import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Check,
  Cpu,
  Download,
  FileCheck2,
  SlidersHorizontal,
  UploadCloud,
} from 'lucide-react';
import { RevealSection, VELLUM_EASE } from './RevealSection';

interface WorkflowStep {
  number: string;
  title: string;
  summary: string;
  detail: string;
  specLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: WorkflowStep[] = [
  {
    number: '01',
    title: 'Drop & verify locally',
    summary: 'Select or drop PDFs and images straight into browser memory.',
    detail:
      'Vellum checks genuine %PDF-, JPEG, and PNG binary headers locally before parsing—protecting against corrupted or mislabeled files with zero upload latency.',
    specLabel: 'Header validation · Instant read',
    icon: UploadCloud,
  },
  {
    number: '02',
    title: 'Process in a background worker',
    summary: 'Reorder pages, set ranges, sign, or calibrate compression.',
    detail:
      'Heavy multi-file merges, raster exports, and page rebuilds run smoothly inside dedicated browser Web Workers so scrolling and previews stay fluid.',
    specLabel: 'Web Worker thread · Responsive UI',
    icon: SlidersHorizontal,
  },
  {
    number: '03',
    title: 'Export straight to your device',
    summary: 'Download clean PDFs, high-DPI JPGs, or ZIP bundles instantly.',
    detail:
      'Finished files save directly from local memory with zero watermarks or queues, and stay accessible inside My Files until you close your tab.',
    specLabel: 'Local Blob export · Zero watermarks',
    icon: Download,
  },
];

export const HowItWorksSection: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const current = STEPS[activeStep] ?? STEPS[0];

  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="bg-white border-t border-slate-200/80"
    >
      <RevealSection className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-18 sm:py-22">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
          <div className="max-w-2xl">
            <p className="text-[13px] font-semibold text-[#2563EB] mb-2">
              How it works
            </p>
            <h2
              id="how-it-works-heading"
              className="font-display text-[30px] sm:text-[38px] font-bold text-[#0B1120] tracking-[-0.028em] leading-[1.1]"
            >
              Three clear steps from file drop to finished PDF.
            </h2>
          </div>
          <p className="text-[15px] text-slate-600 leading-[1.65] max-w-md">
            No sign-ups, no remote upload progress bars, and no desktop
            installers—click any stage to inspect what happens inside your
            browser.
          </p>
        </div>

        {/* Animated Structural Pipeline Track */}
        <div className="relative mb-7 hidden md:block" aria-hidden="true">
          <div className="h-[2px] w-full bg-slate-200 rounded-full overflow-hidden">
            <motion.div
              animate={{ scaleX: (activeStep + 1) / STEPS.length }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              className="h-full w-full origin-left bg-gradient-to-r from-[#2563EB] via-blue-500 to-sky-400"
            />
          </div>
        </div>

        {/* Interactive 3-Stage Architectural Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isActive = idx === activeStep;
            return (
              <motion.button
                key={step.number}
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.99 }}
                transition={{ type: 'spring', stiffness: 440, damping: 30 }}
                onClick={() => setActiveStep(idx)}
                aria-pressed={isActive}
                className={`group text-left rounded-2xl p-6 border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                  isActive
                    ? 'bg-[#0B1120] text-white border-[#0B1120] shadow-[0_22px_48px_-20px_rgba(11,17,32,0.45)]'
                    : 'bg-[#F8FAFC] hover:bg-white text-[#0B1120] border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                        isActive
                          ? 'bg-[#2563EB] text-white shadow-[0_8px_20px_-6px_rgba(37,99,235,0.65)]'
                          : 'bg-white border border-slate-200 text-[#0B1120] group-hover:border-blue-200 group-hover:text-[#2563EB]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span
                      className={`font-mono tabular-nums text-[13px] font-semibold ${
                        isActive ? 'text-blue-400' : 'text-slate-400'
                      }`}
                    >
                      {step.number}.
                    </span>
                  </div>

                  <h3
                    className={`font-display text-[18px] font-bold tracking-[-0.02em] leading-snug ${
                      isActive ? 'text-white' : 'text-[#0B1120]'
                    }`}
                  >
                    {step.title}
                  </h3>
                  <p
                    className={`mt-2 text-[13.5px] leading-[1.6] ${
                      isActive ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    {step.summary}
                  </p>
                </div>

                <p
                  className={`mt-5 pt-3.5 border-t text-[11.5px] font-mono ${
                    isActive
                      ? 'border-slate-800 text-blue-300'
                      : 'border-slate-200/80 text-slate-500'
                  }`}
                >
                  {step.specLabel}
                </p>
              </motion.button>
            );
          })}
        </div>

        {/* Live Animated Detail Inspector Strip */}
        <div className="mt-5 rounded-2xl bg-[#F8FAFC] border border-slate-200/90 px-6 py-5">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={current.number}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: VELLUM_EASE }}
              className="flex flex-col md:flex-row md:items-center justify-between gap-5"
            >
              <div className="max-w-2xl">
                <p className="font-mono text-[11.5px] font-semibold text-[#2563EB]">
                  Stage {current.number} · {current.title}
                </p>
                <p className="mt-1.5 text-[14px] leading-[1.65] text-slate-700">
                  {current.detail}
                </p>
              </div>

              {/* Clean Live Micro-Verification Visual */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-slate-200 shrink-0">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0">
                  {activeStep === 0 ? (
                    <FileCheck2 className="w-4 h-4" />
                  ) : activeStep === 1 ? (
                    <Cpu className="w-4 h-4" />
                  ) : (
                    <Check className="w-4 h-4 text-emerald-600" />
                  )}
                </div>
                <div className="font-mono text-[11.5px]">
                  <p className="font-semibold text-[#0B1120]">
                    {activeStep === 0
                      ? '%PDF-1.7 signature verified'
                      : activeStep === 1
                        ? 'Local Worker active'
                        : 'Ready for instant save'}
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    {activeStep === 0
                      ? 'Client FileReader buffer'
                      : activeStep === 1
                        ? 'pdf-lib + PDF.js canvas'
                        : 'Revocable session Blob URL'}
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </RevealSection>
    </section>
  );
};
