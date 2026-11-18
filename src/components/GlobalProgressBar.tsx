import React from 'react';
import { Loader2 } from 'lucide-react';
import { useGlobalProgressSnapshot } from '../utils/globalProgress';

export const GlobalProgressBar: React.FC = () => {
  const snapshot = useGlobalProgressSnapshot();

  if (snapshot.status === 'idle') {
    return null;
  }

  const isCompleting = snapshot.status === 'completing';
  const visualScale = isCompleting
    ? 1
    : Math.max(0.06, Math.min(1, snapshot.percent / 100));

  return (
    <>
      {/* Razor-sharp viewport-edge top progress bar */}
      <div
        role="progressbar"
        aria-label={snapshot.label || 'Processing PDF document'}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={
          snapshot.indeterminate ? undefined : isCompleting ? 100 : snapshot.percent
        }
        className={`fixed top-0 left-0 right-0 z-[70] h-[3px] bg-slate-200/70 overflow-hidden pointer-events-none transition-opacity duration-300 ${
          isCompleting ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {snapshot.indeterminate && !isCompleting ? (
          <div className="h-full w-2/5 bg-gradient-to-r from-transparent via-[#2563EB] to-[#60A5FA] shadow-[0_0_12px_rgba(37,99,235,0.75)] animate-global-progress" />
        ) : (
          <div
            className="h-full w-full origin-left bg-gradient-to-r from-[#1D4ED8] via-[#2563EB] to-[#60A5FA] shadow-[0_0_12px_rgba(37,99,235,0.75)] transition-transform duration-200 ease-out"
            style={{ transform: `scaleX(${visualScale})` }}
          />
        )}
      </div>

      {/* Compact non-blocking live status chip while active */}
      {!isCompleting && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-[72px] right-4 z-50 pointer-events-none max-w-[calc(100vw-2rem)]"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0B1120]/95 border border-slate-800 text-white shadow-xl backdrop-blur-md text-[12px]">
            <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin shrink-0" />
            <span className="font-medium truncate max-w-[200px] sm:max-w-[260px]">
              {snapshot.label}
            </span>
            {!snapshot.indeterminate && snapshot.percent > 0 && (
              <span className="font-mono tabular-nums text-[11px] font-semibold text-blue-400 shrink-0">
                {snapshot.percent}%
              </span>
            )}
          </div>
        </div>
      )}
    </>
  );
};
