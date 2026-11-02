'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('Workbench Service Worker active:', registration.scope);
          })
          .catch((err) => {
            console.warn('Service Worker registration skipped or failed:', err);
          });
      });
    }
  }, []);

  return null;
}
