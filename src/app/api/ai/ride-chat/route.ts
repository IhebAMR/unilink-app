import { NextResponse } from 'next/server';
import { dbConnect } from '@/app/lib/mongoose';
import CarpoolRide from '@/app/models/CarpoolRide';
// RideRequest and User models not needed in this route; keep imports minimal
import { callHuggingFace } from '@/app/lib/hf';
import RideRequest from '@/app/models/RideRequest';
import { getUserFromRequest } from '@/app/lib/auth';
// local fallback parser will be used if HF fails or is not available

const SYSTEM_PROMPT = `
You are UniLink's ride-booking assistant. 
Your job is to help users book carpool rides by understanding their requests, extracting details, and responding conversationally.
If a user asks for a ride, extract origin, destination, date, time, and passenger count.
If they want to book a specific ride, confirm and proceed.
Always reply with a friendly, helpful tone.
`;

const FUNCTIONS = [
  {
    name: "find_rides",
    description: "Find available rides matching user criteria",
    parameters: {
      type: "object",
      properties: {
        origin: { type: "string", description: "Origin city or address" },
        destination: { type: "string", description: "Destination city or address" },
        date: { type: "string", description: "Date of ride (YYYY-MM-DD)" },
        time: { type: "string", description: "Time of ride (HH:MM or natural language)" },
        passengerCount: { type: "integer", description: "Number of passengers", default: 1 }
      },
      required: ["origin", "destination", "date"]
    }
  },
  {
    name: "book_ride",
    description: "Book a specific ride for the user",
    parameters: {
      type: "object",
      properties: {
        rideId: { type: "string", description: "ID of the ride to book" },
        passengerId: { type: "string", description: "User ID of the passenger" },
        seatsRequested: { type: "integer", description: "Number of seats to book", default: 1 }
      },
      required: ["rideId", "passengerId"]
    }
  }
];

