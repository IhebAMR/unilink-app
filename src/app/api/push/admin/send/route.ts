import { NextResponse } from 'next/server';
import { dbConnect } from '@/app/lib/mongoose';
import User from '@/app/models/User';
import webpush from 'web-push';
import { getUserFromRequest } from '@/app/lib/auth';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@unilink.app';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// Admin endpoint to send custom notifications to all subscribed users
// POST /api/push/admin/send body: { title, message, type? }
export async function POST(request: Request) {
  try {
    await dbConnect();
    const user = getUserFromRequest(request);
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const userDoc = await User.findById(user.id).lean();
    if (!userDoc || userDoc.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { title, message, type = 'now' } = body;

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
    }

    // Get all users with push subscriptions
    const users = await User.find({
      notificationTokens: { $exists: true, $ne: [] }
    }).lean();

    const sent = [];
    const errors = [];

    for (const targetUser of users) {
      if (!targetUser.notificationTokens || targetUser.notificationTokens.length === 0) {
        continue;
      }

      for (const token of targetUser.notificationTokens) {
        try {
          const subscription = JSON.parse(token);
          await webpush.sendNotification(subscription, JSON.stringify({
            title,
            message,
            icon: '/icons/unilink.png',
            badge: '/icons/unilink.png',
            data: {
              url: '/',
              type: 'admin-broadcast'
            },
            tag: `admin-${type}-${Date.now()}`,
            requireInteraction: false
          }));
          if (!sent.includes(targetUser._id.toString())) {
            sent.push(targetUser._id.toString());
          }
        } catch (err: any) {
          console.error(`Failed to send notification to user ${targetUser._id}:`, err);
          
          // Remove invalid subscription
          if (err.statusCode === 410 || err.statusCode === 404) {
            await User.updateOne(
              { _id: targetUser._id },
              { $pull: { notificationTokens: token } }
            );
          }
          
          if (!errors.find(e => e.userId === targetUser._id.toString())) {
            errors.push({ userId: targetUser._id.toString(), error: err.message });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Notification sent to ${sent.length} user(s)`,
      sent: sent.length,
      errors: errors.length,
      details: { sent, errors: errors.length > 0 ? errors : undefined }
    }, { status: 200 });
  } catch (err: any) {
    console.error('POST /api/push/admin/send error:', err);
    return NextResponse.json({
      error: 'Failed to send notifications',
      details: err.message || String(err)
    }, { status: 500 });
  }
}





