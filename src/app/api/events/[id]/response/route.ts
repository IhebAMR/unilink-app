import { NextResponse } from 'next/server';
import { dbConnect } from '@/app/lib/mongoose';
import Event from '@/app/models/Event';
import { getUserFromRequest } from '@/app/lib/auth';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  await dbConnect();
  const user = getUserFromRequest(request);
  if (!user || !user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { status } = await request.json();
    if (!['going', 'not going', 'not interested'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const event = await Event.findById(params.id).exec();
    if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // remove previous response from this user if any
    event.responses = event.responses.filter((r: any) => r.userId.toString() !== user.id);

    event.responses.push({ userId: user.id, status });
    await event.save();

    await event.populate('createdBy', 'name email avatarUrl');
    return NextResponse.json(event, { status: 200 });
  } catch (err) {
    console.error('POST /api/events/[id]/response error:', err);
    return NextResponse.json({ error: 'Failed to respond', details: (err as any)?.message || String(err) }, { status: 500 });
  }
}
