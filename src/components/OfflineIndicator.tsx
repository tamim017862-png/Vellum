import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 right-4 sm:right-auto z-50 inline-flex items-center gap-2.5 rounded-xl bg-[#0B1120] border border-amber-500/40 px-3.5 py-2.5 text-[12px] text-slate-100 shadow-xl"
    >
      <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
      <span>
        <strong className="font-semibold text-white">Offline Mode:</strong> All
        13 browser-local PDF tools continue working without internet.
      </span>
    </div>
  );
};
