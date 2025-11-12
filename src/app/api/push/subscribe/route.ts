import { NextResponse } from 'next/server';
import { dbConnect } from '@/app/lib/mongoose';
import User from '@/app/models/User';
import { getUserFromRequest } from '@/app/lib/auth';
import webpush from 'web-push';

// VAPID keys should be in environment variables
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@unilink.app';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const user = getUserFromRequest(request);
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { subscription } = body;

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    // Store subscription as a string (JSON)
    const subscriptionString = JSON.stringify(subscription);

    const userDoc = await User.findById(user.id);
    if (!userDoc) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Add subscription if not already present
    if (!userDoc.notificationTokens || !Array.isArray(userDoc.notificationTokens)) {
      userDoc.notificationTokens = [];
    }

    // Check if this subscription already exists
    const exists = userDoc.notificationTokens.includes(subscriptionString);
    if (!exists) {
      userDoc.notificationTokens.push(subscriptionString);
      await userDoc.save();
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Push subscription saved',
      publicKey: VAPID_PUBLIC_KEY 
    }, { status: 200 });
  } catch (err: any) {
    console.error('POST /api/push/subscribe error:', err);
    return NextResponse.json({ 
      error: 'Failed to save subscription', 
      details: err.message || String(err) 
    }, { status: 500 });
  }
}

export async function GET() {
  // Return public VAPID key for client-side subscription
  return NextResponse.json({ 
    publicKey: VAPID_PUBLIC_KEY || null 
  }, { status: 200 });
}





