import { NextResponse } from 'next/server';
import { dbConnect } from '@/app/lib/mongoose';
import CarpoolRide from '@/app/models/CarpoolRide';
import RideRequest from '@/app/models/RideRequest';
import User from '@/app/models/User';
import { getUserFromRequest } from '@/app/lib/auth';
import {
  calculateRouteCompatibility,
  calculateTimeCompatibility,
  calculateUserCompatibility,
  calculateOverallMatchScore
} from '@/app/lib/ai-matching';

/**
 * GET /api/ai/recommend-rides
 * AI-powered ride recommendations based on user history and preferences
 * Returns personalized ride suggestions
 */
export async function GET(request: Request) {
  await dbConnect();
  const user = getUserFromRequest(request);
  if (!user || !user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get user's ride history to understand preferences
    const userRequests = await RideRequest.find({
      passengerId: user.id,
      status: { $in: ['accepted', 'completed'] }
    })
      .populate('rideId')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean()
      .exec();

    // Analyze user preferences from history
    const preferences = analyzeUserPreferences(userRequests);

    // Find available rides
    const now = new Date();
    const availableRides = await CarpoolRide.find({
      status: { $in: ['open', 'full'] },
      seatsAvailable: { $gt: 0 },
      dateTime: { $gte: now },
      ownerId: { $ne: user.id } // Exclude user's own rides
    })
      .populate('ownerId', 'name email')
      .sort({ dateTime: 1 })
      .limit(50)
      .lean()
      .exec();

    // Score and rank rides based on preferences
    const recommendations = await Promise.all(
      availableRides.map(async (ride: any) => {
        if (!ride.origin?.location?.coordinates || !ride.destination?.location?.coordinates) {
          return null;
        }

        let score = 0;
        const factors: string[] = [];

        // Time preference matching
        const rideHour = new Date(ride.dateTime).getHours();
        if (preferences.preferredHours.includes(rideHour)) {
          score += 20;
          factors.push('Matches your preferred time');
        }

        // Route similarity (if user has history)
        if (preferences.commonOrigins.length > 0 || preferences.commonDestinations.length > 0) {
          const originMatch = preferences.commonOrigins.some(origin => {
            if (!ride.origin?.location?.coordinates) return false;
            const distance = calculateDistance(
              { lat: origin.lat, lng: origin.lng },
              {
                lat: ride.origin.location.coordinates[1],
                lng: ride.origin.location.coordinates[0]
              }
            );
            return distance < 5; // Within 5km
          });

          const destMatch = preferences.commonDestinations.some(dest => {
            if (!ride.destination?.location?.coordinates) return false;
            const distance = calculateDistance(
              { lat: dest.lat, lng: dest.lng },
              {
                lat: ride.destination.location.coordinates[1],
                lng: ride.destination.location.coordinates[0]
              }
            );
            return distance < 5;
          });

          if (originMatch || destMatch) {
            score += 30;
            factors.push('Similar to your previous routes');
          }
        }

        // Driver rating matching
        try {
          const driver = await User.findById(ride.ownerId._id || ride.ownerId).lean();
          if (driver && driver.reviews && driver.reviews.length > 0) {
            const avgRating = driver.reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / driver.reviews.length;
            if (avgRating >= 4.5) {
              score += 25;
              factors.push('Highly rated driver');
            } else if (avgRating >= 4.0) {
              score += 15;
              factors.push('Well-rated driver');
            }
          }
        } catch (err) {
          console.error('Error checking driver rating:', err);
        }

        // Price preference
        if (preferences.avgPrice > 0) {
          const priceDiff = Math.abs((ride.price || 0) - preferences.avgPrice);
          if (priceDiff < preferences.avgPrice * 0.2) {
            score += 15;
            factors.push('Price matches your budget');
          }
        }

        // Recency bonus (sooner rides get slight boost)
        const daysUntilRide = (new Date(ride.dateTime).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        if (daysUntilRide <= 7) {
          score += 10;
          factors.push('Upcoming ride');
        }

        return {
          ride,
          recommendationScore: Math.min(100, score),
          factors,
          matchReasons: factors
        };
      })
    );

    // Filter and sort recommendations
    const validRecommendations = recommendations
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, 10);

    return NextResponse.json({
      recommendations: validRecommendations,
      preferences: {
        preferredHours: preferences.preferredHours,
        commonRoutes: preferences.commonOrigins.length + preferences.commonDestinations.length
      }
    }, { status: 200 });
  } catch (err) {
    console.error('AI recommend-rides error:', err);
    return NextResponse.json(
      { error: 'Failed to get recommendations', details: (err as any)?.message || String(err) },
      { status: 500 }
    );
  }
}

