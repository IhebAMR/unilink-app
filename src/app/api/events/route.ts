import { NextResponse } from 'next/server';
import { dbConnect } from '@/app/lib/mongoose';
import Event from '@/app/models/Event';
import { getUserFromRequest } from '@/app/lib/auth';
import { validateText } from '@/app/lib/profanityFilter';

export async function GET(request: Request) {
  await dbConnect();
  try {
    // Get current user if logged in
    const user = getUserFromRequest(request);
    const currentUserId = user?.id || null;

    const events = await Event.find({})
      .sort({ date: 1 })
      .limit(100)
      .lean()
      .exec();

    // Transform events to include attending/notGoing arrays as strings for JSON serialization
    const transformedEvents = events.map((event: any) => ({
      ...event,
      attending: event.attending || [],
      notGoing: event.notGoing || [],
    }));

    // Return events along with current user ID for client-side filtering
    return NextResponse.json({ events: transformedEvents, currentUserId }, { status: 200 });
  } catch (err) {
    console.error('GET /api/events error:', err);
    return NextResponse.json({ error: 'Failed to fetch events', details: (err as any)?.message || String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await dbConnect();

  const user = getUserFromRequest(request);
  if (!user || !user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { name, description, date, time, duration, location, image } = body;

    if (!name || !date || !time || !duration || !location) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check for profanity in event name
    const nameValidation = validateText(name);
    if (nameValidation) {
      return NextResponse.json({ 
        error: 'Inappropriate language detected',
        message: nameValidation,
        profanityDetected: true
      }, { status: 400 });
    }

    // Check for profanity in description if provided
    if (description && description.trim()) {
      const descValidation = validateText(description);
      if (descValidation) {
        return NextResponse.json({ 
          error: 'Inappropriate language detected',
          message: descValidation,
          profanityDetected: true
        }, { status: 400 });
      }
    }

    // Check for profanity in location
    const locationValidation = validateText(location);
    if (locationValidation) {
      return NextResponse.json({ 
        error: 'Inappropriate language detected',
        message: locationValidation,
        profanityDetected: true
      }, { status: 400 });
    }

    // Validate date is not in the past
    const eventDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (eventDate < today) {
      return NextResponse.json({ error: 'Event date cannot be in the past' }, { status: 400 });
    }

    const event = await Event.create({
      ownerId: user.id,
      name: name.trim(),
      description: description?.trim() || '',
      date: new Date(date),
      time: time.trim(),
      duration: duration.trim(),
      location: location.trim(),
      image: image?.trim() || '',
      attending: [],
      notGoing: [],
      status: 'upcoming'
    });

    return NextResponse.json(event, { status: 201 });
  } catch (err) {
    console.error('POST /api/events error:', err);
    return NextResponse.json({ error: 'Failed to create event', details: (err as any)?.message || String(err) }, { status: 500 });
  }
}

