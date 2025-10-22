import { NextResponse } from 'next/server';
import { dbConnect } from '@/app/lib/mongoose';
import RideDemand from '@/app/models/RideDemand';
import { getUserFromRequest } from '@/app/lib/auth';

// GET - List all ride demands
export async function GET(request: Request) {
  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'open';
    const myDemands = searchParams.get('myDemands') === 'true';

    const query: any = {};
    
    if (status) {
      query.status = status;
    }

    // If myDemands is true, only return user's own demands
    if (myDemands) {
      const user = getUserFromRequest(request);
      if (!user || !user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      query.passengerId = user.id;
    }

    const demands = await RideDemand.find(query)
      .populate('passengerId', 'name email')
      .sort({ dateTime: 1 })
      .limit(100)
      .lean()
      .exec();

    return NextResponse.json(demands, { status: 200 });
  } catch (err) {
    console.error('GET /api/ride-demands error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch ride demands', details: (err as any)?.message || String(err) },
      { status: 500 }
    );
  }
}

// POST - Create a new ride demand
export async function POST(request: Request) {
  await dbConnect();

  const user = getUserFromRequest(request);
  if (!user || !user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, origin, destination, dateTime, seatsNeeded, maxPrice, notes } = body;

    if (!origin || !destination || !dateTime) {
      return NextResponse.json({ error: 'Missing required fields: origin, destination, dateTime' }, { status: 400 });
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

    const demand = await RideDemand.create({
      passengerId: user.id,
      title,
      origin,
      destination,
      dateTime: new Date(dateTime),
      seatsNeeded: Number(seatsNeeded) || 1,
      maxPrice: maxPrice ? Number(maxPrice) : 0,
      notes,
      status: 'open'
    });

    return NextResponse.json(demand, { status: 201 });
  } catch (err) {
    console.error('POST /api/ride-demands error:', err);
    return NextResponse.json(
      { error: 'Failed to create ride demand', details: (err as any)?.message || String(err) },
      { status: 500 }
    );
  }
}
