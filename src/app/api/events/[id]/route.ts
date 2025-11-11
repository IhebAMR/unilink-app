import { NextResponse } from 'next/server';
import { dbConnect } from '@/app/lib/mongoose';
import Event from '@/app/models/Event';
import { getUserFromRequest } from '@/app/lib/auth';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  await dbConnect();
  try {
    const event = await Event.findById(params.id).populate('createdBy', 'name email avatarUrl').lean().exec();
    if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(event, { status: 200 });
  } catch (err) {
    console.error('GET /api/events/[id] error:', err);
    return NextResponse.json({ error: 'Failed to fetch event', details: (err as any)?.message || String(err) }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  await dbConnect();
  const user = getUserFromRequest(request);
  if (!user || !user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const event = await Event.findById(params.id).exec();
    if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (event.createdBy.toString() !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { title, description, dateTime, location } = body;
    if (title !== undefined) event.title = title;
    if (description !== undefined) event.description = description;
    if (dateTime !== undefined) event.dateTime = new Date(dateTime);
    if (location !== undefined) event.location = location;

    await event.save();
    await event.populate('createdBy', 'name email avatarUrl');
    return NextResponse.json(event, { status: 200 });
  } catch (err) {
    console.error('PUT /api/events/[id] error:', err);
    return NextResponse.json({ error: 'Failed to update event', details: (err as any)?.message || String(err) }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  await dbConnect();
  const user = getUserFromRequest(request);
  if (!user || !user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const event = await Event.findById(params.id).exec();
    if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (event.createdBy.toString() !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // mark as canceled rather than deleting
    event.status = 'canceled';
    await event.save();
    return NextResponse.json({ message: 'Event canceled' }, { status: 200 });
  } catch (err) {
    console.error('DELETE /api/events/[id] error:', err);
    return NextResponse.json({ error: 'Failed to cancel event', details: (err as any)?.message || String(err) }, { status: 500 });
  }
}
