/**
 * AI-based matching utilities for carpooling
 * Provides route matching, compatibility scoring, and ride recommendations
 */

// Calculate distance between two points using Haversine formula (in kilometers)
export function calculateDistance(
  point1: { lat: number; lng: number },
  point2: { lat: number; lng: number }
): number {
  const R = 6371; // Earth's radius in kilometers
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

// Calculate the closest point on a route to a given point
export function findClosestPointOnRoute(
  route: number[][], // [[lng, lat], ...]
  point: { lat: number; lng: number }
): { point: [number, number]; distance: number; index: number } {
  let minDistance = Infinity;
  let closestPoint: [number, number] = route[0];
  let closestIndex = 0;

  for (let i = 0; i < route.length; i++) {
    const [lng, lat] = route[i];
    const distance = calculateDistance({ lat, lng }, point);
    if (distance < minDistance) {
      minDistance = distance;
      closestPoint = [lng, lat];
      closestIndex = i;
    }
  }

  return { point: closestPoint, distance: minDistance, index: closestIndex };
}

// Calculate route compatibility score (0-100)
export function calculateRouteCompatibility(
  rideOrigin: { lat: number; lng: number },
  rideDestination: { lat: number; lng: number },
  rideRoute: number[][] | null,
  userOrigin: { lat: number; lng: number },
  userDestination: { lat: number; lng: number },
  maxDeviationKm: number = 5 // Maximum acceptable deviation in km
): {
  score: number;
  originDeviation: number;
  destinationDeviation: number;
  routeDeviation: number;
  matchType: 'exact' | 'on-route' | 'nearby';
} {
  // Calculate origin and destination distances
  const originDistance = calculateDistance(rideOrigin, userOrigin);
  const destinationDistance = calculateDistance(rideDestination, userDestination);

  // If route is available, check if user's points are on or near the route
  let routeDeviation = Infinity;
  if (rideRoute && rideRoute.length > 0) {
    const originOnRoute = findClosestPointOnRoute(rideRoute, userOrigin);
    const destOnRoute = findClosestPointOnRoute(rideRoute, userDestination);
    routeDeviation = Math.max(originOnRoute.distance, destOnRoute.distance);
  }

  // Determine match type
  let matchType: 'exact' | 'on-route' | 'nearby' = 'nearby';
  if (originDistance < 0.5 && destinationDistance < 0.5) {
    matchType = 'exact';
  } else if (routeDeviation < maxDeviationKm) {
    matchType = 'on-route';
  }

  // Calculate compatibility score
  // Score decreases as deviation increases
  const originScore = Math.max(0, 100 - (originDistance / maxDeviationKm) * 50);
  const destScore = Math.max(0, 100 - (destinationDistance / maxDeviationKm) * 50);
  const routeScore = routeDeviation < Infinity 
    ? Math.max(0, 100 - (routeDeviation / maxDeviationKm) * 50)
    : 50;

  // Weighted average: route matching is most important if available
  let score: number;
  if (routeDeviation < Infinity) {
    score = (routeScore * 0.5) + (originScore * 0.25) + (destScore * 0.25);
  } else {
    score = (originScore * 0.5) + (destScore * 0.5);
  }

  return {
    score: Math.round(score),
    originDeviation: Math.round(originDistance * 10) / 10,
    destinationDeviation: Math.round(destinationDistance * 10) / 10,
    routeDeviation: routeDeviation < Infinity ? Math.round(routeDeviation * 10) / 10 : Infinity,
    matchType
  };
}

// Calculate time compatibility score (0-100)
export function calculateTimeCompatibility(
  rideDateTime: Date,
  userDateTime: Date,
  maxTimeDifferenceHours: number = 2
): {
  score: number;
  timeDifferenceHours: number;
} {
  const timeDiff = Math.abs(rideDateTime.getTime() - userDateTime.getTime());
  const hoursDiff = timeDiff / (1000 * 60 * 60);

  // Score decreases as time difference increases
  const score = Math.max(0, 100 - (hoursDiff / maxTimeDifferenceHours) * 100);

  return {
    score: Math.round(score),
    timeDifferenceHours: Math.round(hoursDiff * 10) / 10
  };
}

// Calculate user compatibility score based on ratings and history
export async function calculateUserCompatibility(
  driverId: string,
  passengerId: string,
  driverRatings: any[],
  passengerRatings: any[]
): Promise<{
  score: number;
  driverRating: number;
  passengerRating: number;
  factors: string[];
}> {
  // Calculate average ratings
  const driverAvg = driverRatings.length > 0
    ? driverRatings.reduce((sum, r) => sum + (r.rating || 0), 0) / driverRatings.length
    : 3.0; // Default neutral rating

  const passengerAvg = passengerRatings.length > 0
    ? passengerRatings.reduce((sum, r) => sum + (r.rating || 0), 0) / passengerRatings.length
    : 3.0;

  // Base compatibility score from ratings
  let score = ((driverAvg + passengerAvg) / 2) * 20; // Convert 0-5 to 0-100

  const factors: string[] = [];

  // Bonus for high ratings
  if (driverAvg >= 4.5) {
    score += 10;
    factors.push('Highly rated driver');
  }
  if (passengerAvg >= 4.5) {
    score += 10;
    factors.push('Highly rated passenger');
  }

  // Penalty for low ratings
  if (driverAvg < 3.0) {
    score -= 15;
    factors.push('Driver has low ratings');
  }
  if (passengerAvg < 3.0) {
    score -= 15;
    factors.push('Passenger has low ratings');
  }

  // Bonus for having many reviews (reliability indicator)
  if (driverRatings.length >= 5) {
    score += 5;
    factors.push('Experienced driver');
  }
  if (passengerRatings.length >= 5) {
    score += 5;
    factors.push('Experienced passenger');
  }

  score = Math.max(0, Math.min(100, score)); // Clamp between 0-100

  return {
    score: Math.round(score),
    driverRating: Math.round(driverAvg * 10) / 10,
    passengerRating: Math.round(passengerAvg * 10) / 10,
    factors
  };
}

// Calculate overall match score combining all factors
export function calculateOverallMatchScore(
  routeScore: number,
  timeScore: number,
  userScore: number,
  priceScore: number = 50 // Default if price not a factor
): {
  totalScore: number;
  breakdown: {
    route: number;
    time: number;
    user: number;
    price: number;
  };
} {
  // Weighted scoring: route (40%), time (20%), user (30%), price (10%)
  const totalScore = 
    routeScore * 0.4 +
    timeScore * 0.2 +
    userScore * 0.3 +
    priceScore * 0.1;

  return {
    totalScore: Math.round(totalScore),
    breakdown: {
      route: routeScore,
      time: timeScore,
      user: userScore,
      price: priceScore
    }
  };
}

// Calculate price compatibility
export function calculatePriceCompatibility(
  ridePrice: number,
  maxPrice: number | null
): number {
  if (!maxPrice || maxPrice === 0) return 50; // Neutral if no price preference
  if (ridePrice <= maxPrice) {
    // Bonus if price is significantly lower
    const savings = (maxPrice - ridePrice) / maxPrice;
    return Math.min(100, 50 + savings * 50);
  } else {
    // Penalty if price exceeds max
    const excess = (ridePrice - maxPrice) / maxPrice;
    return Math.max(0, 50 - excess * 50);
  }
}




