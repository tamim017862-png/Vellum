import { useEffect, useId, useSyncExternalStore } from 'react';

export interface GlobalProgressTask {
  id: string;
  label: string;
  detail?: string;
  /** 0..100 for determinate tasks, or null/undefined for indeterminate shimmer */
  percent: number | null;
  indeterminate: boolean;
  updatedAt: number;
}

export interface GlobalProgressSnapshot {
  status: 'idle' | 'active' | 'completing';
  label: string;
  detail?: string;
  percent: number;
  indeterminate: boolean;
}

const IDLE_SNAPSHOT: GlobalProgressSnapshot = {
  status: 'idle',
  label: '',
  detail: undefined,
  percent: 0,
  indeterminate: false,
};

const activeTasks = new Map<string, GlobalProgressTask>();
const listeners = new Set<() => void>();

let currentSnapshot: GlobalProgressSnapshot = IDLE_SNAPSHOT;
let completeTimer: ReturnType<typeof setTimeout> | null = null;

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function recomputeSnapshot(transitionToComplete: boolean) {
  if (completeTimer !== null) {
    clearTimeout(completeTimer);
    completeTimer = null;
  }

  if (activeTasks.size > 0) {
    // Pick the most recently updated active task for label/detail display
    let latest: GlobalProgressTask | null = null;
    for (const task of activeTasks.values()) {
      if (!latest || task.updatedAt >= latest.updatedAt) {
        latest = task;
      }
    }

    if (latest) {
      const clampedPercent =
        typeof latest.percent === 'number' && Number.isFinite(latest.percent)
          ? Math.max(0, Math.min(100, Math.round(latest.percent)))
          : 0;
      const isIndeterminate =
        latest.indeterminate || latest.percent === null || clampedPercent === 0;

      currentSnapshot = {
        status: 'active',
        label: latest.label,
        detail: latest.detail,
        percent: clampedPercent,
        indeterminate: isIndeterminate,
      };
      emitChange();
      return;
    }
  }

  if (transitionToComplete && currentSnapshot.status === 'active') {
    currentSnapshot = {
      status: 'completing',
      label: currentSnapshot.label,
      detail: undefined,
      percent: 100,
      indeterminate: false,
    };
    emitChange();

    completeTimer = setTimeout(() => {
      completeTimer = null;
      if (activeTasks.size === 0) {
        currentSnapshot = IDLE_SNAPSHOT;
        emitChange();
      }
    }, 380);
    return;
  }

  if (currentSnapshot.status !== 'idle') {
    currentSnapshot = IDLE_SNAPSHOT;
    emitChange();
  }
}

export function reportGlobalProgress(
  taskId: string,
  update: {
    label: string;
    detail?: string;
    percent?: number | null;
    indeterminate?: boolean;
  }
): void {
  activeTasks.set(taskId, {
    id: taskId,
    label: update.label,
    detail: update.detail,
    percent: update.percent ?? null,
    indeterminate: Boolean(update.indeterminate),
    updatedAt: Date.now(),
  });
  recomputeSnapshot(false);
}

export function finishGlobalProgress(taskId: string): void {
  const existed = activeTasks.delete(taskId);
  if (existed) {
    recomputeSnapshot(true);
  }
}

export function clearGlobalProgress(taskId: string): void {
  const existed = activeTasks.delete(taskId);
  if (existed) {
    recomputeSnapshot(false);
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): GlobalProgressSnapshot {
  return currentSnapshot;
}

export function useGlobalProgressSnapshot(): GlobalProgressSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, () => IDLE_SNAPSHOT);
}

export function useGlobalTaskProgress(
  active: boolean,
  label: string,
  options?: {
    percent?: number | null;
    detail?: string;
    indeterminate?: boolean;
  }
): void {
  const taskId = useId();
  const percent = options?.percent ?? null;
  const detail = options?.detail;
  const indeterminate = options?.indeterminate ?? percent === null;

  useEffect(() => {
    if (active) {
      reportGlobalProgress(taskId, {
        label,
        detail,
        percent,
        indeterminate,
      });
    } else {
      finishGlobalProgress(taskId);
    }
  }, [active, detail, indeterminate, label, percent, taskId]);

  useEffect(() => {
    return () => {
      finishGlobalProgress(taskId);
    };
  }, [taskId]);
}
