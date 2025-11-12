import { NextResponse } from 'next/server';
import { dbConnect } from '@/app/lib/mongoose';
import Event from '@/app/models/Event';
import User from '@/app/models/User';
import Notification from '@/app/models/Notification';
import { getUserFromRequest } from '@/app/lib/auth';
import mongoose from 'mongoose';

// POST - Invite users to an event by email
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
    const body = await request.json();
    const { emails } = body; // Array of email addresses

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid event id' }, { status: 400 });
    }

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: 'Emails array is required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emails.filter((email: string) => !emailRegex.test(email.trim()));
    if (invalidEmails.length > 0) {
      return NextResponse.json({ error: `Invalid email addresses: ${invalidEmails.join(', ')}` }, { status: 400 });
    }

    const event = await Event.findById(id).exec();
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Check if user is the owner
    if (event.ownerId.toString() !== user.id) {
      return NextResponse.json({ error: 'Forbidden: Only event owner can invite users' }, { status: 403 });
    }

    // Find users by email
    const normalizedEmails = emails.map((email: string) => email.trim().toLowerCase());
    const users = await User.find({ email: { $in: normalizedEmails } }).exec();

    const foundUserIds = users.map((u) => u._id.toString());
    const notFoundEmails = normalizedEmails.filter(
      (email: string) => !users.some((u) => u.email.toLowerCase() === email)
    );

    // Create notifications for found users
    const notificationPromises = users.map((invitedUser) =>
      Notification.create({
        userId: invitedUser._id,
        type: 'event_invitation',
        title: 'Event Invitation',
        message: `${user.name || user.email} invited you to the event "${event.name}"`,
        relatedEvent: event._id,
      })
    );

    await Promise.all(notificationPromises);

    return NextResponse.json({
      message: 'Invitations sent',
      invited: foundUserIds.length,
      notFound: notFoundEmails,
      notFoundEmails: notFoundEmails,
    }, { status: 200 });
  } catch (err) {
    console.error('POST /api/events/[id]/invite error:', err);
    return NextResponse.json(
      { error: 'Failed to send invitations', details: (err as any)?.message || String(err) },
      { status: 500 }
    );
  }
}

