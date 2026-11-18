import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Minimize2,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { ProcessedFileRecord, ToolId } from '../types/pdf';
import { BatchProgressPanel } from './BatchProgressPanel';
import {
  type BatchProgressState,
  yieldToBrowser,
} from '../utils/batchProgress';
import { formatBytes, sanitizePdfFilename } from '../utils/formatters';
import { useGlobalTaskProgress } from '../utils/globalProgress';
import { getPdfJs, renderPdfPageToCanvas } from '../utils/pdfjsSetup';
import { validatePdfFile } from '../utils/pdfValidation';

interface CompressPdfWorkspaceProps {
  initialFiles?: File[];
  onConsumeInitialFiles?: () => void;
  onBackToTools: () => void;
  onSaveToSession: (record: Omit<ProcessedFileRecord, 'id' | 'createdAt'>) => void;
  onChainToTool?: (url: string, fileName: string, targetToolId: ToolId) => void;
}

type CompressionPreset = 'extreme' | 'balanced' | 'high-quality' | 'lossless';

interface CompressOutputState {
  url: string;
  fileName: string;
  sizeBytes: number;
  originalBytes: number;
  pageCount: number;
}

const PRESETS: {
  id: CompressionPreset;
  title: string;
  subtitle: string;
  scale: number;
  quality: number;
}[] = [
  {
    id: 'extreme',
    title: 'Strong Compression',
    subtitle: '96 DPI · Smaller file size for email & web uploads',
    scale: 1.33,
    quality: 0.56,
  },
  {
    id: 'balanced',
    title: 'Recommended Balance',
    subtitle: '130 DPI · Crisp readability with solid size reduction',
    scale: 1.8,
    quality: 0.72,
  },
  {
    id: 'high-quality',
    title: 'High Clarity',
    subtitle: '165 DPI · Preserves fine graphics & presentation detail',
    scale: 2.25,
    quality: 0.85,
  },
  {
    id: 'lossless',
    title: 'Lossless Structure Only',
    subtitle: 'Preserves selectable vector text · Removes redundant metadata',
    scale: 1,
    quality: 1,
  },
];

