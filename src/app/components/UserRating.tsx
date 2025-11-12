'use client';
import React from 'react';
import StarRating from './ui/StarRating';

interface UserRatingProps {
  userId: string | { _id: string } | null | undefined;
  size?: number;
  showText?: boolean;
  showCount?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Displays a user's average rating with stars and optional text/count
 * Fetches the rating from the API automatically
 */
export default function UserRating({ 
  userId, 
  size = 16, 
  showText = false,
  showCount = false,
  className,
  style 
}: UserRatingProps) {
  const [averageRating, setAverageRating] = React.useState<number | null>(null);
  const [reviewCount, setReviewCount] = React.useState<number>(0);
  const [loading, setLoading] = React.useState(true);

  const userIdStr = React.useMemo(() => {
    if (!userId) return null;
    if (typeof userId === 'string') return userId;
    if (userId._id) return userId._id.toString();
    return null;
  }, [userId]);

  React.useEffect(() => {
    if (!userIdStr) {
      setLoading(false);
      return;
    }

    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`/api/profile/reviews?userId=${userIdStr}`, { 
          credentials: 'include' 
        });
        if (!res.ok) {
          if (mounted) {
            setAverageRating(null);
            setReviewCount(0);
            setLoading(false);
          }
          return;
        }
        const data = await res.json();
        if (mounted) {
          setAverageRating(data.averageRating ?? null);
          setReviewCount(data.count ?? 0);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch user rating', err);
        if (mounted) {
          setAverageRating(null);
          setReviewCount(0);
          setLoading(false);
        }
      }
    })();

    return () => { mounted = false; };
  }, [userIdStr]);

  if (loading) {
    return (
      <div className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, ...style }}>
        <span style={{ fontSize: '0.75rem', color: '#999' }}>...</span>
      </div>
    );
  }

  if (averageRating === null || reviewCount === 0) {
    return (
      <div className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, ...style }}>
        <span style={{ fontSize: '0.75rem', color: '#999' }}>No ratings</span>
      </div>
    );
  }

  return (
    <div className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, ...style }}>
      <StarRating value={Math.round(averageRating)} onChange={() => {}} readOnly size={size} />
      {showText && (
        <span style={{ fontSize: '0.85rem', color: '#666', fontWeight: 500 }}>
          {averageRating.toFixed(1)}
        </span>
      )}
      {showCount && (
        <span style={{ fontSize: '0.75rem', color: '#999' }}>
          ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
        </span>
      )}
    </div>
  );
}




