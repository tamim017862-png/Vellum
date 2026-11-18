import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  CheckCircle2,
  Download,
  Loader2,
  Play,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { ToolId } from '../types/pdf';

interface WatchDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchTool: (id: ToolId) => void;
}

const DEMO_STEPS = [
  {
    step: '01',
    title: 'Select or Drop Documents Locally',
    detail:
      'Files are inspected in your browser for valid %PDF- or JPG/PNG headers. Nothing is transmitted over the network.',
  },
  {
    step: '02',
    title: 'Arrange, Configure & Process',
    detail:
      'Reorder PDFs, specify exact page ranges, pick compression strength, or configure output DPI right inside your tab.',
  },
  {
    step: '03',
    title: 'Instant Download & Session Access',
    detail:
      'Download your finished PDF, JPGs, or ZIP archive immediately. Outputs stay accessible in My Files until you close or clear.',
  },
];

export const WatchDemoModal: React.FC<WatchDemoModalProps> = ({
  isOpen,
  onClose,
  onLaunchTool,
}) => {
  const [isGeneratingSamples, setIsGeneratingSamples] = useState(false);
  const [samplesReady, setSamplesReady] = useState(false);

  const handleDownloadSamplePdfs = async () => {
    setIsGeneratingSamples(true);
    try {
      const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
      const createSample = async (
        title: string,
        subtitle: string,
        accent: [number, number, number]
      ) => {
        const doc = await PDFDocument.create();
        const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
        const fontReg = await doc.embedFont(StandardFonts.Helvetica);

        for (let p = 1; p <= 2; p += 1) {
          const page = doc.addPage([595, 842]);
          page.drawRectangle({
            x: 0,
            y: 770,
            width: 595,
            height: 72,
            color: rgb(accent[0], accent[1], accent[2]),
          });
          page.drawText(`VELLUM SAMPLE — ${title}`, {
            x: 48,
            y: 798,
            size: 18,
            font: fontBold,
            color: rgb(1, 1, 1),
          });
          page.drawText(`${subtitle} · Page ${p} of 2`, {
            x: 48,
            y: 720,
            size: 14,
            font: fontBold,
            color: rgb(0.06, 0.09, 0.16),
          });
          page.drawText(
            'Generated locally in your browser using pdf-lib so you can test Merge, Split, Compress, and PDF to JPG immediately.',
            {
              x: 48,
              y: 690,
              size: 11,
              font: fontReg,
              color: rgb(0.3, 0.35, 0.42),
              maxWidth: 495,
            }
          );
        }

        const bytes = await doc.save();
        const blob = new Blob([new Uint8Array(bytes)], {
          type: 'application/pdf',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.toLowerCase().replace(/\s+/g, '-')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      };

      await createSample(
        'Sample Brief Part A',
        'First sample PDF document',
        [0.145, 0.388, 0.922]
      );
      await createSample(
        'Sample Brief Part B',
        'Second sample PDF document',
        [0.043, 0.067, 0.125]
      );
      setSamplesReady(true);
    } finally {
      setIsGeneratingSamples(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="demo-modal-title"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-[#0B1120]/55 backdrop-blur-xs"
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="relative z-10 w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
          >
            <div className="px-6 sm:px-7 py-5 border-b border-slate-800 flex items-center justify-between gap-4 bg-[#0B1120] text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shadow-[0_8px_18px_-4px_rgba(37,99,235,0.55)]">
                  <Play className="w-4 h-4 fill-white ml-0.5" />
                </div>
                <div>
                  <h2
                    id="demo-modal-title"
                    className="font-display text-[19px] font-bold text-white tracking-[-0.02em]"
                  >
                    How Vellum Works in Your Browser
                  </h2>
                  <p className="text-[12.5px] text-slate-300">
                    Zero uploads · Instant client-side execution
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close demo dialog"
                className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 sm:p-7 space-y-5">
              <div className="space-y-3">
                {DEMO_STEPS.map((item) => (
                  <div
                    key={item.step}
                    className="flex items-start gap-4 p-4 rounded-xl bg-[#F8FAFC] border border-slate-200"
                  >
                    <span className="font-mono tabular-nums text-[12.5px] font-bold text-[#2563EB] bg-blue-50 px-2.5 py-1 rounded-md shrink-0">
                      {item.step}
                    </span>
                    <div>
                      <h3 className="font-display text-[15px] font-bold text-[#0B1120] tracking-[-0.015em]">
                        {item.title}
                      </h3>
                      <p className="text-[13px] text-slate-600 mt-1 leading-relaxed">
                        {item.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Real Sample PDF Generator */}
              <div className="p-4 rounded-xl bg-blue-50/75 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-[#2563EB] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[13px] font-semibold text-[#0B1120]">
                      Need test PDFs right now?
                    </p>
                    <p className="text-[12px] text-slate-600 mt-0.5">
                      Download two valid 2-page sample PDFs generated locally to
                      try any tool.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isGeneratingSamples}
                  onClick={handleDownloadSamplePdfs}
                  className="min-h-[38px] px-4 py-2 bg-white border border-blue-200 text-[#1D4ED8] hover:bg-blue-50 text-[12px] font-semibold rounded-lg inline-flex items-center justify-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  {isGeneratingSamples ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : samplesReady ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {samplesReady
                      ? 'Samples Downloaded'
                      : 'Download 2 Sample PDFs'}
                  </span>
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[40px] px-4 py-2 text-[13px] font-semibold text-slate-600 hover:text-[#0B1120] cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onLaunchTool('merge-pdf');
                  }}
                  className="min-h-[40px] px-5 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-semibold rounded-lg shadow-[0_8px_20px_-6px_rgba(37,99,235,0.5)] inline-flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <span>Launch Merge PDF</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
