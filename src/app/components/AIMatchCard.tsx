'use client';
import React from 'react';
import Card from './ui/Card';
import Badge from './ui/Badge';
import Button from './ui/Button';
import UserRating from './UserRating';
import Link from 'next/link';

interface AIMatchCardProps {
  match: {
    ride: any;
    matchScore: number;
    breakdown: {
      route: number;
      time: number;
      user: number;
      price: number;
    };
    routeMatch: {
      score: number;
      originDeviation: number;
      destinationDeviation: number;
      routeDeviation: number;
      matchType: string;
    };
    timeMatch: {
      score: number;
      timeDifferenceHours: number;
    };
    userMatch: {
      score: number;
      driverRating: number;
      factors: string[];
    };
    recommendation: string;
  };
}

export default function AIMatchCard({ match }: AIMatchCardProps) {
  const { ride, matchScore, breakdown, routeMatch, timeMatch, userMatch, recommendation } = match;

  const getScoreColor = (score: number) => {
    if (score >= 75) return '#16a34a'; // green
    if (score >= 60) return '#3b82f6'; // blue
    if (score >= 45) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  const getMatchTypeBadge = (matchType: string) => {
    switch (matchType) {
      case 'exact':
        return <Badge variant="success">Exact Match</Badge>;
      case 'on-route':
        return <Badge variant="primary">On Route</Badge>;
      default:
        return <Badge variant="warning">Nearby</Badge>;
    }
  };

  return (
    <Card style={{ border: `2px solid ${getScoreColor(matchScore)}`, position: 'relative' }}>
      {/* Match Score Badge */}
      <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        <div style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          color: getScoreColor(matchScore)
        }}>
          {matchScore}%
        </div>
        <div style={{ fontSize: '0.75rem', color: '#666' }}>Match</div>
      </div>

      {/* Recommendation */}
      <div style={{ marginBottom: 12, padding: 8, backgroundColor: '#f0f9ff', borderRadius: 6 }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0369a1' }}>
          🤖 AI Recommendation
        </div>
        <div style={{ fontSize: '0.8rem', color: '#666', marginTop: 4 }}>
          {recommendation}
        </div>
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

        {/* Route Info */}
        <div style={{ fontSize: '0.9rem', marginBottom: 4 }}>
          <strong>From:</strong> {ride.origin?.address || '—'}
        </div>
        <div style={{ fontSize: '0.9rem', marginBottom: 8 }}>
          <strong>To:</strong> {ride.destination?.address || '—'}
        </div>

        {/* Date & Time */}
        <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: 8 }}>
          🗓️ {new Date(ride.dateTime).toLocaleString()}
          {timeMatch.timeDifferenceHours > 0 && (
            <span style={{ marginLeft: 8, color: timeMatch.score >= 60 ? '#16a34a' : '#f59e0b' }}>
              ({timeMatch.timeDifferenceHours > 0 ? '+' : ''}{timeMatch.timeDifferenceHours}h difference)
            </span>
          )}
        </div>

        {/* Seats & Price */}
        <div style={{ display: 'flex', gap: 16, fontSize: '0.9rem', marginBottom: 12 }}>
          <span>💺 <strong>{ride.seatsAvailable}</strong>/{ride.seatsTotal} seats</span>
          {ride.price > 0 && (
            <span>💰 <strong>${ride.price.toFixed(2)}</strong></span>
          )}
        </div>
      </div>

      {/* Match Details */}
      <div style={{ 
        marginTop: 12, 
        padding: 12, 
        backgroundColor: '#f9fafb', 
        borderRadius: 6,
        fontSize: '0.85rem'
      }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Match Breakdown:</div>
        <div style={{ display: 'grid', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Route Match:</span>
            <span style={{ fontWeight: 500, color: getScoreColor(breakdown.route) }}>
              {breakdown.route}% {getMatchTypeBadge(routeMatch.matchType)}
            </span>
          </div>
          {routeMatch.originDeviation < 10 && (
            <div style={{ fontSize: '0.75rem', color: '#666', marginLeft: 12 }}>
              Origin: {routeMatch.originDeviation}km away
            </div>
          )}
          {routeMatch.destinationDeviation < 10 && (
            <div style={{ fontSize: '0.75rem', color: '#666', marginLeft: 12 }}>
              Destination: {routeMatch.destinationDeviation}km away
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Time Match:</span>
            <span style={{ fontWeight: 500, color: getScoreColor(breakdown.time) }}>
              {breakdown.time}%
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Driver Rating:</span>
            <span style={{ fontWeight: 500, color: getScoreColor(breakdown.user) }}>
              {breakdown.user}% ({userMatch.driverRating}/5.0)
            </span>
          </div>
          {userMatch.factors.length > 0 && (
            <div style={{ fontSize: '0.75rem', color: '#666', marginTop: 4 }}>
              {userMatch.factors.join(', ')}
            </div>
          )}
        </div>
      </div>

      {/* Action Button */}
      <div style={{ marginTop: 12 }}>
        <Button href={`/carpools/${ride._id}`} variant="primary" style={{ width: '100%' }}>
          View & Book Ride
        </Button>
      </div>
    </Card>
  );
}




