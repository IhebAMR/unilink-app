'use client';
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { saveMyRequests, getMyRequests, saveUserId, getUserId } from '@/app/lib/offlineStorage';
import { useOnlineStatus } from '@/app/lib/useOnlineStatus';
import Button from '@/app/components/ui/Button';
import Card from '@/app/components/ui/Card';
import Badge from '@/app/components/ui/Badge';
import PageSection from '@/app/components/ui/PageSection';
import UserRating from '@/app/components/UserRating';

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
  const networkOnline = useOnlineStatus();
  const [myDemands, setMyDemands] = React.useState<RideDemand[]>([]);
  const [otherDemands, setOtherDemands] = React.useState<RideDemand[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<'browse' | 'my-requests'>('browse');
  const [isOffline, setIsOffline] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // If network is offline, load from cache immediately
        if (!networkOnline) {
          const cachedRequests = await getMyRequests();
          const cachedUserId = await getUserId();
          
          if (mounted && cachedRequests.length > 0) {
            setMyDemands(cachedRequests);
            setCurrentUserId(cachedUserId);
            setIsOffline(true);
            setLoading(false);
          }
          return;
        }

        // Fetch current user and all demands
        const [userRes, demandsRes] = await Promise.all([
          fetch('/api/carpools', { credentials: 'include' }),
          fetch('/api/ride-demands?status=open', { credentials: 'include' })
        ]);

        const isCached = demandsRes.headers.get('X-Cached-Response') === 'true';

        let userId = null;
        if (userRes.ok) {
          const userData = await userRes.json();
          userId = userData.currentUserId;
          if (mounted) setCurrentUserId(userId);
        }

        if (!demandsRes.ok && !isCached) {
          // Load from IndexedDB as fallback
          const cachedRequests = await getMyRequests();
          const cachedUserId = await getUserId();
          
          if (mounted && cachedRequests.length > 0) {
            setMyDemands(cachedRequests);
            setCurrentUserId(cachedUserId);
            setIsOffline(true);
            setLoading(false);
          }
          throw new Error('Failed to fetch');
        }

        if (demandsRes.ok || isCached) {
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
            setIsOffline(isCached || !networkOnline);
            
            // Save to IndexedDB for offline access
            if (userId && my.length > 0) {
              try {
                await saveMyRequests(my);
                await saveUserId(userId);
              } catch (err) {
                console.error('Failed to save to IndexedDB:', err);
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch ride demands', err);
        // Load from IndexedDB as fallback
        if (mounted) {
          const cachedRequests = await getMyRequests();
          if (cachedRequests.length > 0) {
            setMyDemands(cachedRequests);
            setIsOffline(true);
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [networkOnline]);

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
      <Card key={demand._id} style={{ backgroundColor: isOpen ? 'white' : '#f5f5f5', opacity: isOpen ? 1 : 0.7 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <h3 style={{ margin: 0 }}>{demand.title || 'Ride Request'}</h3>
              <Badge variant={isOpen ? 'success' : 'neutral'}>{demand.status.toUpperCase()}</Badge>
            </div>

            {!isOwn && (
              <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Requested by: {passengerName}</span>
                {demand.passengerId && (
                  <UserRating userId={demand.passengerId} size={14} showText={true} />
                )}
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

        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button href={`/ride-demands/${demand._id}`} variant="primary" size="sm">View Details</Button>
          {isOwn && demand.status === 'open' && (
            <Button 
              href={`/ride-demands/${demand._id}#ai-matches`} 
              variant="primary"
              size="sm"
              style={{ backgroundColor: '#3b82f6' }}
            >
              🤖 Find AI Matches
            </Button>
          )}
          {isOwn && (
            <Button onClick={() => handleDelete(demand._id)} variant="danger" size="sm">Delete</Button>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 16, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Offline Warning */}
      {isOffline && (
        <PageSection>
          <Badge variant="warning">You are offline - Showing your saved ride requests only</Badge>
        </PageSection>
      )}
      
      {/* Header */}
      <PageSection
        title="🙋 Ride Requests"
        description="Request rides or offer yours to passengers"
        actions={<Button href="/ride-demands/create" variant="warning">+ Request a Ride</Button>}
        style={{ marginBottom: 24 }}
      >
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid #e0e0e0' }}>
          <Button variant={activeTab === 'browse' ? 'primary' : 'ghost'} onClick={() => setActiveTab('browse')}>
            🔍 Browse Requests ({otherDemands.length})
          </Button>
          <Button variant={activeTab === 'my-requests' ? 'warning' : 'ghost'} onClick={() => setActiveTab('my-requests')}>
            📝 My Requests ({myDemands.length})
          </Button>
        </div>
      </PageSection>

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
                <PageSection style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '3rem', marginBottom: 16 }}>🙋</div>
                  <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>No ride requests yet</h3>
                  <p style={{ margin: 0, color: '#666' }}>Check back later for new requests</p>
                </PageSection>
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
                <PageSection style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '3rem', marginBottom: 16 }}>📝</div>
                  <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>You haven't requested any rides yet</h3>
                  <p style={{ margin: '0 0 16px 0', color: '#666' }}>Create your first ride request!</p>
                  <Button href="/ride-demands/create" variant="warning">+ Request a Ride</Button>
                </PageSection>
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
