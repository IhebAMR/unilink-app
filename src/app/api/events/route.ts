import { NextResponse } from 'next/server';
import { dbConnect } from '@/app/lib/mongoose';
import Event from '@/app/models/Event';
import User from '@/app/models/User';
import { getUserFromRequest } from '@/app/lib/auth';

export async function GET(request: Request) {
  await dbConnect();
  try {
    const user = getUserFromRequest(request);
    const currentUserId = user?.id || null;

    const events = await Event.find({})
      .sort({ dateTime: 1 })
      .limit(200)
      .populate('createdBy', 'name email avatarUrl')
      .lean()
      .exec();

    // Add counts and current user's response
    const eventsWithCounts = events.map(ev => {
      const goingCount = ev.responses?.filter((r: any) => r.status === 'going').length || 0;
      const notGoingCount = ev.responses?.filter((r: any) => r.status === 'not going').length || 0;
      const notInterestedCount = ev.responses?.filter((r: any) => r.status === 'not interested').length || 0;
      let myResponse = null;
      if (currentUserId) {
        const found = ev.responses?.find((r: any) => r.userId?.toString() === currentUserId);
        myResponse = found?.status || null;
      }
      return {
        ...ev,
        goingCount,
        notGoingCount,
        notInterestedCount,
        myResponse
      };
    });

    return NextResponse.json({ events: eventsWithCounts, currentUserId }, { status: 200 });
  } catch (err) {
    console.error('GET /api/events error:', err);
    return NextResponse.json({ error: 'Failed to fetch events', details: (err as any)?.message || String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await dbConnect();

  const user = getUserFromRequest(request);
  if (!user || !user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { title, description, dateTime, location } = body;

    if (!title || !dateTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const event = await Event.create({
      title,
      description,
      dateTime: new Date(dateTime),
      location,
      createdBy: user.id
    });

    await event.populate('createdBy', 'name email avatarUrl');

    return NextResponse.json(event, { status: 201 });
  } catch (err) {
    console.error('POST /api/events error:', err);
    return NextResponse.json({ error: 'Failed to create event', details: (err as any)?.message || String(err) }, { status: 500 });
  }
}
