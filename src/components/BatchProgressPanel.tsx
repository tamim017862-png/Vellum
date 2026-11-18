import React, { useEffect, useRef, useState } from 'react';
import { Clock, Loader2 } from 'lucide-react';
import {
  computeProgressMetrics,
  type BatchProgressState,
} from '../utils/batchProgress';
import { useGlobalTaskProgress } from '../utils/globalProgress';

interface BatchProgressPanelProps {
  title: string;
  progress: BatchProgressState;
  unitLabel?: string;
  onCancel?: () => void;
  cancelLabel?: string;
}

export const BatchProgressPanel: React.FC<BatchProgressPanelProps> = ({
  title,
  progress,
  unitLabel = 'items',
  onCancel,
  cancelLabel = 'Cancel',
}) => {
  const [nowMs, setNowMs] = useState(() => Date.now());

  const snapshotRef = useRef<{
    startedAt: number;
    current: number;
    baseRemainingMs: number;
    updatedAt: number;
  } | null>(null);

  if (
    snapshotRef.current &&
    snapshotRef.current.startedAt !== progress.startedAt
  ) {
    snapshotRef.current = null;
  }

  if (progress.current > 0 && progress.current < progress.total) {
    if (!snapshotRef.current || snapshotRef.current.current !== progress.current) {
      const stamp = Date.now();
      const elapsed = Math.max(1, stamp - progress.startedAt);
      const baseRemainingMs = Math.round(
        (elapsed / progress.current) * (progress.total - progress.current)
      );
      snapshotRef.current = {
        startedAt: progress.startedAt,
        current: progress.current,
        baseRemainingMs,
        updatedAt: stamp,
      };
    }
  } else if (progress.current >= progress.total || progress.current === 0) {
    snapshotRef.current = null;
  }

  useEffect(() => {
    setNowMs(Date.now());
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 500);
    return () => window.clearInterval(timer);
  }, [progress.startedAt]);

  const metrics = computeProgressMetrics(progress, nowMs, snapshotRef.current);

  useGlobalTaskProgress(true, title, {
    percent: metrics.percent,
    detail: progress.stage,
    indeterminate: metrics.current === 0,
  });

  return (
    <div
      role="status"
      aria-live="polite"
      className="p-4 bg-[#EFF6FF]/80 border border-[#BFDBFE] rounded-2xl space-y-3"
    >
      <div className="flex items-center justify-between gap-3 text-[13px] font-semibold text-[#0F172A]">
        <span className="flex items-center gap-2 min-w-0">
          <Loader2 className="w-4 h-4 animate-spin text-[#2563EB] shrink-0" />
          <span className="truncate">{title}</span>
        </span>
        <span className="font-mono tabular-nums text-[#1D4ED8] shrink-0">
          {metrics.percent}%
        </span>
      </div>

      <div
        role="progressbar"
        aria-label={title}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={metrics.percent}
        className="w-full h-2.5 bg-white rounded-full overflow-hidden border border-[#BFDBFE]"
      >
        <div
          className="h-full bg-[#2563EB] rounded-full transition-all duration-200"
          style={{ width: `${metrics.percent}%` }}
        />
      </div>

      <div className="flex items-center justify-between gap-2 text-[12px] text-[#475569]">
        <span className="inline-flex items-center gap-1.5 font-medium text-[#0F172A] min-w-0 truncate">
          <Clock className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
          <span className="truncate">{metrics.etaText}</span>
        </span>
        <span className="font-mono tabular-nums shrink-0">
          {metrics.current}/{metrics.total} {unitLabel} · {metrics.elapsedText}
        </span>
      </div>

      {progress.stage && (
        <p className="text-[11px] text-[#475569] truncate pt-0.5 border-t border-[#BFDBFE]/70">
          {progress.stage}
        </p>
      )}

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="w-full min-h-[38px] px-3 py-1.5 text-[12px] font-semibold text-[#0F172A] bg-white border border-[#E2E8F0] rounded-xl hover:border-[#2563EB] hover:text-[#1D4ED8] transition-colors cursor-pointer"
        >
          {cancelLabel}
        </button>
      )}
    </div>
  );
};
