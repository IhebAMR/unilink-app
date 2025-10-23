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
  origin?: any;
  destination?: any;
  route?: { coordinates?: [number, number][] };
};

export default function CarpoolsListPage() {
  const [myRides, setMyRides] = React.useState<Ride[]>([]);
  const [otherRides, setOtherRides] = React.useState<Ride[]>([]);
  const [loading, setLoading] = React.useState(true);

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
    const rideStatus = (r as any).status || 'open';
    const isAvailable = rideStatus === 'open' && r.seatsAvailable > 0;
    
    return (
      <div key={r._id} style={{ 
        border: '1px solid #ddd', 
        padding: 12, 
        borderRadius: 6, 
        display: 'flex', 
        gap: 12,
        opacity: isAvailable ? 1 : 0.7
      }}>
        <div style={{ width: 240 }}>
          <MapPreview coords={r.route?.coordinates || []} height={140} zoom={11} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h3 style={{ margin: 0 }}>{r.title || 'Ride'}</h3>
            <div style={{ 
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: '0.75rem',
              fontWeight: 'bold',
              backgroundColor: isAvailable ? '#4CAF50' : '#FF9800',
              color: 'white'
            }}>
              {isAvailable ? 'Available' : 'Full'}
            </div>
          </div>
          <div style={{ fontSize: '0.9rem', marginTop: 4 }}>
            Date: {new Date(r.dateTime).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.9rem' }}>
            Seats: <strong>{r.seatsAvailable}</strong>/{r.seatsTotal}
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <Link href={`/carpools/${r._id}`}><button>View Details</button></Link>
            {isOwn && (
              <button
                onClick={() => handleDelete(r._id)}
                style={{
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Carpool Rides</h1>
        <Link href="/carpools/create"><button>Offer a ride</button></Link>
      </div>

      {loading && <div>Loading...</div>}

      {!loading && (
        <>
          {/* My Rides Section */}
          {myRides.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ 
                fontSize: '1.5rem', 
                marginBottom: 16, 
                paddingBottom: 8, 
                borderBottom: '2px solid #4CAF50' 
              }}>
                My Rides ({myRides.length})
              </h2>
              <div style={{ display: 'grid', gap: 12 }}>
                {myRides.map(r => renderRideCard(r, true))}
              </div>
            </div>
          )}

          {/* Other Rides Section */}
          <div>
            <h2 style={{ 
              fontSize: '1.5rem', 
              marginBottom: 16, 
              paddingBottom: 8, 
              borderBottom: '2px solid #2196F3' 
            }}>
              Available Rides ({otherRides.length})
            </h2>
            {otherRides.length === 0 ? (
              <div>No rides available from other users.</div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {otherRides.map(r => renderRideCard(r, false))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}