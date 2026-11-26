// Minimal hash-based router (no react-router dependency).
import { useEffect, useState } from 'react';

export function useRoute(): [string, (r: string) => void] {
  const [route, setRoute] = useState<string>(() => window.location.hash.slice(1) || '/dashboard');

  useEffect(() => {
    const onHash = () => setRoute(window.location.hash.slice(1) || '/dashboard');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = (r: string) => {
    window.location.hash = r;
  };
  return [route, navigate];
}
