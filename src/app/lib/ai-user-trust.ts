/**
 * AI-powered user trust and safety scoring
 * Calculates trust scores based on multiple factors
 */

export interface TrustScoreResult {
  score: number; // 0-100
  breakdown: {
    reviews: number;
    activity: number;
    accountAge: number;
    verification: number;
    behavior: number;
  };
  level: 'excellent' | 'good' | 'fair' | 'poor' | 'new';
  factors: string[];
  recommendations: string[];
}

/**
 * Calculate comprehensive trust score for a user
 */
export async function calculateUserTrustScore(
  userId: string,
  user: any,
  rides: any[],
  reviews: any[]
): Promise<TrustScoreResult> {
  const breakdown = {
    reviews: 0,
    activity: 0,
    accountAge: 0,
    verification: 0,
    behavior: 0
  };
  const factors: string[] = [];
  const recommendations: string[] = [];

  // 1. Review Ratings (40% weight, max 40 points)
  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
    : 3.0; // Default neutral rating

  breakdown.reviews = Math.round((avgRating / 5) * 40);
  
  if (avgRating >= 4.5) {
    factors.push('Highly rated by other users');
  } else if (avgRating >= 4.0) {
    factors.push('Well-rated user');
  } else if (avgRating < 3.0) {
    factors.push('Low ratings - may need attention');
    recommendations.push('Consider reaching out to improve experience');
  }

  if (reviews.length === 0) {
    factors.push('No reviews yet');
    recommendations.push('Complete rides to build your reputation');
  } else if (reviews.length >= 10) {
    factors.push('Established reputation');
  }

  // 2. Activity History (20% weight, max 20 points)
  const completedRides = rides.filter(r => r.status === 'completed').length;
  const totalRides = rides.length;
  
  breakdown.activity = Math.min(20, completedRides * 2); // 2 points per completed ride, max 20
  
  if (completedRides >= 10) {
    factors.push('Experienced user with many completed rides');
  } else if (completedRides >= 5) {
    factors.push('Active user');
  } else if (completedRides === 0 && totalRides > 0) {
    factors.push('No completed rides yet');
    recommendations.push('Complete your first ride to build trust');
  }

  // 3. Account Age (10% weight, max 10 points)
  const accountAgeDays = user.createdAt
    ? (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    : 0;
  
  breakdown.accountAge = Math.min(10, Math.floor(accountAgeDays / 30)); // 1 point per month, max 10
  
  if (accountAgeDays >= 180) {
    factors.push('Long-term member');
  } else if (accountAgeDays < 30) {
    factors.push('New account');
    recommendations.push('Build your profile to increase trust');
  }

  // 4. Verification Status (15% weight, max 15 points)
  breakdown.verification = 0;
  if (user.isVerified) {
    breakdown.verification += 10;
    factors.push('Email verified');
  }
  if (user.avatarUrl) {
    breakdown.verification += 5;
    factors.push('Profile photo added');
  }
  if (!user.isVerified) {
    recommendations.push('Verify your email to increase trust score');
  }
  if (!user.avatarUrl) {
    recommendations.push('Add a profile photo to build trust');
  }

  // 5. Behavior Patterns (15% weight, max 15 points, can be negative)
  breakdown.behavior = 15; // Start with full points
  
  if (totalRides > 0) {
    // Cancellation rate
    const cancelledRides = rides.filter(r => r.status === 'cancelled').length;
    const cancellationRate = cancelledRides / totalRides;
    
    if (cancellationRate > 0.3) {
      breakdown.behavior -= 10;
      factors.push('High cancellation rate');
      recommendations.push('Try to avoid last-minute cancellations');
    } else if (cancellationRate > 0.1) {
      breakdown.behavior -= 5;
      factors.push('Some cancellations');
    }

    // No-show rate (simplified - can be enhanced with actual request data)
    // For now, we'll skip this as it requires additional data fetching
    // Can be added later when request data is available
  }

  breakdown.behavior = Math.max(0, breakdown.behavior); // Can't go below 0

  // Calculate total score
  const totalScore = 
    breakdown.reviews +
    breakdown.activity +
    breakdown.accountAge +
    breakdown.verification +
    breakdown.behavior;

  // Determine trust level
  let level: 'excellent' | 'good' | 'fair' | 'poor' | 'new';
  if (totalScore >= 80) {
    level = 'excellent';
  } else if (totalScore >= 65) {
    level = 'good';
  } else if (totalScore >= 50) {
    level = 'fair';
  } else if (totalScore >= 30) {
    level = 'poor';
  } else {
    level = 'new';
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(totalScore))),
    breakdown,
    level,
    factors,
    recommendations
  };
}

/**
 * Calculate behavior risk score (0-100, higher = more risky)
 */
export function calculateBehaviorRisk(
  rides: any[],
  reviews: any[]
): {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  indicators: string[];
} {
  let riskScore = 0;
  const indicators: string[] = [];

  if (rides.length === 0) {
    return { riskScore: 50, riskLevel: 'medium', indicators: ['No ride history'] };
  }

  // Cancellation rate
  const cancellationRate = rides.filter(r => r.status === 'cancelled').length / rides.length;
  if (cancellationRate > 0.5) {
    riskScore += 40;
    indicators.push('Very high cancellation rate');
  } else if (cancellationRate > 0.3) {
    riskScore += 25;
    indicators.push('High cancellation rate');
  }

  // Low ratings
  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
    : 3.0;
  
  if (avgRating < 2.5 && reviews.length >= 3) {
    riskScore += 30;
    indicators.push('Consistently low ratings');
  } else if (avgRating < 3.0 && reviews.length >= 5) {
    riskScore += 15;
    indicators.push('Below average ratings');
  }

  // Account age (new accounts are riskier)
  // This would need user data, so we'll skip for now

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high';
  if (riskScore >= 50) {
    riskLevel = 'high';
  } else if (riskScore >= 25) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'low';
  }

  return {
    riskScore: Math.min(100, riskScore),
    riskLevel,
    indicators
  };
}

