import { NextResponse } from 'next/server';
import { dbConnect } from '@/app/lib/mongoose';
import CarpoolRide from '@/app/models/CarpoolRide';
import RideRequest from '@/app/models/RideRequest';
import User from '@/app/models/User';
import webpush from 'web-push';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@unilink.app';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// This endpoint should be called by a cron job or scheduled task
// POST /api/push/reminders?secret=YOUR_SECRET
export async function POST(request: Request) {
  try {
    // Simple secret check (in production, use a more secure method)
    const url = new URL(request.url);
    const secret = url.searchParams.get('secret');
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const now = new Date();
    // Check rides starting in the next 1 hour (60 minutes)
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    // Also check rides starting in 24 hours (for advance reminder)
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    // For testing: also check rides in the past 5 minutes (to catch just-started rides)
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    // Find upcoming rides (not completed, not cancelled)
    // Include rides from 5 minutes ago to 24 hours from now (for testing flexibility)
    const upcomingRides: any[] = await CarpoolRide.find({
      status: { $in: ['open', 'full'] },
      dateTime: { 
        $gte: fiveMinutesAgo,  // Include recent rides for testing
        $lte: oneDayFromNow 
      }
    }).populate('ownerId', 'name email notificationTokens').lean();

    const notificationsSent: Array<{ userId: string; rideId: string; type: string }> = [];
    const errors: Array<{ userId: string; error: string }> = [];

    for (const ride of upcomingRides) {
      const rideDate = new Date(ride.dateTime);
      const timeUntilRide = rideDate.getTime() - now.getTime();
      const hoursUntilRide = timeUntilRide / (1000 * 60 * 60);
      const minutesUntilRide = timeUntilRide / (1000 * 60);

      // Determine reminder type
      let reminderType = '';
      let title = '';
      let message = '';

      // For testing: send notification if ride is within 5 minutes (past or future)
      if (Math.abs(minutesUntilRide) <= 5) {
        reminderType = 'now';
        title = '🚗 Ride Reminder (Test)';
        message = `Reminder: "${ride.title || 'Your ride'}" is scheduled for ${rideDate.toLocaleString()}`;
      } else if (hoursUntilRide <= 1 && hoursUntilRide > 0) {
        // 1 hour reminder
        reminderType = '1hour';
        title = '🚗 Your ride starts in 1 hour!';
        message = `Don't forget: "${ride.title || 'Your ride'}" starts at ${rideDate.toLocaleString()}`;
      } else if (hoursUntilRide <= 24 && hoursUntilRide > 23) {
        // 24 hour reminder
        reminderType = '24hour';
        title = '📅 Ride reminder: Tomorrow';
        message = `Reminder: "${ride.title || 'Your ride'}" is scheduled for tomorrow at ${rideDate.toLocaleString()}`;
      } else {
        continue; // Skip if not in reminder window
      }

      // Send notification to ride owner
      if (ride.ownerId && ride.ownerId.notificationTokens) {
        const owner: any = await User.findById(ride.ownerId._id).lean() as any;
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
                tag: `ride-${ride._id}-${reminderType}`,
                requireInteraction: false
              }));
              notificationsSent.push({ userId: owner._id.toString(), rideId: ride._id.toString(), type: reminderType });
            } catch (err: any) {
              console.error(`Failed to send notification to owner ${owner._id}:`, err);
              // Remove invalid subscription
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

      // Send notification to accepted passengers
      const acceptedRequests: any[] = await RideRequest.find({
        rideId: ride._id,
        status: 'accepted'
      }).populate('passengerId', 'name email notificationTokens').lean();

      for (const request of acceptedRequests) {
        if (request.passengerId && request.passengerId.notificationTokens) {
          const passenger: any = await User.findById(request.passengerId._id).lean() as any;
          if (passenger && passenger.notificationTokens) {
            for (const token of passenger.notificationTokens) {
              try {
                const subscription = JSON.parse(token);
                await webpush.sendNotification(subscription, JSON.stringify({
                  title,
                  message: `You're a passenger: "${ride.title || 'Ride'}" ${reminderType === '1hour' ? 'starts in 1 hour' : 'is tomorrow'}`,
                  icon: '/icons/unilink.png',
                  badge: '/icons/unilink.png',
                  data: {
                    url: `/carpools/${ride._id}`,
                    rideId: ride._id.toString()
                  },
                  tag: `ride-${ride._id}-${reminderType}-passenger`,
                  requireInteraction: false
                }));
                notificationsSent.push({ userId: passenger._id.toString(), rideId: ride._id.toString(), type: reminderType });
              } catch (err: any) {
                console.error(`Failed to send notification to passenger ${passenger._id}:`, err);
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
    }

    return NextResponse.json({
      success: true,
      notificationsSent: notificationsSent.length,
      errors: errors.length,
      details: { notificationsSent, errors }
    }, { status: 200 });
  } catch (err: any) {
    console.error('POST /api/push/reminders error:', err);
    return NextResponse.json({
      error: 'Failed to send reminders',
      details: err.message || String(err)
    }, { status: 500 });
  }
}

