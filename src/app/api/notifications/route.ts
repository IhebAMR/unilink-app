import { NextResponse } from 'next/server';
import { dbConnect } from '@/app/lib/mongoose';
import Notification from '@/app/models/Notification';
import { getUserFromRequest } from '@/app/lib/auth';

// GET - Fetch user's notifications
export async function GET(request: Request) {
  await dbConnect();

  const user = getUserFromRequest(request);
  if (!user || !user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === 'true';

    const query: any = { userId: user.id };
    if (unreadOnly) {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()
      .exec();

    const unreadCount = await Notification.countDocuments({ 
      userId: user.id, 
      read: false 
    });

    return NextResponse.json({ notifications, unreadCount }, { status: 200 });
  } catch (err) {
    console.error('GET /api/notifications error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch notifications', details: (err as any)?.message || String(err) },
      { status: 500 }
    );
  }
}

// PATCH - Mark notifications as read
export async function PATCH(request: Request) {
  await dbConnect();

  const user = getUserFromRequest(request);
  if (!user || !user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { notificationIds, markAllRead } = body;

    if (markAllRead) {
      // Mark all user's notifications as read
      await Notification.updateMany(
        { userId: user.id, read: false },
        { $set: { read: true } }
      );
      return NextResponse.json({ message: 'All notifications marked as read' }, { status: 200 });
    }

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json({ error: 'notificationIds must be an array' }, { status: 400 });
    }

    // Mark specific notifications as read (only if they belong to the user)
    await Notification.updateMany(
      { _id: { $in: notificationIds }, userId: user.id },
      { $set: { read: true } }
    );

    return NextResponse.json({ message: 'Notifications marked as read' }, { status: 200 });
  } catch (err) {
    console.error('PATCH /api/notifications error:', err);
    return NextResponse.json(
      { error: 'Failed to update notifications', details: (err as any)?.message || String(err) },
      { status: 500 }
    );
  }
}

// DELETE - Delete notifications
export async function DELETE(request: Request) {
  await dbConnect();

  const user = getUserFromRequest(request);
  if (!user || !user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');

    if (!notificationId) {
      return NextResponse.json({ error: 'Missing notification id' }, { status: 400 });
    }

    // Delete notification only if it belongs to the user
    const result = await Notification.deleteOne({
      _id: notificationId,
      userId: user.id
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Notification deleted' }, { status: 200 });
  } catch (err) {
    console.error('DELETE /api/notifications error:', err);
    return NextResponse.json(
      { error: 'Failed to delete notification', details: (err as any)?.message || String(err) },
      { status: 500 }
    );
  }
}
