import { NextResponse } from 'next/server';
import { dbConnect } from '@/app/lib/mongoose';
import Event from '@/app/models/Event';
import { getUserFromRequest } from '@/app/lib/auth';
import mongoose from 'mongoose';

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
    const { action } = body; // 'attending' or 'notGoing'

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid event id' }, { status: 400 });
    }

    if (!action || !['attending', 'notGoing'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be "attending" or "notGoing"' }, { status: 400 });
    }

    const event = await Event.findById(id).exec();
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const userId = new mongoose.Types.ObjectId(user.id);
    const isAttending = event.attending.some((id: any) => id.toString() === user.id);
    const isNotGoing = event.notGoing.some((id: any) => id.toString() === user.id);

    if (action === 'attending') {
      if (isAttending) {
        // Remove from attending
        event.attending = event.attending.filter((id: any) => id.toString() !== user.id);
      } else {
        // Add to attending, remove from notGoing if present
        if (!isAttending) {
          event.attending.push(userId);
        }
        event.notGoing = event.notGoing.filter((id: any) => id.toString() !== user.id);
      }
    } else if (action === 'notGoing') {
      if (isNotGoing) {
        // Remove from notGoing
        event.notGoing = event.notGoing.filter((id: any) => id.toString() !== user.id);
      } else {
        // Add to notGoing, remove from attending if present
        if (!isNotGoing) {
          event.notGoing.push(userId);
        }
        event.attending = event.attending.filter((id: any) => id.toString() !== user.id);
      }
    }

    await event.save();

    // Return arrays as strings for JSON serialization
    return NextResponse.json({
      message: 'Attendance updated',
      event: {
        _id: event._id,
        attending: event.attending.map((id: any) => id.toString()),
        notGoing: event.notGoing.map((id: any) => id.toString()),
        attendingCount: event.attending.length,
        notGoingCount: event.notGoing.length
      }
    }, { status: 200 });
  } catch (err) {
    console.error('POST /api/events/[id]/attendance error:', err);
    return NextResponse.json(
      { error: 'Failed to update attendance', details: (err as any)?.message || String(err) },
      { status: 500 }
    );
  }
}

