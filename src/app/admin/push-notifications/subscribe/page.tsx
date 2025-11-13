'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/app/components/ui/Button';
import Card from '@/app/components/ui/Card';
import PageSection from '@/app/components/ui/PageSection';

export default function SubscribePushPage() {
  const router = useRouter();
  const [status, setStatus] = useState<string>('Checking...');
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setStatus('Push notifications are not supported in this browser');
        setLoading(false);
        return;
      }

      const permission = Notification.permission;
      if (permission === 'denied') {
        setStatus('Notifications are blocked. Please enable them in your browser settings.');
        setLoading(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const currentSubscription = await registration.pushManager.getSubscription();
      
      if (currentSubscription) {
        setSubscription(currentSubscription);
        setStatus('You are already subscribed to push notifications!');
      } else {
        setStatus('Not subscribed. Click the button below to subscribe.');
      }
    } catch (err: any) {
      setError(err.message);
      setStatus('Error checking subscription');
    } finally {
      setLoading(false);
    }
  };

  const subscribe = async () => {
    setLoading(true);
    setError(null);

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        setError('Notification permission was denied. Please allow notifications and try again.');
        setLoading(false);
        return;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Get VAPID public key
      const keyRes = await fetch('/api/push/subscribe');
      const keyData = await keyRes.json();
      
      if (!keyData.publicKey) {
        setError('VAPID public key not configured. Please contact administrator.');
        setLoading(false);
        return;
      }

      // Convert VAPID key
      const applicationServerKey = urlBase64ToUint8Array(keyData.publicKey);

      // Subscribe
      // The browser expects a BufferSource (ArrayBuffer or ArrayBufferView).
      // Cast the Uint8Array to ArrayBuffer to satisfy TypeScript's stricter lib types.
      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer ? applicationServerKey.buffer as ArrayBuffer : applicationServerKey as unknown as ArrayBuffer
      });

      // Send subscription to server
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ subscription: newSubscription })
      });

      if (res.ok) {
        setSubscription(newSubscription);
        setStatus('✓ Successfully subscribed to push notifications!');
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save subscription');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to subscribe');
    } finally {
      setLoading(false);
    }
  };

  function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <h1>Subscribe to Push Notifications</h1>
      
      <PageSection style={{ marginTop: 24 }}>
        <h2 style={{ marginTop: 0 }}>Current Status</h2>
        <div style={{ padding: 16, backgroundColor: '#f5f5f5', borderRadius: 8, marginTop: 12 }}>
          <p style={{ margin: 0, fontWeight: 600 }}>{status}</p>
        </div>

        {Notification.permission === 'denied' && (
          <div style={{ marginTop: 16, padding: 16, backgroundColor: '#ffebee', borderRadius: 8, color: '#c62828' }}>
            <strong>⚠️ Notifications are blocked</strong>
            <p style={{ marginTop: 8, marginBottom: 0 }}>
              To enable notifications:
              <ol style={{ marginLeft: 20, marginTop: 8 }}>
                <li>Click the lock icon in your browser's address bar</li>
                <li>Change "Notifications" to "Allow"</li>
                <li>Refresh this page</li>
              </ol>
            </p>
          </div>
        )}

        {subscription && (
          <div style={{ marginTop: 16, padding: 16, backgroundColor: '#e8f5e9', borderRadius: 8, color: '#2e7d32' }}>
            <strong>✓ Subscribed!</strong>
            <p style={{ marginTop: 8, marginBottom: 0, fontSize: '0.9rem' }}>
              Your subscription endpoint: {subscription.endpoint.substring(0, 50)}...
            </p>
          </div>
        )}
      </PageSection>

      {!subscription && Notification.permission !== 'denied' && (
        <PageSection style={{ marginTop: 24 }}>
          <h2 style={{ marginTop: 0 }}>Subscribe Now</h2>
          <p>Click the button below to enable push notifications:</p>
          <Button 
            onClick={subscribe} 
            variant="success" 
            disabled={loading}
            style={{ marginTop: 12 }}
          >
            {loading ? 'Subscribing...' : '🔔 Enable Push Notifications'}
          </Button>
        </PageSection>
      )}

      {error && (
        <div style={{ marginTop: 24, padding: 16, backgroundColor: '#ffebee', borderRadius: 8, color: '#c62828' }}>
          <strong>✗ Error:</strong>
          <p style={{ marginTop: 8, marginBottom: 0 }}>{error}</p>
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <Button onClick={() => router.push('/admin/push-notifications')} variant="outline">
          ← Back to Push Notifications Manager
        </Button>
      </div>
    </div>
  );
}





