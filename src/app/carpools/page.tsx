'use client';
import React from 'react';
import Link from 'next/link';
import MapPreview from '@/app/components/MapPreview';
import Button from '@/app/components/ui/Button';
import Card from '@/app/components/ui/Card';
import Badge from '@/app/components/ui/Badge';
import PageSection from '@/app/components/ui/PageSection';
import UserRating from '@/app/components/UserRating';
import AIRecommendations from '@/app/components/AIRecommendations';
import { saveMyRides, getMyRides, saveUserId, getUserId } from '@/app/lib/offlineStorage';
import { useOnlineStatus } from '@/app/lib/useOnlineStatus';

type Ride = {
  _id: string;
  ownerId: string | { _id: string; name?: string; email?: string };
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
  const networkOnline = useOnlineStatus();
  const [myRides, setMyRides] = React.useState<Ride[]>([]);
  const [otherRides, setOtherRides] = React.useState<Ride[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filterStatus, setFilterStatus] = React.useState<'all' | 'available' | 'full'>('all');
  const [activeTab, setActiveTab] = React.useState<'browse' | 'my-rides' | 'ai-recommendations'>('browse');
  const [isOffline, setIsOffline] = React.useState(false);
  const [aiRecommendations, setAiRecommendations] = React.useState<any[]>([]);
  const [loadingAI, setLoadingAI] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // If network is offline, load from cache immediately
        if (!networkOnline) {
          const cachedMyRides = await getMyRides();
          if (mounted && cachedMyRides.length > 0) {
            setMyRides(cachedMyRides);
            setIsOffline(true);
            setLoading(false);
          }
          return;
        }

        const res = await fetch('/api/carpools', { credentials: 'include' });
        
        // Check if this is a cached response
        const isCached = res.headers.get('X-Cached-Response') === 'true';
        
        if (!res.ok && !isCached) {
          // If network failed, try to load from IndexedDB
          const cachedMyRides = await getMyRides();
          
          if (mounted && cachedMyRides.length > 0) {
            setMyRides(cachedMyRides);
            setIsOffline(true);
            setLoading(false);
          }
          throw new Error('Failed to fetch');
        }
        
        const json = await res.json();
        
        if (mounted) {
          const { rides, currentUserId } = json;
          
          // Separate rides into user's own and others
          const my: Ride[] = [];
          const others: Ride[] = [];
          
          for (const ride of rides) {
            if (!currentUserId) {
              others.push(ride);
              continue;
            }
            
            // Handle both string and object ownerId
            const ownerIdStr = typeof ride.ownerId === 'string' 
              ? ride.ownerId 
              : ride.ownerId?._id?.toString?.() || ride.ownerId?.toString?.();
            
            if (ownerIdStr === currentUserId) {
              my.push(ride);
            } else {
              others.push(ride);
            }
          }
          
          setMyRides(my);
          setOtherRides(others);
          setIsOffline(isCached || !networkOnline);
          
          // Save to IndexedDB for offline access
          if (currentUserId && my.length > 0) {
            try {
              await saveMyRides(my);
              await saveUserId(currentUserId);
            } catch (err) {
              console.error('Failed to save to IndexedDB:', err);
            }
          }
        }
      } catch (err) {
        console.error(err);
        // Load from IndexedDB as fallback
        if (mounted) {
          const cachedMyRides = await getMyRides();
          if (cachedMyRides.length > 0) {
            setMyRides(cachedMyRides);
            setIsOffline(true);
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [networkOnline]);

  // Load AI recommendations
  React.useEffect(() => {
    if (!networkOnline || activeTab !== 'ai-recommendations') return;
    
    let mounted = true;
    (async () => {
      try {
        setLoadingAI(true);
        const res = await fetch('/api/ai/recommend-rides', { credentials: 'include' });
        if (res.ok && mounted) {
          const data = await res.json();
          setAiRecommendations(data.recommendations || []);
        }
      } catch (err) {
        console.error('Failed to load AI recommendations', err);
      } finally {
        if (mounted) setLoadingAI(false);
      }
    })();

    return () => { mounted = false; };
  }, [networkOnline, activeTab]);

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
      <Card key={r._id} style={{ display: 'flex', gap: 16, opacity: isAvailable ? 1 : 0.7, position: 'relative' }}>
        {/* Status Badge */}
        <div style={{ position: 'absolute', top: 12, right: 12 }}>
          <Badge variant={isAvailable ? 'success' : rideStatus === 'full' ? 'warning' : 'neutral'}>
            {isAvailable ? '✓ Available' : rideStatus === 'full' ? 'Full' : rideStatus.toUpperCase()}
          </Badge>
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

          {/* Driver Rating */}
          {r.ownerId && (
            <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.85rem', color: '#666' }}>Driver:</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                {typeof r.ownerId === 'object' ? (r.ownerId.name || r.ownerId.email) : 'Unknown'}
              </span>
              <UserRating userId={r.ownerId} size={14} showText={true} />
            </div>
          )}

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
            <Button href={`/carpools/${r._id}`} variant="primary">{isOwn ? 'Manage Ride' : 'View & Book'}</Button>
            {isOwn && (
              <Button onClick={() => handleDelete(r._id)} variant="danger">🗑️ Delete</Button>
            )}
          </div>
        </div>
      </Card>
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
      {/* Offline Warning */}
      {isOffline && (
        <PageSection>
          <Badge variant="warning">You are offline - Showing your saved rides only</Badge>
        </PageSection>
      )}
      
      {/* Header */}
      <PageSection
        title="🚗 Carpooling"
        description="Find rides or offer your own"
        actions={<Button href="/carpools/create" variant="success">+ Offer a Ride</Button>}
        style={{ marginBottom: 24 }}
      >
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid #e0e0e0' }}>
          <Button
            variant={activeTab === 'browse' ? 'primary' : 'ghost'}
            onClick={() => setActiveTab('browse')}
          >
            🔍 Browse Rides ({otherRides.length})
          </Button>
          <Button
            variant={activeTab === 'my-rides' ? 'success' : 'ghost'}
            onClick={() => setActiveTab('my-rides')}
          >
            🚙 My Rides ({myRides.length})
          </Button>
          <Button
            variant={activeTab === 'ai-recommendations' ? 'primary' : 'ghost'}
            onClick={() => setActiveTab('ai-recommendations')}
          >
            🤖 AI Recommendations
          </Button>
        </div>
      </PageSection>

      {loading && (
        <div style={{ textAlign: 'center', padding: 48, fontSize: '1.2rem', color: '#666' }}>
          Loading rides...
        </div>
      )}

      {!loading && (
        <>
          {/* Filters */}
          <PageSection style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontWeight: 600, color: '#666' }}>Filter:</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(['all', 'available', 'full'] as const).map(status => (
                  <Button
                    key={status}
                    variant={filterStatus === status ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus(status)}
                  >
                    {status === 'all' && '🔘 All'}
                    {status === 'available' && '✓ Available'}
                    {status === 'full' && '⊗ Full'}
                  </Button>
                ))}
              </div>
            </div>
          </PageSection>

          {/* Browse Rides Tab */}
          {activeTab === 'browse' && (
            <div>
              {filteredOtherRides.length === 0 ? (
                <PageSection style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '3rem', marginBottom: 16 }}>🚗</div>
                  <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>No rides found</h3>
                  <p style={{ margin: 0, color: '#666' }}>
                    {filterStatus !== 'all' 
                      ? 'Try changing the filter or check back later.' 
                      : 'Be the first to offer a ride!'}
                  </p>
                </PageSection>
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
                <PageSection style={{ textAlign: 'center' }}>
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
                    <Button href="/carpools/create" variant="success">+ Offer a Ride</Button>
                  )}
                </PageSection>
              ) : (
                <div style={{ display: 'grid', gap: 16 }}>
                  {filteredMyRides.map(r => renderRideCard(r, true))}
                </div>
              )}
            </div>
          )}

          {/* AI Recommendations Tab */}
          {activeTab === 'ai-recommendations' && (
            <div>
              {loadingAI ? (
                <PageSection style={{ textAlign: 'center', padding: 48 }}>
                  <div style={{ fontSize: '2rem', marginBottom: 16 }}>🤖</div>
                  <div style={{ fontSize: '1.1rem', color: '#666' }}>
                    Analyzing your preferences...
                  </div>
                </PageSection>
              ) : (
                <PageSection>
                  <div style={{ marginBottom: 16 }}>
                    <h2 style={{ margin: '0 0 8px 0', fontSize: '1.5rem' }}>
                      🤖 AI-Powered Recommendations
                    </h2>
                    <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
                      Personalized ride suggestions based on your travel history and preferences
                    </p>
                  </div>
                  <AIRecommendations recommendations={aiRecommendations} />
                </PageSection>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}