import { NextResponse } from 'next/server';
import { dbConnect } from '@/app/lib/mongoose';
import CarpoolRide from '@/app/models/CarpoolRide';
import RideRequest from '@/app/models/RideRequest';
import User from '@/app/models/User';
// Ensure the User model is registered with mongoose (import has side-effects)
void User;
import { getUserFromRequest } from '@/app/lib/auth';
import mongoose from 'mongoose';

// Single consolidated handlers
export async function GET(request: Request, { params }: { params: { id: string } }) {
  await dbConnect();
  try {
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ride id' }, { status: 400 });
    }
    const rideDoc = await CarpoolRide.findById(id)
      .populate('ownerId', 'name email')
      .lean()
      .exec();
    if (!rideDoc) {
      return NextResponse.json({ error: 'Ride not found' }, { status: 404 });
    }
    const user = getUserFromRequest(request);
    const currentUserId = user?.id || null;
    let myRequest: any = null;
    if (currentUserId) {
      const reqDoc = await RideRequest.findOne({ rideId: id, passengerId: currentUserId }).lean().exec();
      if (reqDoc && typeof reqDoc === 'object' && '_id' in reqDoc) {
        // Narrow type safely
        myRequest = {
          _id: (reqDoc as any)._id,
          status: (reqDoc as any).status,
            seatsRequested: (reqDoc as any).seatsRequested,
          createdAt: (reqDoc as any).createdAt,
        };
      }
    }
    return NextResponse.json({ ride: rideDoc, currentUserId, myRequest }, { status: 200 });
  } catch (err) {
    console.error('GET /api/carpools/:id error:', err);
    return NextResponse.json({ error: 'Failed to fetch ride', details: (err as any)?.message || String(err) }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  await dbConnect();
  const user = getUserFromRequest(request);
  if (!user || !user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ride id' }, { status: 400 });
    }
    const ride = await CarpoolRide.findById(id).exec();
    if (!ride) {
      return NextResponse.json({ error: 'Ride not found' }, { status: 404 });
    }
    if (ride.ownerId.toString() !== user.id) {
      return NextResponse.json({ error: 'Forbidden: You can only delete your own ride' }, { status: 403 });
    }
    await CarpoolRide.findByIdAndDelete(id).exec();
    return NextResponse.json({ message: 'Ride deleted successfully' }, { status: 200 });
  } catch (err) {
    console.error('DELETE /api/carpools/:id error:', err);
    return NextResponse.json({ error: 'Failed to delete ride', details: (err as any)?.message || String(err) }, { status: 500 });
  }
}

// PATCH /api/carpools/:id  body: { action: 'complete' }
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  await dbConnect();
  const user = getUserFromRequest(request);
  if (!user || !user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ride id' }, { status: 400 });
    }
    const body = await request.json().catch(() => ({}));
    const action = body?.action;
    if (action !== 'complete') {
      return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
    }
    const ride = await CarpoolRide.findById(id).exec();
    if (!ride) return NextResponse.json({ error: 'Ride not found' }, { status: 404 });
    
    // Check if user is the owner or a participant
    const isOwner = ride.ownerId.toString() === user.id;
    const isParticipant = ride.participants && Array.isArray(ride.participants) && 
      ride.participants.some((p: any) => p.toString() === user.id);
    
    if (!isOwner && !isParticipant) {
      return NextResponse.json({ error: 'Forbidden: Only owner or participants can complete the ride' }, { status: 403 });
    }
    
    // Only allow completion after the scheduled ride date has passed
    const now = new Date();
    if (ride.dateTime && new Date(ride.dateTime) > now) {
      return NextResponse.json({ 
        error: 'Trip has not started yet. You can mark it as completed after the scheduled date.' 
      }, { status: 400 });
    }
    
    ride.status = 'completed';
    await ride.save();
    return NextResponse.json({ message: 'Ride marked as completed', ride: { status: ride.status, id: ride._id } }, { status: 200 });
  } catch (err) {
    console.error('PATCH /api/carpools/:id error:', err);
    return NextResponse.json({ error: 'Failed to update ride', details: (err as any)?.message || String(err) }, { status: 500 });
  }
}
