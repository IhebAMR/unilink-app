import { NextResponse } from 'next/server';
import { dbConnect } from '@/app/lib/mongoose';
import CarpoolRide from '@/app/models/CarpoolRide';
import RideRequest from '@/app/models/RideRequest';
import { getUserFromRequest } from '@/app/lib/auth';
import mongoose from 'mongoose';

// Dynamic import for Notification to ensure it's always fresh
const getNotificationModel = async () => {
  const { default: Notification } = await import('@/app/models/Notification');
  return Notification;
};

// Dynamically import User model to register it with Mongoose
const getUserModel = async () => {
  const { default: User } = await import('@/app/models/User');
  return User;
};

// GET - List all ride requests for a specific ride (owner only)
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  await dbConnect();
  await getUserModel();

  const user = getUserFromRequest(request);
  if (!user || !user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ride id' }, { status: 400 });
    }

    // Verify user is the owner of the ride
    const ride = await CarpoolRide.findById(id).exec();
    if (!ride) {
      return NextResponse.json({ error: 'Ride not found' }, { status: 404 });
    }

    if (ride.ownerId.toString() !== user.id) {
      return NextResponse.json({ error: 'Forbidden: Only ride owner can view requests' }, { status: 403 });
    }

    // Get all requests for this ride with passenger info
    const requests = await RideRequest.find({ rideId: id })
      .populate('passengerId', 'name email')
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return NextResponse.json(requests, { status: 200 });
  } catch (err) {
    console.error('GET /api/carpools/:id/requests error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch requests', details: (err as any)?.message || String(err) },
      { status: 500 }
    );
  }
}

// POST - Create a new ride booking request
export async function POST(
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
      return NextResponse.json({ error: 'Invalid ride id' }, { status: 400 });
    }

    const body = await request.json();
    const { seatsRequested = 1, message } = body;

    // Get the ride
    const ride = await CarpoolRide.findById(id).exec();
    if (!ride) {
      return NextResponse.json({ error: 'Ride not found' }, { status: 404 });
    }

    // Check if user is trying to book their own ride
    if (ride.ownerId.toString() === user.id) {
      return NextResponse.json({ error: 'Cannot book your own ride' }, { status: 400 });
    }

    // Check if ride is still available
    if (ride.status !== 'open') {
      return NextResponse.json({ error: 'Ride is not available for booking' }, { status: 400 });
    }

    // Check if enough seats available
    if (ride.seatsAvailable < seatsRequested) {
      return NextResponse.json({ error: 'Not enough seats available' }, { status: 400 });
    }

    // Check if user already has a pending or accepted request for this ride
    const existingRequest = await RideRequest.findOne({
      rideId: id,
      passengerId: user.id,
      status: { $in: ['pending', 'accepted'] }
    }).exec();

    if (existingRequest) {
      return NextResponse.json({ error: 'You already have a request for this ride' }, { status: 400 });
    }

    // Create the request
    const rideRequest = await RideRequest.create({
      rideId: id,
      passengerId: user.id,
      seatsRequested: Number(seatsRequested),
      message,
      status: 'pending'
    });

    // Create notification for ride owner
    const NotificationModel = await getNotificationModel();
    await NotificationModel.create({
      userId: ride.ownerId,
      type: 'ride_request',
      title: 'New Ride Request',
      message: `Someone requested ${seatsRequested} seat${seatsRequested > 1 ? 's' : ''} for your ride${ride.title ? ` "${ride.title}"` : ''}`,
      relatedRide: id,
      relatedRequest: rideRequest._id
    });

    return NextResponse.json(rideRequest, { status: 201 });
  } catch (err) {
    console.error('POST /api/carpools/:id/requests error:', err);
    return NextResponse.json(
      { error: 'Failed to create request', details: (err as any)?.message || String(err) },
      { status: 500 }
    );
  }
}

// PATCH - Accept or decline a ride request
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
      return NextResponse.json({ error: 'Invalid ride id' }, { status: 400 });
    }

    const body = await request.json();
    const { requestId, action } = body; // action: 'accept' or 'decline'

    if (!requestId || !action) {
      return NextResponse.json({ error: 'Missing requestId or action' }, { status: 400 });
    }

    if (!['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be "accept" or "decline"' }, { status: 400 });
    }

    // Verify user is the owner of the ride
    const ride = await CarpoolRide.findById(id).exec();
    if (!ride) {
      return NextResponse.json({ error: 'Ride not found' }, { status: 404 });
    }

    if (ride.ownerId.toString() !== user.id) {
      return NextResponse.json({ error: 'Forbidden: Only ride owner can manage requests' }, { status: 403 });
    }

    // Get the request
    const rideRequest = await RideRequest.findById(requestId).exec();
    if (!rideRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Verify request belongs to this ride
    if (rideRequest.rideId.toString() !== id) {
      return NextResponse.json({ error: 'Request does not belong to this ride' }, { status: 400 });
    }

    // Check if request is still pending
    if (rideRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Request is no longer pending' }, { status: 400 });
    }

    if (action === 'accept') {
      // Check if enough seats available
      if (ride.seatsAvailable < rideRequest.seatsRequested) {
        return NextResponse.json({ error: 'Not enough seats available' }, { status: 400 });
      }

      // Update request status
      rideRequest.status = 'accepted';
      await rideRequest.save();

      // Update ride: decrease seats, add passenger to participants
      ride.seatsAvailable -= rideRequest.seatsRequested;
      
      // Add passenger to participants if not already there
      if (!ride.participants.includes(rideRequest.passengerId)) {
        ride.participants.push(rideRequest.passengerId);
      }

      // Update ride status if full
      if (ride.seatsAvailable === 0) {
        ride.status = 'full';
      }

      await ride.save();

      // Create notification for requester
      const NotificationModel = await getNotificationModel();
      const seatsText = rideRequest.seatsRequested > 1 ? `${rideRequest.seatsRequested} seats` : '1 seat';
      const rideTitle = ride.title ? ` "${ride.title}"` : '';
      await NotificationModel.create({
        userId: rideRequest.passengerId,
        type: 'request_accepted',
        title: 'Ride Request Accepted!',
        message: `Your request for ${seatsText} has been accepted for the ride${rideTitle}`,
        relatedRide: id,
        relatedRequest: requestId
      });

      return NextResponse.json({ 
        message: 'Request accepted', 
        request: rideRequest,
        ride: { seatsAvailable: ride.seatsAvailable, status: ride.status }
      }, { status: 200 });
    } else {
      // Decline request
      rideRequest.status = 'rejected';
      await rideRequest.save();

      // Create notification for requester
      const NotificationModel = await getNotificationModel();
      const seatsText = rideRequest.seatsRequested > 1 ? `${rideRequest.seatsRequested} seats` : '1 seat';
      const rideTitle = ride.title ? ` "${ride.title}"` : '';
      await NotificationModel.create({
        userId: rideRequest.passengerId,
        type: 'request_rejected',
        title: 'Ride Request Declined',
        message: `Your request for ${seatsText} has been declined for the ride${rideTitle}`,
        relatedRide: id,
        relatedRequest: requestId
      });

      return NextResponse.json({ 
        message: 'Request declined', 
        request: rideRequest 
      }, { status: 200 });
    }
  } catch (err) {
    console.error('PATCH /api/carpools/:id/requests error:', err);
    return NextResponse.json(
      { error: 'Failed to update request', details: (err as any)?.message || String(err) },
      { status: 500 }
    );
  }
}