import { NextResponse } from 'next/server';
import { dbConnect } from '@/app/lib/mongoose';
import CarpoolRide from '@/app/models/CarpoolRide';
import { getUserFromRequest } from '@/app/lib/auth';
import mongoose from 'mongoose';

// Dynamically import User model to register it with Mongoose
const getUserModel = async () => {
  const { default: User } = await import('@/app/models/User');
  return User;
};

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  await dbConnect();
  
  // Ensure User model is registered for populate
  await getUserModel();

  try {
    const { id } = params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ride id' }, { status: 400 });
    }

    const ride = await CarpoolRide.findById(id)
      .populate('ownerId', 'name email')
      .lean()
      .exec();

    if (!ride) {
      return NextResponse.json({ error: 'Ride not found' }, { status: 404 });
    }

    return NextResponse.json(ride, { status: 200 });
  } catch (err) {
    console.error('GET /api/carpools/:id error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch ride', details: (err as any)?.message || String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  await dbConnect();

  // Check authentication
  const user = getUserFromRequest(request);
  if (!user || !user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ride id' }, { status: 400 });
    }

    // Find the ride first to check ownership
    const ride = await CarpoolRide.findById(id).exec();

    if (!ride) {
      return NextResponse.json({ error: 'Ride not found' }, { status: 404 });
    }

    // Check if the user is the owner of the ride
    if (ride.ownerId.toString() !== user.id) {
      return NextResponse.json({ error: 'Forbidden: You can only delete your own rides' }, { status: 403 });
    }

    // Delete the ride
    await CarpoolRide.findByIdAndDelete(id).exec();

    return NextResponse.json({ message: 'Ride deleted successfully' }, { status: 200 });
  } catch (err) {
    console.error('DELETE /api/carpools/:id error:', err);
    return NextResponse.json(
      { error: 'Failed to delete ride', details: (err as any)?.message || String(err) },
      { status: 500 }
    );
  }
}
