'use client';
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type RideDemand = {
  _id: string;
  passengerId: any;
  title?: string;
  origin: { address: string };
  destination: { address: string };
  dateTime: string;
  seatsNeeded: number;
  maxPrice: number;
  notes?: string;
  status: string;
};

export default function RideDemandsPage() {
  const router = useRouter();
  const [myDemands, setMyDemands] = React.useState<RideDemand[]>([]);
  const [otherDemands, setOtherDemands] = React.useState<RideDemand[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<'browse' | 'my-requests'>('browse');

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // Fetch current user and all demands
        const [userRes, demandsRes] = await Promise.all([
          fetch('/api/carpools', { credentials: 'include' }),
          fetch('/api/ride-demands?status=open', { credentials: 'include' })
        ]);

        let userId = null;
        if (userRes.ok) {
          const userData = await userRes.json();
          userId = userData.currentUserId;
          if (mounted) setCurrentUserId(userId);
        }

        if (demandsRes.ok) {
          const demands = await demandsRes.json();
          
          if (mounted) {
            const my: RideDemand[] = [];
            const others: RideDemand[] = [];

            for (const demand of demands) {
              const demandOwnerId = typeof demand.passengerId === 'string' 
                ? demand.passengerId 
                : demand.passengerId?._id;
              
              if (userId && demandOwnerId === userId) {
                my.push(demand);
              } else {
                others.push(demand);
              }
            }

            setMyDemands(my);
            setOtherDemands(others);
          }
        }
      } catch (err) {
        console.error('Failed to fetch ride demands', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, []);

  const handleDelete = async (demandId: string) => {
    if (!confirm('Are you sure you want to delete this ride request?')) return;

    try {
      const res = await fetch(`/api/ride-demands/${demandId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!res.ok) {
        const json = await res.json();
        alert(json.error || 'Failed to delete ride demand');
        return;
      }

      setMyDemands(prev => prev.filter(d => d._id !== demandId));
      alert('Ride request deleted successfully');
    } catch (err) {
      console.error('Failed to delete ride demand', err);
      alert('Failed to delete ride demand');
    }
  };

  const renderDemandCard = (demand: RideDemand, isOwn = false) => {
    const isOpen = demand.status === 'open';
    const passengerName = typeof demand.passengerId === 'object' 
      ? demand.passengerId?.name || demand.passengerId?.email 
      : 'User';

    return (
      <div
        key={demand._id}
        style={{
          border: '1px solid #ddd',
          padding: 16,
          borderRadius: 6,
          backgroundColor: isOpen ? 'white' : '#f5f5f5',
          opacity: isOpen ? 1 : 0.7
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <h3 style={{ margin: 0 }}>{demand.title || 'Ride Request'}</h3>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  backgroundColor: isOpen ? '#4CAF50' : '#999',
                  color: 'white'
                }}
              >
                {demand.status.toUpperCase()}
              </span>
            </div>

            {!isOwn && (
              <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: 8 }}>
                Requested by: {passengerName}
              </div>
            )}

            <div style={{ display: 'grid', gap: 4, fontSize: '0.9rem', marginBottom: 8 }}>
              <div>
                <strong>From:</strong> {demand.origin.address}
              </div>
              <div>
                <strong>To:</strong> {demand.destination.address}
              </div>
              <div>
                <strong>Date:</strong> {new Date(demand.dateTime).toLocaleString()}
              </div>
              <div>
                <strong>Seats needed:</strong> {demand.seatsNeeded}
              </div>
              {demand.maxPrice > 0 && (
                <div>
                  <strong>Max price:</strong> ${demand.maxPrice.toFixed(2)}
                </div>
              )}
            </div>

            {demand.notes && (
              <div style={{ fontSize: '0.85rem', color: '#555', fontStyle: 'italic', marginTop: 8 }}>
                {demand.notes}
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <Link href={`/ride-demands/${demand._id}`}>
            <button style={{ padding: '6px 12px', borderRadius: 4 }}>View Details</button>
          </Link>
          {isOwn && (
            <button
              onClick={() => handleDelete(demand._id)}
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
    );
  };

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
            <h1 style={{ margin: '0 0 8px 0', fontSize: '2rem' }}>🙋 Ride Requests</h1>
            <p style={{ margin: 0, color: '#666' }}>Request rides or offer yours to passengers</p>
          </div>
          <Link href="/ride-demands/create">
            <button style={{
              backgroundColor: '#FF9800',
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
              <span style={{ fontSize: '1.2rem' }}>+</span> Request a Ride
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
            🔍 Browse Requests ({otherDemands.length})
          </button>
          <button
            onClick={() => setActiveTab('my-requests')}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '1rem',
              borderBottom: activeTab === 'my-requests' ? '3px solid #FF9800' : '3px solid transparent',
              color: activeTab === 'my-requests' ? '#FF9800' : '#666',
              transition: 'all 0.2s',
              marginBottom: '-2px'
            }}
          >
            📝 My Requests ({myDemands.length})
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 48, fontSize: '1.2rem', color: '#666' }}>
          Loading requests...
        </div>
      )}

      {!loading && (
        <>
          {/* Browse Requests Tab */}
          {activeTab === 'browse' && (
            <div>
              {otherDemands.length === 0 ? (
                <div style={{
                  backgroundColor: 'white',
                  padding: 48,
                  borderRadius: 12,
                  textAlign: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: 16 }}>🙋</div>
                  <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>No ride requests yet</h3>
                  <p style={{ margin: 0, color: '#666' }}>Check back later for new requests</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 16 }}>
                  {otherDemands.map(d => renderDemandCard(d, false))}
                </div>
              )}
            </div>
          )}

          {/* My Requests Tab */}
          {activeTab === 'my-requests' && (
            <div>
              {myDemands.length === 0 ? (
                <div style={{
                  backgroundColor: 'white',
                  padding: 48,
                  borderRadius: 12,
                  textAlign: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: 16 }}>📝</div>
                  <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>You haven't requested any rides yet</h3>
                  <p style={{ margin: '0 0 16px 0', color: '#666' }}>Create your first ride request!</p>
                  <Link href="/ride-demands/create">
                    <button style={{
                      backgroundColor: '#FF9800',
                      color: 'white',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '1rem'
                    }}>
                      + Request a Ride
                    </button>
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 16 }}>
                  {myDemands.map(d => renderDemandCard(d, true))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
