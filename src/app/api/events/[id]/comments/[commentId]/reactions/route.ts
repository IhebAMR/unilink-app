import { NextResponse } from 'next/server';
import { dbConnect } from '@/app/lib/mongoose';
import EventComment from '@/app/models/EventComment';
import { getUserFromRequest } from '@/app/lib/auth';
import mongoose from 'mongoose';

// POST - Add or remove a reaction to a comment
export async function POST(
  request: Request,
  { params }: { params: { id: string; commentId: string } }
) {
  await dbConnect();

  const user = getUserFromRequest(request);
  if (!user || !user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, commentId } = params;
    const body = await request.json();
    const { emoji, replyId } = body; // replyId if reacting to a reply

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return NextResponse.json({ error: 'Invalid comment id' }, { status: 400 });
    }

    if (!emoji) {
      return NextResponse.json({ error: 'Emoji is required' }, { status: 400 });
    }

    const comment = await EventComment.findById(commentId).exec();
    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    if (comment.eventId.toString() !== id) {
      return NextResponse.json({ error: 'Comment does not belong to this event' }, { status: 400 });
    }

    const userId = new mongoose.Types.ObjectId(user.id);

    if (replyId) {
      // React to a reply
      const reply = comment.replies.id(replyId);
      if (!reply) {
        return NextResponse.json({ error: 'Reply not found' }, { status: 404 });
      }

      // Check if user already reacted with this emoji
      const existingReaction = reply.reactions.find(
        (r: any) => r.userId.toString() === user.id && r.emoji === emoji
      );

      if (existingReaction) {
        // Remove reaction
        reply.reactions = reply.reactions.filter(
          (r: any) => !(r.userId.toString() === user.id && r.emoji === emoji)
        );
      } else {
        // Add reaction
        reply.reactions.push({ userId, emoji });
      }

      await comment.save();

      // Count reactions
      const reactionCounts: Record<string, number> = {};
      reply.reactions.forEach((r: any) => {
        reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
      });

      return NextResponse.json({ reactions: reactionCounts }, { status: 200 });
    } else {
      // React to main comment
      const existingReaction = comment.reactions.find(
        (r: any) => r.userId.toString() === user.id && r.emoji === emoji
      );

      if (existingReaction) {
        // Remove reaction
        comment.reactions = comment.reactions.filter(
          (r: any) => !(r.userId.toString() === user.id && r.emoji === emoji)
        );
      } else {
        // Add reaction
        comment.reactions.push({ userId, emoji });
      }

      await comment.save();

      // Count reactions
      const reactionCounts: Record<string, number> = {};
      comment.reactions.forEach((r: any) => {
        reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
      });

      return NextResponse.json({ reactions: reactionCounts }, { status: 200 });
    }
  } catch (err) {
    console.error('POST /api/events/[id]/comments/[commentId]/reactions error:', err);
    return NextResponse.json(
      { error: 'Failed to update reaction', details: (err as any)?.message || String(err) },
      { status: 500 }
    );
  }
}

