'use client';
import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import MapPreview from '@/app/components/MapPreview';
import BackButton from '@/app/components/BackButton';
import Button from '@/app/components/ui/Button';
import Badge from '@/app/components/ui/Badge';
import Card from '@/app/components/ui/Card';
import PageSection from '@/app/components/ui/PageSection';
import StarRating from '@/app/components/ui/StarRating';
import UserRating from '@/app/components/UserRating';

export default function RideDetailPage() {
  const params = useParams(); // recommended in client components
  const id = params?.id as string | undefined;
  const router = useRouter();

  const [ride, setRide] = React.useState<any | null>(null);
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const [ownerReviews, setOwnerReviews] = React.useState<any[]>([]);
  const [ownerAverage, setOwnerAverage] = React.useState<number | null>(null);
  const [reviewRating, setReviewRating] = React.useState<number>(0);
  const [reviewComment, setReviewComment] = React.useState<string>('');
  const [submittingReview, setSubmittingReview] = React.useState<boolean>(false);
  const [reviewSuccess, setReviewSuccess] = React.useState<string | null>(null);
  const [hasReviewed, setHasReviewed] = React.useState<boolean>(false);
  const [requests, setRequests] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [booking, setBooking] = React.useState(false);
  const [bookingMessage, setBookingMessage] = React.useState('');
  const [seatsRequested, setSeatsRequested] = React.useState(1);
  const [showBookingForm, setShowBookingForm] = React.useState(false);
  const [myRequest, setMyRequest] = React.useState<any | null>(null);

  // Check if current user has already reviewed when reviews or currentUserId changes
  React.useEffect(() => {
    if (currentUserId && ownerReviews.length > 0) {
      const userReviewed = ownerReviews.some((r: any) => 
        r.author && String(r.author._id) === String(currentUserId)
      );
      setHasReviewed(userReviewed);
    }
  }, [currentUserId, ownerReviews]);

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
  // Support both shapes: { ride, currentUserId, myRequest } or legacy ride document
  const rideDoc = rideJson?.ride ?? rideJson;
  if (mounted) setRide(rideDoc);
  if (mounted && rideJson?.currentUserId) setCurrentUserId(rideJson.currentUserId);
  if (mounted && rideJson?.myRequest) setMyRequest(rideJson.myRequest);
        // Fetch owner reviews
        if (mounted) {
          try {
            const ownerId = rideDoc?.ownerId?._id || rideDoc?.ownerId;
            if (ownerId && id) {
              fetch(`/api/profile/reviews?userId=${ownerId}&relatedRide=${id}`, { credentials: 'include' })
                .then(res => res.ok ? res.json() : null)
                .then(data => {
                  if (!mounted) return;
                  if (data) {
                    setOwnerReviews(data.reviews || []);
                    setOwnerAverage(data.averageRating ?? null);
                    // Check if current user has already reviewed
                    if (rideJson?.currentUserId) {
                      const userReviewed = (data.reviews || []).some((r: any) => 
                        r.author && String(r.author._id) === String(rideJson.currentUserId)
                      );
                      if (mounted) setHasReviewed(userReviewed);
                    }
                  }
                }).catch(err => console.error('Failed to load owner reviews', err));
            }
          } catch (err) {
            console.error('Error fetching owner reviews', err);
          }
        }
        
        // Get current user ID
        if (userRes.ok) {
          const userData = await userRes.json();
          if (mounted && !rideJson?.currentUserId) setCurrentUserId(userData.currentUserId);
          
          // If user is the owner, fetch ride requests
          const isOwner = userData.currentUserId && rideDoc.ownerId && 
            (typeof rideDoc.ownerId === 'string' ? rideDoc.ownerId === userData.currentUserId : rideDoc.ownerId._id === userData.currentUserId);
          
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
    // Prevent duplicate booking attempts if user already has a pending/accepted request
    if (myRequest && (myRequest.status === 'pending' || myRequest.status === 'accepted')) {
      alert(`You already have a ${myRequest.status} request for this ride`);
      return;
    }
    
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
      
      const created = await res.json();
      setMyRequest({ _id: created._id, status: created.status, seatsRequested: created.seatsRequested, createdAt: created.createdAt });
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
        // If the ride became fully reserved / closed as a result of this accept, navigate owner to history
        const updated = result.ride;
        const seatsLeft = typeof updated.seatsAvailable === 'number' ? updated.seatsAvailable : undefined;
        const status = updated.status;
        if ((typeof seatsLeft === 'number' && seatsLeft <= 0) || status === 'closed' || status === 'full') {
          // navigate owner (driver) to history when the ride is closed/full
          router.push('/history');
        }
      }
      
      alert(result.message);
    } catch (err) {
      console.error('Failed to update request', err);
      alert('Failed to update request');
    }
  };

  if (loading) return <div style={{ padding: 16 }}>Loading...</div>;
  if (error) return (
    <div style={{ padding: 16 }}>
      <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>
      <Button onClick={() => router.push('/carpools')} variant="outline">Back to list</Button>
    </div>
  );
  if (!ride) return <div>Ride not found.</div>;

  const ownerIdStr = (typeof ride.ownerId === 'string') ? ride.ownerId : ride.ownerId?._id?.toString?.();
  const isOwner = !!(currentUserId && ownerIdStr && ownerIdStr === currentUserId);
  
  // Check if current user is a participant (either in participants array or has an accepted request)
  const isInParticipants = !!(currentUserId && ride.participants && Array.isArray(ride.participants) &&
    ride.participants.some((p: any) => {
      const pId = typeof p === 'string' ? p : p?._id?.toString?.() || p?.toString?.();
      return pId === currentUserId;
    }));
  const hasAcceptedRequest = !!(myRequest && myRequest.status === 'accepted');
  const isParticipant = isInParticipants || hasAcceptedRequest;

  const rideStatus = ride.status || 'open';
  const isAvailable = rideStatus === 'open' && ride.seatsAvailable > 0;
  const hasMyActiveRequest = !!(myRequest && (myRequest.status === 'pending' || myRequest.status === 'accepted'));
  
  // Only allow completion after the scheduled ride date has passed
  // Both owners and participants can mark rides as completed
  const canComplete = (isOwner || isParticipant) && 
    rideStatus !== 'completed' && 
    rideStatus !== 'cancelled' && 
    new Date(ride.dateTime) <= new Date();

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>
      <BackButton label="Back to Rides" href="/carpools" />

      <PageSection style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <h1 style={{ margin: 0 }}>{ride.title || 'Ride'}</h1>
            <div style={{ marginTop: 8 }}>
              <Badge variant={rideStatus === 'open' ? 'success' : rideStatus === 'full' ? 'warning' : 'neutral'}>
                {rideStatus === 'open' ? '✓ Available' : rideStatus === 'full' ? 'FULL' : rideStatus.toUpperCase()}
              </Badge>
            </div>
          </div>
          {isOwner && (
            <Button onClick={handleDelete} disabled={deleting} variant="danger">
              {deleting ? 'Deleting…' : 'Delete Ride'}
            </Button>
          )}
          {canComplete && (
            <Button
              onClick={async () => {
                if (!confirm('Mark this ride as completed? This will allow passengers to leave reviews.')) return;
                try {
                  const res = await fetch(`/api/carpools/${id}`, { 
                    method: 'PATCH', 
                    headers: { 'Content-Type': 'application/json' }, 
                    credentials: 'include', 
                    body: JSON.stringify({ action: 'complete' }) 
                  });
                  if (!res.ok) {
                    const j = await res.json().catch(()=>({}));
                    alert(j.error || 'Failed to mark as completed');
                    return;
                  }
                  const j = await res.json();
                  setRide((prev:any) => ({ ...prev, status: 'completed' }));
                  alert('Ride marked as completed! Passengers can now leave reviews.');
                } catch (e) {
                  console.error('Complete ride error', e);
                  alert('Failed to complete ride');
                }
              }}
              variant="success"
              disabled={rideStatus === 'completed'}
              style={{ marginLeft: 8 }}
            >
              {rideStatus === 'completed' ? '✓ Completed' : '✓ Mark Completed'}
            </Button>
          )}
        </div>

        {ride.ownerId && typeof ride.ownerId === 'object' && (
          <div style={{ marginBottom: 12, fontSize: '0.9rem', color: '#666', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>Offered by: {ride.ownerId.name || ride.ownerId.email}</span>
            <UserRating userId={ride.ownerId} size={14} showText={true} />
          </div>
        )}

        {/* Owner reviews */}
        {ride.ownerId && (
          <div style={{ marginTop: 8, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem', color: '#444' }}>
              <span style={{ fontWeight: 600 }}>Driver rating:</span>
              <StarRating value={Math.round((ownerAverage || 0))} onChange={() => {}} readOnly size={20} />
              {ownerAverage !== null ? <span>({ownerAverage.toFixed(1)})</span> : <span>No ratings yet</span>}
              {ownerReviews?.length ? <span style={{ color: '#888' }}>• {ownerReviews.length} review{ownerReviews.length>1?'s':''}</span> : null}
            </div>
            {ownerReviews.length > 0 && (
              <div style={{ marginTop: 8 }}>
                {ownerReviews.map(r => (
                  <div key={r._id} style={{ borderTop: '1px solid #eee', paddingTop: 8, marginTop: 8 }}>
                    <div style={{ fontWeight: '600' }}>{r.author?.name || r.author?.email || 'Anonymous'}</div>
                    <div style={{ fontSize: '0.85rem', color: '#555' }}>Rating: {r.rating} / 5</div>
                    {r.comment && <div style={{ marginTop: 6, color: '#333' }}>{r.comment}</div>}
                    <div style={{ fontSize: '0.75rem', color: '#888', marginTop: 6 }}>{new Date(r.createdAt).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Show message if user has already reviewed */}
            {currentUserId && ride.ownerId && ride.status === 'completed' && hasReviewed && ownerIdStr !== currentUserId && isParticipant && (
              <div style={{ marginTop: 12, padding: 10, border: '1px solid #e5e7eb', borderRadius: 6, backgroundColor: '#f9fafb' }}>
                <div style={{ color: '#16a34a', fontWeight: 600 }}>✓ You have already reviewed this driver</div>
              </div>
            )}

            {/* Submit review (participants only) */}
            {currentUserId && ride.ownerId && ride.status === 'completed' && !hasReviewed && ownerIdStr !== currentUserId && isParticipant && (
              <div style={{ marginTop: 12, padding: 10, border: '1px dashed #e5e7eb', borderRadius: 6 }}>
                <div style={{ marginBottom: 8, fontWeight: 600 }}>Leave a review for this driver</div>
                <div style={{ marginBottom: 8 }}>
                  <StarRating value={reviewRating} onChange={setReviewRating} ariaLabel="Your rating" />
                </div>
                <div>
                  <textarea
                    maxLength={300}
                    placeholder="Write your review here (optional)"
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    style={{ width: '100%', minHeight: 80, padding: 8, borderRadius: 6, border: '1px solid #e5e7eb' }}
                  />
                  <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#888' }}>{reviewComment.length}/300</div>
                </div>
                {reviewSuccess && (
                  <div style={{ marginTop: 8, color: '#16a34a', fontWeight: 600 }}>{reviewSuccess}</div>
                )}
                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                      <Button variant="success" onClick={async () => {
                        if (!ride?.ownerId) return;
                        if (!reviewRating) { alert('Please choose a star rating.'); return; }
                        setSubmittingReview(true);
                        try {
                          const ownerId = ride.ownerId._id || ride.ownerId;
                          // Ensure we send a valid ride id: prefer route param `id`, fall back to ride._id
                          const rideIdToSend = id || (ride && (ride._id || ride.id));
                          if (!rideIdToSend) {
                            alert('Cannot submit review: missing ride id');
                            return;
                          }
                      const res = await fetch('/api/profile/reviews', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ userId: ownerId, rating: reviewRating, comment: reviewComment, relatedRide: rideIdToSend })
                      });
                      if (!res.ok) {
                        const j = await res.json().catch(() => ({}));
                        const errorMsg = j.error || 'Failed to submit review';
                        alert(errorMsg);
                        console.error('Review submission error:', j);
                        return;
                      }
                      const data = await res.json();
                      setOwnerReviews(data.reviews || []);
                      setOwnerAverage(data.averageRating ?? null);
                      setReviewComment('');
                      setReviewRating(0);
                      setHasReviewed(true);
                      setReviewSuccess('Thanks! Your review has been submitted.');
                    } catch (err) {
                      console.error('Failed to submit review', err);
                      alert('Failed to submit review');
                    } finally {
                      setSubmittingReview(false);
                    }
                  }} disabled={submittingReview || !reviewRating}>{submittingReview ? 'Sending…' : 'Submit Review'}</Button>
                  <Button variant="neutral" onClick={() => { setReviewRating(5); setReviewComment(''); }}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'grid', gap: 6 }}>
          <div>Date: {ride.dateTime ? new Date(ride.dateTime).toLocaleString() : '—'}</div>
          <div>Seats Available: <strong>{ride.seatsAvailable ?? 0}</strong> / {ride.seatsTotal ?? 0}</div>
        </div>

        <div style={{ marginTop: 12 }}>
          <MapPreview coords={ride.route?.coordinates || []} height={360} zoom={12} />
        </div>

        {ride.notes && (
          <div style={{ marginTop: 12 }}>
            <p style={{ margin: 0 }}>{ride.notes}</p>
          </div>
        )}
      </PageSection>

      {/* Book Ride Button for Non-Owners */}
      {!isOwner && currentUserId && isAvailable && (
        <Card style={{ marginTop: 16 }}>
          {hasMyActiveRequest && (
            <div style={{ marginBottom: 8 }}>
              <Badge variant={myRequest.status === 'accepted' ? 'success' : 'warning'}>
                You have an {myRequest.status} request for this ride
              </Badge>
            </div>
          )}
          {!showBookingForm ? (
            <Button variant="success" onClick={() => setShowBookingForm(true)} disabled={hasMyActiveRequest}>
              {hasMyActiveRequest ? 'Request already sent' : 'Book This Ride'}
            </Button>
          ) : (
            <div>
              <h3 style={{ marginTop: 0 }}>Request to join this ride</h3>
              
              {/* Seat Selector */}
              <div style={{ marginBottom: 12 }}>
                <label htmlFor="seats-select" style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>
                  Number of seats needed:
                </label>
                <select
                  id="seats-select"
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
                <Button onClick={handleBookRide} disabled={booking || hasMyActiveRequest} variant="success">
                  {booking ? 'Sending…' : hasMyActiveRequest ? 'Request already sent' : `Request ${seatsRequested} ${seatsRequested === 1 ? 'Seat' : 'Seats'}`}
                </Button>
                <Button onClick={() => { setShowBookingForm(false); setBookingMessage(''); setSeatsRequested(1); }} variant="neutral">Cancel</Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {!isAvailable && !isOwner && (
        <PageSection style={{ marginTop: 16 }}>
          <Badge variant="warning">This ride is no longer available for booking.</Badge>
        </PageSection>
      )}

      {/* Ride Requests (Owner Only) */}
      {isOwner && requests.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>Ride Requests</h2>
            {canComplete && (
              <Button
                onClick={async () => {
                  if (!confirm('Mark this ride as completed? This will allow passengers to leave reviews.')) return;
                  try {
                    const res = await fetch(`/api/carpools/${id}`, { 
                      method: 'PATCH', 
                      headers: { 'Content-Type': 'application/json' }, 
                      credentials: 'include', 
                      body: JSON.stringify({ action: 'complete' }) 
                    });
                    if (!res.ok) {
                      const j = await res.json().catch(()=>({}));
                      alert(j.error || 'Failed to mark as completed');
                      return;
                    }
                    const j = await res.json();
                    setRide((prev:any) => ({ ...prev, status: 'completed' }));
                    alert('Ride marked as completed! Passengers can now leave reviews.');
                  } catch (e) {
                    console.error('Complete ride error', e);
                    alert('Failed to complete ride');
                  }
                }}
                variant="success"
                disabled={rideStatus === 'completed'}
              >
                {rideStatus === 'completed' ? '✓ Completed' : '✓ Mark Ride as Completed'}
              </Button>
            )}
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {requests.map(req => (
              <Card key={req._id} style={{ backgroundColor: req.status === 'pending' ? '#fff' : req.status === 'accepted' ? '#e8f5e9' : '#ffebee' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div style={{ fontWeight: 'bold' }}>
                        {req.passengerId?.name || req.passengerId?.email || 'Unknown User'}
                      </div>
                      {req.passengerId && (
                        <UserRating userId={req.passengerId} size={14} showText={true} />
                      )}
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
                  <Badge variant={req.status === 'pending' ? 'warning' : req.status === 'accepted' ? 'success' : 'danger'}>
                    {req.status.toUpperCase()}
                  </Badge>
                </div>
                {req.status === 'pending' && (
                  <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                    <Button onClick={() => handleRequestAction(req._id, 'accept')} size="sm" variant="success">Accept</Button>
                    <Button onClick={() => handleRequestAction(req._id, 'decline')} size="sm" variant="danger">Decline</Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <Button onClick={() => router.push('/carpools')} variant="outline">Back to list</Button>
      </div>
    </div>
  );
}