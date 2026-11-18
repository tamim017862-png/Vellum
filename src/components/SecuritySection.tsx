import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  CloudOff,
  Cpu,
  Download,
  FileCheck2,
  FolderOpen,
  HardDrive,
  Lock,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  RevealSection,
  StaggerGroup,
  StaggerItem,
  VELLUM_EASE,
} from './RevealSection';

interface SecuritySectionProps {
  onOpenMyFiles: () => void;
}

const SECURITY_ANSWERS = [
  {
    index: '01',
    question: '13 Browser-Local PDF Engines',
    answer:
      'Merge, Split, Compress, Organize, Rotate, Delete, Extract, Sign, Watermark, Page Numbers, Crop, PDF to JPG, and JPG to PDF execute entirely inside your browser using pdf-lib, PDF.js, Canvas, and Web Workers.',
    icon: Cpu,
  },
  {
    index: '02',
    question: '2 Transparent Opt-In AI Tools',
    answer:
      'AI PDF Summarizer and Chat with PDF extract text locally on your device first. Only when you explicitly click Submit is that extracted text sent to our stateless Gemini route—with zero file or database storage.',
    icon: HardDrive,
  },
  {
    index: '03',
    question: 'Temporary Tab-Scoped Outputs',
    answer:
      'Finished PDFs and ZIP files live strictly as temporary Blob URLs inside My Files while your browser tab is open and revoke automatically when cleared or closed.',
    icon: FileCheck2,
  },
  {
    index: '04',
    question: 'Direct On-Device Downloads',
    answer:
      'Core document edits save straight from local memory to disk without waiting on remote servers, upload queues, or account logins.',
    icon: Download,
  },
];

