'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * TeamViewAutoRefresh
 * 
 * Client Component that handles automatic polling for the Team View dashboard.
 * 
 * Following React Best Practices:
 * - Uses router.refresh() to trigger Server Component re-fetch (no client-side waterfall)
 * - Cleanup interval on unmount (Best Practice: 5.3 - Narrow effect dependencies)
 * - Lazy state initialization for lastRefresh (Best Practice: 5.5)
 * - Returns null (no visual output, pure side-effect component)
 */
export function TeamViewAutoRefresh() {
  const router = useRouter();
  const [lastRefresh, setLastRefresh] = useState(() => new Date());

  useEffect(() => {
    // Polling interval: 30 seconds
    const POLL_INTERVAL = 30_000; // 30s in ms

    const intervalId = setInterval(() => {
      // Trigger Server Component re-fetch
      router.refresh();
      setLastRefresh(new Date());
    }, POLL_INTERVAL);

    // Cleanup on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [router]);

  // Debug info (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log(`[TeamViewAutoRefresh] Last refresh: ${lastRefresh.toLocaleTimeString()}`);
  }

  return null;
}
