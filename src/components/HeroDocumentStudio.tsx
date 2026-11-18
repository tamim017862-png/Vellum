import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  Check,
  FileText,
  Layers,
  LayoutGrid,
  Minimize2,
  PenTool,
  RotateCw,
  ShieldCheck,
} from 'lucide-react';
import type { ToolId } from '../types/pdf';
import { VELLUM_EASE } from './RevealSection';

interface HeroDocumentStudioProps {
  onOpenTool: (id: ToolId) => void;
}

interface StudioMode {
  toolId: ToolId;
  shortLabel: string;
  title: string;
  spec: string;
  ctaLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STUDIO_MODES: StudioMode[] = [
  {
    toolId: 'merge-pdf',
    shortLabel: 'Merge',
    title: 'Multi-File Packet Binding',
    spec: 'Combines up to 20 PDFs in a local Web Worker',
    ctaLabel: 'Open Merge PDF',
    icon: Layers,
  },
  {
    toolId: 'compress-pdf',
    shortLabel: 'Compress',
    title: 'Precision Size Optimization',
    spec: 'Visual DPI tiers or lossless object compaction',
    ctaLabel: 'Open Compress PDF',
    icon: Minimize2,
  },
  {
    toolId: 'sign-pdf',
    shortLabel: 'Sign',
    title: 'Vector Ink Signature Placement',
    spec: 'Draw or type signatures directly on page canvas',
    ctaLabel: 'Open Sign PDF',
    icon: PenTool,
  },
  {
    toolId: 'organize-pdf',
    shortLabel: 'Organize',
    title: 'Visual Page Grid Studio',
    spec: 'Reorder, rotate 90°, delete, or extract pages',
    ctaLabel: 'Open Organize PDF',
    icon: LayoutGrid,
  },
];

const MergeStageVisual: React.FC = () => {
  const inputDocs = [
    { name: 'Contract_v2.pdf', pages: '6p', delay: 0.05 },
    { name: 'Schedule_A.pdf', pages: '5p', delay: 0.14 },
    { name: 'Appendix.pdf', pages: '3p', delay: 0.23 },
  ];

  return (
    <div className="w-full flex items-center justify-between gap-3 sm:gap-5 px-2 sm:px-4">
      {/* Left: 3 Source Document Sheets */}
      <div className="flex-1 space-y-2.5 max-w-[186px]">
        {inputDocs.map((doc, idx) => (
          <motion.div
            key={doc.name}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.42, delay: doc.delay, ease: VELLUM_EASE }}
            className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-900/90 border border-slate-700/80 shadow-sm"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-6 h-6 rounded-md bg-blue-500/15 border border-blue-400/30 text-blue-400 flex items-center justify-center shrink-0">
                <FileText className="w-3.5 h-3.5" />
              </span>
              <span className="text-[11.5px] font-medium text-slate-200 truncate">
                {doc.name}
              </span>
            </div>
            <span className="font-mono tabular-nums text-[10.5px] text-slate-400 shrink-0">
              0{idx + 1} · {doc.pages}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Center: Architectural Signal Beam Connector */}
      <div className="flex flex-col items-center gap-1.5 shrink-0" aria-hidden="true">
        <div className="relative w-10 sm:w-14 h-[2px] bg-slate-800 rounded-full overflow-hidden">
          <span className="absolute inset-y-0 left-0 w-7 bg-gradient-to-r from-transparent via-blue-400 to-white animate-signal-1" />
          <span className="absolute inset-y-0 left-0 w-5 bg-gradient-to-r from-transparent via-blue-500 to-sky-300 animate-signal-2" />
        </div>
        <span className="font-mono text-[9.5px] text-blue-400 tracking-wide">
          bind
        </span>
      </div>

      {/* Right: Unified Bound PDF Output */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92, x: 14 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        transition={{ duration: 0.48, delay: 0.18, ease: VELLUM_EASE }}
        className="relative w-[138px] sm:w-[162px] shrink-0"
      >
        {/* Layered stacked sheet offset */}
        <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-xl bg-blue-500/10 border border-blue-400/20" />
        <div className="relative rounded-xl bg-gradient-to-b from-slate-800/95 to-slate-900 border border-blue-500/50 p-3.5 shadow-[0_14px_34px_-12px_rgba(37,99,235,0.45)]">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[10px] font-semibold text-blue-400">
              PDF / 1.7
            </span>
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Check className="w-3 h-3" strokeWidth={2.6} />
            </span>
          </div>
          {/* Architectural page skeleton */}
          <div className="space-y-1.5 mb-3.5">
            <div className="h-2 w-3/4 rounded-xs bg-slate-200/85" />
            <div className="h-1.5 w-full rounded-xs bg-slate-600/75" />
            <div className="h-1.5 w-5/6 rounded-xs bg-slate-600/60" />
            <div className="h-1.5 w-2/3 rounded-xs bg-slate-700/80" />
          </div>
          <div className="pt-2.5 border-t border-slate-700/80">
            <p className="text-[11.5px] font-semibold text-white truncate">
              Merged_Packet.pdf
            </p>
            <p className="font-mono tabular-nums text-[10.5px] text-blue-300 mt-0.5">
              14 pages · 1 file
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const CompressStageVisual: React.FC = () => {
  return (
    <div className="w-full max-w-[390px] mx-auto px-2">
      <div className="grid grid-cols-12 gap-4 items-center">
        {/* Blueprint Scanning Sheet */}
        <div className="col-span-5 relative rounded-xl bg-slate-900 border border-slate-700/80 p-3.5 overflow-hidden">
          <div
            className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-blue-500/30 via-blue-400/15 to-transparent border-b border-blue-400/70 animate-scan-sweep pointer-events-none"
            aria-hidden="true"
          />
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-3">
            <span>Scan.pdf</span>
            <span className="text-blue-400">128 DPI</span>
          </div>
          <div className="space-y-2">
            <div className="h-10 rounded-md bg-slate-800 border border-slate-700/70 flex items-center justify-center">
              <div className="w-10 h-5 rounded-xs bg-blue-500/20 border border-blue-400/30" />
            </div>
            <div className="h-1.5 w-full rounded-xs bg-slate-700" />
            <div className="h-1.5 w-4/5 rounded-xs bg-slate-700/80" />
            <div className="h-1.5 w-3/5 rounded-xs bg-slate-700/60" />
          </div>
        </div>

        {/* Live Size Delta Readout */}
        <div className="col-span-7 space-y-3.5">
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
              <span className="text-slate-400">Original scan</span>
              <span className="text-slate-300 tabular-nums">18.4 MB</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full w-full rounded-full bg-slate-600" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
              <span className="text-blue-300 font-medium">Optimized PDF</span>
              <span className="text-emerald-400 font-semibold tabular-nums">
                2.1 MB
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <motion.div
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0.14 }}
                transition={{ duration: 0.95, delay: 0.18, ease: VELLUM_EASE }}
                className="h-full w-full origin-left rounded-full bg-gradient-to-r from-blue-500 to-emerald-400"
              />
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.4, ease: VELLUM_EASE }}
            className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2 text-[11.5px]"
          >
            <span className="font-mono tabular-nums text-emerald-400 font-semibold">
              −88.6% smaller
            </span>
            <span className="text-slate-400 text-[11px]">
              Sharp readable text
            </span>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

const SignStageVisual: React.FC = () => {
  return (
    <div className="w-full max-w-[330px] mx-auto px-2">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: VELLUM_EASE }}
        className="rounded-xl bg-white text-slate-900 p-4 sm:p-5 shadow-[0_20px_50px_-16px_rgba(0,0,0,0.65)] border border-slate-200"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
          <div>
            <p className="font-display text-[12px] font-bold text-slate-900">
              Service Agreement
            </p>
            <p className="font-mono text-[9.5px] text-slate-400">
              Page 4 of 4 · Execution Copy
            </p>
          </div>
          <span className="font-mono text-[9.5px] text-blue-700 font-semibold">
            Ready to sign
          </span>
        </div>

        <div className="space-y-1.5 mb-4">
          <div className="h-1.5 w-full rounded-xs bg-slate-200" />
          <div className="h-1.5 w-11/12 rounded-xs bg-slate-200" />
          <div className="h-1.5 w-3/4 rounded-xs bg-slate-100" />
        </div>

        {/* Live Animated Calligraphic Signature Canvas */}
        <div className="relative rounded-lg bg-blue-50/70 border border-dashed border-blue-400/80 px-3 py-2.5">
          <span className="block font-mono text-[9px] text-blue-700/80 mb-1">
            Authorized Signature
          </span>
          <svg
            viewBox="0 0 210 46"
            className="w-full h-9 overflow-visible"
            fill="none"
            aria-hidden="true"
          >
            <motion.path
              d="M10 34 C 24 8, 36 8, 34 32 C 33 38, 48 14, 58 22 C 66 28, 62 34, 74 26 C 85 18, 96 14, 102 28 C 107 37, 120 12, 134 24 C 142 30, 154 20, 168 24 C 180 27, 192 22, 202 20"
              stroke="#1E3A8A"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0.4 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.15, delay: 0.2, ease: VELLUM_EASE }}
            />
            <motion.path
              d="M28 38 C 78 35, 136 33, 188 34"
              stroke="#2563EB"
              strokeWidth="1.4"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.7 }}
              transition={{ duration: 0.55, delay: 1.1, ease: VELLUM_EASE }}
            />
          </svg>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 1.25, ease: VELLUM_EASE }}
          className="mt-2.5 flex items-center justify-between text-[10.5px] font-medium text-emerald-700"
        >
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Flattened locally in browser</span>
          </span>
          <span className="font-mono text-slate-400">0 bytes sent</span>
        </motion.div>
      </motion.div>
    </div>
  );
};