export const CompressPdfWorkspace: React.FC<CompressPdfWorkspaceProps> = ({
  initialFiles,
  onConsumeInitialFiles,
  onBackToTools,
  onSaveToSession,
  onChainToTool,
}) => {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceBytes, setSourceBytes] = useState<ArrayBuffer | null>(null);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);

  useGlobalTaskProgress(isInspecting, 'Loading PDF document...', {
    indeterminate: true,
  });

  const [preset, setPreset] = useState<CompressionPreset>('balanced');
  const [outputName, setOutputName] = useState('vellum-compressed-document');

  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<BatchProgressState | null>(null);
  const [output, setOutput] = useState<CompressOutputState | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resetFile = useCallback(() => {
    setSourceFile(null);
    setSourceBytes(null);
    setTotalPages(null);
    setOutput(null);
    setError(null);
    setProgress(null);
  }, []);

  const handleFileSelected = useCallback(async (file: File) => {
    setError(null);
    setOutput(null);

    const check = await validatePdfFile(file);
    if (!check.valid) {
      setError(check.reason ?? 'Invalid PDF file.');
      return;
    }

    setIsInspecting(true);
    try {
      const buffer = await file.arrayBuffer();
      const doc = await PDFDocument.load(buffer, { updateMetadata: false });
      setSourceFile(file);
      setSourceBytes(buffer);
      setTotalPages(doc.getPageCount());
      const base = file.name.replace(/\.pdf$/i, '');
      setOutputName(`${base}-compressed`);
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : '';
      if (msg.includes('encrypted') || msg.includes('password')) {
        setError(
          `"${file.name}" is encrypted or password-protected. Please unlock it before compressing.`
        );
      } else {
        setError(`"${file.name}" could not be parsed.`);
      }
    } finally {
      setIsInspecting(false);
    }
  }, []);

  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      const first = initialFiles[0];
      onConsumeInitialFiles?.();
      void handleFileSelected(first);
    }
  }, [handleFileSelected, initialFiles, onConsumeInitialFiles]);

  useEffect(() => {
    setOutput(null);
  }, [preset]);

  const handleCompress = async () => {
    if (!sourceFile || !sourceBytes || !totalPages) return;
    setError(null);
    setOutput(null);
    const startedAt = Date.now();
    setIsProcessing(true);
    setProgress({
      current: 0,
      total: totalPages,
      startedAt,
      stage: 'Loading PDF structure in local memory...',
    });

    try {
      const chosen = PRESETS.find((p) => p.id === preset) ?? PRESETS[1];
      const safeFileName = sanitizePdfFilename(outputName);

      if (chosen.id === 'lossless') {
        await yieldToBrowser();
        const doc = await PDFDocument.load(sourceBytes.slice(0), {
          updateMetadata: false,
        });
        doc.setTitle('');
        doc.setAuthor('');
        doc.setSubject('');
        doc.setKeywords([]);
        doc.setProducer('Vellum');
        doc.setCreator('Vellum');
        setProgress({
          current: totalPages,
          total: totalPages,
          startedAt,
          stage: 'Finalizing lossless object stream...',
        });
        await yieldToBrowser();

        const savedBytes = await doc.save({ useObjectStreams: true });
        const blob = new Blob([new Uint8Array(savedBytes)], {
          type: 'application/pdf',
        });
        const url = URL.createObjectURL(blob);

        setOutput({
          url,
          fileName: safeFileName,
          sizeBytes: blob.size,
          originalBytes: sourceFile.size,
          pageCount: totalPages,
        });
        onSaveToSession({
          name: safeFileName,
          sizeBytes: blob.size,
          toolId: 'compress-pdf',
          toolName: 'Compress PDF',
          detailText: `${totalPages} pages · Lossless`,
          url,
          mimeType: 'application/pdf',
        });
        return;
      }

      // Visual page recompression via PDF.js + Canvas JPEG + pdf-lib
      const pdfjs = getPdfJs();
      const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(sourceBytes.slice(0)),
      });
      const pdfProxy = await loadingTask.promise;
      const outDoc = await PDFDocument.create();
      outDoc.setProducer('Vellum Local PDF Engine');

      for (let pageNum = 1; pageNum <= pdfProxy.numPages; pageNum += 1) {
        setProgress({
          current: pageNum - 1,
          total: pdfProxy.numPages,
          startedAt,
          stage: `Recompressing page ${pageNum} of ${pdfProxy.numPages}`,
        });
        const origPage = await pdfProxy.getPage(pageNum);
        const origViewport = origPage.getViewport({ scale: 1 });
        origPage.cleanup();

        const canvas = await renderPdfPageToCanvas(
          pdfProxy,
          pageNum,
          chosen.scale
        );

        const jpegBlob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('Canvas JPEG export failed.'))),
            'image/jpeg',
            chosen.quality
          );
        });

        const jpgBytes = await jpegBlob.arrayBuffer();
        const embeddedImg = await outDoc.embedJpg(jpgBytes);
        const page = outDoc.addPage([origViewport.width, origViewport.height]);
        page.drawImage(embeddedImg, {
          x: 0,
          y: 0,
          width: origViewport.width,
          height: origViewport.height,
        });

        canvas.width = 0;
        canvas.height = 0;

        setProgress({
          current: pageNum,
          total: pdfProxy.numPages,
          startedAt,
          stage:
            pageNum < pdfProxy.numPages
              ? `Compressed page ${pageNum} of ${pdfProxy.numPages}`
              : 'Packaging compressed PDF file...',
        });
        await yieldToBrowser();
      }

      await pdfProxy.cleanup();
      await loadingTask.destroy();

      const finalBytes = await outDoc.save({ useObjectStreams: true });
      const blob = new Blob([new Uint8Array(finalBytes)], {
        type: 'application/pdf',
      });
      const url = URL.createObjectURL(blob);

      setOutput({
        url,
        fileName: safeFileName,
        sizeBytes: blob.size,
        originalBytes: sourceFile.size,
        pageCount: totalPages,
      });

      const pct = Math.round(
        ((sourceFile.size - blob.size) / Math.max(sourceFile.size, 1)) * 100
      );
      onSaveToSession({
        name: safeFileName,
        sizeBytes: blob.size,
        toolId: 'compress-pdf',
        toolName: 'Compress PDF',
        detailText:
          pct > 0
            ? `${pct}% smaller · ${totalPages} pages`
            : `${totalPages} pages · Optimized`,
        url,
        mimeType: 'application/pdf',
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to compress the PDF document.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!output) return;
    const link = document.createElement('a');
    link.href = output.url;
    link.download = output.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const savingsPct = output
    ? Math.round(
        ((output.originalBytes - output.sizeBytes) /
          Math.max(output.originalBytes, 1)) *
          100
      )
    : 0;

  return (
    <section
      aria-labelledby="compress-workspace-heading"
      className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14"
    >
      <div className="mb-8 pb-7 border-b border-[#E2E8F0]">
        <button
          type="button"
          onClick={onBackToTools}
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#475569] hover:text-[#2563EB] transition-colors mb-4 min-h-[36px] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Tools</span>
        </button>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[12px] font-semibold text-[#059669] mb-2">
              Optimize · Size Reduction
            </p>
            <h1
              id="compress-workspace-heading"
              className="font-display text-[32px] sm:text-[42px] font-extrabold text-[#0F172A] leading-[1.1] tracking-tight"
            >
              Compress PDF
            </h1>
            <p className="mt-2 text-[15px] text-[#475569] max-w-2xl">
              Shrink oversized PDF scans and presentations using visual
              recompression, or run lossless optimization to preserve selectable
              text.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[12px] font-medium text-[#475569] shrink-0">
            <ShieldCheck className="w-4 h-4 text-[#059669]" />
            <span>Private · No files uploaded</span>
          </div>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <p className="text-[13px] font-medium text-red-700">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
            className="w-8 h-8 inline-flex items-center justify-center rounded-xl text-red-600 hover:bg-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            void handleFileSelected(f);
            e.target.value = '';
          }
        }}
        className="sr-only"
        aria-label="Select a PDF file to compress"
      />

      {!sourceFile ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragOver(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) void handleFileSelected(f);
          }}
          className={`rounded-3xl border-2 border-dashed transition-all px-6 py-14 text-center cursor-pointer ${
            isDragOver
              ? 'border-[#2563EB] bg-[#EFF6FF]'
              : 'border-[#CBD5E1] bg-white hover:border-[#2563EB] hover:bg-[#EFF6FF]/40'
          }`}
        >
          <div className="mx-auto w-14 h-14 rounded-2xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center mb-4">
            {isInspecting ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Upload className="w-6 h-6" />
            )}
          </div>
          <p className="font-display text-[16px] font-bold text-[#0F172A]">
            {isInspecting
              ? 'Inspecting PDF document...'
              : 'Drop a PDF file here, or browse from your device'}
          </p>
          <p className="mt-1.5 text-[13px] text-[#475569]">
            Single PDF up to 100 MB · Processed locally
          </p>
          <div className="mt-5">
            <span className="inline-flex items-center justify-center px-5 py-2.5 min-h-[42px] text-[13px] font-semibold text-white bg-[#2563EB] rounded-xl shadow-sm shadow-[#2563EB]/25">
              Select PDF File
            </span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-[#ECFDF5] text-[#059669] flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p
                    className="text-[15px] font-bold text-[#0F172A] truncate"
                    title={sourceFile.name}
                  >
                    {sourceFile.name}
                  </p>
                  <p className="text-[13px] text-[#475569] font-mono tabular-nums mt-0.5">
                    {totalPages} {totalPages === 1 ? 'page' : 'pages'} ·{' '}
                    {formatBytes(sourceFile.size)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={isProcessing}
                onClick={resetFile}
                className="min-h-[38px] px-3.5 py-1.5 text-[12px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl inline-flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Change File</span>
              </button>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-4">
              <h2 className="font-display text-[17px] font-bold text-[#0F172A]">
                Compression Preset
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {PRESETS.map((item) => {
                  const active = preset === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={isProcessing}
                      onClick={() => setPreset(item.id)}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                        active
                          ? 'bg-[#EFF6FF] border-[#2563EB]'
                          : 'bg-[#F8FAFC] border-[#E2E8F0] hover:border-[#93C5FD]'
                      }`}
                    >
                      <p className="text-[14px] font-bold text-[#0F172A]">
                        {item.title}
                      </p>
                      <p className="text-[12px] text-[#475569] mt-1 leading-relaxed">
                        {item.subtitle}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <aside className="lg:col-span-4 bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-6 shadow-[0_12px_32px_-16px_rgba(15,23,42,0.12)] lg:sticky lg:top-24">
            <div>
              <h2 className="font-display text-[20px] font-bold text-[#0F172A]">
                Optimization Summary
              </h2>
              <p className="text-[13px] text-[#475569] mt-1">
                Compare exact byte savings after local compression.
              </p>
            </div>

            <div>
              <label
                htmlFor="compress-output-name"
                className="block text-[13px] font-semibold text-[#0F172A] mb-2"
              >
                Output Filename
              </label>
              <div className="flex items-center border border-[#CBD5E1] rounded-xl bg-[#F8FAFC] focus-within:border-[#2563EB] focus-within:bg-white overflow-hidden">
                <input
                  id="compress-output-name"
                  type="text"
                  disabled={isProcessing}
                  value={outputName}
                  onChange={(e) => setOutputName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-[14px] text-[#0F172A] bg-transparent focus:outline-none min-w-0"
                />
                <span className="px-3 py-2.5 text-[13px] font-mono text-[#475569] bg-[#E2E8F0]/60 border-l border-[#CBD5E1] shrink-0">
                  .pdf
                </span>
              </div>
            </div>

            <dl className="py-4 border-y border-[#F1F5F9] space-y-2.5 text-[13px]">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[#475569]">Original Size</dt>
                <dd className="font-mono tabular-nums font-semibold text-[#0F172A]">
                  {formatBytes(sourceFile.size)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[#475569]">Pages</dt>
                <dd className="font-mono tabular-nums font-semibold text-[#0F172A]">
                  {totalPages}
                </dd>
              </div>
            </dl>

            {isProcessing && progress ? (
              <BatchProgressPanel
                title="Compressing PDF locally..."
                progress={progress}
                unitLabel="pages"
              />
            ) : output ? (
              <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <CheckCircle2 className="w-5 h-5 text-[#059669] shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <h3 className="text-[14px] font-bold text-[#0F172A]">
                        {savingsPct > 0
                          ? `Reduced by ${savingsPct}%`
                          : 'Optimization Complete'}
                      </h3>
                      <p className="text-[11.5px] text-[#475569] font-mono tabular-nums mt-0.5">
                        {savingsPct > 0
                          ? `Saved ${formatBytes(Math.max(0, output.originalBytes - output.sizeBytes))}`
                          : 'Already compact at this preset'}
                      </p>
                    </div>
                  </div>
                  {savingsPct > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-[#ECFDF5] border border-[#A7F3D0] font-mono text-[11px] font-bold text-[#059669] tabular-nums shrink-0">
                      -{savingsPct}%
                    </span>
                  )}
                </div>

                {/* Before -> After Visual Byte Diff Bar */}
                <div className="p-3 rounded-xl bg-white border border-[#E2E8F0] space-y-2.5">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-[#475569]">Original</span>
                      <span className="font-semibold text-[#0F172A] tabular-nums">
                        {formatBytes(output.originalBytes)}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                      <div className="h-full w-full rounded-full bg-slate-400" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-[#059669] font-semibold">
                        Compressed
                      </span>
                      <span className="font-bold text-[#059669] tabular-nums">
                        {formatBytes(output.sizeBytes)}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          savingsPct > 0 ? 'bg-[#059669]' : 'bg-[#2563EB]'
                        }`}
                        style={{
                          width: `${Math.max(
                            6,
                            Math.min(
                              100,
                              Math.round(
                                (output.sizeBytes /
                                  Math.max(output.originalBytes, 1)) *
                                  100
                              )
                            )
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  {savingsPct <= 0 && (
                    <p className="text-[11px] text-[#475569] leading-relaxed pt-0.5">
                      Try Strong Compression if you want smaller image-based
                      output.
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleDownload}
                  className="w-full min-h-[46px] px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[14px] font-semibold rounded-xl shadow-md shadow-[#2563EB]/25 inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Compressed PDF</span>
                </button>

                {onChainToTool && (
                  <div className="pt-3 border-t border-[#E2E8F0] space-y-2">
                    <p className="text-[11px] font-mono font-semibold text-[#475569]">
                      Send output directly to next tool
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {(
                        [
                          { id: 'sign-pdf', label: 'Sign PDF' },
                          { id: 'split-pdf', label: 'Split' },
                          { id: 'ai-summarizer', label: 'AI Brief' },
                        ] as { id: ToolId; label: string }[]
                      ).map((target) => (
                        <button
                          key={target.id}
                          type="button"
                          onClick={() =>
                            onChainToTool(
                              output.url,
                              output.fileName,
                              target.id
                            )
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#0B1120] text-[#0F172A] hover:text-white border border-[#E2E8F0] hover:border-[#0B1120] text-[11.5px] font-medium transition-colors cursor-pointer"
                        >
                          <span>{target.label}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={handleCompress}
                className="w-full min-h-[48px] px-5 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[14px] font-semibold rounded-xl shadow-md shadow-[#2563EB]/25 inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Minimize2 className="w-4 h-4" />
                <span>Compress PDF</span>
              </button>
            )}
          </aside>
        </div>
      )}
    </section>
  );
};
