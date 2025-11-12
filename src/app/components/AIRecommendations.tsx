'use client';
import React from 'react';
import Card from './ui/Card';
import Badge from './ui/Badge';
import Button from './ui/Button';
import UserRating from './UserRating';
import Link from 'next/link';

interface Recommendation {
  ride: any;
  recommendationScore: number;
  factors: string[];
  matchReasons: string[];
}

interface AIRecommendationsProps {
  recommendations: Recommendation[];
  onRideClick?: (rideId: string) => void;
}

export default function AIRecommendations({ recommendations, onRideClick }: AIRecommendationsProps) {
  if (recommendations.length === 0) {
    return (
      <Card style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: 8 }}>🤖</div>
        <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 4 }}>
          No AI Recommendations Yet
        </div>
        <div style={{ fontSize: '0.9rem', color: '#666' }}>
          Complete a few rides to get personalized recommendations based on your preferences.
        </div>
      </Card>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 75) return '#16a34a';
    if (score >= 60) return '#3b82f6';
    if (score >= 45) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {recommendations.map((rec, index) => {
        const { ride, recommendationScore, matchReasons } = rec;
        return (
          <Card key={ride._id} style={{ border: `2px solid ${getScoreColor(recommendationScore)}`, position: 'relative' }}>
            {/* Recommendation Badge */}
            <div style={{ position: 'absolute', top: 12, right: 12 }}>
              <Badge variant="primary" style={{ backgroundColor: getScoreColor(recommendationScore) }}>
                {recommendationScore}% Match
              </Badge>
            </div>

            {/* AI Badge */}
            <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: '1rem' }}>🤖</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0369a1' }}>
                AI Recommended
              </span>
              {index === 0 && (
                <Badge variant="success" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                  Best Match
                </Badge>
              )}
            </div>

            {/* Ride Info */}
            <div style={{ marginBottom: 12 }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem' }}>
                {ride.title || 'Carpool Ride'}
              </h3>

              {/* Driver Info */}
              {ride.ownerId && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: '0.85rem', color: '#666' }}>Driver:</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                    {typeof ride.ownerId === 'object' ? (ride.ownerId.name || ride.ownerId.email) : 'Unknown'}
                  </span>
                  <UserRating userId={ride.ownerId} size={12} showText={true} />
                </div>
              )}

              {/* Route */}
              <div style={{ fontSize: '0.9rem', marginBottom: 4 }}>
                <strong>From:</strong> {ride.origin?.address || '—'}
              </div>
              <div style={{ fontSize: '0.9rem', marginBottom: 8 }}>
                <strong>To:</strong> {ride.destination?.address || '—'}
              </div>

              {/* Date & Time */}
              <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: 8 }}>
                🗓️ {new Date(ride.dateTime).toLocaleString()}
              </div>

              {/* Seats & Price */}
              <div style={{ display: 'flex', gap: 16, fontSize: '0.9rem', marginBottom: 12 }}>
                <span>💺 <strong>{ride.seatsAvailable}</strong>/{ride.seatsTotal} seats</span>
                {ride.price > 0 && (
                  <span>💰 <strong>${ride.price.toFixed(2)}</strong></span>
                )}
              </div>
            </div>

            {/* Match Reasons */}
            {matchReasons.length > 0 && (
              <div style={{
                marginTop: 12,
                padding: 10,
                backgroundColor: '#f0f9ff',
                borderRadius: 6,
                fontSize: '0.85rem'
              }}>
                <div style={{ fontWeight: 600, marginBottom: 4, color: '#0369a1' }}>
                  Why this ride?
                </div>
                <ul style={{ margin: 0, paddingLeft: 20, color: '#666' }}>
                  {matchReasons.map((reason, i) => (
                    <li key={i}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Button */}
            <div style={{ marginTop: 12 }}>
              <Button
                href={`/carpools/${ride._id}`}
                variant="primary"
                style={{ width: '100%' }}
                onClick={() => onRideClick?.(ride._id)}
              >
                View Details
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}




