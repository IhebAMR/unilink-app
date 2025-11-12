import { NextResponse } from 'next/server';
import { dbConnect } from '@/app/lib/mongoose';
import User from '@/app/models/User';
import CarpoolRide from '@/app/models/CarpoolRide';
import { getUserFromRequest } from '@/app/lib/auth';
import { calculateUserTrustScore } from '@/app/lib/ai-user-trust';

/**
 * GET /api/ai/user-trust-score/:userId
 * Calculate AI-powered trust score for a user
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> | { userId: string } }
) {
  await dbConnect();
  
  const currentUser = getUserFromRequest(request);
  if (!currentUser || !currentUser.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Handle both sync and async params (Next.js 15+ uses Promise)
    const resolvedParams = params instanceof Promise ? await params : params;
    const { userId } = resolvedParams;

    // Get user data
    const user = await User.findById(userId).lean();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user's rides (as owner)
    const rides = await CarpoolRide.find({
      ownerId: userId
    }).lean();

    // Get user's reviews
    const reviews = user.reviews || [];

    // Calculate trust score
    const trustScore = await calculateUserTrustScore(
      userId,
      user,
      rides,
      reviews
    );

    return NextResponse.json(trustScore, { status: 200 });
  } catch (err) {
    console.error('AI user trust score error:', err);
    return NextResponse.json(
      { error: 'Failed to calculate trust score', details: (err as any)?.message || String(err) },
      { status: 500 }
    );
  }
}

