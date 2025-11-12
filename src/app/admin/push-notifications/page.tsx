'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/app/components/ui/Button';
import Card from '@/app/components/ui/Card';
import PageSection from '@/app/components/ui/PageSection';

export default function AdminPushNotificationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rides, setRides] = useState<any[]>([]);
  const [selectedRide, setSelectedRide] = useState<string>('');
  const [notificationType, setNotificationType] = useState<'now' | '1hour' | '24hour'>('now');
  const [customMessage, setCustomMessage] = useState('');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [vapidConfigured, setVapidConfigured] = useState<boolean>(false);

  useEffect(() => {
    // Check if user is admin
    const checkAdmin = async () => {
      try {
        const res = await fetch('/api/me', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.user?.role === 'admin') {
            setIsAdmin(true);
            loadRides();
            checkVapidConfig();
          } else {
            setIsAdmin(false);
          }
        } else {
          setIsAdmin(false);
        }
      } catch (err) {
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, []);

  const checkVapidConfig = async () => {
    try {
      const res = await fetch('/api/push/subscribe');
      const data = await res.json();
      setVapidConfigured(!!data.publicKey);
    } catch (err) {
      setVapidConfigured(false);
    }
  };

  const loadRides = async () => {
    try {
      const res = await fetch('/api/carpools', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        // Get all rides (both my rides and others)
        const allRides = [...(data.myRides || []), ...(data.rides || [])];
        // Sort by date (upcoming first)
        const sortedRides = allRides.sort((a: any, b: any) => {
          const dateA = new Date(a.dateTime || 0).getTime();
          const dateB = new Date(b.dateTime || 0).getTime();
          return dateA - dateB;
        });
        setRides(sortedRides);
      }
    } catch (err) {
      console.error('Failed to load rides:', err);
    }
  };

  const sendTestNotification = async () => {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch('/api/push/test', {
        credentials: 'include'
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setResult(data.message);
      } else {
        setError(data.error || 'Failed to send test notification');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send test notification');
    } finally {
      setLoading(false);
    }
  };

  const sendRideNotification = async () => {
    if (!selectedRide) {
      setError('Please select a ride');
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch('/api/push/test-ride', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          rideId: selectedRide, 
          type: notificationType,
          customMessage: customMessage || undefined
        })
      });
      const data = await res.json();

      if (res.ok) {
        setResult(`✓ ${data.message}\nSent to ${data.notificationsSent} device(s)`);
      } else {
        setError(data.error || 'Failed to send notification');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send notification');
    } finally {
      setLoading(false);
    }
  };

  const sendCustomNotification = async () => {
    if (!customMessage.trim()) {
      setError('Please enter a message');
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch('/api/push/admin/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: 'Admin Notification',
          message: customMessage,
          type: notificationType
        })
      });
      const data = await res.json();

      if (res.ok) {
        setResult(`✓ Custom notification sent to ${data.sent} user(s)`);
      } else {
        setError(data.error || 'Failed to send custom notification');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send custom notification');
    } finally {
      setLoading(false);
    }
  };

  const triggerReminders = async () => {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const url = new URL('/api/push/reminders', window.location.origin);
      url.searchParams.set('secret', process.env.NEXT_PUBLIC_CRON_SECRET || prompt('Enter CRON_SECRET:') || '');
      
      const res = await fetch(url.toString(), {
        method: 'POST'
      });
      const data = await res.json();

      if (res.ok) {
        setResult(`Reminders sent: ${data.notificationsSent} notifications, ${data.errors} errors`);
      } else {
        setError(data.error || 'Failed to send reminders');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send reminders');
    } finally {
      setLoading(false);
    }
  };

  if (isAdmin === null) {
    return <div style={{ padding: 24 }}>Checking permissions...</div>;
  }

  if (isAdmin === false) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <h1>Access Denied</h1>
        <p>You must be an admin to access this page.</p>
        <Button onClick={() => router.push('/')} variant="outline" style={{ marginTop: 16 }}>
          Go Home
        </Button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 24 }}>
      <h1>Admin: Push Notification Manager</h1>
      
      <PageSection style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>Configuration Status</h2>
          <Button onClick={checkVapidConfig} variant="neutral" size="sm">
            Refresh
          </Button>
        </div>
        {vapidConfigured ? (
          <div style={{ padding: 12, backgroundColor: '#e8f5e9', borderRadius: 6, color: '#2e7d32' }}>
            ✓ VAPID keys are configured
          </div>
        ) : (
          <div style={{ padding: 12, backgroundColor: '#ffebee', borderRadius: 6, color: '#c62828' }}>
            ✗ VAPID keys not configured. Push notifications will not work.
          </div>
        )}
      </PageSection>

      <PageSection style={{ marginTop: 24 }}>
        <h2 style={{ marginTop: 0 }}>Quick Test</h2>
        <p>Send a test notification to yourself:</p>
        <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
          <Button 
            onClick={sendTestNotification} 
            variant="success" 
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Test Notification to Me'}
          </Button>
          <Button 
            onClick={() => router.push('/admin/push-notifications/subscribe')} 
            variant="primary"
          >
            🔔 Subscribe to Push Notifications
          </Button>
        </div>
        <p style={{ fontSize: '0.85rem', color: '#666', marginTop: 8 }}>
          If you see "0 device(s)", click "Subscribe to Push Notifications" first to enable notifications.
        </p>
      </PageSection>

      <PageSection style={{ marginTop: 24 }}>
        <h2 style={{ marginTop: 0 }}>Send Notification for Specific Ride</h2>
        <p>Select a ride and send notifications to the owner and all accepted passengers:</p>
        
        <div style={{ marginTop: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
            Select Ride:
          </label>
          <select
            value={selectedRide}
            onChange={(e) => setSelectedRide(e.target.value)}
            style={{
              width: '100%',
              padding: 8,
              borderRadius: 6,
              border: '1px solid #e5e7eb',
              fontSize: '1rem'
            }}
          >
            <option value="">-- Select a ride --</option>
            {rides.map((ride: any) => (
              <option key={ride._id} value={ride._id}>
                {ride.title || 'Untitled Ride'} - {ride.dateTime ? new Date(ride.dateTime).toLocaleString() : 'No date'} 
                ({ride.ownerId?.name || 'Unknown'})
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
            Notification Type:
          </label>
          <select
            value={notificationType}
            onChange={(e) => setNotificationType(e.target.value as any)}
            style={{
              width: '100%',
              padding: 8,
              borderRadius: 6,
              border: '1px solid #e5e7eb',
              fontSize: '1rem'
            }}
          >
            <option value="now">Immediate Reminder</option>
            <option value="1hour">1 Hour Before</option>
            <option value="24hour">24 Hours Before</option>
          </select>
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
            Custom Message (optional - overrides default):
          </label>
          <textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="Leave empty to use default message"
            style={{
              width: '100%',
              minHeight: 80,
              padding: 8,
              borderRadius: 6,
              border: '1px solid #e5e7eb',
              fontSize: '1rem'
            }}
          />
        </div>

        <Button 
          onClick={sendRideNotification} 
          variant="primary" 
          disabled={loading || !selectedRide}
          style={{ marginTop: 16 }}
        >
          {loading ? 'Sending...' : '🚀 Send Notification Now'}
        </Button>
      </PageSection>

      <PageSection style={{ marginTop: 24 }}>
        <h2 style={{ marginTop: 0 }}>Send Custom Notification to All Users</h2>
        <p>Send a custom notification to all users who have subscribed to push notifications:</p>
        
        <div style={{ marginTop: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
            Message:
          </label>
          <textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="Enter your notification message"
            style={{
              width: '100%',
              minHeight: 100,
              padding: 8,
              borderRadius: 6,
              border: '1px solid #e5e7eb',
              fontSize: '1rem'
            }}
          />
        </div>

        <Button 
          onClick={sendCustomNotification} 
          variant="primary" 
          disabled={loading || !customMessage.trim()}
          style={{ marginTop: 16 }}
        >
          {loading ? 'Sending...' : '📢 Send to All Subscribed Users'}
        </Button>
      </PageSection>

      <PageSection style={{ marginTop: 24 }}>
        <h2 style={{ marginTop: 0 }}>Trigger Automatic Reminders</h2>
        <p>Manually trigger the reminder system (checks for rides in next 24 hours):</p>
        <Button 
          onClick={triggerReminders} 
          variant="primary" 
          disabled={loading}
          style={{ marginTop: 12 }}
        >
          {loading ? 'Processing...' : '🔄 Run Reminder Check Now'}
        </Button>
        <p style={{ fontSize: '0.85rem', color: '#666', marginTop: 8 }}>
          This simulates what the cron job does - checks for upcoming rides and sends notifications.
        </p>
      </PageSection>

      {result && (
        <div style={{ marginTop: 24, padding: 16, backgroundColor: '#e8f5e9', borderRadius: 6, color: '#2e7d32' }}>
          <strong>✓ Success:</strong>
          <div style={{ marginTop: 8, whiteSpace: 'pre-line' }}>{result}</div>
        </div>
      )}
      {error && (
        <div style={{ marginTop: 24, padding: 16, backgroundColor: '#ffebee', borderRadius: 6, color: '#c62828' }}>
          <strong>✗ Error:</strong>
          <div style={{ marginTop: 8 }}>{error}</div>
        </div>
      )}
    </div>
  );
}

