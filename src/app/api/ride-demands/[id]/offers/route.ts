import { NextResponse } from 'next/server';
import { dbConnect } from '@/app/lib/mongoose';
import { getUserFromRequest } from '@/app/lib/auth';

// POST /api/ride-demands/:id/offers - Driver offers a ride for this demand
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Force model reload to get updated schema
    const mongoose = await import('mongoose');
    delete mongoose.default.models.RideDemand;
    const { default: RideDemand } = await import('@/app/models/RideDemand');
    const { default: NotificationModel } = await import('@/app/models/Notification');
    
    const body = await request.json();
    const { carpoolRideId, message } = body;

    if (!carpoolRideId) {
      return NextResponse.json({ error: 'carpoolRideId is required' }, { status: 400 });
    }

    const demandId = params.id;
    const demand = await RideDemand.findById(demandId).exec();
    
    if (!demand) {
      return NextResponse.json({ error: 'Ride demand not found' }, { status: 404 });
    }

    if (demand.status !== 'open') {
      return NextResponse.json({ error: 'Ride demand is no longer open' }, { status: 400 });
    }

    // Check if driver already offered this ride
    const existingOffer = demand.offers?.find(
      (o: any) => o.driverId?.toString() === user.id && o.carpoolRideId?.toString() === carpoolRideId
    );

    if (existingOffer) {
      return NextResponse.json({ error: 'You have already offered this ride' }, { status: 400 });
    }

    // Use findByIdAndUpdate with $push to add the offer
    await RideDemand.findByIdAndUpdate(
      demandId,
      {
        $push: {
          offers: {
            driverId: user.id,
            carpoolRideId: carpoolRideId,
            message: message || '',
            status: 'pending',
            offeredAt: new Date()
          }
        }
      },
      { new: true }
    ).exec();

    // Create notification for the passenger
    await NotificationModel.create({
      userId: demand.passengerId,
      type: 'ride_offer',
      title: 'New Ride Offer',
      message: `${user.name || user.email} offered a ride for your request: "${demand.title}"`,
      relatedRide: carpoolRideId,
      relatedRequest: demandId
    });

    return NextResponse.json({ success: true, message: 'Offer sent successfully' }, { status: 200 });
  } catch (err) {
    console.error('POST /api/ride-demands/:id/offers error:', err);
    return NextResponse.json(
      { error: 'Failed to offer ride', details: (err as any)?.message || String(err) },
      { status: 500 }
    );
  }
}

// PATCH /api/ride-demands/:id/offers - Passenger accepts/declines an offer
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Force model reload to get updated schema
    const mongoose = await import('mongoose');
    delete mongoose.default.models.RideDemand;
    const { default: RideDemand } = await import('@/app/models/RideDemand');
    const { default: NotificationModel2 } = await import('@/app/models/Notification');
    
    const body = await request.json();
    const { offerId, action } = body; // action: 'accept' or 'decline'

    if (!offerId || !action) {
      return NextResponse.json({ error: 'offerId and action are required' }, { status: 400 });
    }

    if (!['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'action must be accept or decline' }, { status: 400 });
    }

    const demandId = params.id;
    const demand = await RideDemand.findById(demandId);
    
    if (!demand) {
      return NextResponse.json({ error: 'Ride demand not found' }, { status: 404 });
    }

    // Check if user is the passenger who created the demand
    if (demand.passengerId.toString() !== user.id) {
      return NextResponse.json({ error: 'Only the passenger can accept/decline offers' }, { status: 403 });
    }

    const offer = demand.offers.id(offerId);
    if (!offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    if (offer.status !== 'pending') {
      return NextResponse.json({ error: 'Offer has already been processed' }, { status: 400 });
    }

    // Update offer status
    offer.status = action === 'accept' ? 'accepted' : 'declined';

    // If accepted, close the demand and decline all other offers
    if (action === 'accept') {
      demand.status = 'matched';
      for (const o of demand.offers) {
        if (o._id.toString() !== offerId) {
          o.status = 'declined';
        }
      }
    }

    await demand.save();

    // Create notification for the driver
    await NotificationModel2.create({
      userId: offer.driverId,
      type: action === 'accept' ? 'offer_accepted' : 'offer_declined',
      title: action === 'accept' ? 'Offer Accepted!' : 'Offer Declined',
      message: `Your ride offer for "${demand.title}" was ${action === 'accept' ? 'accepted' : 'declined'}.`,
      relatedRide: offer.carpoolRideId,
      relatedRequest: demandId
    });

    return NextResponse.json({ success: true, demand }, { status: 200 });
  } catch (err) {
    console.error('PATCH /api/ride-demands/:id/offers error:', err);
    return NextResponse.json(
      { error: 'Failed to process offer', details: (err as any)?.message || String(err) },
      { status: 500 }
    );
  }
}