export const SecuritySection: React.FC<SecuritySectionProps> = ({
  onOpenMyFiles,
}) => {
  const [boundaryMode, setBoundaryMode] = useState<'local' | 'ai'>('local');

  return (
    <section
      id="security"
      aria-labelledby="security-heading"
      className="relative bg-[#0B1120] bg-arch-grid-dark text-white border-t border-slate-800/90 overflow-hidden"
    >
      {/* Subtle deep cobalt ambient highlight */}
      <div
        className="absolute top-0 left-1/3 w-[520px] h-[340px] rounded-full bg-blue-600/10 blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <RevealSection className="relative max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-start">
          {/* Left Trust Narrative */}
          <div className="lg:col-span-5">
            <p className="text-[13px] font-semibold text-blue-400 mb-3">
              Privacy &amp; security architecture
            </p>
            <h2
              id="security-heading"
              className="font-display text-[32px] sm:text-[42px] font-bold text-white tracking-[-0.03em] leading-[1.08]"
            >
              Built so your files stay{' '}
              <span className="text-blue-400">strictly on your device.</span>
            </h2>
            <p className="mt-5 text-[15.5px] leading-[1.68] text-slate-300">
              Unlike upload-based PDF converters, Vellum runs its core engines
              inside your browser sandbox. Sensitive contracts, financial
              statements, and scans stay in local memory from drop to download.
            </p>

            {/* Precision Tabular Metrics */}
            <div className="mt-8 rounded-2xl bg-slate-900/90 border border-slate-800 grid grid-cols-2 divide-x divide-slate-800">
              <div className="p-5">
                <div className="font-mono tabular-nums text-[24px] font-bold text-white">
                  13 / 15
                </div>
                <div className="text-[12.5px] text-slate-400 mt-1">
                  100% browser-local PDF engines
                </div>
              </div>
              <div className="p-5">
                <div className="font-mono tabular-nums text-[24px] font-bold text-emerald-400">
                  0 Bytes
                </div>
                <div className="text-[12.5px] text-slate-400 mt-1">
                  Stored in remote databases
                </div>
              </div>
            </div>

            <div className="mt-6">
              <motion.button
                type="button"
                whileHover={{ y: -1.5 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 460, damping: 28 }}
                onClick={onOpenMyFiles}
                className="min-h-[44px] px-5 py-2.5 bg-white hover:bg-blue-50 text-[#0B1120] rounded-lg text-[13.5px] font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
              >
                <FolderOpen className="w-4 h-4 text-[#2563EB]" />
                <span>Inspect Session Files</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          </div>

          {/* Right: Interactive Live Data-Boundary Diagram + 4 Architectural Facts */}
          <div className="lg:col-span-7 space-y-5">
            {/* Interactive Security Boundary Visualizer */}
            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-800">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-white">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Live Data Boundary Diagram</span>
                </div>

                {/* Segmented Switch: Local PDF Tools vs Opt-In AI Tools */}
                <div
                  role="tablist"
                  aria-label="Inspect security boundary mode"
                  className="inline-flex p-1 rounded-lg bg-slate-950 border border-slate-800 self-start sm:self-auto"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={boundaryMode === 'local'}
                    onClick={() => setBoundaryMode('local')}
                    className={`relative px-3 py-1.5 rounded-md text-[11.5px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      boundaryMode === 'local'
                        ? 'text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {boundaryMode === 'local' && (
                      <motion.span
                        layoutId="security-boundary-pill"
                        transition={{
                          type: 'spring',
                          stiffness: 450,
                          damping: 32,
                        }}
                        className="absolute inset-0 rounded-md bg-[#2563EB]"
                        aria-hidden="true"
                      />
                    )}
                    <span className="relative z-10">Core PDFs (13)</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={boundaryMode === 'ai'}
                    onClick={() => setBoundaryMode('ai')}
                    className={`relative px-3 py-1.5 rounded-md text-[11.5px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      boundaryMode === 'ai'
                        ? 'text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {boundaryMode === 'ai' && (
                      <motion.span
                        layoutId="security-boundary-pill"
                        transition={{
                          type: 'spring',
                          stiffness: 450,
                          damping: 32,
                        }}
                        className="absolute inset-0 rounded-md bg-violet-600"
                        aria-hidden="true"
                      />
                    )}
                    <span className="relative z-10">Opt-in AI (2)</span>
                  </button>
                </div>
              </div>

              <AnimatePresence mode="wait" initial={false}>
                {boundaryMode === 'local' ? (
                  <motion.div
                    key="boundary-local"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.22, ease: VELLUM_EASE }}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-stretch"
                  >
                    {/* Device Sandbox Perimeter */}
                    <div className="sm:col-span-8 rounded-xl bg-slate-950/90 border border-emerald-500/35 p-4">
                      <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-emerald-400 mb-3">
                        <span className="inline-flex items-center gap-1.5 font-semibold">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Your Browser Sandbox</span>
                        </span>
                        <span>100% Isolated</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { step: '01', name: 'File Read', sub: 'Local disk' },
                          { step: '02', name: 'Web Worker', sub: 'pdf-lib / JS' },
                          { step: '03', name: 'Save File', sub: 'Blob export' },
                        ].map((node) => (
                          <div
                            key={node.step}
                            className="rounded-lg bg-slate-900 border border-slate-800 p-2.5"
                          >
                            <span className="font-mono text-[10px] text-blue-400 font-semibold">
                              {node.step}
                            </span>
                            <p className="font-display text-[12.5px] font-bold text-white mt-0.5">
                              {node.name}
                            </p>
                            <p className="text-[10.5px] text-slate-400 mt-0.5">
                              {node.sub}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Blocked Cloud Node */}
                    <div className="sm:col-span-4 rounded-xl bg-slate-950/50 border border-dashed border-slate-700 p-4 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span>Remote Server</span>
                        <CloudOff className="w-4 h-4 text-slate-500" />
                      </div>
                      <div className="my-3">
                        <p className="font-mono tabular-nums text-[15px] font-bold text-slate-300">
                          0 Bytes Sent
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                          PDF binaries never cross the network boundary.
                        </p>
                      </div>
                      <span className="text-[10.5px] font-mono text-emerald-400">
                        Verified offline-capable
                      </span>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="boundary-ai"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.22, ease: VELLUM_EASE }}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-stretch"
                  >
                    {/* Local Extraction Stage */}
                    <div className="sm:col-span-7 rounded-xl bg-slate-950/90 border border-blue-500/35 p-4 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-[11px] font-mono text-blue-400 mb-3">
                        <span className="inline-flex items-center gap-1.5 font-semibold">
                          <Lock className="w-3.5 h-3.5" />
                          <span>On Your Device First</span>
                        </span>
                        <span>PDF stays local</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-slate-900 border border-slate-800 p-2.5">
                          <span className="font-mono text-[10px] text-blue-400">
                            01
                          </span>
                          <p className="font-display text-[12.5px] font-bold text-white mt-0.5">
                            PDF Binary
                          </p>
                          <p className="text-[10.5px] text-slate-400 mt-0.5">
                            Never uploaded
                          </p>
                        </div>
                        <div className="rounded-lg bg-slate-900 border border-slate-800 p-2.5">
                          <span className="font-mono text-[10px] text-blue-400">
                            02
                          </span>
                          <p className="font-display text-[12.5px] font-bold text-white mt-0.5">
                            Text Extract
                          </p>
                          <p className="text-[10.5px] text-slate-400 mt-0.5">
                            Local PDF.js
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Stateless Opt-In AI Route */}
                    <div className="sm:col-span-5 rounded-xl bg-slate-950/90 border border-violet-500/40 p-4 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-[11px] font-mono text-violet-300">
                        <span>Opt-in Gemini Route</span>
                        <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                      </div>
                      <div className="my-2.5">
                        <p className="font-display text-[13px] font-bold text-white">
                          Sent only when you click Submit
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                          Extracted text only · zero disk or database retention.
                        </p>
                      </div>
                      <span className="text-[10.5px] font-mono text-violet-300">
                        Explicit user action
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 4 Core Privacy Guarantees — Clean Hairline Matrix */}
            <StaggerGroup
              stagger={0.055}
              className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-slate-800 border border-slate-800 rounded-2xl overflow-hidden"
            >
              {SECURITY_ANSWERS.map((item) => {
                const Icon = item.icon;
                return (
                  <StaggerItem key={item.index} className="h-full">
                    <div className="group h-full p-5 sm:p-6 bg-slate-900/95 hover:bg-slate-900 flex flex-col justify-between transition-colors duration-200">
                      <div>
                        <div className="flex items-center justify-between gap-3 mb-3.5">
                          <div className="w-9 h-9 rounded-lg bg-slate-950 border border-slate-800 group-hover:border-blue-500/50 text-blue-400 flex items-center justify-center transition-colors duration-200">
                            <Icon className="w-4 h-4" strokeWidth={1.8} />
                          </div>
                          <span className="font-mono tabular-nums text-[11.5px] font-semibold text-slate-500">
                            {item.index}
                          </span>
                        </div>
                        <h3 className="font-display text-[15.5px] font-bold text-white tracking-[-0.018em]">
                          {item.question}
                        </h3>
                        <p className="mt-2 text-[13px] leading-[1.62] text-slate-300">
                          {item.answer}
                        </p>
                      </div>
                    </div>
                  </StaggerItem>
                );
              })}
            </StaggerGroup>
          </div>
        </div>
      </RevealSection>
    </section>
  );
};
