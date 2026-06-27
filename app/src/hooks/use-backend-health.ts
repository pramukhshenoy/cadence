import { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { apiFetch } from '@/lib/api-client';

const CHECK_INTERVAL_MS = 30_000;
const FAILURES_BEFORE_BANNER = 2;

export function useBackendHealth() {
  const [isOnline, setIsOnline] = useState(true);
  const failCountRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await apiFetch('/health');
        if (!cancelled) {
          if (res.ok) {
            failCountRef.current = 0;
            setIsOnline(true);
          } else {
            failCountRef.current += 1;
            if (failCountRef.current >= FAILURES_BEFORE_BANNER) setIsOnline(false);
          }
        }
      } catch {
        if (!cancelled) {
          failCountRef.current += 1;
          if (failCountRef.current >= FAILURES_BEFORE_BANNER) setIsOnline(false);
        }
      }
    }

    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') check();
    });

    return () => {
      cancelled = true;
      clearInterval(interval);
      sub.remove();
    };
  }, []);

  return { isOnline };
}