function analyzeUserPreferences(requests: any[]): {
  preferredHours: number[];
  commonOrigins: Array<{ lat: number; lng: number }>;
  commonDestinations: Array<{ lat: number; lng: number }>;
  avgPrice: number;
} {
  const hours: number[] = [];
  const origins: Array<{ lat: number; lng: number }> = [];
  const destinations: Array<{ lat: number; lng: number }> = [];
  let totalPrice = 0;
  let priceCount = 0;

  requests.forEach((req: any) => {
    const ride = req.rideId;
    if (!ride) return;

    // Extract hour
    const dateTime = new Date(ride.dateTime);
    hours.push(dateTime.getHours());

    // Extract origin
    if (ride.origin?.location?.coordinates) {
      origins.push({
        lat: ride.origin.location.coordinates[1],
        lng: ride.origin.location.coordinates[0]
      });
    }

    // Extract destination
    if (ride.destination?.location?.coordinates) {
      destinations.push({
        lat: ride.destination.location.coordinates[1],
        lng: ride.destination.location.coordinates[0]
      });
    }

    // Extract price
    if (ride.price && ride.price > 0) {
      totalPrice += ride.price;
      priceCount++;
    }
  });

  // Find most common hours (top 3)
  const hourCounts: Record<number, number> = {};
  hours.forEach(h => {
    hourCounts[h] = (hourCounts[h] || 0) + 1;
  });
  const preferredHours = Object.entries(hourCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([h]) => parseInt(h));

  // Find common origins/destinations (within 5km clusters)
  const commonOrigins = clusterLocations(origins, 5);
  const commonDestinations = clusterLocations(destinations, 5);

  return {
    preferredHours: preferredHours.length > 0 ? preferredHours : [8, 12, 17], // Default commute hours
    commonOrigins,
    commonDestinations,
    avgPrice: priceCount > 0 ? totalPrice / priceCount : 0
  };
}

function clusterLocations(
  locations: Array<{ lat: number; lng: number }>,
  maxDistanceKm: number
): Array<{ lat: number; lng: number }> {
  if (locations.length === 0) return [];

  const clusters: Array<{ lat: number; lng: number; count: number }> = [];

  locations.forEach(loc => {
    let foundCluster = false;
    for (const cluster of clusters) {
      const distance = calculateDistance(loc, cluster);
      if (distance < maxDistanceKm) {
        // Update cluster center (weighted average)
        const totalCount = cluster.count + 1;
        cluster.lat = (cluster.lat * cluster.count + loc.lat) / totalCount;
        cluster.lng = (cluster.lng * cluster.count + loc.lng) / totalCount;
        cluster.count = totalCount;
        foundCluster = true;
        break;
      }
    }
    if (!foundCluster) {
      clusters.push({ ...loc, count: 1 });
    }
  });

  // Return top clusters
  return clusters
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map(({ lat, lng }) => ({ lat, lng }));
}

// Helper function (import from ai-matching)
function calculateDistance(
  point1: { lat: number; lng: number },
  point2: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = toRad(point2.lat - point1.lat);
  const dLng = toRad(point2.lng - point1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.lat)) *
      Math.cos(toRad(point2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}




