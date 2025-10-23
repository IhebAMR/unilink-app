'use client';
import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import MapPreview from '@/app/components/MapPreview';
import BackButton from '@/app/components/BackButton';

export default function RideDetailPage() {
  const params = useParams(); // recommended in client components
  const id = params?.id as string | undefined;
  const router = useRouter();

  const [ride, setRide] = React.useState<any | null>(null);
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const [requests, setRequests] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [booking, setBooking] = React.useState(false);
  const [bookingMessage, setBookingMessage] = React.useState('');
  const [seatsRequested, setSeatsRequested] = React.useState(1);
  const [showBookingForm, setShowBookingForm] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    if (!id) {
      setError('Missing ride id');
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch ride details and current user in parallel
        const [rideRes, userRes] = await Promise.all([
          fetch(`/api/carpools/${id}`, { credentials: 'include' }),
          fetch('/api/carpools', { credentials: 'include' })
        ]);
        
        if (!rideRes.ok) {
          const txt = await rideRes.text();
          console.error('GET /api/carpools/:id failed', rideRes.status, txt);
          if (rideRes.status === 404) {
            if (mounted) setError('Ride not found');
          } else if (rideRes.status === 400) {
            if (mounted) setError('Invalid ride id');
          } else if (mounted) {
            setError(`Server error ${rideRes.status}: ${txt}`);
          }
          return;
        }
        
        const rideJson = await rideRes.json();
        if (mounted) setRide(rideJson);
        
        // Get current user ID
        if (userRes.ok) {
          const userData = await userRes.json();
          if (mounted) setCurrentUserId(userData.currentUserId);
          
          // If user is the owner, fetch ride requests
          const isOwner = userData.currentUserId && rideJson.ownerId && 
            (typeof rideJson.ownerId === 'string' ? rideJson.ownerId === userData.currentUserId : rideJson.ownerId._id === userData.currentUserId);
          
          if (isOwner) {
            try {
              const reqRes = await fetch(`/api/carpools/${id}/requests`, { credentials: 'include' });
              if (reqRes.ok) {
                const reqData = await reqRes.json();
                if (mounted) setRequests(reqData);
              }
            } catch (err) {
              console.error('Failed to fetch requests', err);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch ride', err);
        if (mounted) setError('Failed to fetch ride');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;
    
    if (!confirm('Are you sure you want to delete this ride?')) return;
    
    try {
      setDeleting(true);
      const res = await fetch(`/api/carpools/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!res.ok) {
        const json = await res.json();
        alert(json.error || 'Failed to delete ride');
        return;
      }
      
      // Redirect to carpools list after successful deletion
      router.push('/carpools');
    } catch (err) {
      console.error('Failed to delete ride', err);
      alert('Failed to delete ride');
    } finally {
      setDeleting(false);
    }
  };

  const handleBookRide = async () => {
    if (!id) return;
    
    try {
      setBooking(true);
      const res = await fetch(`/api/carpools/${id}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ seatsRequested, message: bookingMessage })
      });
      
      if (!res.ok) {
        const json = await res.json();
        alert(json.error || 'Failed to book ride');
        return;
      }
      
      alert('Ride booking request sent! Waiting for owner approval.');
      setShowBookingForm(false);
      setBookingMessage('');
      setSeatsRequested(1);
    } catch (err) {
      console.error('Failed to book ride', err);
      alert('Failed to book ride');
    } finally {
      setBooking(false);
    }
  };

  const handleRequestAction = async (requestId: string, action: 'accept' | 'decline') => {
    if (!id) return;
    
    try {
      const res = await fetch(`/api/carpools/${id}/requests`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ requestId, action })
      });
      
      if (!res.ok) {
        const json = await res.json();
        alert(json.error || 'Failed to update request');
        return;
      }
      
      const result = await res.json();
      
      // Update requests list
      setRequests(prev => prev.map(req => 
        req._id === requestId ? { ...req, status: action === 'accept' ? 'accepted' : 'rejected' } : req
      ));
      
      // Update ride seats if accepted
      if (action === 'accept' && result.ride) {
        setRide((prev: any) => ({ ...prev, ...result.ride }));
      }
      
      alert(result.message);
    } catch (err) {
      console.error('Failed to update request', err);
      alert('Failed to update request');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return (
    <div style={{ padding: 16 }}>
      <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>
      <button onClick={() => router.push('/carpools')}>Back to list</button>
    </div>
  );
  if (!ride) return <div>Ride not found.</div>;

  const isOwner = currentUserId && ride.ownerId && 
    (typeof ride.ownerId === 'string' ? ride.ownerId === currentUserId : ride.ownerId._id === currentUserId);

  const rideStatus = ride.status || 'open';
  const isAvailable = rideStatus === 'open' && ride.seatsAvailable > 0;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>
      <BackButton label="Back to Rides" href="/carpools" />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>{ride.title || 'Ride'}</h1>
          <div style={{ 
            marginTop: 8,
            padding: '4px 12px',
            borderRadius: 4,
            display: 'inline-block',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            backgroundColor: rideStatus === 'open' ? '#4CAF50' : rideStatus === 'full' ? '#FF9800' : '#999',
            color: 'white'
          }}>
            {rideStatus === 'open' ? '✓ Available' : rideStatus === 'full' ? 'FULL' : rideStatus.toUpperCase()}
          </div>
        </div>
        {isOwner && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 4,
              cursor: deleting ? 'not-allowed' : 'pointer',
              opacity: deleting ? 0.6 : 1
            }}
          >
            {deleting ? 'Deleting...' : 'Delete Ride'}
          </button>
        )}
      </div>

      {ride.ownerId && typeof ride.ownerId === 'object' && (
        <div style={{ marginBottom: 12, fontSize: '0.9rem', color: '#666' }}>
          Offered by: {ride.ownerId.name || ride.ownerId.email}
        </div>
      )}

      <div>Date: {ride.dateTime ? new Date(ride.dateTime).toLocaleString() : '—'}</div>
      <div>Seats Available: <strong>{ride.seatsAvailable ?? 0}</strong> / {ride.seatsTotal ?? 0}</div>

      <div style={{ marginTop: 12 }}>
        <MapPreview coords={ride.route?.coordinates || []} height={360} zoom={12} />
      </div>

      <div style={{ marginTop: 12 }}>
        <p>{ride.notes}</p>
      </div>

      {/* Book Ride Button for Non-Owners */}
      {!isOwner && currentUserId && isAvailable && (
        <div style={{ marginTop: 16, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 6 }}>
          {!showBookingForm ? (
            <button
              onClick={() => setShowBookingForm(true)}
              style={{
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 'bold'
              }}
            >
              Book This Ride
            </button>
          ) : (
            <div>
              <h3 style={{ marginTop: 0 }}>Request to join this ride</h3>
              
              {/* Seat Selector */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>
                  Number of seats needed:
                </label>
                <select
                  value={seatsRequested}
                  onChange={(e) => setSeatsRequested(Number(e.target.value))}
                  style={{ 
                    padding: '8px 12px', 
                    borderRadius: 4, 
                    border: '1px solid #ddd',
                    fontSize: '1rem',
                    minWidth: 100
                  }}
                >
                  {Array.from({ length: ride.seatsAvailable }, (_, i) => i + 1).map(num => (
                    <option key={num} value={num}>
                      {num} {num === 1 ? 'seat' : 'seats'}
                    </option>
                  ))}
                </select>
              </div>

              <textarea
                placeholder="Optional message to the driver..."
                value={bookingMessage}
                onChange={(e) => setBookingMessage(e.target.value)}
                style={{ width: '100%', minHeight: 80, padding: 8, borderRadius: 4, border: '1px solid #ddd' }}
              />
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <button
                  onClick={handleBookRide}
                  disabled={booking}
                  style={{
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: 4,
                    cursor: booking ? 'not-allowed' : 'pointer'
                  }}
                >
                  {booking ? 'Sending...' : `Request ${seatsRequested} ${seatsRequested === 1 ? 'Seat' : 'Seats'}`}
                </button>
                <button
                  onClick={() => { setShowBookingForm(false); setBookingMessage(''); setSeatsRequested(1); }}
                  style={{
                    backgroundColor: '#999',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: 4,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {!isAvailable && !isOwner && (
        <div style={{ marginTop: 16, padding: 12, backgroundColor: '#fff3cd', borderRadius: 6, color: '#856404' }}>
          This ride is no longer available for booking.
        </div>
      )}

      {/* Ride Requests (Owner Only) */}
      {isOwner && requests.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h2>Ride Requests</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {requests.map(req => (
              <div key={req._id} style={{ 
                border: '1px solid #ddd', 
                padding: 16, 
                borderRadius: 6,
                backgroundColor: req.status === 'pending' ? '#fff' : req.status === 'accepted' ? '#e8f5e9' : '#ffebee'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>
                      {req.passengerId?.name || req.passengerId?.email || 'Unknown User'}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#666', marginTop: 4 }}>
                      Seats requested: {req.seatsRequested}
                    </div>
                    {req.message && (
                      <div style={{ marginTop: 8, fontStyle: 'italic', color: '#555' }}>
                        "{req.message}"
                      </div>
                    )}
                    <div style={{ fontSize: '0.8rem', color: '#999', marginTop: 8 }}>
                      {new Date(req.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ 
                    padding: '4px 12px',
                    borderRadius: 4,
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    backgroundColor: req.status === 'pending' ? '#FFC107' : req.status === 'accepted' ? '#4CAF50' : '#f44336',
                    color: 'white'
                  }}>
                    {req.status.toUpperCase()}
                  </div>
                </div>
                {req.status === 'pending' && (
                  <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleRequestAction(req._id, 'accept')}
                      style={{
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: 4,
                        cursor: 'pointer'
                      }}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRequestAction(req._id, 'decline')}
                      style={{
                        backgroundColor: '#f44336',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: 4,
                        cursor: 'pointer'
                      }}
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <button onClick={() => router.push('/carpools')}>Back to list</button>
      </div>
    </div>
  );
}