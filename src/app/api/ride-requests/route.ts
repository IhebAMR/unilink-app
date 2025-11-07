import { NextResponse } from 'next/server';
import { dbConnect } from '@/app/lib/mongoose';
import RideRequest from '@/app/models/RideRequest';
import { getUserFromRequest } from '@/app/lib/auth';

// GET /api/ride-requests - List the current user's ride booking requests
export async function GET(request: Request) {
  await dbConnect();

  const user = getUserFromRequest(request);
  if (!user || !user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const requests = await RideRequest.find({ passengerId: user.id })
      .populate('rideId', 'title dateTime status seatsAvailable ownerId')
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return NextResponse.json({ requests }, { status: 200 });
  } catch (err) {
    console.error('GET /api/ride-requests error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch your requests', details: (err as any)?.message || String(err) },
      { status: 500 }
    );
  }
}
