'use client';
import React from 'react';
import Link from 'next/link';
import MapPreview from '@/app/components/MapPreview';

type Ride = {
  _id: string;
  ownerId: string;
  title?: string;
  dateTime: string;
  seatsAvailable: number;
  seatsTotal: number;
  price?: number;
  origin?: any;
  destination?: any;
  route?: { coordinates?: [number, number][] };
  status?: string;
};

export default function CarpoolsListPage() {
  const [myRides, setMyRides] = React.useState<Ride[]>([]);
  const [otherRides, setOtherRides] = React.useState<Ride[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filterStatus, setFilterStatus] = React.useState<'all' | 'available' | 'full'>('all');
  const [activeTab, setActiveTab] = React.useState<'browse' | 'my-rides'>('browse');

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/carpools', { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        
        if (mounted) {
          const { rides, currentUserId } = json;
          
          // Separate rides into user's own and others
          const my: Ride[] = [];
          const others: Ride[] = [];
          
          for (const ride of rides) {
            if (currentUserId && ride.ownerId === currentUserId) {
              my.push(ride);
            } else {
              others.push(ride);
            }
          }
          
          setMyRides(my);
          setOtherRides(others);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleDelete = async (rideId: string) => {
    if (!confirm('Are you sure you want to delete this ride?')) return;
    
    try {
      const res = await fetch(`/api/carpools/${rideId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!res.ok) {
        const json = await res.json();
        alert(json.error || 'Failed to delete ride');
        return;
      }
      
      // Remove the ride from the list
      setMyRides(prev => prev.filter(r => r._id !== rideId));
    } catch (err) {
      console.error('Failed to delete ride', err);
      alert('Failed to delete ride');
    }
  };

  const renderRideCard = (r: Ride, isOwn = false) => {
    const rideStatus = r.status || 'open';
    const isAvailable = rideStatus === 'open' && r.seatsAvailable > 0;
    
    return (
      <div key={r._id} style={{ 
        border: '1px solid #e0e0e0', 
        padding: 16, 
        borderRadius: 12, 
        display: 'flex', 
        gap: 16,
        backgroundColor: 'white',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        transition: 'all 0.2s',
        opacity: isAvailable ? 1 : 0.7,
        position: 'relative'
      }}>
        {/* Status Badge */}
        <div style={{ 
          position: 'absolute',
          top: 12,
          right: 12,
          padding: '4px 12px',
          borderRadius: 20,
          fontSize: '0.75rem',
          fontWeight: 'bold',
          backgroundColor: isAvailable ? '#4CAF50' : rideStatus === 'full' ? '#FF9800' : '#999',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 4
        }}>
          {isAvailable ? '✓ Available' : rideStatus === 'full' ? '⊗ Full' : rideStatus.toUpperCase()}
        </div>

        {/* Map Preview */}
        <div style={{ width: 280, flexShrink: 0 }}>
          <MapPreview coords={r.route?.coordinates || []} height={180} zoom={11} />
        </div>

        {/* Ride Info */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '1.3rem', color: '#333' }}>
            {r.title || 'Carpool Ride'}
          </h3>

          <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
            {/* Origin & Destination */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ fontSize: '1.2rem' }}>📍</span>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#666' }}>From</div>
                <div style={{ fontWeight: 500 }}>{r.origin?.address || '—'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ fontSize: '1.2rem' }}>🎯</span>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#666' }}>To</div>
                <div style={{ fontWeight: 500 }}>{r.destination?.address || '—'}</div>
              </div>
            </div>

            {/* Date & Time */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.2rem' }}>🗓️</span>
              <div>
                <span style={{ fontWeight: 500 }}>{new Date(r.dateTime).toLocaleDateString()}</span>
                <span style={{ marginLeft: 8, color: '#666' }}>{new Date(r.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

            {/* Seats & Price */}
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.2rem' }}>💺</span>
                <span><strong>{r.seatsAvailable}</strong>/{r.seatsTotal} seats</span>
              </div>
              {r.price && r.price > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '1.2rem' }}>💰</span>
                  <span style={{ fontWeight: 500, color: '#4CAF50' }}>${r.price.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
            <Link href={`/carpools/${r._id}`}>
              <button style={{
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '0.95rem'
              }}>
                {isOwn ? 'Manage Ride' : 'View & Book'}
              </button>
            </Link>
            {isOwn && (
              <button
                onClick={() => handleDelete(r._id)}
                style={{
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: '0.95rem'
                }}
              >
                🗑️ Delete
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Filter rides based on status
  const getFilteredRides = (rides: Ride[]) => {
    if (filterStatus === 'all') return rides;
    if (filterStatus === 'available') {
      return rides.filter(r => (r.status || 'open') === 'open' && r.seatsAvailable > 0);
    }
    if (filterStatus === 'full') {
      return rides.filter(r => r.status === 'full' || r.seatsAvailable === 0);
    }
    return rides;
  };

  const filteredOtherRides = getFilteredRides(otherRides);
  const filteredMyRides = getFilteredRides(myRides);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 16, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: 24, 
        borderRadius: 12, 
        marginBottom: 24,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '2rem' }}>🚗 Carpooling</h1>
            <p style={{ margin: 0, color: '#666' }}>Find rides or offer your own</p>
          </div>
          <Link href="/carpools/create">
            <button style={{
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <span style={{ fontSize: '1.2rem' }}>+</span> Offer a Ride
            </button>
          </Link>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid #e0e0e0' }}>
          <button
            onClick={() => setActiveTab('browse')}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '1rem',
              borderBottom: activeTab === 'browse' ? '3px solid #2196F3' : '3px solid transparent',
              color: activeTab === 'browse' ? '#2196F3' : '#666',
              transition: 'all 0.2s',
              marginBottom: '-2px'
            }}
          >
            🔍 Browse Rides ({otherRides.length})
          </button>
          <button
            onClick={() => setActiveTab('my-rides')}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '1rem',
              borderBottom: activeTab === 'my-rides' ? '3px solid #4CAF50' : '3px solid transparent',
              color: activeTab === 'my-rides' ? '#4CAF50' : '#666',
              transition: 'all 0.2s',
              marginBottom: '-2px'
            }}
          >
            🚙 My Rides ({myRides.length})
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 48, fontSize: '1.2rem', color: '#666' }}>
          Loading rides...
        </div>
      )}

      {!loading && (
        <>
          {/* Filters */}
          <div style={{ 
            backgroundColor: 'white', 
            padding: 16, 
            borderRadius: 12, 
            marginBottom: 24,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: 16
          }}>
            <span style={{ fontWeight: 600, color: '#666' }}>Filter:</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['all', 'available', 'full'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  style={{
                    padding: '8px 16px',
                    border: filterStatus === status ? '2px solid #2196F3' : '1px solid #ddd',
                    backgroundColor: filterStatus === status ? '#E3F2FD' : 'white',
                    color: filterStatus === status ? '#2196F3' : '#666',
                    borderRadius: 20,
                    cursor: 'pointer',
                    fontWeight: filterStatus === status ? 600 : 400,
                    fontSize: '0.9rem',
                    transition: 'all 0.2s'
                  }}
                >
                  {status === 'all' && '🔘 All'}
                  {status === 'available' && '✓ Available'}
                  {status === 'full' && '⊗ Full'}
                </button>
              ))}
            </div>
          </div>

          {/* Browse Rides Tab */}
          {activeTab === 'browse' && (
            <div>
              {filteredOtherRides.length === 0 ? (
                <div style={{ 
                  backgroundColor: 'white', 
                  padding: 48, 
                  borderRadius: 12,
                  textAlign: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: 16 }}>🚗</div>
                  <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>No rides found</h3>
                  <p style={{ margin: 0, color: '#666' }}>
                    {filterStatus !== 'all' 
                      ? 'Try changing the filter or check back later.' 
                      : 'Be the first to offer a ride!'}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 16 }}>
                  {filteredOtherRides.map(r => renderRideCard(r, false))}
                </div>
              )}
            </div>
          )}

          {/* My Rides Tab */}
          {activeTab === 'my-rides' && (
            <div>
              {filteredMyRides.length === 0 ? (
                <div style={{ 
                  backgroundColor: 'white', 
                  padding: 48, 
                  borderRadius: 12,
                  textAlign: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: 16 }}>🚙</div>
                  <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>
                    {myRides.length === 0 ? "You haven't offered any rides yet" : 'No rides match the filter'}
                  </h3>
                  <p style={{ margin: '0 0 16px 0', color: '#666' }}>
                    {myRides.length === 0 
                      ? 'Create your first ride and start carpooling!' 
                      : 'Try changing the filter.'}
                  </p>
                  {myRides.length === 0 && (
                    <Link href="/carpools/create">
                      <button style={{
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        padding: '12px 24px',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '1rem'
                      }}>
                        + Offer a Ride
                      </button>
                    </Link>
                  )}
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 16 }}>
                  {filteredMyRides.map(r => renderRideCard(r, true))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}