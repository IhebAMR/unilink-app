import { NextResponse } from 'next/server';
import { dbConnect } from '@/app/lib/mongoose';
import RideDemand from '@/app/models/RideDemand';
import { getUserFromRequest } from '@/app/lib/auth';
import mongoose from 'mongoose';

// Dynamically import User model to register it with Mongoose
const getUserModel = async () => {
  const { default: User } = await import('@/app/models/User');
  return User;
};

// GET - Get a specific ride demand
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  await dbConnect();
  await getUserModel();

  try {
    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid demand id' }, { status: 400 });
    }

    const demand = await RideDemand.findById(id)
      .populate('passengerId', 'name email')
      .populate('offers.driverId', 'name email')
      .populate('offers.carpoolRideId')
      .lean()
      .exec();

    if (!demand) {
      return NextResponse.json({ error: 'Ride demand not found' }, { status: 404 });
    }

    return NextResponse.json(demand, { status: 200 });
  } catch (err) {
    console.error('GET /api/ride-demands/:id error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch ride demand', details: (err as any)?.message || String(err) },
      { status: 500 }
    );
  }
}

// DELETE - Delete a ride demand
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  await dbConnect();

  const user = getUserFromRequest(request);
  if (!user || !user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid demand id' }, { status: 400 });
    }

    const demand = await RideDemand.findById(id).exec();

    if (!demand) {
      return NextResponse.json({ error: 'Ride demand not found' }, { status: 404 });
    }

    // Check if user is the owner of the demand
    if (demand.passengerId.toString() !== user.id) {
      return NextResponse.json({ error: 'Forbidden: You can only delete your own ride demands' }, { status: 403 });
    }

    await RideDemand.findByIdAndDelete(id).exec();

    return NextResponse.json({ message: 'Ride demand deleted successfully' }, { status: 200 });
  } catch (err) {
    console.error('DELETE /api/ride-demands/:id error:', err);
    return NextResponse.json(
      { error: 'Failed to delete ride demand', details: (err as any)?.message || String(err) },
      { status: 500 }
    );
  }
}

// PATCH - Update ride demand status
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  await dbConnect();

  const user = getUserFromRequest(request);
  if (!user || !user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid demand id' }, { status: 400 });
    }

    const body = await request.json();
    const { status } = body;

    if (!status || !['open', 'matched', 'cancelled', 'completed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const demand = await RideDemand.findById(id).exec();

    if (!demand) {
      return NextResponse.json({ error: 'Ride demand not found' }, { status: 404 });
    }

    // Check if user is the owner of the demand
    if (demand.passengerId.toString() !== user.id) {
      return NextResponse.json({ error: 'Forbidden: You can only update your own ride demands' }, { status: 403 });
    }

    demand.status = status;
    await demand.save();

    return NextResponse.json(demand, { status: 200 });
  } catch (err) {
    console.error('PATCH /api/ride-demands/:id error:', err);
    return NextResponse.json(
      { error: 'Failed to update ride demand', details: (err as any)?.message || String(err) },
      { status: 500 }
    );
  }
}
