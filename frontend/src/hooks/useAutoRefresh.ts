import { useEffect } from 'react';

/**
 * Automatically hard refreshes the page after a period of inactivity.
 * This prevents users from looking at stale data if they leave the 
 * tab open overnight or for long periods.
 */
export function useAutoRefresh(timeoutMinutes: number = 120) {
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const timeoutMs = timeoutMinutes * 60 * 1000;

    const resetTimeout = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        console.log(`[AutoRefresh] Inactive for ${timeoutMinutes} minutes. Hard refreshing...`);
        
        // Attempt to clear CacheStorage (used by Service Workers/PWA)
        if (window.caches) {
          window.caches.keys().then((names) => {
            for (let name of names) window.caches.delete(name);
          });
        }
        
        // Attempt to unregister any service workers
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then((registrations) => {
            for (let registration of registrations) {
              registration.unregister();
            }
          });
        }

        // Force reload from server 
        // @ts-ignore: 'true' argument is deprecated in modern browsers but still works in some older ones for a hard reload
        window.location.reload(true);
      }, timeoutMs);
    };

    // Initial setup
    resetTimeout();

    // Listeners for user activity
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    
    // Throttle the reset to avoid spamming clearTimeout on every pixel of mouse movement
    let isThrottled = false;
    const handleActivity = () => {
      if (!isThrottled) {
        resetTimeout();
        isThrottled = true;
        setTimeout(() => { isThrottled = false; }, 2000); // Only reset at most once every 2 seconds
      }
    };

    events.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      clearTimeout(timeoutId);
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [timeoutMinutes]);
}
