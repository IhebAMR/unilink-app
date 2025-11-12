import { NextResponse } from 'next/server';
import { dbConnect } from '@/app/lib/mongoose';
import CarpoolRide from '@/app/models/CarpoolRide';
import RideDemand from '@/app/models/RideDemand';
import User from '@/app/models/User';
import { getUserFromRequest } from '@/app/lib/auth';
import {
  calculateRouteCompatibility,
  calculateTimeCompatibility,
  calculateUserCompatibility,
  calculateOverallMatchScore,
  calculatePriceCompatibility
} from '@/app/lib/ai-matching';

/**
 * POST /api/ai/match-rides
 * AI-powered ride matching for passengers
 * Body: { origin, destination, dateTime, maxPrice?, seatsNeeded? }
 */
export async function POST(request: Request) {
  await dbConnect();
  const user = getUserFromRequest(request);
  if (!user || !user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { origin, destination, dateTime, maxPrice, seatsNeeded = 1 } = body;

    if (!origin?.location?.coordinates || !destination?.location?.coordinates || !dateTime) {
      return NextResponse.json(
        { error: 'Missing required fields: origin, destination, dateTime' },
        { status: 400 }
      );
    }

    const userOrigin = {
      lat: origin.location.coordinates[1],
      lng: origin.location.coordinates[0]
    };
    const userDestination = {
      lat: destination.location.coordinates[1],
      lng: destination.location.coordinates[0]
    };
    const userDateTime = new Date(dateTime);

    // Find available rides
    const availableRides = await CarpoolRide.find({
      status: { $in: ['open', 'full'] },
      seatsAvailable: { $gte: seatsNeeded },
      dateTime: {
        $gte: new Date(userDateTime.getTime() - 2 * 60 * 60 * 1000), // 2 hours before
        $lte: new Date(userDateTime.getTime() + 2 * 60 * 60 * 1000) // 2 hours after
      }
    })
      .populate('ownerId', 'name email')
      .lean()
      .exec();

    // Calculate match scores for each ride
    const matches = await Promise.all(
      availableRides.map(async (ride: any) => {
        if (!ride.origin?.location?.coordinates || !ride.destination?.location?.coordinates) {
          return null;
        }

        const rideOrigin = {
          lat: ride.origin.location.coordinates[1],
          lng: ride.origin.location.coordinates[0]
        };
        const rideDestination = {
          lat: ride.destination.location.coordinates[1],
          lng: ride.destination.location.coordinates[0]
        };
        const rideRoute = ride.route?.coordinates || null;

        // Calculate route compatibility
        const routeMatch = calculateRouteCompatibility(
          rideOrigin,
          rideDestination,
          rideRoute,
          userOrigin,
          userDestination
        );

        // Calculate time compatibility
        const timeMatch = calculateTimeCompatibility(
          new Date(ride.dateTime),
          userDateTime
        );

        // Calculate user compatibility (ratings)
        let userMatch = { score: 50, driverRating: 0, passengerRating: 0, factors: [] };
        try {
          const driver = await User.findById(ride.ownerId._id || ride.ownerId).lean();
          const passenger = await User.findById(user.id).lean();
          
          if (driver && passenger) {
            const driverReviews = driver.reviews || [];
            const passengerReviews = passenger.reviews || [];
            userMatch = await calculateUserCompatibility(
              ride.ownerId._id || ride.ownerId,
              user.id,
              driverReviews,
              passengerReviews
            );
          }
        } catch (err) {
          console.error('Error calculating user compatibility:', err);
        }

        // Calculate price compatibility
        const priceScore = calculatePriceCompatibility(
          ride.price || 0,
          maxPrice || null
        );

        // Calculate overall match score
        const overall = calculateOverallMatchScore(
          routeMatch.score,
          timeMatch.score,
          userMatch.score,
          priceScore
        );

        return {
          ride,
          matchScore: overall.totalScore,
          breakdown: overall.breakdown,
          routeMatch,
          timeMatch,
          userMatch,
          priceScore,
          recommendation: getRecommendation(overall.totalScore, routeMatch.matchType)
        };
      })
    );

    // Filter out null matches and sort by match score
    const validMatches = matches
      .filter((m): m is NonNullable<typeof m> => m !== null)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 10); // Top 10 matches

    return NextResponse.json({
      matches: validMatches,
      userRequest: { origin: userOrigin, destination: userDestination, dateTime: userDateTime }
    }, { status: 200 });
  } catch (err) {
    console.error('AI match-rides error:', err);
    return NextResponse.json(
      { error: 'Failed to find matches', details: (err as any)?.message || String(err) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/match-rides?demandId=...
 * Get AI recommendations for a specific ride demand
 */
export async function GET(request: Request) {
  await dbConnect();
  const user = getUserFromRequest(request);
  if (!user || !user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const demandId = searchParams.get('demandId');

    if (!demandId) {
      return NextResponse.json({ error: 'Missing demandId parameter' }, { status: 400 });
    }

    const demand = await RideDemand.findById(demandId).lean();
    if (!demand) {
      return NextResponse.json({ error: 'Ride demand not found' }, { status: 404 });
    }

    // Check if user owns the demand
    if (demand.passengerId.toString() !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!demand.origin?.location?.coordinates || !demand.destination?.location?.coordinates) {
      return NextResponse.json({ error: 'Invalid demand data' }, { status: 400 });
    }

    // Use POST logic with demand data
    const body = {
      origin: demand.origin,
      destination: demand.destination,
      dateTime: demand.dateTime,
      maxPrice: demand.maxPrice,
      seatsNeeded: demand.seatsNeeded
    };

    // Create a new request object for POST handler
    const postRequest = new Request(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify(body)
    });

    return POST(postRequest);
  } catch (err) {
    console.error('AI match-rides GET error:', err);
    return NextResponse.json(
      { error: 'Failed to find matches', details: (err as any)?.message || String(err) },
      { status: 500 }
    );
  }
}

function getRecommendation(score: number, matchType: string): string {
  if (score >= 90) {
    return 'Perfect match! Highly recommended.';
  } else if (score >= 75) {
    return 'Great match! Strong recommendation.';
  } else if (score >= 60) {
    return 'Good match. Worth considering.';
  } else if (score >= 45) {
    return 'Moderate match. Some deviation expected.';
  } else {
    return 'Low match. Significant route or time differences.';
  }
}




