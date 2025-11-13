'use client';
import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import MapPreview from '@/app/components/MapPreview';
import BackButton from '@/app/components/BackButton';
import Button from '@/app/components/ui/Button';
import Badge from '@/app/components/ui/Badge';
import Card from '@/app/components/ui/Card';
import PageSection from '@/app/components/ui/PageSection';
import Modal from '@/app/components/ui/Modal';
import UserRating from '@/app/components/UserRating';
import AIMatchCard from '@/app/components/AIMatchCard';

export default function RideDemandDetailPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const router = useRouter();

  const [demand, setDemand] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const [myRides, setMyRides] = React.useState<any[]>([]);
  const [showOfferDialog, setShowOfferDialog] = React.useState(false);
  const [selectedRide, setSelectedRide] = React.useState<string>('');
  const [offerMessage, setOfferMessage] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [aiMatches, setAiMatches] = React.useState<any[]>([]);
  const [loadingAI, setLoadingAI] = React.useState(false);
  const [showAIMatches, setShowAIMatches] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    if (!id) {
      setError('Missing demand id');
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const [demandRes, ridesRes] = await Promise.all([
          fetch(`/api/ride-demands/${id}`, { credentials: 'include' }),
          fetch('/api/carpools', { credentials: 'include' })
        ]);

        if (!demandRes.ok) {
          const txt = await demandRes.text();
          console.error('GET /api/ride-demands/:id failed', demandRes.status, txt);
          if (mounted) setError(demandRes.status === 404 ? 'Ride demand not found' : 'Failed to fetch ride demand');
          return;
        }

        const demandJson = await demandRes.json();
        if (mounted) setDemand(demandJson);

        if (ridesRes.ok) {
          const ridesData = await ridesRes.json();
          if (mounted) {
            setCurrentUserId(ridesData.currentUserId);
            // Filter only my rides and annotate whether already offered
            const myAvailableRides = ridesData.rides
              .filter((r: any) => {
                const rideOwnerId = typeof r.ownerId === 'string' ? r.ownerId : r.ownerId?._id || r.ownerId?.toString();
                return rideOwnerId === ridesData.currentUserId && (r.status === 'open' || r.status === 'available') && r.seatsAvailable > 0;
              })
              .map((r: any) => {
                const alreadyOffered = demandJson?.offers?.some((o: any) => o.driverId && (typeof o.driverId === 'string' ? o.driverId === ridesData.currentUserId : o.driverId._id === ridesData.currentUserId) && o.carpoolRideId === r._id);
                return { ...r, alreadyOffered };
              });
            setMyRides(myAvailableRides);
          }
        }
      } catch (err) {
        console.error('Failed to fetch ride demand', err);
        if (mounted) setError('Failed to fetch ride demand');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm('Are you sure you want to delete this ride request?')) return;

    try {
      setDeleting(true);
      const res = await fetch(`/api/ride-demands/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!res.ok) {
        const json = await res.json();
        alert(json.error || 'Failed to delete ride demand');
        return;
      }

      router.push('/ride-demands');
    } catch (err) {
      console.error('Failed to delete ride demand', err);
      alert('Failed to delete ride demand');
    } finally {
      setDeleting(false);
    }
  };

  const handleOfferRide = async () => {
    if (!selectedRide) {
      alert('Please select a ride to offer');
      return;
    }

    const rideObj = myRides.find(r => r._id === selectedRide);
    if (rideObj?.alreadyOffered) {
      alert('You have already offered this ride to this request');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/ride-demands/${id}/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          carpoolRideId: selectedRide,
          message: offerMessage
        })
      });

      if (!res.ok) {
        const json = await res.json();
        alert(json.error || 'Failed to offer ride');
        return;
      }

      alert('Ride offer sent successfully! The passenger will be notified.');
      setShowOfferDialog(false);
      setSelectedRide('');
      setOfferMessage('');
      
      // Refresh demand data
      const demandRes = await fetch(`/api/ride-demands/${id}`, { credentials: 'include' });
      if (demandRes.ok) {
        const demandJson = await demandRes.json();
        setDemand(demandJson);
        // Update myRides alreadyOffered flags
        setMyRides(prev => prev.map(r => ({ ...r, alreadyOffered: r._id === selectedRide ? true : r.alreadyOffered })));
      }
    } catch (err) {
      console.error('Failed to offer ride', err);
      alert('Failed to offer ride');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOfferAction = async (offerId: string, action: 'accept' | 'decline') => {
    if (!confirm(`Are you sure you want to ${action} this offer?`)) return;

    try {
      const res = await fetch(`/api/ride-demands/${id}/offers`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ offerId, action })
      });

      if (!res.ok) {
        const json = await res.json();
        alert(json.error || `Failed to ${action} offer`);
        return;
      }

      alert(`Offer ${action}ed successfully!`);
      
      // Refresh demand data
      const demandRes = await fetch(`/api/ride-demands/${id}`, { credentials: 'include' });
      if (demandRes.ok) {
        const demandJson = await demandRes.json();
        setDemand(demandJson);
        // If the passenger (owner of this demand) accepted an offer, send them to History
        // This is the case where the requester accepted a driver's offer.
        if (action === 'accept') {
          router.push('/history');
        }
      }
    } catch (err) {
      console.error(`Failed to ${action} offer`, err);
      alert(`Failed to ${action} offer`);
    }
  };

  if (loading) return <div style={{ padding: 16 }}>Loading...</div>;
  if (error) return (
    <div style={{ padding: 16 }}>
      <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>
      <Button onClick={() => router.push('/ride-demands')} variant="outline">Back to list</Button>
    </div>
  );
  if (!demand) return <div>Ride demand not found.</div>;

  const isOwner = currentUserId && demand.passengerId &&
    (typeof demand.passengerId === 'string' 
      ? demand.passengerId === currentUserId 
      : (demand.passengerId._id?.toString?.() === currentUserId || demand.passengerId.toString?.() === currentUserId));

  const routeCoords = [];
  if (demand.origin?.location?.coordinates) {
    routeCoords.push(demand.origin.location.coordinates);
  }
  if (demand.destination?.location?.coordinates) {
    routeCoords.push(demand.destination.location.coordinates);
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>
      <BackButton label="Back to Requests" href="/ride-demands" />
      
      <PageSection style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <h1 style={{ margin: 0 }}>{demand.title || 'Ride Request'}</h1>
            <div style={{ marginTop: 8 }}>
              <Badge variant={demand.status === 'open' ? 'success' : 'neutral'}>{demand.status.toUpperCase()}</Badge>
            </div>
          </div>
          {isOwner && (
            <Button onClick={handleDelete} disabled={deleting} variant="danger">
              {deleting ? 'Deleting…' : 'Delete Request'}
            </Button>
          )}
        </div>

      {demand.passengerId && typeof demand.passengerId === 'object' && (
        <div style={{ marginBottom: 12, fontSize: '0.9rem', color: '#666', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>Requested by: {demand.passengerId.name || demand.passengerId.email}</span>
          <UserRating userId={demand.passengerId} size={14} showText={true} />
        </div>
      )}

      <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
        <div>
          <strong>From:</strong> {demand.origin?.address || '—'}
        </div>
        <div>
          <strong>To:</strong> {demand.destination?.address || '—'}
        </div>
        <div>
          <strong>Date & Time:</strong> {demand.dateTime ? new Date(demand.dateTime).toLocaleString() : '—'}
        </div>
        <div>
          <strong>Seats Needed:</strong> {demand.seatsNeeded || 1}
        </div>
        {demand.maxPrice > 0 && (
          <div>
            <strong>Maximum Price:</strong> ${demand.maxPrice.toFixed(2)}
          </div>
        )}
      </div>

      {routeCoords.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h3>Route</h3>
          <MapPreview coords={routeCoords} height={360} zoom={12} />
        </div>
      )}

      {demand.notes && (
        <div style={{ marginTop: 16 }}>
          <h3>Additional Notes</h3>
          <p>{demand.notes}</p>
        </div>
      )}

      <div style={{ marginTop: 24, display: 'flex', gap: 8 }}>
        <Button onClick={() => router.push('/ride-demands')} variant="outline">Back to list</Button>
        {!isOwner && demand.status === 'open' && (
          <Button variant="success" onClick={() => setShowOfferDialog(true)}>Offer a Ride</Button>
        )}
      </div>

      </PageSection>

      {/* AI Matching Section - Show for owners of open demands */}
      {demand && demand.status === 'open' && isOwner && (
  <PageSection {...({ id: 'ai-matches' } as any)} style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h2 style={{ margin: '0 0 4px 0', fontSize: '1.3rem' }}>
                🤖 AI-Powered Ride Matching
              </h2>
              <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
                Find the best rides that match your route and preferences
              </p>
            </div>
            <Button
              variant="primary"
              onClick={async () => {
                if (showAIMatches) {
                  setShowAIMatches(false);
                  return;
                }
                setLoadingAI(true);
                try {
                  const res = await fetch(`/api/ai/match-rides?demandId=${id}`, {
                    credentials: 'include'
                  });
                  if (res.ok) {
                    const data = await res.json();
                    setAiMatches(data.matches || []);
                    setShowAIMatches(true);
                  } else {
                    alert('Failed to find AI matches');
                  }
                } catch (err) {
                  console.error('AI matching error', err);
                  alert('Failed to find AI matches');
                } finally {
                  setLoadingAI(false);
                }
              }}
              disabled={loadingAI}
            >
              {loadingAI ? 'Finding Matches...' : showAIMatches ? 'Hide Matches' : 'Find AI Matches'}
            </Button>
          </div>

          {showAIMatches && (
            <div>
              {aiMatches.length === 0 ? (
                <Card style={{ padding: 24, textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 8 }}>🤖</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 4 }}>
                    No matches found
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#666' }}>
                    Try adjusting your route or time preferences
                  </div>
                </Card>
              ) : (
                <div style={{ display: 'grid', gap: 16 }}>
                  {aiMatches.map((match, index) => (
                    <AIMatchCard key={match.ride._id} match={match} />
                  ))}
                </div>
              )}
            </div>
          )}
        </PageSection>
      )}

      {/* Offers Section */}
      {demand.offers && demand.offers.length > 0 && (
        <PageSection style={{ marginTop: 32 }}>
          <h3>Ride Offers ({demand.offers.length})</h3>
          {demand.offers.map((offer: any) => (
            <Card key={offer._id} style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                    Driver: {offer.driverId?.name || offer.driverId?.email || 'Unknown'}
                  </div>
                  {offer.message && (
                    <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: 8 }}>
                      Message: {offer.message}
                    </div>
                  )}
                  <div style={{ fontSize: '0.85rem', color: '#999' }}>
                    Offered: {new Date(offer.offeredAt).toLocaleString()}
                  </div>
                  <Badge variant={offer.status === 'accepted' ? 'success' : offer.status === 'declined' ? 'danger' : 'warning'}>
                    {offer.status.toUpperCase()}
                  </Badge>
                </div>
                {isOwner && offer.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button onClick={() => handleOfferAction(offer._id, 'accept')} size="sm" variant="success">Accept</Button>
                    <Button onClick={() => handleOfferAction(offer._id, 'decline')} size="sm" variant="danger">Decline</Button>
                  </div>
                )}
              </div>
              {offer.carpoolRideId && (
                <Button onClick={() => router.push(`/carpools/${offer.carpoolRideId}`)} variant="primary" size="sm" style={{ marginTop: 12 }}>
                  View Ride Details
                </Button>
              )}
            </Card>
          ))}
        </PageSection>
      )}

      {/* Offer Dialog */}
      <Modal
        open={showOfferDialog}
        onClose={() => setShowOfferDialog(false)}
        title="Offer a Ride"
      >
        {myRides.length === 0 ? (
          <div>
            <p>You don't have any available rides to offer.</p>
            <Button onClick={() => router.push('/carpools/create')} variant="primary" style={{ marginTop: 12 }}>
              Create a Ride
            </Button>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="ride-select" style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                Select a ride to offer:
              </label>
              <select
                id="ride-select"
                value={selectedRide}
                onChange={(e) => setSelectedRide(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 4,
                  border: '1px solid #ddd',
                  fontSize: '16px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value="">-- Select a ride --</option>
                {myRides.map((ride) => (
                  <option key={ride._id} value={ride._id} disabled={ride.alreadyOffered}>
                    {ride.title} - {new Date(ride.dateTime).toLocaleDateString()} ({ride.seatsAvailable} seats) {ride.alreadyOffered ? '— already offered' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label htmlFor="offer-message" style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                Message (optional):
              </label>
              <textarea
                id="offer-message"
                value={offerMessage}
                onChange={(e) => setOfferMessage(e.target.value)}
                placeholder="Add a message for the passenger..."
                rows={4}
                style={{
                  width: '100%',
                  padding: 8,
                  borderRadius: 4,
                  border: '1px solid #ddd',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button onClick={() => setShowOfferDialog(false)} variant="outline">Cancel</Button>
              <Button onClick={handleOfferRide} disabled={submitting || !selectedRide || myRides.find(r => r._id === selectedRide)?.alreadyOffered} variant="success">
                {submitting ? 'Sending…' : myRides.find(r => r._id === selectedRide)?.alreadyOffered ? 'Already Offered' : 'Send Offer'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
