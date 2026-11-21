import { useState, useEffect, useCallback } from 'react';

const API_BASE = 'https://nagnail.lk/api';
const SW_PATH  = '/sw.js';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export function useAdminPush() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);
  const [permission,   setPermission]   = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [stats,        setStats]        = useState(null);
  const [error,        setError]        = useState(null);

  const isSupported = typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window;

  useEffect(() => {
    if (!isSupported) return;
    navigator.serviceWorker
      .register(SW_PATH)
      .then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        if (sub) setIsSubscribed(true);
      })
      .catch(console.error);

    fetchStats();
  }, [isSupported]);

  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res   = await fetch(`${API_BASE}/admin/push/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setStats(data.stats || data);
    } catch (e) {
      console.error('[AdminPush] Stats fetch error:', e);
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported) return false;
    setIsLoading(true);
    setError(null);

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        setError('Permission denied');
        setIsLoading(false);
        return false;
      }

      const keyRes  = await fetch(`${API_BASE}/push/vapid-key`);
      const keyData = await keyRes.json();
      const vapidKey = urlBase64ToUint8Array(keyData.publicKey);

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: vapidKey
      });

      const token = localStorage.getItem('admin_token');
      await fetch(`${API_BASE}/push/subscribe`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          userInfo: { type: 'admin' }
        })
      });

      setIsSubscribed(true);
      setIsLoading(false);
      fetchStats();
      return true;
    } catch (err) {
      console.error('[AdminPush] Subscribe error:', err);
      setError(err.message);
      setIsLoading(false);
      return false;
    }
  }, [isSupported, fetchStats]);

  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const token = localStorage.getItem('admin_token');
        await fetch(`${API_BASE}/push/unsubscribe`, {
          method:  'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ endpoint: sub.endpoint })
        });
        await sub.unsubscribe();
      }
      setIsSubscribed(false);
      setIsLoading(false);
      fetchStats();
      return true;
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
      return false;
    }
  }, [fetchStats]);

  const sendTest = useCallback(async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res   = await fetch(`${API_BASE}/admin/push/test`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: '🧪 Test Notification',
          body:  'Push notifications are working correctly!'
        })
      });
      return res.ok;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, []);

  const broadcast = useCallback(async (payload) => {
    try {
      const token = localStorage.getItem('admin_token');
      const res   = await fetch(`${API_BASE}/admin/push/broadcast`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      fetchStats();
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, [fetchStats]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    stats,
    error,
    subscribe,
    unsubscribe,
    sendTest,
    broadcast,
    fetchStats
  };
}