export async function POST(req: Request) {
  await dbConnect();
  const { message } = await req.json();

  // Quick small-talk / greeting detection: respond locally to simple greetings
  const textMessage = (message || '').toString().trim();
  const greetingRe = /^(hi|hello|hey|hiya|yo|good\s(morning|afternoon|evening))\b[!.]?$/i;
  const thanksRe = /^(thanks|thank you|thx)[!.]?$/i;
  if (greetingRe.test(textMessage)) {
    return NextResponse.json({ reply: 'Hi there! I\'m UniLink\'s ride assistant — I can help you find or book carpool rides. Try: "I want a ride from Tunis to Sousse tomorrow at 9 AM"', structured: null, aiRaw: null, error: null });
  }
  if (thanksRe.test(textMessage)) {
    return NextResponse.json({ reply: 'You\'re welcome! Anything else I can help with?', structured: null, aiRaw: null, error: null });
  }

  // Quick booking intent: "book <rideId>" or "book ride <rideId>"
  const bookMatch = /(?:book|reserve)\s*(?:ride\s*)?([0-9a-fA-F]{6,24})?/i.exec(textMessage);
  if (bookMatch) {
    const rideId = bookMatch[1];
    if (!rideId) {
      return NextResponse.json({ reply: 'Which ride would you like to book? Reply with: "Book ride RIDE_ID" (e.g. Book ride 69155ed1...)', structured: null, aiRaw: null, error: null });
    }

    // find the ride
    const ride = await CarpoolRide.findById(rideId).lean().exec();
    if (!ride) return NextResponse.json({ reply: `I couldn't find a ride with id ${rideId}. Please check the id and try again.`, structured: null, aiRaw: null, error: null });
    if (ride.seatsAvailable <= 0) return NextResponse.json({ reply: `Sorry, ride ${rideId} is full (no seats available).`, structured: { rideId, status: 'full' }, aiRaw: null, error: null });

    // determine passengerId from request (cookie JWT) or dev fallback
    const user = getUserFromRequest(req) || (process.env.USE_DEV_AUTH === 'true' ? { id: process.env.DEV_USER_ID } : null);
    if (!user || !user.id) {
      return NextResponse.json({ reply: 'You must be logged in to book a ride. Please sign in and try again.', structured: null, aiRaw: null, error: null });
    }

    // create a RideRequest
    const rr = new RideRequest({ rideId: ride._id, passengerId: user.id, seatsRequested: 1, message: 'Requested via chat assistant' });
    await rr.save();

    return NextResponse.json({ reply: `Thanks — your booking request for ride ${rideId} has been created (request id: ${rr._id}). The driver will review it.`, structured: { rideId, requestId: rr._id }, aiRaw: null, error: null });
  }

  // Try Hugging Face if configured, otherwise fallback to local parser
  const hfKey = process.env.HF_API_KEY || process.env.HUGGINGFACE_API_KEY;
  let hfCallError: string | null = null;

  if (hfKey) {
    try {
      // Ask the model to extract structured fields where possible, but allow
      // a plain conversational reply as a fallback.
      const hfPrompt = `${SYSTEM_PROMPT}\n\nUser: ${message}\n\nRespond with a brief conversational reply. If you can, also include a JSON object on its own line with keys: origin, destination, date, time, passengerCount, intent (e.g., "find" or "book") and optionally rideId.`;
      const aiRaw = await callHuggingFace(hfPrompt);

      // Try to extract a JSON object from the model output
      let structured = null;
      try {
        const jsonMatch = aiRaw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          structured = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        // ignore parse errors
      }

      // Use the AI's conversational text as the reply (strip JSON if present)
      let reply = aiRaw;
      if (structured) {
        // remove the JSON substring from the reply for cleanliness
        reply = aiRaw.replace(JSON.stringify(structured), '').trim();
      }

      return NextResponse.json({ reply, structured, aiRaw, error: null });
    } catch (err: any) {
      hfCallError = (err && err.message) ? err.message : String(err);
      console.warn('Hugging Face call failed, falling back to local parser:', hfCallError);
    }
  }

  // Local fallback: simple NLP heuristics to extract origin/destination/date/time/passengers
  const text = (message || '').toString();
  

  // origin/destination: try several english and french patterns
  let origin: string | null = null;
  let destination: string | null = null;

  const patterns = [
    /from\s+([^\n,]+?)\s+to\s+([^\n,]+?)(?:\s|$|\.|,)/i,
    /([^\n,]+?)\s+to\s+([^\n,]+?)(?:\s|$|\.|,)/i,
    /de\s+([^\n,]+?)\s+à\s+([^\n,]+?)(?:\s|$|\.|,)/i,       // French 'de X à Y'
    /du\s+([^\n,]+?)\s+au\s+([^\n,]+?)(?:\s|$|\.|,)/i,     // French 'du X au Y'
    /([^\n,]+?)\s+[-→–]\s+([^\n,]+?)(?:\s|$|\.|,)/i,        // 'A - B' or arrows
    /([^\n,]+?)\s+vers\s+([^\n,]+?)(?:\s|$|\.|,)/i         // 'X vers Y'
  ];

  for (const re of patterns) {
    const m = re.exec(text);
    if (m) {
      origin = m[1].trim();
      destination = m[2].trim();
      break;
    }
  }

  // time: look for 'at 9', 'at 9 am', '9am', etc.
  let time: string | null = null;
  const timeMatch = /at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i.exec(text) || /(\d{1,2}:\d{2}\s*(?:am|pm)?)/i.exec(text);
  if (timeMatch) time = timeMatch[1].trim();

  // date: look for 'tomorrow' or ISO date
  let dateStr: string | null = null;
  if (/tomorrow/i.test(text)) {
    const d = new Date(); d.setDate(d.getDate() + 1); dateStr = d.toISOString().slice(0,10);
  } else if (/today/i.test(text)) {
    dateStr = new Date().toISOString().slice(0,10);
  } else {
    const iso = /(\d{4}-\d{2}-\d{2})/.exec(text);
    if (iso) dateStr = iso[1];
  }

  // passengers
  let passengerCount = 1;
  const pMatch = /(\d+)\s*(?:passenger|passengers|seat|seats)/i.exec(text);
  if (pMatch) passengerCount = Number.parseInt(pMatch[1], 10) || 1;

  // If we have origin/destination/date, search rides
  let rides: any[] = [];
  if (origin && destination && dateStr) {
    // Build a day range for the requested date (startOfDay .. startOfNextDay)
    const startOfDay = new Date(dateStr);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfNextDay = new Date(startOfDay);
    startOfNextDay.setDate(startOfNextDay.getDate() + 1);

    // Escape user input for regex
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const originRegex = new RegExp(esc(origin), 'i');
    const destRegex = new RegExp(esc(destination), 'i');

    // Query: date within the day AND fuzzy match on multiple location fields
    const q: any = {
      dateTime: { $gte: startOfDay, $lt: startOfNextDay },
      $or: [
        { 'origin.city': originRegex },
        { 'origin.name': originRegex },
        { 'origin.address': originRegex },
        { 'destination.city': destRegex },
        { 'destination.name': destRegex },
        { 'destination.address': destRegex },
        { title: originRegex },
        { title: destRegex },
        { 'ownerId.name': originRegex },
        { 'ownerId.name': destRegex }
      ]
    };

    rides = await CarpoolRide.find(q).limit(10).lean().exec();
  }

  // If no rides found for the exact day, try a relaxed search for the next 7 days
  if (rides.length === 0 && origin && destination && dateStr) {
    const start = new Date(dateStr);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7); // next 7 days

    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const originRegex = new RegExp(esc(origin), 'i');
    const destRegex = new RegExp(esc(destination), 'i');

    const q2: any = {
      dateTime: { $gte: start, $lt: end },
      $or: [
        { 'origin.city': originRegex },
        { 'origin.name': originRegex },
        { 'origin.address': originRegex },
        { 'destination.city': destRegex },
        { 'destination.name': destRegex },
        { 'destination.address': destRegex },
        { title: originRegex },
        { title: destRegex },
        { 'ownerId.name': originRegex },
        { 'ownerId.name': destRegex }
      ]
    };

    rides = await CarpoolRide.find(q2).sort({ dateTime: 1 }).limit(10).lean().exec();
  }

  // Build a friendly reply
  let reply = '';
  if (rides.length > 0) {
    reply = `I found ${rides.length} ride(s) from ${origin} to ${destination} on ${dateStr}:\n` +
      rides.map(r => `• ${r.title || r.ownerId?.name || 'Driver'} at ${new Date(r.dateTime).toLocaleTimeString()} (${r.seatsAvailable} seats left) — id: ${r._id}`).join('\n') +
      '\nReply with "Book ride ID_HERE" to request a seat.';
  } else if (origin && destination) {
    reply = `Sorry, I couldn't find rides from ${origin} to ${destination} on ${dateStr || 'the requested date'}.`;
  } else {
    reply = "I couldn't understand your request. Try: 'I want a ride from Tunis to Sousse tomorrow at 9 AM'";
  }

  return NextResponse.json({ reply, structured: { origin, destination, date: dateStr, time, passengerCount, rides }, error: hfCallError });
}
