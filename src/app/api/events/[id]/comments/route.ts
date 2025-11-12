import { NextResponse } from 'next/server';
import { dbConnect } from '@/app/lib/mongoose';
import EventComment from '@/app/models/EventComment';
import Event from '@/app/models/Event';
import { getUserFromRequest } from '@/app/lib/auth';
import mongoose from 'mongoose';

// GET - Fetch all comments for an event
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

    // Verify event exists
    const event = await Event.findById(id).exec();
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Get comments with user details
    const comments = await EventComment.find({ eventId: id })
      .populate('userId', 'name avatarUrl')
      .populate('replies.userId', 'name avatarUrl')
      .sort({ createdAt: 1 })
      .lean()
      .exec();

    // Transform to include user info and reaction counts
    const transformedComments = comments.map((comment: any) => {
      // Count reactions by emoji and track user's reactions
      const reactionCounts: Record<string, number> = {};
      const userReactions: string[] = [];
      comment.reactions?.forEach((reaction: any) => {
        reactionCounts[reaction.emoji] = (reactionCounts[reaction.emoji] || 0) + 1;
        if (currentUserId && reaction.userId?.toString() === currentUserId) {
          userReactions.push(reaction.emoji);
        }
      });

      // Process replies
      const replies = (comment.replies || []).map((reply: any) => {
        const replyReactionCounts: Record<string, number> = {};
        const replyUserReactions: string[] = [];
        reply.reactions?.forEach((reaction: any) => {
          replyReactionCounts[reaction.emoji] = (replyReactionCounts[reaction.emoji] || 0) + 1;
          if (currentUserId && reaction.userId?.toString() === currentUserId) {
            replyUserReactions.push(reaction.emoji);
          }
        });

        return {
          _id: reply._id,
          userId: reply.userId,
          content: reply.content,
          reactions: replyReactionCounts,
          userReactions: replyUserReactions,
          createdAt: reply.createdAt,
        };
      });

      return {
        _id: comment._id,
        userId: comment.userId,
        content: comment.content,
        reactions: reactionCounts,
        userReactions,
        replies,
        createdAt: comment.createdAt,
      };
    });

    return NextResponse.json({ comments: transformedComments, currentUserId }, { status: 200 });
  } catch (err) {
    console.error('GET /api/events/[id]/comments error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch comments', details: (err as any)?.message || String(err) },
      { status: 500 }
    );
  }
}

// POST - Create a new comment
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
    const { content, parentCommentId } = body; // parentCommentId for replies

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid event id' }, { status: 400 });
    }

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 });
    }

    // Verify event exists
    const event = await Event.findById(id).exec();
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (parentCommentId) {
      // Add reply to existing comment
      const parentComment = await EventComment.findById(parentCommentId).exec();
      if (!parentComment) {
        return NextResponse.json({ error: 'Parent comment not found' }, { status: 404 });
      }

      if (parentComment.eventId.toString() !== id) {
        return NextResponse.json({ error: 'Comment does not belong to this event' }, { status: 400 });
      }

      parentComment.replies.push({
        userId: new mongoose.Types.ObjectId(user.id),
        content: content.trim(),
        reactions: [],
      });

      await parentComment.save();

      // Fetch updated comment with populated user
      const updatedComment = await EventComment.findById(parentCommentId)
        .populate('userId', 'name avatarUrl')
        .populate('replies.userId', 'name avatarUrl')
        .lean()
        .exec();

      return NextResponse.json({ comment: updatedComment }, { status: 201 });
    } else {
      // Create new top-level comment
      const comment = await EventComment.create({
        eventId: id,
        userId: user.id,
        content: content.trim(),
        reactions: [],
        replies: [],
      });

      // Fetch with populated user
      const populatedComment = await EventComment.findById(comment._id)
        .populate('userId', 'name avatarUrl')
        .populate('replies.userId', 'name avatarUrl')
        .lean()
        .exec();

      return NextResponse.json({ comment: populatedComment }, { status: 201 });
    }
  } catch (err) {
    console.error('POST /api/events/[id]/comments error:', err);
    return NextResponse.json(
      { error: 'Failed to create comment', details: (err as any)?.message || String(err) },
      { status: 500 }
    );
  }
}

