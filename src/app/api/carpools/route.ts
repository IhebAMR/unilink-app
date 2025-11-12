import { NextResponse } from 'next/server';
import { dbConnect } from '@/app/lib/mongoose';
import CarpoolRide from '@/app/models/CarpoolRide';
import { getUserFromRequest } from '@/app/lib/auth';

export async function GET(request: Request) {
  await dbConnect();
  try {
    // Get current user if logged in
    const user = getUserFromRequest(request);
    const currentUserId = user?.id || null;

    const rides = await CarpoolRide.find({})
      .populate('ownerId', 'name email')
      .sort({ dateTime: 1 })
      .limit(100)
      .lean()
      .exec();

    // Return rides along with current user ID for client-side filtering
    return NextResponse.json({ rides, currentUserId }, { status: 200 });
  } catch (err) {
    console.error('GET /api/carpools error:', err);
    return NextResponse.json({ error: 'Failed to fetch rides', details: (err as any)?.message || String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await dbConnect();

  const user = getUserFromRequest(request);
  if (!user || !user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { title, origin, destination, route, stops, dateTime, seatsTotal, price, notes } = body;

    if (!origin || !destination || !dateTime || !seatsTotal) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate coordinates if provided
    if (origin.location?.coordinates) {
      const [lng, lat] = origin.location.coordinates;
      if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
        return NextResponse.json({ 
          error: `Invalid origin coordinates. Longitude must be between -180 and 180, latitude between -90 and 90. Got: lng=${lng}, lat=${lat}` 
        }, { status: 400 });
      }
    }

    if (destination.location?.coordinates) {
      const [lng, lat] = destination.location.coordinates;
      if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
        return NextResponse.json({ 
          error: `Invalid destination coordinates. Longitude must be between -180 and 180, latitude between -90 and 90. Got: lng=${lng}, lat=${lat}` 
        }, { status: 400 });
      }
    }

    // Validate route coordinates if provided
    if (route?.coordinates && Array.isArray(route.coordinates)) {
      for (let i = 0; i < route.coordinates.length; i++) {
        const [lng, lat] = route.coordinates[i];
        if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
          return NextResponse.json({ 
            error: `Invalid route coordinate at index ${i}. Longitude must be between -180 and 180, latitude between -90 and 90. Got: lng=${lng}, lat=${lat}` 
          }, { status: 400 });
        }
      }
    }

    const ride = await CarpoolRide.create({
      ownerId: user.id,
      title,
      origin,
      destination,
      route,
      stops,
      dateTime: new Date(dateTime),
      seatsTotal: Number(seatsTotal),
      seatsAvailable: Number(seatsTotal),
      price: price ? Number(price) : 0,
      notes
    });

    return NextResponse.json(ride, { status: 201 });
  } catch (err) {
    console.error('POST /api/carpools error:', err);
    return NextResponse.json({ error: 'Failed to create ride', details: (err as any)?.message || String(err) }, { status: 500 });
  }
}