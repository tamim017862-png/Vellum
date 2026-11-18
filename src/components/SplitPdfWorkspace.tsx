import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Scissors,
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
import { parsePageRanges, validatePdfFile } from '../utils/pdfValidation';

interface SplitPdfWorkspaceProps {
  initialFiles?: File[];
  onConsumeInitialFiles?: () => void;
  onBackToTools: () => void;
  onSaveToSession: (record: Omit<ProcessedFileRecord, 'id' | 'createdAt'>) => void;
  onChainToTool?: (url: string, fileName: string, targetToolId: ToolId) => void;
}

type SplitMode = 'ranges' | 'every-n' | 'all-pages';

interface SplitOutputState {
  url: string;
  fileName: string;
  sizeBytes: number;
  summaryText: string;
  isZip: boolean;
}

export const SplitPdfWorkspace: React.FC<SplitPdfWorkspaceProps> = ({
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

  useGlobalTaskProgress(isInspecting, 'Loading PDF pages...', {
    indeterminate: true,
  });

  const [mode, setMode] = useState<SplitMode>('ranges');
  const [rangeInput, setRangeInput] = useState('1');
  const [separateRanges, setSeparateRanges] = useState(false);
  const [everyN, setEveryN] = useState(2);
  const [outputName, setOutputName] = useState('vellum-split-document');

  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<BatchProgressState | null>(null);
  const [output, setOutput] = useState<SplitOutputState | null>(null);

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
      const count = doc.getPageCount();

      setSourceFile(file);
      setSourceBytes(buffer);
      setTotalPages(count);
      setRangeInput(count > 1 ? `1-${Math.min(count, 2)}` : '1');
      const base = file.name.replace(/\.pdf$/i, '');
      setOutputName(`${base}-split`);
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : '';
      if (msg.includes('encrypted') || msg.includes('password')) {
        setError(
          `"${file.name}" is encrypted or password-protected. Please unlock it before splitting.`
        );
      } else {
        setError(
          `"${file.name}" could not be parsed. It may be corrupted or unsupported.`
        );
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
  }, [mode, rangeInput, separateRanges, everyN]);

  const parsedRanges = useMemo(() => {
    if (!totalPages || mode !== 'ranges') return null;
    return parsePageRanges(rangeInput, totalPages);
  }, [mode, rangeInput, totalPages]);

  const chunkCount = useMemo(() => {
    if (!totalPages) return 0;
    if (mode === 'all-pages') return totalPages;
    if (mode === 'every-n') {
      const safeN = Math.max(1, Math.min(everyN, totalPages));
      return Math.ceil(totalPages / safeN);
    }
    if (parsedRanges?.ok) {
      return separateRanges ? parsedRanges.groups.length : 1;
    }
    return 0;
  }, [everyN, mode, parsedRanges, separateRanges, totalPages]);

  const canSplit =
    Boolean(sourceBytes && totalPages && !isInspecting && !isProcessing) &&
    (mode !== 'ranges' || Boolean(parsedRanges?.ok));

  const handleSplit = async () => {
    if (!sourceBytes || !totalPages || !canSplit) return;

    const startedAt = Date.now();
    const initialTotal = Math.max(1, chunkCount);
    setError(null);
    setOutput(null);
    setIsProcessing(true);
    setProgress({
      current: 0,
      total: initialTotal,
      startedAt,
      stage: 'Loading source PDF into local memory...',
    });

    try {
      await yieldToBrowser();
      const srcDoc = await PDFDocument.load(sourceBytes, {
        updateMetadata: false,
      });

      const createSubPdf = async (oneBasedPages: number[]) => {
        const subDoc = await PDFDocument.create();
        subDoc.setProducer('Vellum Local PDF Engine');
        const copied = await subDoc.copyPages(
          srcDoc,
          oneBasedPages.map((p) => p - 1)
        );
        for (const page of copied) {
          subDoc.addPage(page);
        }
        return subDoc.save({ useObjectStreams: true });
      };

      const baseSafe = sanitizePdfFilename(outputName).replace(/\.pdf$/i, '');

      if (mode === 'ranges' && parsedRanges?.ok) {
        if (!separateRanges || parsedRanges.groups.length === 1) {
          const extractTotal = Math.max(1, parsedRanges.pages.length);
          setProgress({
            current: 0,
            total: extractTotal,
            startedAt,
            stage: `Extracting ${parsedRanges.pages.length} pages...`,
          });
          await yieldToBrowser();
          const bytes = await createSubPdf(parsedRanges.pages);
          setProgress({
            current: extractTotal,
            total: extractTotal,
            startedAt,
            stage: 'Finalizing extracted PDF...',
          });
          const blob = new Blob([new Uint8Array(bytes)], {
            type: 'application/pdf',
          });
          const url = URL.createObjectURL(blob);
          const fileName = `${baseSafe}.pdf`;
          const summaryText = `${parsedRanges.pages.length} ${parsedRanges.pages.length === 1 ? 'page' : 'pages'} extracted`;

          setOutput({
            url,
            fileName,
            sizeBytes: blob.size,
            summaryText,
            isZip: false,
          });
          onSaveToSession({
            name: fileName,
            sizeBytes: blob.size,
            toolId: 'split-pdf',
            toolName: 'Split PDF',
            detailText: summaryText,
            url,
            mimeType: 'application/pdf',
          });
          return;
        }

        const zip = new JSZip();
        const totalParts = parsedRanges.groups.length;
        for (let i = 0; i < totalParts; i += 1) {
          const group = parsedRanges.groups[i];
          setProgress({
            current: i,
            total: totalParts,
            startedAt,
            stage: `Building part ${i + 1} of ${totalParts}...`,
          });
          const bytes = await createSubPdf(group);
          const label =
            group.length === 1
              ? `page-${group[0]}`
              : `pages-${group[0]}-${group[group.length - 1]}`;
          zip.file(`${baseSafe}-${label}.pdf`, bytes);

          const completed = i + 1;
          setProgress({
            current: completed,
            total: totalParts,
            startedAt,
            stage:
              completed < totalParts
                ? `Built part ${completed} of ${totalParts}`
                : 'Packaging ZIP archive...',
          });
          await yieldToBrowser();
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const fileName = `${baseSafe}-parts.zip`;
        const summaryText = `${parsedRanges.groups.length} PDF files in ZIP`;

        setOutput({
          url,
          fileName,
          sizeBytes: zipBlob.size,
          summaryText,
          isZip: true,
        });
        onSaveToSession({
          name: fileName,
          sizeBytes: zipBlob.size,
          toolId: 'split-pdf',
          toolName: 'Split PDF',
          detailText: summaryText,
          url,
          mimeType: 'application/zip',
        });
        return;
      }

      if (mode === 'every-n') {
        const step = Math.max(1, Math.min(everyN, totalPages));
        const groups: number[][] = [];
        for (let start = 1; start <= totalPages; start += step) {
          const end = Math.min(totalPages, start + step - 1);
          const g: number[] = [];
          for (let p = start; p <= end; p += 1) g.push(p);
          groups.push(g);
        }

        if (groups.length === 1) {
          setProgress({
            current: 0,
            total: 1,
            startedAt,
            stage: `Building single ${groups[0].length}-page PDF...`,
          });
          const bytes = await createSubPdf(groups[0]);
          setProgress({
            current: 1,
            total: 1,
            startedAt,
            stage: 'Finalizing split PDF...',
          });
          const blob = new Blob([new Uint8Array(bytes)], {
            type: 'application/pdf',
          });
          const url = URL.createObjectURL(blob);
          const fileName = `${baseSafe}.pdf`;
          const summaryText = `${groups[0].length} pages`;
          setOutput({
            url,
            fileName,
            sizeBytes: blob.size,
            summaryText,
            isZip: false,
          });
          onSaveToSession({
            name: fileName,
            sizeBytes: blob.size,
            toolId: 'split-pdf',
            toolName: 'Split PDF',
            detailText: summaryText,
            url,
            mimeType: 'application/pdf',
          });
          return;
        }

        const zip = new JSZip();
        const totalParts = groups.length;
        for (let i = 0; i < totalParts; i += 1) {
          const group = groups[i];
          setProgress({
            current: i,
            total: totalParts,
            startedAt,
            stage: `Splitting part ${i + 1} of ${totalParts}...`,
          });
          const bytes = await createSubPdf(group);
          const partIndex = String(i + 1).padStart(2, '0');
          zip.file(
            `${baseSafe}-part-${partIndex}-p${group[0]}-${group[group.length - 1]}.pdf`,
            bytes
          );
          const completed = i + 1;
          setProgress({
            current: completed,
            total: totalParts,
            startedAt,
            stage:
              completed < totalParts
                ? `Completed part ${completed} of ${totalParts}`
                : 'Packaging ZIP archive...',
          });
          await yieldToBrowser();
        }
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const fileName = `${baseSafe}-split.zip`;
        const summaryText = `${groups.length} split PDFs in ZIP`;

        setOutput({
          url,
          fileName,
          sizeBytes: zipBlob.size,
          summaryText,
          isZip: true,
        });
        onSaveToSession({
          name: fileName,
          sizeBytes: zipBlob.size,
          toolId: 'split-pdf',
          toolName: 'Split PDF',
          detailText: summaryText,
          url,
          mimeType: 'application/zip',
        });
        return;
      }

      // mode === 'all-pages'
      const zip = new JSZip();
      const yieldInterval = totalPages > 40 ? 3 : 1;
      for (let p = 1; p <= totalPages; p += 1) {
        if (p === 1 || p % yieldInterval === 1) {
          setProgress({
            current: p - 1,
            total: totalPages,
            startedAt,
            stage: `Extracting page ${p} of ${totalPages}...`,
          });
        }
        const bytes = await createSubPdf([p]);
        const padded = String(p).padStart(3, '0');
        zip.file(`${baseSafe}-page-${padded}.pdf`, bytes);

        if (p % yieldInterval === 0 || p === totalPages) {
          setProgress({
            current: p,
            total: totalPages,
            startedAt,
            stage:
              p < totalPages
                ? `Extracted page ${p} of ${totalPages}`
                : 'Packaging ZIP archive...',
          });
          await yieldToBrowser();
        }
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const fileName = `${baseSafe}-all-pages.zip`;
      const summaryText = `${totalPages} individual page PDFs`;

      setOutput({
        url,
        fileName,
        sizeBytes: zipBlob.size,
        summaryText,
        isZip: true,
      });
      onSaveToSession({
        name: fileName,
        sizeBytes: zipBlob.size,
        toolId: 'split-pdf',
        toolName: 'Split PDF',
        detailText: summaryText,
        url,
        mimeType: 'application/zip',
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to split the PDF document.'
      );
    } finally {
      setIsProcessing(false);
      setProgress(null);
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

  return (
    <section
      aria-labelledby="split-workspace-heading"
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
            <p className="font-mono text-[12px] font-semibold text-[#2563EB] mb-2">
              Organize · Range &amp; ZIP Split
            </p>
            <h1
              id="split-workspace-heading"
              className="font-display text-[32px] sm:text-[42px] font-extrabold text-[#0F172A] leading-[1.1] tracking-tight"
            >
              Split PDF
            </h1>
            <p className="mt-2 text-[15px] text-[#475569] max-w-2xl">
              Extract specific pages, split every N pages, or burst an entire
              document into individual PDFs—all privately in your browser.
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
        aria-label="Select a PDF file to split"
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
              ? 'Reading PDF structure...'
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
          {/* Left: File summary & split mode options */}
          <div className="lg:col-span-8 space-y-6">
            {/* Active Source File Card */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0">
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

            {/* Split Mode Selection */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-6">
              <div>
                <h2 className="font-display text-[17px] font-bold text-[#0F172A]">
                  Choose Split Method
                </h2>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'ranges' as SplitMode,
                      title: 'Page Ranges',
                      desc: 'Extract e.g. 1-3, 5',
                    },
                    {
                      id: 'every-n' as SplitMode,
                      title: 'Every N Pages',
                      desc: 'Fixed page chunks',
                    },
                    {
                      id: 'all-pages' as SplitMode,
                      title: 'All Pages',
                      desc: 'One PDF per page',
                    },
                  ].map((option) => {
                    const active = mode === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        disabled={isProcessing}
                        onClick={() => setMode(option.id)}
                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                          active
                            ? 'bg-[#EFF6FF] border-[#2563EB] text-[#0F172A]'
                            : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#0F172A] hover:border-[#93C5FD]'
                        }`}
                      >
                        <p className="text-[14px] font-bold">{option.title}</p>
                        <p className="text-[12px] text-[#475569] mt-0.5">
                          {option.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {mode === 'ranges' && (
                <div className="space-y-4 pt-2 border-t border-[#F1F5F9]">
                  <div>
                    <label
                      htmlFor="split-range-input"
                      className="block text-[13px] font-semibold text-[#0F172A] mb-2"
                    >
                      Pages or Ranges (1–{totalPages})
                    </label>
                    <input
                      id="split-range-input"
                      type="text"
                      disabled={isProcessing}
                      value={rangeInput}
                      onChange={(e) => setRangeInput(e.target.value)}
                      placeholder="e.g. 1-3, 5, 8-10"
                      className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[14px] font-mono text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#2563EB]"
                    />
                    {parsedRanges && !parsedRanges.ok ? (
                      <p className="text-[12px] font-medium text-red-600 mt-2">
                        {parsedRanges.error}
                      </p>
                    ) : parsedRanges?.ok ? (
                      <p className="text-[12px] text-[#475569] mt-2">
                        Selected {parsedRanges.pages.length}{' '}
                        {parsedRanges.pages.length === 1 ? 'page' : 'pages'} across{' '}
                        {parsedRanges.groups.length}{' '}
                        {parsedRanges.groups.length === 1 ? 'range' : 'ranges'}.
                      </p>
                    ) : null}
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={separateRanges}
                      onChange={(e) => setSeparateRanges(e.target.checked)}
                      className="w-4 h-4 accent-[#2563EB] rounded"
                    />
                    <span className="text-[13px] font-medium text-[#0F172A]">
                      Save each comma-separated range as its own PDF (downloads
                      as ZIP)
                    </span>
                  </label>
                </div>
              )}

              {mode === 'every-n' && (
                <div className="pt-2 border-t border-[#F1F5F9]">
                  <label
                    htmlFor="split-every-n"
                    className="block text-[13px] font-semibold text-[#0F172A] mb-2"
                  >
                    Pages per split file
                  </label>
                  <input
                    id="split-every-n"
                    type="number"
                    min={1}
                    max={totalPages ?? 1}
                    disabled={isProcessing}
                    value={everyN}
                    onChange={(e) =>
                      setEveryN(Math.max(1, Number(e.target.value) || 1))
                    }
                    className="w-36 px-4 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[14px] font-mono tabular-nums text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#2563EB]"
                  />
                  <p className="text-[12px] text-[#475569] mt-2">
                    This will produce{' '}
                    <strong className="text-[#0F172A] font-mono">
                      {chunkCount}
                    </strong>{' '}
                    {chunkCount === 1 ? 'PDF file' : 'PDF files (bundled as ZIP)'}.
                  </p>
                </div>
              )}

              {mode === 'all-pages' && (
                <div className="pt-2 border-t border-[#F1F5F9]">
                  <p className="text-[13px] text-[#475569]">
                    Every page (1 through {totalPages}) will be exported as its
                    own standalone PDF file inside a single ZIP archive.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Summary & Action */}
          <aside className="lg:col-span-4 bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-6 shadow-[0_12px_32px_-16px_rgba(15,23,42,0.12)] lg:sticky lg:top-24">
            <div>
              <h2 className="font-display text-[20px] font-bold text-[#0F172A]">
                Split Summary
              </h2>
              <p className="text-[13px] text-[#475569] mt-1">
                Configure your output filename and export locally.
              </p>
            </div>

            <div>
              <label
                htmlFor="split-output-name"
                className="block text-[13px] font-semibold text-[#0F172A] mb-2"
              >
                Output Base Name
              </label>
              <input
                id="split-output-name"
                type="text"
                disabled={isProcessing}
                value={outputName}
                onChange={(e) => setOutputName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[14px] text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#2563EB]"
              />
            </div>

            <dl className="py-4 border-y border-[#F1F5F9] space-y-2.5 text-[13px]">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[#475569]">Source Pages</dt>
                <dd className="font-mono tabular-nums font-semibold text-[#0F172A]">
                  {totalPages}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[#475569]">Output Files</dt>
                <dd className="font-mono tabular-nums font-semibold text-[#0F172A]">
                  {chunkCount} {chunkCount > 1 ? '(ZIP)' : '(PDF)'}
                </dd>
              </div>
            </dl>

            {isProcessing && progress ? (
              <BatchProgressPanel
                title="Splitting PDF locally..."
                progress={progress}
                unitLabel={mode === 'all-pages' || (mode === 'ranges' && !separateRanges) ? 'pages' : 'parts'}
              />
            ) : output ? (
              <div className="p-4 bg-[#EFF6FF]/75 border border-[#BFDBFE] rounded-2xl space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#059669] shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <h3 className="text-[14px] font-bold text-[#0F172A]">
                      Split Complete
                    </h3>
                    <p className="text-[12px] text-[#475569] font-mono tabular-nums mt-0.5">
                      {output.summaryText} · {formatBytes(output.sizeBytes)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="w-full min-h-[46px] px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[14px] font-semibold rounded-xl shadow-md shadow-[#2563EB]/25 inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>
                    Download {output.isZip ? 'ZIP Archive' : 'Split PDF'}
                  </span>
                </button>

                {onChainToTool && !output.isZip && (
                  <div className="pt-3 border-t border-[#BFDBFE] space-y-2">
                    <p className="text-[11px] font-mono font-semibold text-[#475569]">
                      Send output directly to next tool
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {(
                        [
                          { id: 'compress-pdf', label: 'Compress' },
                          { id: 'sign-pdf', label: 'Sign PDF' },
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
                disabled={!canSplit}
                onClick={handleSplit}
                className="w-full min-h-[48px] px-5 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[14px] font-semibold rounded-xl shadow-md shadow-[#2563EB]/25 disabled:bg-[#E2E8F0] disabled:text-[#94A3B8] disabled:shadow-none disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Scissors className="w-4 h-4" />
                <span>Split PDF</span>
              </button>
            )}
          </aside>
        </div>
      )}
    </section>
  );
};
