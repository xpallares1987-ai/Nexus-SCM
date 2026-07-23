import { useEffect } from 'react';
import { toast } from 'sonner';

export function useSessionTimeout(logOut: () => Promise<void>) {
  useEffect(() => {
    let inactivityTimeout: NodeJS.Timeout;
    const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 minutes

    const resetInactivityTimer = () => {
      clearTimeout(inactivityTimeout);
      inactivityTimeout = setTimeout(() => {
        logOut().then(() => {
          toast.error("Session expired due to inactivity. Please sign in again for security.", {
            duration: 8000,
            icon: "🔒"
          });
        });
      }, INACTIVITY_LIMIT);
    };

    const events = ['mousemove', 'mousedown', 'keypress', 'touchmove', 'scroll'];
    events.forEach(event => window.addEventListener(event, resetInactivityTimer));
    resetInactivityTimer();

    return () => {
      clearTimeout(inactivityTimeout);
      events.forEach(event => window.removeEventListener(event, resetInactivityTimer));
    };
  }, [logOut]);
}
