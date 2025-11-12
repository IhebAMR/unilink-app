'use client';
import React, { useState } from 'react';
import Card from './ui/Card';

export interface Event {
  _id?: string;
  id?: string;
  name: string;
  title?: string; // For backward compatibility
  date: string | Date;
  originalDate?: string | Date; // Original date for filtering (not formatted)
  time: string;
  location: string;
  attending?: number | string[];
  attendingArray?: string[]; // Full array of user IDs
  notGoingArray?: string[]; // Full array of user IDs
  image?: string;
  currentUserId?: string; // Current user's ID to check their status
  status?: string; // Event status: 'upcoming', 'ongoing', 'completed', 'cancelled'
  cancellationReason?: string; // Reason for cancellation
  ownerId?: string; // Event owner ID for filtering
}

interface EventCardProps {
  event: Event;
  onAttendanceUpdate?: (eventId: string, attendingCount: number, attendingArray: string[], notGoingArray: string[]) => void;
  onCardClick?: (eventId: string) => void;
}

export default function EventCard({ event, onAttendanceUpdate, onCardClick }: EventCardProps) {
  const [isGoing, setIsGoing] = useState(() => {
    // Initialize from event data
    if (event.currentUserId && event.attendingArray) {
      return event.attendingArray.includes(event.currentUserId);
    }
    return false;
  });
  const [isNotGoing, setIsNotGoing] = useState(() => {
    // Initialize from event data
    if (event.currentUserId && event.notGoingArray) {
      return event.notGoingArray.includes(event.currentUserId);
    }
    return false;
  });
  const [attendingCount, setAttendingCount] = useState(() => {
    if (typeof event.attending === 'number') {
      return event.attending;
    }
    if (Array.isArray(event.attending)) {
      return event.attending.length;
    }
    if (event.attendingArray) {
      return event.attendingArray.length;
    }
    return 0;
  });
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const eventName = event.title || event.name;
  const eventId = event.id || event._id;
  const eventIdString = eventId ? String(eventId) : null;
  const isCancelled = event.status === 'cancelled';
  // Use Picsum photos as placeholder - 400x200 to match card dimensions
  const placeholderImage = `https://picsum.photos/400/200?random=${eventIdString || Math.random()}`;
  const hasValidImage = event.image && !imageError;

  const handleGoing = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!eventIdString || !event.currentUserId || isCancelled) {
      // User not logged in or event cancelled
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/events/${eventIdString}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'attending' }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update attendance');
      }

      const data = await res.json();
      const newIsGoing = !isGoing;
      setIsGoing(newIsGoing);
      setIsNotGoing(false);
      setAttendingCount(data.event.attendingCount);
      
      // Update local arrays
      const newAttendingArray = data.event.attending || [];
      const newNotGoingArray = data.event.notGoing || [];
      
      // Notify parent component to update the event list
      if (onAttendanceUpdate && eventIdString) {
        onAttendanceUpdate(eventIdString, data.event.attendingCount, newAttendingArray, newNotGoingArray);
      }
    } catch (err: any) {
      console.error('Failed to update attendance', err);
      // Optionally show error message to user
    } finally {
      setLoading(false);
    }
  };

  const handleNotGoing = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!eventIdString || !event.currentUserId || isCancelled) {
      // User not logged in or event cancelled
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/events/${eventIdString}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'notGoing' }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update attendance');
      }

      const data = await res.json();
      const newIsNotGoing = !isNotGoing;
      setIsNotGoing(newIsNotGoing);
      setIsGoing(false);
      
      // Update local arrays
      const newAttendingArray = data.event.attending || [];
      const newNotGoingArray = data.event.notGoing || [];
      
      // Notify parent component to update the event list
      if (onAttendanceUpdate && eventIdString) {
        onAttendanceUpdate(eventIdString, data.event.attendingCount, newAttendingArray, newNotGoingArray);
      }
    } catch (err: any) {
      console.error('Failed to update attendance', err);
      // Optionally show error message to user
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Don't trigger if clicking on buttons
    const target = e.target as HTMLElement;
    if (target.closest('button')) {
      return;
    }
    
    if (onCardClick && eventIdString) {
      e.stopPropagation();
      onCardClick(eventIdString);
    }
  };

  return (
    <Card
      style={{
        padding: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '100%',
      }}
      hoverable
      onClick={handleCardClick}
    >
      {/* Image Section with Overlay Buttons */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '200px',
          overflow: 'hidden',
          backgroundColor: '#e0e0e0',
          cursor: 'pointer',
        }}
      >
        <img
          src={hasValidImage ? event.image : placeholderImage}
          alt={eventName}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: isCancelled ? 0.6 : 1,
          }}
          onError={() => {
            setImageError(true);
          }}
        />
        {/* Cancelled Badge */}
        {isCancelled && (
          <div
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              backgroundColor: '#f44336',
              color: 'white',
              padding: '6px 12px',
              borderRadius: 20,
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              zIndex: 11,
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            Cancelled
          </div>
        )}
        {/* Overlay Buttons */}
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            zIndex: 10,
          }}
        >
          {/* Going Button (Green Checkmark) */}
          <button
            onClick={handleGoing}
            disabled={loading || !event.currentUserId || isCancelled}
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              border: 'none',
              backgroundColor: isGoing ? '#4caf50' : 'white',
              color: isGoing ? 'white' : '#4caf50',
              cursor: (loading || !event.currentUserId || isCancelled) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              transition: 'all 0.2s ease',
              opacity: (loading || !event.currentUserId || isCancelled) ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!loading && event.currentUserId) {
                e.currentTarget.style.transform = 'scale(1.1)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title={!event.currentUserId ? 'Please log in to mark attendance' : (isGoing ? 'Going' : 'Mark as going')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>

          {/* Not Going Button (X) */}
          <button
            onClick={handleNotGoing}
            disabled={loading || !event.currentUserId || isCancelled}
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              border: 'none',
              backgroundColor: isNotGoing ? '#f44336' : 'white',
              color: isNotGoing ? 'white' : '#f44336',
              cursor: (loading || !event.currentUserId || isCancelled) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              transition: 'all 0.2s ease',
              opacity: (loading || !event.currentUserId || isCancelled) ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!loading && event.currentUserId) {
                e.currentTarget.style.transform = 'scale(1.1)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title={!event.currentUserId ? 'Please log in to mark attendance' : (isNotGoing ? 'Not going' : 'Mark as not going')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Event Details Section */}
      <div style={{ padding: 16 }}>
        {/* Date and Time */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
            color: '#666',
            fontSize: '0.9rem',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>
            {typeof event.date === 'string'
              ? event.date
              : new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · {event.time}
          </span>
        </div>

        {/* Event Title */}
        <h3
          style={{
            margin: '0 0 8px 0',
            fontSize: '1.2rem',
            fontWeight: 600,
            color: '#333',
          }}
        >
          {event.title || event.name}
        </h3>

        {/* Cancellation Reason (if cancelled) */}
        {isCancelled && event.cancellationReason && (
          <div
            style={{
              marginBottom: 12,
              padding: '10px 12px',
              backgroundColor: '#ffebee',
              border: '1px solid #f44336',
              borderRadius: 6,
              fontSize: '0.85rem',
              color: '#c62828',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Cancelled:</div>
            <div style={{ color: '#666', lineHeight: 1.4 }}>{event.cancellationReason}</div>
          </div>
        )}

        {/* Location and Attendance */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: '#666',
            fontSize: '0.9rem',
          }}
        >
          <span>
            {attendingCount.toLocaleString()} attending · {event.location}
          </span>
        </div>
      </div>
    </Card>
  );
}

