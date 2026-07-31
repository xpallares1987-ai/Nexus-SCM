import { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications(token: string | null) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => {
          setRegistration(reg);
          return reg.pushManager.getSubscription();
        })
        .then(sub => {
          if (sub) {
            setIsSubscribed(true);
            setSubscription(sub);
          }
        })
        .catch(err => {
          console.error('Service Worker registration failed: ', err);
          setError('Service Worker registration failed.');
        });
    } else {
      setError('Push notifications are not supported in this browser.');
    }
  }, []);

  const subscribeToPush = async () => {
    if (!token || !registration) return false;

    try {
      setIsSubscribed(true);
      return true;
    } catch (err: any) {
      console.error('Failed to subscribe the user: ', err);
      setError(err.message || 'Failed to subscribe to push notifications');
      return false;
    }
  };

  return {
    isSupported: 'serviceWorker' in navigator && 'PushManager' in window,
    isSubscribed,
    subscribeToPush,
    error
  };
}
