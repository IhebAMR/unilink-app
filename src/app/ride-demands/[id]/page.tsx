'use client';
import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import MapPreview from '@/app/components/MapPreview';
import BackButton from '@/app/components/BackButton';

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
            // Filter only my rides that are still available (status: 'open' means available)
            const myAvailableRides = ridesData.rides.filter((r: any) => {
              const rideOwnerId = typeof r.ownerId === 'string' ? r.ownerId : r.ownerId?._id || r.ownerId?.toString();
              return rideOwnerId === ridesData.currentUserId && (r.status === 'open' || r.status === 'available') && r.seatsAvailable > 0;
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
      }
    } catch (err) {
      console.error(`Failed to ${action} offer`, err);
      alert(`Failed to ${action} offer`);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return (
    <div style={{ padding: 16 }}>
      <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>
      <button onClick={() => router.push('/ride-demands')}>Back to list</button>
    </div>
  );
  if (!demand) return <div>Ride demand not found.</div>;

  const isOwner = currentUserId && demand.passengerId &&
    (typeof demand.passengerId === 'string' ? demand.passengerId === currentUserId : demand.passengerId._id === currentUserId);

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
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>{demand.title || 'Ride Request'}</h1>
          <div
            style={{
              marginTop: 8,
              padding: '4px 12px',
              borderRadius: 4,
              display: 'inline-block',
              fontSize: '0.85rem',
              fontWeight: 'bold',
              backgroundColor: demand.status === 'open' ? '#4CAF50' : '#999',
              color: 'white'
            }}
          >
            {demand.status.toUpperCase()}
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
            {deleting ? 'Deleting...' : 'Delete Request'}
          </button>
        )}
      </div>

      {demand.passengerId && typeof demand.passengerId === 'object' && (
        <div style={{ marginBottom: 12, fontSize: '0.9rem', color: '#666' }}>
          Requested by: {demand.passengerId.name || demand.passengerId.email}
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
        <button onClick={() => router.push('/ride-demands')}>Back to list</button>
        {!isOwner && demand.status === 'open' && (
          <button
            style={{
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 4,
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
            onClick={() => setShowOfferDialog(true)}
          >
            Offer a Ride
          </button>
        )}
      </div>

      {/* Offers Section */}
      {demand.offers && demand.offers.length > 0 && (
        <div style={{ marginTop: 32, padding: 16, backgroundColor: '#f9f9f9', borderRadius: 8 }}>
          <h3>Ride Offers ({demand.offers.length})</h3>
          {demand.offers.map((offer: any) => (
            <div
              key={offer._id}
              style={{
                backgroundColor: 'white',
                padding: 16,
                marginTop: 12,
                borderRadius: 8,
                border: '1px solid #ddd'
              }}
            >
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
                  <div
                    style={{
                      marginTop: 8,
                      padding: '4px 8px',
                      borderRadius: 4,
                      display: 'inline-block',
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      backgroundColor:
                        offer.status === 'accepted' ? '#4CAF50' :
                        offer.status === 'declined' ? '#f44336' : '#ff9800',
                      color: 'white'
                    }}
                  >
                    {offer.status.toUpperCase()}
                  </div>
                </div>
                {isOwner && offer.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleOfferAction(offer._id, 'accept')}
                      style={{
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                      }}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleOfferAction(offer._id, 'decline')}
                      style={{
                        backgroundColor: '#f44336',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                      }}
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
              {offer.carpoolRideId && (
                <button
                  onClick={() => router.push(`/carpools/${offer.carpoolRideId}`)}
                  style={{
                    marginTop: 12,
                    backgroundColor: '#1e90ff',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  View Ride Details
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Offer Dialog */}
      {showOfferDialog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowOfferDialog(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: 24,
              borderRadius: 12,
              maxWidth: 500,
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>Offer a Ride</h3>
            
            {myRides.length === 0 ? (
              <div>
                <p>You don't have any available rides to offer.</p>
                <button
                  onClick={() => router.push('/carpools/create')}
                  style={{
                    backgroundColor: '#1e90ff',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: 4,
                    cursor: 'pointer',
                    marginTop: 12
                  }}
                >
                  Create a Ride
                </button>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                    Select a ride to offer:
                  </label>
                  <select
                    value={selectedRide}
                    onChange={(e) => setSelectedRide(e.target.value)}
                    style={{
                      width: '100%',
                      padding: 8,
                      borderRadius: 4,
                      border: '1px solid #ddd'
                    }}
                  >
                    <option value="">-- Select a ride --</option>
                    {myRides.map((ride) => (
                      <option key={ride._id} value={ride._id}>
                        {ride.title} - {new Date(ride.dateTime).toLocaleDateString()} ({ride.seatsAvailable} seats available)
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                    Message (optional):
                  </label>
                  <textarea
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
                  <button
                    onClick={() => setShowOfferDialog(false)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 4,
                      border: '1px solid #ddd',
                      background: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleOfferRide}
                    disabled={submitting || !selectedRide}
                    style={{
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: 4,
                      cursor: submitting || !selectedRide ? 'not-allowed' : 'pointer',
                      opacity: submitting || !selectedRide ? 0.6 : 1
                    }}
                  >
                    {submitting ? 'Sending...' : 'Send Offer'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
