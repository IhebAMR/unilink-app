'use client';

import { useEffect, useState } from 'react';

export default function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if push notifications are supported
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setIsSupported(false);
      setIsLoading(false);
      return;
    }

    setIsSupported(true);

    // Check current subscription status
    const checkSubscription = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (err) {
        console.error('Error checking subscription:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkSubscription();

    // Request permission and subscribe
    const subscribeToPush = async () => {
      try {
        // Request notification permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.log('Notification permission denied');
          setIsLoading(false);
          return;
        }

        // Get service worker registration
        const registration = await navigator.serviceWorker.ready;

        // Get VAPID public key from server
        const keyRes = await fetch('/api/push/subscribe');
        const keyData = await keyRes.json();
        
        if (!keyData.publicKey) {
          console.log('VAPID public key not configured');
          setIsLoading(false);
          return;
        }

        // Convert VAPID key to Uint8Array
        const applicationServerKey = urlBase64ToUint8Array(keyData.publicKey);

        // Check if already subscribed
        let subscription = await registration.pushManager.getSubscription();
        
        if (!subscription) {
          // Subscribe to push notifications
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey
          });
        }

        // Send subscription to server
        const res = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ subscription })
        });

        if (res.ok) {
          setIsSubscribed(true);
          console.log('Push notification subscription successful');
        } else {
          console.error('Failed to save subscription');
        }
      } catch (err) {
        console.error('Error subscribing to push notifications:', err);
      } finally {
        setIsLoading(false);
      }
    };

    // Auto-subscribe if permission was already granted (guard for environments without Notification)
    const perm = typeof Notification !== 'undefined' ? Notification.permission : 'default';
    if (perm === 'granted' || perm === 'default') {
      subscribeToPush();
    } else {
      setIsLoading(false);
    }
  }, []);

  // Helper function to convert VAPID key
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

  // This component doesn't render anything visible
  // It silently handles push notification subscription in the background
  return null;
}

