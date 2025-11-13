import { NextResponse } from 'next/server';
import { dbConnect } from '@/app/lib/mongoose';
import User from '@/app/models/User';
import { getUserFromRequest } from '@/app/lib/auth';
// Dynamic import Notification to avoid stale model caching
const getNotificationModel = async () => {
  const { default: Notification } = await import('@/app/models/Notification');
  return Notification;
};

/**
 * GET /api/profile/reviews?userId=...  => list reviews + average
 * POST /api/profile/reviews  body: { userId, rating, comment } => add or update review by current user
 */
export async function GET(request: Request) {
  try {
    await dbConnect();
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const relatedRide = url.searchParams.get('relatedRide') || url.searchParams.get('rideId');
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    const user: any = await User.findById(userId).populate('reviews.authorId', 'name email avatarUrl').lean();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    let allReviews: any[] = (user.reviews || []);
    if (relatedRide) {
      allReviews = allReviews.filter((r: any) => r.relatedRide && String(r.relatedRide) === String(relatedRide));
    }

    const reviews = allReviews.map((r: any) => ({
      _id: r._id,
      author: r.authorId ? { _id: r.authorId._id, name: r.authorId.name, email: r.authorId.email, avatarUrl: r.authorId.avatarUrl } : null,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt
    }));

  const avg = reviews.length ? (reviews.reduce((s: number, x: any) => s + (x.rating || 0), 0) / reviews.length) : 0;

    return NextResponse.json({ reviews, averageRating: Number(avg.toFixed(2)), count: reviews.length });
  } catch (err: any) {
    console.error('GET /api/profile/reviews error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch reviews' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const currentUser = getUserFromRequest(request);
    if (!currentUser || !currentUser.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { userId, rating, comment } = body;
    const relatedRide = body.relatedRide || body.rideId || null;
    if (!userId || !rating) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    if (userId === currentUser.id) return NextResponse.json({ error: 'Cannot review yourself' }, { status: 400 });

    // If a relatedRide is provided, validate the ride and participation
    if (!relatedRide) {
      return NextResponse.json({ error: 'Missing relatedRide (ride id) for this review' }, { status: 400 });
    }

    // Ensure the ride exists and is completed
    const CarpoolRide = (await import('@/app/models/CarpoolRide')).default;
    const ride = await CarpoolRide.findById(relatedRide).lean();
    if (!ride) return NextResponse.json({ error: 'Related ride not found' }, { status: 404 });
    // Only allow reviews for completed rides
    if (ride.status !== 'completed') return NextResponse.json({ error: 'Can only review after the trip is completed' }, { status: 400 });

    // Ensure both reviewer and target were participants (or owner)
    const reviewerId = currentUser.id;
    const targetId = userId;
    const reviewerWasOnRide = String(ride.ownerId) === String(reviewerId) || (Array.isArray(ride.participants) && ride.participants.map(String).includes(String(reviewerId)));
    const targetWasOnRide = String(ride.ownerId) === String(targetId) || (Array.isArray(ride.participants) && ride.participants.map(String).includes(String(targetId)));
    if (!reviewerWasOnRide || !targetWasOnRide) {
      return NextResponse.json({ error: 'Both reviewer and reviewed user must have participated in the ride' }, { status: 400 });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) return NextResponse.json({ error: 'Target user not found' }, { status: 404 });

    // Prevent multiple reviews for the same ride by same user
    const existingForRide: any = (targetUser.reviews || []).find((r: any) => String(r.authorId) === String(currentUser.id) && r.relatedRide && String(r.relatedRide) === String(relatedRide));
    if (existingForRide) {
      return NextResponse.json({ error: 'You have already reviewed this trip' }, { status: 400 });
    }

    // Add the new review targeted at the specific ride
    targetUser.reviews = targetUser.reviews || [];
    targetUser.reviews.push({ authorId: currentUser.id, rating: Number(rating), comment, relatedRide });

    await targetUser.save();

    // Create a notification to inform the reviewed user
    try {
      const NotificationModel = await getNotificationModel();
      const createdNotif = await NotificationModel.create({
        userId: userId,
        type: 'review',
        title: 'New Review',
        message: `${currentUser.email || 'Someone'} left a review for you.`,
        relatedRide: relatedRide
      });
      console.log('Review notification created:', { notifId: createdNotif._id?.toString(), userId: createdNotif.userId?.toString(), type: createdNotif.type });
    } catch (nerr) {
      console.error('Failed to create review notification:', nerr);
    }

    // Return fresh aggregated data filtered by relatedRide if provided
    const populated: any = await User.findById(userId).populate('reviews.authorId', 'name email avatarUrl').lean();
    let allReviews = (populated?.reviews || []);
    
    // Filter by relatedRide if provided
    if (relatedRide) {
      allReviews = allReviews.filter((r: any) => r.relatedRide && String(r.relatedRide) === String(relatedRide));
    }
    
    const reviews = allReviews.map((r: any) => ({
      _id: r._id,
      author: r.authorId ? { _id: r.authorId._id, name: r.authorId.name, email: r.authorId.email, avatarUrl: r.authorId.avatarUrl } : null,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      relatedRide: r.relatedRide
    }));

    const avg = reviews.length ? (reviews.reduce((s: number, x: any) => s + (x.rating || 0), 0) / reviews.length) : 0;

    return NextResponse.json({ reviews, averageRating: Number(avg.toFixed(2)), count: reviews.length });
  } catch (err: any) {
    console.error('POST /api/profile/reviews error:', err);
    return NextResponse.json({ error: err.message || 'Failed to submit review' }, { status: 500 });
  }
}
