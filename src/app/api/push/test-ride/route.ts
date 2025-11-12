import { NextResponse } from 'next/server';
import { dbConnect } from '@/app/lib/mongoose';
import CarpoolRide from '@/app/models/CarpoolRide';
import RideRequest from '@/app/models/RideRequest';
import User from '@/app/models/User';
import webpush from 'web-push';
import { getUserFromRequest } from '@/app/lib/auth';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@unilink.app';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// Test endpoint to send notifications for a specific ride immediately
// POST /api/push/test-ride body: { rideId, type: '1hour' | '24hour' | 'now' }
export async function POST(request: Request) {
  try {
    await dbConnect();
    const user = getUserFromRequest(request);
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { rideId, type = 'now', customMessage } = body;

    if (!rideId) {
      return NextResponse.json({ error: 'Missing rideId' }, { status: 400 });
    }

    const ride = await CarpoolRide.findById(rideId)
      .populate('ownerId', 'name email notificationTokens')
      .lean();

    if (!ride) {
      return NextResponse.json({ error: 'Ride not found' }, { status: 404 });
    }

    // Check if user is admin, owner, or has accepted request
    const userDoc = await User.findById(user.id).lean();
    const isAdmin = userDoc?.role === 'admin';
    const isOwner = String(ride.ownerId._id || ride.ownerId) === String(user.id);
    const hasAcceptedRequest = await RideRequest.findOne({
      rideId: rideId,
      passengerId: user.id,
      status: 'accepted'
    }).lean();

    if (!isAdmin && !isOwner && !hasAcceptedRequest) {
      return NextResponse.json({ 
        error: 'You must be an admin, the ride owner, or an accepted passenger to test notifications for this ride' 
      }, { status: 403 });
    }

    const rideDate = new Date(ride.dateTime);
    let title = '';
    let message = '';

    // Use custom message if provided, otherwise use default
    if (customMessage) {
      title = '🚗 Ride Reminder';
      message = customMessage;
    } else {
      switch (type) {
        case '1hour':
          title = '🚗 Your ride starts in 1 hour!';
          message = `Don't forget: "${ride.title || 'Your ride'}" starts at ${rideDate.toLocaleString()}`;
          break;
        case '24hour':
          title = '📅 Ride reminder: Tomorrow';
          message = `Reminder: "${ride.title || 'Your ride'}" is scheduled for tomorrow at ${rideDate.toLocaleString()}`;
          break;
        case 'now':
        default:
          title = '🚗 Ride Reminder';
          message = `Reminder: "${ride.title || 'Your ride'}" is scheduled for ${rideDate.toLocaleString()}`;
          break;
      }
    }

    const notificationsSent = [];
    const errors = [];

    // Send to owner
    if (isOwner && ride.ownerId && ride.ownerId.notificationTokens) {
      const owner = await User.findById(ride.ownerId._id).lean();
      if (owner && owner.notificationTokens) {
        for (const token of owner.notificationTokens) {
          try {
            const subscription = JSON.parse(token);
            await webpush.sendNotification(subscription, JSON.stringify({
              title,
              message,
              icon: '/icons/unilink.png',
              badge: '/icons/unilink.png',
              data: {
                url: `/carpools/${ride._id}`,
                rideId: ride._id.toString()
              },
              tag: `ride-${ride._id}-test-${type}`,
              requireInteraction: false
            }));
            notificationsSent.push({ userId: owner._id.toString(), role: 'owner' });
          } catch (err: any) {
            console.error(`Failed to send notification to owner:`, err);
            if (err.statusCode === 410 || err.statusCode === 404) {
              await User.updateOne(
                { _id: owner._id },
                { $pull: { notificationTokens: token } }
              );
            }
            errors.push({ userId: owner._id.toString(), error: err.message });
          }
        }
      }
    }

    // Send to accepted passengers
    const acceptedRequests = await RideRequest.find({
      rideId: rideId,
      status: 'accepted'
    }).populate('passengerId', 'name email notificationTokens').lean();

    for (const request of acceptedRequests) {
      if (request.passengerId && request.passengerId.notificationTokens) {
        const passenger = await User.findById(request.passengerId._id).lean();
        if (passenger && passenger.notificationTokens) {
          for (const token of passenger.notificationTokens) {
            try {
              const subscription = JSON.parse(token);
              await webpush.sendNotification(subscription, JSON.stringify({
                title,
                message: `You're a passenger: "${ride.title || 'Ride'}" ${type === '1hour' ? 'starts in 1 hour' : type === '24hour' ? 'is tomorrow' : 'reminder'}`,
                icon: '/icons/unilink.png',
                badge: '/icons/unilink.png',
                data: {
                  url: `/carpools/${ride._id}`,
                  rideId: ride._id.toString()
                },
                tag: `ride-${ride._id}-test-${type}-passenger`,
                requireInteraction: false
              }));
              notificationsSent.push({ userId: passenger._id.toString(), role: 'passenger' });
            } catch (err: any) {
              console.error(`Failed to send notification to passenger:`, err);
              if (err.statusCode === 410 || err.statusCode === 404) {
                await User.updateOne(
                  { _id: passenger._id },
                  { $pull: { notificationTokens: token } }
                );
              }
              errors.push({ userId: passenger._id.toString(), error: err.message });
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Test notifications sent for ride "${ride.title || ride._id}"`,
      notificationsSent: notificationsSent.length,
      details: notificationsSent,
      errors: errors.length > 0 ? errors : undefined
    }, { status: 200 });
  } catch (err: any) {
    console.error('POST /api/push/test-ride error:', err);
    return NextResponse.json({
      error: 'Failed to send test notifications',
      details: err.message || String(err)
    }, { status: 500 });
  }
}

