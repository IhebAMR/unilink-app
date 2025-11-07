'use client';
import React from 'react';
import Button from '@/app/components/ui/Button';
import Badge from '@/app/components/ui/Badge';
import Card from '@/app/components/ui/Card';
import PageSection from '@/app/components/ui/PageSection';
import { useRouter } from 'next/navigation';

export default function HistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const [myRides, setMyRides] = React.useState<any[]>([]);
  const [myRequests, setMyRequests] = React.useState<any[]>([]);
  const [myDemands, setMyDemands] = React.useState<any[]>([]);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const [ridesRes, requestsRes, demandsRes] = await Promise.all([
          fetch('/api/carpools', { credentials: 'include' }),
          fetch('/api/ride-requests', { credentials: 'include' }),
          fetch('/api/ride-demands?myDemands=true', { credentials: 'include' })
        ]);

        if (ridesRes.ok) {
          const ridesJson = await ridesRes.json();
          if (mounted) {
            setCurrentUserId(ridesJson.currentUserId);
            const mine = (ridesJson.rides || []).filter((r: any) => {
              const ownerId = typeof r.ownerId === 'string' ? r.ownerId : r.ownerId?._id || r.ownerId?.toString();
              return ridesJson.currentUserId && ownerId === ridesJson.currentUserId;
            });
            setMyRides(mine);
          }
        } else if (mounted) {
          setError('Failed to load your rides');
        }

        if (requestsRes.ok) {
          const reqJson = await requestsRes.json();
          if (mounted) setMyRequests(reqJson.requests || []);
        }

        if (demandsRes.ok) {
          const demJson = await demandsRes.json();
          if (mounted) setMyDemands(demJson || []);
        }
      } catch (err) {
        console.error('Failed to load history', err);
        if (mounted) setError('Failed to load history');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) return <div style={{ padding: 16 }}>Loading…</div>;
  if (error) return (
    <div style={{ padding: 16 }}>
      <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>
      <Button onClick={() => router.push('/')}>Go Home</Button>
    </div>
  );

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 16 }}>
      <h1 style={{ marginTop: 0 }}>History</h1>

      <PageSection style={{ marginTop: 12 }}>
        <h2 style={{ marginTop: 0 }}>My Offered Rides</h2>
        {myRides.length === 0 ? (
          <div>No rides yet.</div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {myRides.map((r) => (
              <Card key={r._id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{r.title || 'Ride'}</div>
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>{r.dateTime ? new Date(r.dateTime).toLocaleString() : ''}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Badge variant={r.status === 'open' ? 'success' : r.status === 'full' ? 'warning' : 'neutral'}>
                      {r.status?.toUpperCase()}
                    </Badge>
                    <Button size="sm" onClick={() => router.push(`/carpools/${r._id}`)}>Open</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </PageSection>

      <PageSection style={{ marginTop: 24 }}>
        <h2 style={{ marginTop: 0 }}>My Ride Requests</h2>
        {myRequests.length === 0 ? (
          <div>No ride booking requests yet.</div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {myRequests.map((req: any) => (
              <Card key={req._id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{req.rideId?.title || 'Ride'}</div>
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>{req.rideId?.dateTime ? new Date(req.rideId.dateTime).toLocaleString() : ''}</div>
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>Seats requested: {req.seatsRequested}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Badge variant={req.status === 'accepted' ? 'success' : req.status === 'pending' ? 'warning' : 'danger'}>
                      {req.status?.toUpperCase()}
                    </Badge>
                    {req.rideId?._id && (
                      <Button size="sm" onClick={() => router.push(`/carpools/${req.rideId._id}`)}>Open</Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </PageSection>

      <PageSection style={{ marginTop: 24 }}>
        <h2 style={{ marginTop: 0 }}>My Posted Demands</h2>
        {myDemands.length === 0 ? (
          <div>No posted ride demands yet.</div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {myDemands.map((d: any) => (
              <Card key={d._id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{d.title || 'Ride Request'}</div>
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>{d.dateTime ? new Date(d.dateTime).toLocaleString() : ''}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Badge variant={d.status === 'open' ? 'success' : d.status === 'matched' ? 'warning' : 'neutral'}>
                      {d.status?.toUpperCase()}
                    </Badge>
                    <Button size="sm" onClick={() => router.push(`/ride-demands/${d._id}`)}>Open</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </PageSection>
    </div>
  );
}
