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

// Test endpoint to send a push notification to the current user
// GET /api/push/test - sends a test notification
export async function GET(request: Request) {
  try {
    await dbConnect();
    const user = getUserFromRequest(request);
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userDoc: any = await User.findById(user.id).lean() as any;
    if (!userDoc || !userDoc.notificationTokens || userDoc.notificationTokens.length === 0) {
      return NextResponse.json({ 
        error: 'No push subscription found. Please allow notifications in your browser first.',
        subscribed: false
      }, { status: 400 });
    }

  const results: string[] = [];
  const errors: string[] = [];

    // Send test notification to all user's subscriptions
    for (const token of userDoc.notificationTokens) {
      try {
        const subscription = JSON.parse(token);
        await webpush.sendNotification(subscription, JSON.stringify({
          title: '🧪 Test Notification',
          message: 'This is a test push notification from Unilink! If you see this, push notifications are working correctly.',
          icon: '/icons/unilink.png',
          badge: '/icons/unilink.png',
          data: {
            url: '/',
            test: true
          },
          tag: 'test-notification',
          requireInteraction: false
        }));
        results.push('Notification sent successfully');
      } catch (err: any) {
        console.error('Failed to send test notification:', err);
        errors.push(err.message || 'Unknown error');
        
        // Remove invalid subscription
        if (err.statusCode === 410 || err.statusCode === 404) {
          await User.updateOne(
            { _id: user.id },
            { $pull: { notificationTokens: token } }
          );
        }
      }
    }

    if (results.length > 0) {
      return NextResponse.json({
        success: true,
        message: `Test notification sent to ${results.length} device(s)`,
        results,
        errors: errors.length > 0 ? errors : undefined
      }, { status: 200 });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to send test notification',
        errors
      }, { status: 500 });
    }
  } catch (err: any) {
    console.error('GET /api/push/test error:', err);
    return NextResponse.json({
      error: 'Failed to send test notification',
      details: err.message || String(err)
    }, { status: 500 });
  }
}





