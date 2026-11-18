export interface BatchProgressState {
  current: number;
  total: number;
  startedAt: number;
  stage?: string;
}

export interface ProgressMetrics {
  current: number;
  total: number;
  percent: number;
  elapsedMs: number;
  remainingMs: number | null;
  etaText: string;
  elapsedText: string;
}

export function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

export function formatEtaDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) {
    return 'Finalizing output...';
  }
  if (ms < 1000) {
    return '< 1s remaining';
  }

  const totalSeconds = Math.ceil(ms / 1000);
  if (totalSeconds < 60) {
    return `~${totalSeconds}s remaining`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) {
    return seconds > 0
      ? `~${minutes}m ${seconds}s remaining`
      : `~${minutes}m remaining`;
  }

  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return remMinutes > 0
    ? `~${hours}h ${remMinutes}m remaining`
    : `~${hours}h remaining`;
}

export function formatElapsedDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 1000) {
    return '0s';
  }
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

export function computeProgressMetrics(
  progress: BatchProgressState,
  nowMs: number = Date.now(),
  stepSnapshot?: { current: number; baseRemainingMs: number; updatedAt: number } | null
): ProgressMetrics {
  const safeTotal = Math.max(1, Math.floor(progress.total));
  const safeCurrent = Math.max(0, Math.min(Math.floor(progress.current), safeTotal));
  const percent = Math.min(100, Math.round((safeCurrent / safeTotal) * 100));
  const elapsedMs = Math.max(0, nowMs - progress.startedAt);
  const elapsedText = formatElapsedDuration(elapsedMs);

  if (safeCurrent === 0) {
    return {
      current: safeCurrent,
      total: safeTotal,
      percent,
      elapsedMs,
      remainingMs: null,
      etaText: 'Estimating time remaining...',
      elapsedText,
    };
  }

  if (safeCurrent >= safeTotal) {
    return {
      current: safeCurrent,
      total: safeTotal,
      percent: 100,
      elapsedMs,
      remainingMs: 0,
      etaText: 'Finalizing output...',
      elapsedText,
    };
  }

  let remainingMs: number;
  if (stepSnapshot && stepSnapshot.current === safeCurrent) {
    const sinceUpdate = Math.max(0, nowMs - stepSnapshot.updatedAt);
    remainingMs = Math.max(500, stepSnapshot.baseRemainingMs - sinceUpdate);
  } else {
    const avgMsPerItem = elapsedMs / safeCurrent;
    remainingMs = Math.max(500, Math.round(avgMsPerItem * (safeTotal - safeCurrent)));
  }

  return {
    current: safeCurrent,
    total: safeTotal,
    percent,
    elapsedMs,
    remainingMs,
    etaText: formatEtaDuration(remainingMs),
    elapsedText,
  };
}
