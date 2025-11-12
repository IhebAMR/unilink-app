'use client';

import { useState } from 'react';
import Button from '@/app/components/ui/Button';
import Card from '@/app/components/ui/Card';

export default function TestPushPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vapidKey, setVapidKey] = useState<string | null>(null);

  const checkVapidKey = async () => {
    try {
      const res = await fetch('/api/push/subscribe');
      const data = await res.json();
      setVapidKey(data.publicKey);
      if (!data.publicKey) {
        setError('VAPID public key not configured. Please set NEXT_PUBLIC_VAPID_PUBLIC_KEY in your .env.local file.');
      }
    } catch (err) {
      setError('Failed to fetch VAPID key');
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

  const testReminders = async () => {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const url = new URL('/api/push/reminders', window.location.origin);
      url.searchParams.set('secret', prompt('Enter CRON_SECRET:') || '');
      
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

  const testRideNotification = async () => {
    setLoading(true);
    setResult(null);
    setError(null);

    const rideId = prompt('Enter Ride ID to test:');
    if (!rideId) {
      setLoading(false);
      return;
    }

    const type = prompt('Notification type:\n1. "now" - Immediate reminder\n2. "1hour" - 1 hour reminder\n3. "24hour" - 24 hour reminder\n\nEnter type (default: now):') || 'now';

    try {
      const res = await fetch('/api/push/test-ride', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ rideId, type })
      });
      const data = await res.json();

      if (res.ok) {
        setResult(`✓ ${data.message}\nSent to ${data.notificationsSent} device(s)`);
      } else {
        setError(data.error || 'Failed to send test notification');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send test notification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <h1>Push Notification Testing</h1>
      
      <Card style={{ marginTop: 24, padding: 24 }}>
        <h2 style={{ marginTop: 0 }}>Setup Check</h2>
        <p>First, check if VAPID keys are configured:</p>
        <Button onClick={checkVapidKey} variant="primary" style={{ marginTop: 12 }}>
          Check VAPID Configuration
        </Button>
        {vapidKey && (
          <div style={{ marginTop: 12, padding: 12, backgroundColor: '#e8f5e9', borderRadius: 6 }}>
            <strong>✓ VAPID Public Key:</strong>
            <div style={{ fontSize: '0.85rem', wordBreak: 'break-all', marginTop: 4 }}>
              {vapidKey}
            </div>
          </div>
        )}
      </Card>

      <Card style={{ marginTop: 24, padding: 24 }}>
        <h2 style={{ marginTop: 0 }}>Test Push Notification</h2>
        <p>Send a test notification to your current device:</p>
        <ol style={{ marginLeft: 20, marginTop: 12 }}>
          <li>Make sure you've allowed notifications in your browser</li>
          <li>Click the button below to send a test notification</li>
          <li>You should see a notification even if the app is in the background</li>
        </ol>
        <Button 
          onClick={sendTestNotification} 
          variant="success" 
          disabled={loading}
          style={{ marginTop: 12 }}
        >
          {loading ? 'Sending...' : 'Send Test Notification'}
        </Button>
        
        {result && (
          <div style={{ marginTop: 12, padding: 12, backgroundColor: '#e8f5e9', borderRadius: 6, color: '#2e7d32' }}>
            ✓ {result}
          </div>
        )}
        {error && (
          <div style={{ marginTop: 12, padding: 12, backgroundColor: '#ffebee', borderRadius: 6, color: '#c62828' }}>
            ✗ {error}
          </div>
        )}
      </Card>

      <Card style={{ marginTop: 24, padding: 24, backgroundColor: '#e3f2fd' }}>
        <h2 style={{ marginTop: 0 }}>🚀 Quick Demo Test (IMMEDIATE)</h2>
        <p><strong>For your demo tomorrow - test notifications instantly!</strong></p>
        <ol style={{ marginLeft: 20, marginTop: 12 }}>
          <li>Create a test ride (or use an existing one)</li>
          <li>Copy the ride ID from the URL (e.g., <code>/carpools/507f1f77bcf86cd799439011</code>)</li>
          <li>Click the button below and paste the ride ID</li>
          <li>You'll receive a notification immediately!</li>
        </ol>
        <Button 
          onClick={testRideNotification} 
          variant="success" 
          disabled={loading}
          style={{ marginTop: 12, fontSize: '1.1rem', padding: '12px 24px' }}
        >
          {loading ? 'Sending...' : '🎯 Send Test Notification for Specific Ride'}
        </Button>
        <p style={{ fontSize: '0.85rem', color: '#666', marginTop: 8 }}>
          <strong>Tip:</strong> You can test with any ride you own or are a passenger of. The notification will be sent immediately regardless of the ride's scheduled time.
        </p>
      </Card>

      <Card style={{ marginTop: 24, padding: 24 }}>
        <h2 style={{ marginTop: 0 }}>Test Ride Reminders (Cron Simulation)</h2>
        <p>Manually trigger the reminder system (simulates cron job):</p>
        <Button 
          onClick={testReminders} 
          variant="primary" 
          disabled={loading}
          style={{ marginTop: 12 }}
        >
          {loading ? 'Sending...' : 'Send Reminders for Upcoming Rides'}
        </Button>
        <p style={{ fontSize: '0.85rem', color: '#666', marginTop: 8 }}>
          This will check for rides starting in the next 24 hours and send notifications to owners and passengers.
        </p>
      </Card>

      <Card style={{ marginTop: 24, padding: 24, backgroundColor: '#fff3e0' }}>
        <h3 style={{ marginTop: 0 }}>📝 Setup Instructions</h3>
        <ol style={{ marginLeft: 20 }}>
          <li><strong>Generate VAPID keys:</strong>
            <pre style={{ backgroundColor: '#f5f5f5', padding: 8, borderRadius: 4, marginTop: 4 }}>
              npx web-push generate-vapid-keys
            </pre>
          </li>
          <li><strong>Add to .env.local:</strong>
            <pre style={{ backgroundColor: '#f5f5f5', padding: 8, borderRadius: 4, marginTop: 4 }}>
{`NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key
VAPID_SUBJECT=mailto:your-email@example.com
CRON_SECRET=any-random-string`}
            </pre>
          </li>
          <li><strong>VAPID_SUBJECT:</strong> Use your email address with "mailto:" prefix, e.g., <code>mailto:admin@unilink.app</code></li>
          <li><strong>Restart your dev server</strong> after adding environment variables</li>
        </ol>
      </Card>
    </div>
  );
}