const OrganizeStageVisual: React.FC = () => {
  const [arranged, setArranged] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setArranged(true), 650);
    return () => window.clearTimeout(t);
  }, []);

  const pages = arranged
    ? [
        { id: 'p1', label: '01', tag: 'Cover', rotated: false, active: true },
        { id: 'p2', label: '02', tag: 'Fixed 90°', rotated: false, active: true },
        { id: 'p4', label: '03', tag: 'Summary', rotated: false, active: false },
        { id: 'p3', label: '04', tag: 'Tables', rotated: false, active: false },
      ]
    : [
        { id: 'p1', label: '01', tag: 'Cover', rotated: false, active: true },
        { id: 'p2', label: '02', tag: 'Sideways', rotated: true, active: true },
        { id: 'p3', label: '03', tag: 'Tables', rotated: false, active: false },
        { id: 'p4', label: '04', tag: 'Summary', rotated: false, active: false },
      ];

  return (
    <div className="w-full max-w-[360px] mx-auto px-2">
      <div className="grid grid-cols-4 gap-2.5">
        {pages.map((page) => (
          <motion.div
            key={page.id}
            layout
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            className={`rounded-lg p-2.5 border transition-colors ${
              page.active
                ? 'bg-slate-800/95 border-blue-500/60 shadow-[0_8px_20px_-8px_rgba(37,99,235,0.45)]'
                : 'bg-slate-900/90 border-slate-700/80'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono tabular-nums text-[10px] font-semibold text-blue-300">
                {page.label}
              </span>
              {page.id === 'p2' && (
                <RotateCw className="w-3 h-3 text-blue-400" />
              )}
            </div>
            <motion.div
              animate={{ rotate: page.rotated ? -90 : 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              className="aspect-[3/4] rounded-md bg-slate-950/90 border border-slate-700/70 p-2 flex flex-col justify-center gap-1.5"
            >
              <div className="h-1.5 w-3/4 rounded-xs bg-slate-300/80" />
              <div className="h-1 w-full rounded-xs bg-slate-600" />
              <div className="h-1 w-5/6 rounded-xs bg-slate-600" />
              <div className="h-1 w-2/3 rounded-xs bg-slate-700" />
            </motion.div>
            <p className="mt-2 text-[10px] text-center text-slate-300 truncate">
              {page.tag}
            </p>
          </motion.div>
        ))}
      </div>
      <div className="mt-3.5 flex items-center justify-between text-[11px] font-mono text-slate-400 px-0.5">
        <span>Drag-and-drop page reordering</span>
        <span className="text-blue-400">
          {arranged ? 'Order & rotation synced' : 'Inspecting thumbnails...'}
        </span>
      </div>
    </div>
  );
};

export const HeroDocumentStudio: React.FC<HeroDocumentStudioProps> = ({
  onOpenTool,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused || typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % STUDIO_MODES.length);
    }, 4800);

    return () => window.clearInterval(timer);
  }, [isPaused]);

  const activeMode = STUDIO_MODES[activeIndex] ?? STUDIO_MODES[0];

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
      className="relative h-full flex flex-col justify-between rounded-2xl bg-[#0B1120] bg-arch-grid-dark text-white border border-slate-800/95 shadow-[0_32px_80px_-28px_rgba(11,17,32,0.45)] overflow-hidden"
    >
      {/* Top ambient sapphire rim glow */}
      <div
        className="absolute -top-24 right-1/4 w-72 h-72 rounded-full bg-blue-600/18 blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      {/* Workbench Window Header */}
      <div className="relative z-10 px-5 py-3.5 border-b border-slate-800/90 bg-slate-950/60 backdrop-blur-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-400/25 text-blue-400 flex items-center justify-center shrink-0">
            <activeMode.icon className="w-3.5 h-3.5" />
          </span>
          <div className="min-w-0">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={`title-${activeMode.toolId}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: VELLUM_EASE }}
                className="font-display text-[13.5px] font-semibold text-white truncate"
              >
                {activeMode.title}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        <span className="font-mono text-[11px] text-slate-400 whitespace-nowrap shrink-0">
          On-device engine
        </span>
      </div>

      {/* Central Live Animated Document Blueprint Stage */}
      <div className="relative z-10 flex-1 min-h-[268px] sm:min-h-[296px] flex items-center justify-center px-4 py-6">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeMode.toolId}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.26, ease: VELLUM_EASE }}
            className="w-full"
          >
            {activeMode.toolId === 'merge-pdf' && <MergeStageVisual />}
            {activeMode.toolId === 'compress-pdf' && <CompressStageVisual />}
            {activeMode.toolId === 'sign-pdf' && <SignStageVisual />}
            {activeMode.toolId === 'organize-pdf' && <OrganizeStageVisual />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Interactive Segmented Mode Switcher & Launch Strip */}
      <div className="relative z-10 border-t border-slate-800/90 bg-slate-950/75 px-4 pt-3.5 pb-4 space-y-3">
        {/* Segmented Control */}
        <div className="rounded-xl bg-slate-900/90 border border-slate-800 overflow-hidden">
          <div
            role="tablist"
            aria-label="Interactive document engine preview modes"
            className="grid grid-cols-4 gap-1 p-1"
          >
            {STUDIO_MODES.map((mode, idx) => {
              const isSelected = idx === activeIndex;
              return (
                <button
                  key={mode.toolId}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setActiveIndex(idx)}
                  className={`relative py-2 px-2 rounded-lg text-[12px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="hero-studio-mode-pill"
                      transition={{
                        type: 'spring',
                        stiffness: 430,
                        damping: 32,
                      }}
                      className="absolute inset-0 rounded-lg bg-[#2563EB] shadow-[0_6px_18px_-6px_rgba(37,99,235,0.8)]"
                      aria-hidden="true"
                    />
                  )}
                  <span className="relative z-10">{mode.shortLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Auto-cycle hairline progress indicator */}
          <div className="h-[2px] w-full bg-slate-800/80 overflow-hidden" aria-hidden="true">
            <span
              key={activeIndex}
              className={`block h-full w-full bg-gradient-to-r from-blue-600 via-blue-400 to-sky-300 animate-preset-progress ${
                isPaused
                  ? '[animation-play-state:paused]'
                  : '[animation-play-state:running]'
              }`}
            />
          </div>
        </div>

        {/* Bottom Caption + Direct Tool Action */}
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="min-w-0 flex-1 overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={`spec-${activeMode.toolId}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: VELLUM_EASE }}
                className="text-[12px] text-slate-400 truncate"
              >
                {activeMode.spec}
              </motion.p>
            </AnimatePresence>
          </div>
          <a
            href={`/${activeMode.toolId}`}
            onClick={(e) => {
              e.preventDefault();
              onOpenTool(activeMode.toolId);
            }}
            className="group inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-blue-400 hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            <span>{activeMode.ctaLabel}</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>
      </div>
    </div>
  );
};
