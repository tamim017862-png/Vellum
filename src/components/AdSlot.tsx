import React, { useEffect, useRef } from 'react';

interface AdSlotProps {
  slotId?: string;
  variant?: 'leaderboard' | 'rectangle';
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

function getAdSenseClient(): string | null {
  if (typeof document === 'undefined') return null;
  const meta = document.querySelector<HTMLMetaElement>(
    'meta[name="google-adsense-account"]'
  );
  const val = meta?.content?.trim();
  if (val && /^ca-pub-\d{10,20}$/.test(val)) {
    return val;
  }
  return null;
}

export const AdSlot: React.FC<AdSlotProps> = ({
  slotId,
  variant = 'leaderboard',
  className = '',
}) => {
  const client = getAdSenseClient();
  const insRef = useRef<HTMLModElement | null>(null);
  const pushedRef = useRef(false);

  useEffect(() => {
    if (!client || !slotId || pushedRef.current || !insRef.current) return;
    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
      pushedRef.current = true;
    } catch {
      // Ignore ad-blocker or duplicate initialization rejections gracefully
    }
  }, [client, slotId]);

  // Render nothing until ADSENSE_CLIENT_ID is configured in the environment
  if (!client || !slotId) {
    return null;
  }

  const minHeightClass =
    variant === 'rectangle' ? 'min-h-[250px]' : 'min-h-[100px]';

  return (
    <aside
      aria-label="Advertisement"
      className={`w-full my-6 flex flex-col items-center justify-center rounded-2xl border border-[#EAECEF] bg-[#F7F7F8]/60 px-4 py-3 ${minHeightClass} ${className}`}
    >
      <span className="text-[11px] font-medium uppercase tracking-wider text-[#80868B] mb-2">
        Advertisement
      </span>
      <ins
        ref={insRef}
        className="adsbygoogle block w-full"
        style={{ display: 'block', minHeight: variant === 'rectangle' ? '220px' : '80px' }}
        data-ad-client={client}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
};
