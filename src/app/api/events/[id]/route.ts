import { NextResponse } from 'next/server';
import { dbConnect } from '@/app/lib/mongoose';
import Event from '@/app/models/Event';
import Notification from '@/app/models/Notification';
import User from '@/app/models/User';
import { getUserFromRequest } from '@/app/lib/auth';
import { validateText } from '@/app/lib/profanityFilter';
import mongoose from 'mongoose';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  await dbConnect();
  try {
    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid event id' }, { status: 400 });
    }

    // Get current user if logged in
    const user = getUserFromRequest(request);
    const currentUserId = user?.id || null;

    const event = await Event.findById(id)
      .populate('ownerId', 'name avatarUrl')
      .lean()
      .exec();

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Transform to include arrays and ensure cancellationReason is included
    const transformedEvent = {
      ...event,
      attending: (event as any).attending || [],
      notGoing: (event as any).notGoing || [],
      cancellationReason: (event as any).cancellationReason || null,
      status: (event as any).status || 'upcoming',
    };

    return NextResponse.json({ event: transformedEvent, currentUserId }, { status: 200 });
  } catch (err) {
    console.error('GET /api/events/[id] error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch event', details: (err as any)?.message || String(err) },
      { status: 500 }
    );
  }
}

// PATCH - Update event details
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
    const body = await request.json();
    const { name, description, date, time, duration, location, image } = body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid event id' }, { status: 400 });
    }

    const event = await Event.findById(id).exec();
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Check if user is the owner
    if (event.ownerId.toString() !== user.id) {
      return NextResponse.json({ error: 'Forbidden: Only event owner can update event' }, { status: 403 });
    }

    // Check for profanity in fields being updated
    if (name !== undefined) {
      const nameValidation = validateText(name);
      if (nameValidation) {
        return NextResponse.json({ 
          error: 'Inappropriate language detected',
          message: nameValidation,
          profanityDetected: true
        }, { status: 400 });
      }
      event.name = name.trim();
    }
    
    if (description !== undefined) {
      if (description && description.trim()) {
        const descValidation = validateText(description);
        if (descValidation) {
          return NextResponse.json({ 
            error: 'Inappropriate language detected',
            message: descValidation,
            profanityDetected: true
          }, { status: 400 });
        }
      }
      event.description = description?.trim() || '';
    }
    
    if (location !== undefined) {
      const locationValidation = validateText(location);
      if (locationValidation) {
        return NextResponse.json({ 
          error: 'Inappropriate language detected',
          message: locationValidation,
          profanityDetected: true
        }, { status: 400 });
      }
      event.location = location.trim();
    }
    
    if (date !== undefined) {
      const eventDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (eventDate < today) {
        return NextResponse.json({ error: 'Event date cannot be in the past' }, { status: 400 });
      }
      event.date = eventDate;
    }
    if (time !== undefined) event.time = time.trim();
    if (duration !== undefined) event.duration = duration.trim();
    if (image !== undefined) event.image = image?.trim() || '';

    await event.save();

    const updatedEvent = await Event.findById(id)
      .populate('ownerId', 'name avatarUrl')
      .lean()
      .exec();

    return NextResponse.json({ event: updatedEvent }, { status: 200 });
  } catch (err) {
    console.error('PATCH /api/events/[id] error:', err);
    return NextResponse.json(
      { error: 'Failed to update event', details: (err as any)?.message || String(err) },
      { status: 500 }
    );
  }
}

// DELETE - Cancel event
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
    const body = await request.json();
    const { cancellationReason } = body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid event id' }, { status: 400 });
    }

    if (!cancellationReason || !cancellationReason.trim()) {
      return NextResponse.json({ error: 'Cancellation reason is required' }, { status: 400 });
    }

    const event = await Event.findById(id).exec();
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Check if user is the owner
    if (event.ownerId.toString() !== user.id) {
      return NextResponse.json({ error: 'Forbidden: Only event owner can cancel event' }, { status: 403 });
    }

    // Update event status to cancelled using findByIdAndUpdate
    // This ensures both fields are updated atomically
    const updatedEvent = await Event.findByIdAndUpdate(
      id,
      {
        status: 'cancelled',
        cancellationReason: cancellationReason.trim(),
      },
      {
        new: true, // Return the updated document
        runValidators: true, // Run validators
      }
    )
      .populate('ownerId', 'name avatarUrl')
      .lean()
      .exec();

    if (!updatedEvent) {
      return NextResponse.json({ error: 'Event not found after cancellation' }, { status: 404 });
    }

    // Get event owner name for notification
    const owner = await User.findById(event.ownerId).select('name email').lean().exec();
    const ownerName = (owner as any)?.name || (owner as any)?.email || 'Event organizer';

    // Get all users who are attending the event
    const attendingUserIds = (updatedEvent as any).attending || [];
    
    // Create notifications for all attending users
    if (attendingUserIds.length > 0) {
      const notificationPromises = attendingUserIds.map((userId: any) => {
        // userId can be ObjectId or string - Mongoose will handle conversion
        return Notification.create({
          userId: userId,
          type: 'event_cancelled',
          title: 'Event Cancelled',
          message: `The event "${event.name}" has been cancelled by ${ownerName}.${cancellationReason.trim() ? ` Reason: ${cancellationReason.trim()}` : ''}`,
          relatedEvent: event._id,
        });
      });

      await Promise.all(notificationPromises);
    }

    // Log to verify the cancellation reason was saved
    console.log('Updated event cancellationReason:', (updatedEvent as any).cancellationReason);
    console.log('Updated event status:', (updatedEvent as any).status);
    console.log(`Sent cancellation notifications to ${attendingUserIds.length} attendees`);

    const transformedEvent = {
      ...updatedEvent,
      attending: (updatedEvent as any).attending || [],
      notGoing: (updatedEvent as any).notGoing || [],
      cancellationReason: (updatedEvent as any).cancellationReason || null,
      status: (updatedEvent as any).status || 'cancelled',
    };

    console.log('Transformed event cancellationReason:', transformedEvent.cancellationReason);

    return NextResponse.json({ message: 'Event cancelled successfully', event: transformedEvent }, { status: 200 });
  } catch (err) {
    console.error('DELETE /api/events/[id] error:', err);
    return NextResponse.json(
      { error: 'Failed to cancel event', details: (err as any)?.message || String(err) },
      { status: 500 }
    );
  }
}

