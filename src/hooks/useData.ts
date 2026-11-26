import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/api';
import type { Notification } from '@/types';

// Polls notifications for the current user every 12s (near-real-time in local mode).
export function useNotifications(userId: string | null | undefined) {
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) { setUnread(0); setItems([]); return; }
    try {
      const [count, list] = await Promise.all([
        api.unreadCount(userId),
        api.listNotifications(userId),
      ]);
      setUnread(count);
      setItems(list);
    } catch { /* ignore */ }
  }, [userId]);

  useEffect(() => {
    refresh();
    if (userId) {
      timer.current = window.setInterval(refresh, 12000);
      return () => { if (timer.current) window.clearInterval(timer.current); };
    }
  }, [userId, refresh]);

  const setLoadingState = useCallback((v: boolean) => setLoading(v), []);
  return { unread, items, loading, refresh, setLoadingState };
}

// Generic data fetcher.
export function useFetch<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const run = useCallback(async () => {
    setLoading(true); setError(null);
    try { const d = await fetcher(); if (mountedRef.current) setData(d); }
    catch (e) { if (mountedRef.current) setError(e instanceof Error ? e.message : 'Erreur'); }
    finally { if (mountedRef.current) setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mountedRef.current = true;
    run();
    return () => { mountedRef.current = false; };
  }, [run]);

  return { data, loading, error, refresh: run, setData };
}
