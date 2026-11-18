import { useCallback, useEffect, useRef } from 'react';
import type { Metric } from 'web-vitals';

export type WebVitalName = 'LCP' | 'CLS' | 'INP' | 'FCP' | 'TTFB';
export type WebVitalRating = 'good' | 'needs-improvement' | 'poor';

export interface WebVitalThreshold {
  good: number;
  poor: number;
  unit: 'ms' | 'score';
}

/**
 * Official Google Core Web Vitals & PageSpeed Insights thresholds.
 */
export const CORE_WEB_VITAL_THRESHOLDS: Record<WebVitalName, WebVitalThreshold> = {
  LCP: { good: 2500, poor: 4000, unit: 'ms' },
  CLS: { good: 0.1, poor: 0.25, unit: 'score' },
  INP: { good: 200, poor: 500, unit: 'ms' },
  FCP: { good: 1800, poor: 3000, unit: 'ms' },
  TTFB: { good: 800, poor: 1800, unit: 'ms' },
};

export interface WebVitalReport {
  id: string;
  name: WebVitalName;
  value: number;
  delta: number;
  rating: WebVitalRating;
  navigationType: string;
  route: string;
  timestamp: number;
}

export interface WebVitalsSnapshot {
  route: string;
  metrics: Partial<Record<WebVitalName, WebVitalReport>>;
  passesCoreWebVitals: boolean;
  updatedAt: number | null;
}

export interface UseWebVitalsOptions {
  /** Active application route path used to tag captured metrics. */
  route?: string;
  /** Optional callback invoked whenever a metric measurement updates. */
  onMetric?: (report: WebVitalReport, snapshot: WebVitalsSnapshot) => void;
  /** Optional endpoint (e.g. '/api/vitals') flushed on visibilitychange/pagehide via sendBeacon. */
  reportEndpoint?: string;
  /** Disable collection conditionally without changing hook call order. */
  enabled?: boolean;
  /** Emit debug logs in development when metrics arrive. */
  debug?: boolean;
}

declare global {
  interface Window {
    __VELLUM_WEB_VITALS__?: WebVitalsSnapshot;
  }
}

function normalizeMetricValue(name: WebVitalName, value: number): number {
  return name === 'CLS'
    ? Math.round(value * 10000) / 10000
    : Math.round(value * 100) / 100;
}

function evaluateCoreWebVitalsPass(
  metrics: Partial<Record<WebVitalName, WebVitalReport>>
): boolean {
  const coreNames: WebVitalName[] = ['LCP', 'CLS', 'INP'];
  return coreNames.every((name) => {
    const entry = metrics[name];
    return !entry || entry.rating === 'good';
  });
}

let observersInitialized = false;

/**
 * React hook that tracks Google Core Web Vitals (LCP, CLS, INP) and
 * supporting PageSpeed metrics (FCP, TTFB) without blocking initial paint
 * or causing React re-renders.
 */
export function useWebVitals(options: UseWebVitalsOptions = {}) {
  const {
    route = typeof window !== 'undefined' ? window.location.pathname : '/',
    onMetric,
    reportEndpoint,
    enabled = true,
    debug = false,
  } = options;

  const routeRef = useRef(route);
  routeRef.current = route;

  const onMetricRef = useRef(onMetric);
  onMetricRef.current = onMetric;

  const endpointRef = useRef(reportEndpoint);
  endpointRef.current = reportEndpoint;

  const debugRef = useRef(debug);
  debugRef.current = debug;

  const metricsRef = useRef<Partial<Record<WebVitalName, WebVitalReport>>>({});
  const pendingQueueRef = useRef<Map<WebVitalName, WebVitalReport>>(new Map());
  const updatedAtRef = useRef<number | null>(null);

  const getSnapshot = useCallback((): WebVitalsSnapshot => {
    return {
      route: routeRef.current,
      metrics: { ...metricsRef.current },
      passesCoreWebVitals: evaluateCoreWebVitalsPass(metricsRef.current),
      updatedAt: updatedAtRef.current,
    };
  }, []);

  const flush = useCallback(() => {
    const endpoint = endpointRef.current;
    if (!endpoint || typeof window === 'undefined') return;
    if (pendingQueueRef.current.size === 0) return;

    const batch = Array.from(pendingQueueRef.current.values());
    pendingQueueRef.current.clear();

    const payload = JSON.stringify({
      route: routeRef.current,
      metrics: batch,
      sentAt: Date.now(),
    });

    try {
      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        const blob = new Blob([payload], { type: 'application/json' });
        const queued = navigator.sendBeacon(endpoint, blob);
        if (queued) return;
      }

      if (typeof fetch === 'function') {
        void fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {
          // Swallow transient unload/network errors silently
        });
      }
    } catch {
      // Never throw from telemetry dispatch
    }
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const syncGlobalSnapshot = () => {
      window.__VELLUM_WEB_VITALS__ = {
        route: routeRef.current,
        metrics: { ...metricsRef.current },
        passesCoreWebVitals: evaluateCoreWebVitalsPass(metricsRef.current),
        updatedAt: updatedAtRef.current,
      };
    };

    syncGlobalSnapshot();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flush();
      }
    };

    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    if (observersInitialized) {
      return () => {
        window.removeEventListener('pagehide', flush);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }

    let cancelled = false;
    let idleHandle: number | null = null;
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

    const handleMetric = (metric: Metric) => {
      if (cancelled) return;
      const name = metric.name as WebVitalName;
      const report: WebVitalReport = {
        id: metric.id,
        name,
        value: normalizeMetricValue(name, metric.value),
        delta: normalizeMetricValue(name, metric.delta),
        rating: metric.rating,
        navigationType: metric.navigationType,
        route: routeRef.current,
        timestamp: Date.now(),
      };

      metricsRef.current[name] = report;
      pendingQueueRef.current.set(name, report);
      updatedAtRef.current = report.timestamp;
      syncGlobalSnapshot();

      if (debugRef.current && import.meta.env.DEV) {
        const unit = CORE_WEB_VITAL_THRESHOLDS[name].unit === 'ms' ? 'ms' : '';
        console.debug(
          `[Vellum Web Vitals] ${name}: ${report.value}${unit} (${report.rating}) on ${report.route}`
        );
      }

      onMetricRef.current?.(report, {
        route: routeRef.current,
        metrics: { ...metricsRef.current },
        passesCoreWebVitals: evaluateCoreWebVitalsPass(metricsRef.current),
        updatedAt: updatedAtRef.current,
      });
    };

    const startObserving = () => {
      if (cancelled || observersInitialized) return;
      observersInitialized = true;

      void import('web-vitals')
        .then(({ onCLS, onFCP, onINP, onLCP, onTTFB }) => {
          if (cancelled) return;
          onCLS(handleMetric);
          onFCP(handleMetric);
          onINP(handleMetric);
          onLCP(handleMetric);
          onTTFB(handleMetric);
        })
        .catch(() => {
          observersInitialized = false;
        });
    };

    if (typeof window.requestIdleCallback === 'function') {
      idleHandle = window.requestIdleCallback(startObserving, { timeout: 1500 });
    } else {
      timeoutHandle = setTimeout(startObserving, 0);
    }

    return () => {
      cancelled = true;
      if (idleHandle !== null && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleHandle);
      }
      if (timeoutHandle !== null) {
        clearTimeout(timeoutHandle);
      }
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, flush]);

  return {
    getSnapshot,
    flush,
  };
}
