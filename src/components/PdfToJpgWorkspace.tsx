import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileImage,
  FileText,
  Loader2,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { ProcessedFileRecord } from '../types/pdf';
import { BatchProgressPanel } from './BatchProgressPanel';
import {
  type BatchProgressState,
  yieldToBrowser,
} from '../utils/batchProgress';
import { formatBytes } from '../utils/formatters';
import { useGlobalTaskProgress } from '../utils/globalProgress';
import { getPdfJs, renderPdfPageToCanvas } from '../utils/pdfjsSetup';
import { parsePageRanges, validatePdfFile } from '../utils/pdfValidation';

interface PdfToJpgWorkspaceProps {
  initialFiles?: File[];
  onConsumeInitialFiles?: () => void;
  onBackToTools: () => void;
  onSaveToSession: (record: Omit<ProcessedFileRecord, 'id' | 'createdAt'>) => void;
}

interface RenderedPageJpg {
  pageNumber: number;
  fileName: string;
  url: string;
  blob: Blob;
  width: number;
  height: number;
}

export const PdfToJpgWorkspace: React.FC<PdfToJpgWorkspaceProps> = ({
  initialFiles,
  onConsumeInitialFiles,
  onBackToTools,
  onSaveToSession,
}) => {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceBytes, setSourceBytes] = useState<ArrayBuffer | null>(null);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);

  useGlobalTaskProgress(isInspecting, 'Loading PDF document...', {
    indeterminate: true,
  });

  const [scale, setScale] = useState<number>(2);
  const [quality, setQuality] = useState<number>(0.92);
  const [pageSelection, setPageSelection] = useState<'all' | 'custom'>('all');
  const [customRange, setCustomRange] = useState('1');

  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress] = useState<BatchProgressState | null>(null);
  const [renderedPages, setRenderedPages] = useState<RenderedPageJpg[]>([]);
  const [zipOutput, setZipOutput] = useState<{
    url: string;
    fileName: string;
    sizeBytes: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const renderedRef = useRef<RenderedPageJpg[]>([]);

  useEffect(() => {
    renderedRef.current = renderedPages;
  }, [renderedPages]);

  const revokePreviewUrls = useCallback((pages: RenderedPageJpg[]) => {
    for (const p of pages) {
      URL.revokeObjectURL(p.url);
    }
  }, []);

  useEffect(() => {
    return () => {
      revokePreviewUrls(renderedRef.current);
    };
  }, [revokePreviewUrls]);

  const resetFile = useCallback(() => {
    revokePreviewUrls(renderedRef.current);
    setSourceFile(null);
    setSourceBytes(null);
    setTotalPages(null);
    setRenderedPages([]);
    setZipOutput(null);
    setError(null);
    setProgress(null);
  }, [revokePreviewUrls]);

  const handleFileSelected = useCallback(
    async (file: File) => {
      setError(null);
      revokePreviewUrls(renderedRef.current);
      setRenderedPages([]);
      setZipOutput(null);

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
        setPageSelection('all');
        setCustomRange(count > 1 ? `1-${Math.min(count, 3)}` : '1');
      } catch (err) {
        const msg = err instanceof Error ? err.message.toLowerCase() : '';
        if (msg.includes('encrypted') || msg.includes('password')) {
          setError(
            `"${file.name}" is encrypted or password-protected. Please unlock it first.`
          );
        } else {
          setError(`"${file.name}" could not be parsed.`);
        }
      } finally {
        setIsInspecting(false);
      }
    },
    [revokePreviewUrls]
  );

  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      const first = initialFiles[0];
      onConsumeInitialFiles?.();
      void handleFileSelected(first);
    }
  }, [handleFileSelected, initialFiles, onConsumeInitialFiles]);

  const targetPages = useMemo(() => {
    if (!totalPages) return { ok: false as const, pages: [] as number[], error: '' };
    if (pageSelection === 'all') {
      return {
        ok: true as const,
        pages: Array.from({ length: totalPages }, (_, i) => i + 1),
        error: '',
      };
    }
    const parsed = parsePageRanges(customRange, totalPages);
    if (!parsed.ok) {
      return { ok: false as const, pages: [] as number[], error: parsed.error };
    }
    // Deduplicate while preserving order
    const unique = Array.from(new Set(parsed.pages));
    return { ok: true as const, pages: unique, error: '' };
  }, [customRange, pageSelection, totalPages]);

  const handleConvert = async () => {
    if (!sourceFile || !sourceBytes || !targetPages.ok || targetPages.pages.length === 0) {
      return;
    }

    setError(null);
    revokePreviewUrls(renderedRef.current);
    setRenderedPages([]);
    setZipOutput(null);
    const total = Math.max(1, targetPages.pages.length);
    const startedAt = Date.now();
    setIsRendering(true);
    setProgress({
      current: 0,
      total,
      startedAt,
      stage: 'Loading PDF renderer in local memory...',
    });

    try {
      await yieldToBrowser();
      const pdfjs = getPdfJs();
      const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(sourceBytes.slice(0)),
      });
      const pdfProxy = await loadingTask.promise;

      const baseName = sourceFile.name.replace(/\.pdf$/i, '') || 'vellum-page';
      const results: RenderedPageJpg[] = [];
      const zip = new JSZip();

      for (let i = 0; i < targetPages.pages.length; i += 1) {
        const pageNum = targetPages.pages[i];
        setProgress({
          current: i,
          total,
          startedAt,
          stage: `Rendering page ${pageNum} (${i + 1} of ${total})...`,
        });

        const canvas = await renderPdfPageToCanvas(pdfProxy, pageNum, scale);
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('JPEG encoding failed.'))),
            'image/jpeg',
            quality
          );
        });

        const url = URL.createObjectURL(blob);
        const fileName = `${baseName}-page-${String(pageNum).padStart(3, '0')}.jpg`;
        results.push({
          pageNumber: pageNum,
          fileName,
          url,
          blob,
          width: canvas.width,
          height: canvas.height,
        });

        zip.file(fileName, blob);

        canvas.width = 0;
        canvas.height = 0;

        const completed = i + 1;
        setProgress({
          current: completed,
          total,
          startedAt,
          stage:
            completed < total
              ? `Encoded JPG for page ${pageNum}`
              : results.length > 1
                ? 'Packaging JPGs into ZIP archive...'
                : 'Finalizing JPG output...',
        });
        await yieldToBrowser();
      }

      await pdfProxy.cleanup();
      await loadingTask.destroy();
      setRenderedPages(results);

      if (results.length === 1) {
        const single = results[0];
        const sessionUrl = URL.createObjectURL(single.blob);
        onSaveToSession({
          name: single.fileName,
          sizeBytes: single.blob.size,
          toolId: 'pdf-to-jpg',
          toolName: 'PDF to JPG',
          detailText: `Page ${single.pageNumber} · ${single.width}×${single.height}px`,
          url: sessionUrl,
          mimeType: 'image/jpeg',
        });
      } else {
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipUrl = URL.createObjectURL(zipBlob);
        const zipName = `${baseName}-jpg-pages.zip`;
        setZipOutput({
          url: zipUrl,
          fileName: zipName,
          sizeBytes: zipBlob.size,
        });
        onSaveToSession({
          name: zipName,
          sizeBytes: zipBlob.size,
          toolId: 'pdf-to-jpg',
          toolName: 'PDF to JPG',
          detailText: `${results.length} JPG images in ZIP`,
          url: zipUrl,
          mimeType: 'application/zip',
        });
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to convert PDF pages to JPG.'
      );
    } finally {
      setIsRendering(false);
    }
  };

  const downloadBlobUrl = (url: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section
      aria-labelledby="pdf-to-jpg-heading"
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
            <p className="font-mono text-[12px] font-semibold text-[#4F46E5] mb-2">
              Convert · High-DPI JPG Export
            </p>
            <h1
              id="pdf-to-jpg-heading"
              className="font-display text-[32px] sm:text-[42px] font-extrabold text-[#0F172A] leading-[1.1] tracking-tight"
            >
              PDF to JPG
            </h1>
            <p className="mt-2 text-[15px] text-[#475569] max-w-2xl">
              Render PDF pages into crisp JPEG images right inside your
              browser. Download individual pages or export the entire set as a
              ZIP archive.
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
        aria-label="Select a PDF file to convert to JPG"
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
            Single PDF up to 100 MB · Exports crisp JPEG images
          </p>
          <div className="mt-5">
            <span className="inline-flex items-center justify-center px-5 py-2.5 min-h-[42px] text-[13px] font-semibold text-white bg-[#2563EB] rounded-xl shadow-sm shadow-[#2563EB]/25">
              Select PDF File
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: File & Render Settings */}
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
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
                  disabled={isRendering}
                  onClick={resetFile}
                  className="min-h-[38px] px-3.5 py-1.5 text-[12px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl inline-flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Change File</span>
                </button>
              </div>

              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Resolution Scale */}
                  <div>
                    <label className="block text-[13px] font-semibold text-[#0F172A] mb-2">
                      Output Resolution
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: '1.5×', value: 1.5 },
                        { label: '2× High', value: 2 },
                        { label: '3× Print', value: 3 },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={isRendering}
                          onClick={() => setScale(opt.value)}
                          className={`py-2.5 px-2 rounded-xl border text-[12px] font-semibold transition-colors cursor-pointer ${
                            scale === opt.value
                              ? 'bg-[#EFF6FF] border-[#2563EB] text-[#1D4ED8]'
                              : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#0F172A] hover:border-[#93C5FD]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* JPEG Quality */}
                  <div>
                    <label className="block text-[13px] font-semibold text-[#0F172A] mb-2">
                      JPEG Quality
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: '80%', value: 0.8 },
                        { label: '92%', value: 0.92 },
                        { label: '100%', value: 1 },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={isRendering}
                          onClick={() => setQuality(opt.value)}
                          className={`py-2.5 px-2 rounded-xl border text-[12px] font-semibold font-mono transition-colors cursor-pointer ${
                            quality === opt.value
                              ? 'bg-[#EFF6FF] border-[#2563EB] text-[#1D4ED8]'
                              : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#0F172A] hover:border-[#93C5FD]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Page Selection */}
                <div className="pt-4 border-t border-[#F1F5F9] space-y-3">
                  <label className="block text-[13px] font-semibold text-[#0F172A]">
                    Pages to Convert
                  </label>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={isRendering}
                      onClick={() => setPageSelection('all')}
                      className={`px-4 py-2 rounded-xl border text-[13px] font-semibold cursor-pointer transition-colors ${
                        pageSelection === 'all'
                          ? 'bg-[#2563EB] text-white border-[#2563EB]'
                          : 'bg-[#F8FAFC] text-[#0F172A] border-[#E2E8F0] hover:border-[#93C5FD]'
                      }`}
                    >
                      All Pages ({totalPages})
                    </button>
                    <button
                      type="button"
                      disabled={isRendering}
                      onClick={() => setPageSelection('custom')}
                      className={`px-4 py-2 rounded-xl border text-[13px] font-semibold cursor-pointer transition-colors ${
                        pageSelection === 'custom'
                          ? 'bg-[#2563EB] text-white border-[#2563EB]'
                          : 'bg-[#F8FAFC] text-[#0F172A] border-[#E2E8F0] hover:border-[#93C5FD]'
                      }`}
                    >
                      Custom Range
                    </button>
                  </div>

                  {pageSelection === 'custom' && (
                    <div className="pt-1">
                      <input
                        type="text"
                        disabled={isRendering}
                        value={customRange}
                        onChange={(e) => setCustomRange(e.target.value)}
                        placeholder={`e.g. 1-${Math.min(totalPages ?? 1, 3)}`}
                        aria-label="Custom page range"
                        className="w-full sm:w-72 px-4 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[14px] font-mono text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#2563EB]"
                      />
                      {!targetPages.ok && (
                        <p className="text-[12px] font-medium text-red-600 mt-1.5">
                          {targetPages.error}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Export Panel */}
            <aside className="lg:col-span-4 bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-6 shadow-[0_12px_32px_-16px_rgba(15,23,42,0.12)] lg:sticky lg:top-24">
              <div>
                <h2 className="font-display text-[20px] font-bold text-[#0F172A]">
                  Export Summary
                </h2>
                <p className="text-[13px] text-[#475569] mt-1">
                  Each page is rendered cleanly as a JPEG image.
                </p>
              </div>

              <dl className="py-4 border-y border-[#F1F5F9] space-y-2.5 text-[13px]">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[#475569]">Pages Selected</dt>
                  <dd className="font-mono tabular-nums font-semibold text-[#0F172A]">
                    {targetPages.ok ? targetPages.pages.length : 0}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[#475569]">Render Scale</dt>
                  <dd className="font-mono tabular-nums font-semibold text-[#0F172A]">
                    {scale}× ({Math.round(quality * 100)}% JPG)
                  </dd>
                </div>
              </dl>

              {isRendering && progress ? (
                <BatchProgressPanel
                  title="Rendering JPG pages..."
                  progress={progress}
                  unitLabel="pages"
                />
              ) : (
                <div className="space-y-3">
                  <button
                    type="button"
                    disabled={!targetPages.ok || targetPages.pages.length === 0}
                    onClick={handleConvert}
                    className="w-full min-h-[48px] px-5 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[14px] font-semibold rounded-xl shadow-md shadow-[#2563EB]/25 disabled:bg-[#E2E8F0] disabled:text-[#94A3B8] disabled:shadow-none disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <FileImage className="w-4 h-4" />
                    <span>
                      {renderedPages.length > 0
                        ? 'Re-Render JPGs'
                        : 'Convert to JPG'}
                    </span>
                  </button>

                  {zipOutput && (
                    <button
                      type="button"
                      onClick={() =>
                        downloadBlobUrl(zipOutput.url, zipOutput.fileName)
                      }
                      className="w-full min-h-[46px] px-5 py-2.5 bg-[#0B1120] hover:bg-[#1E293B] text-white text-[14px] font-semibold rounded-xl inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>
                        Download All as ZIP ({formatBytes(zipOutput.sizeBytes)})
                      </span>
                    </button>
                  )}
                </div>
              )}
            </aside>
          </div>

          {/* Rendered Image Previews */}
          {renderedPages.length > 0 && (
            <div className="pt-4 border-t border-[#E2E8F0]">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-[#059669]" />
                  <h2 className="font-display text-[18px] font-bold text-[#0F172A]">
                    Rendered Images ({renderedPages.length})
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {renderedPages.map((page) => (
                  <div
                    key={page.pageNumber}
                    className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between"
                  >
                    <div className="bg-[#F8FAFC] p-4 flex items-center justify-center border-b border-[#E2E8F0]">
                      <img
                        src={page.url}
                        alt={`Page ${page.pageNumber} preview`}
                        className="max-h-64 w-auto object-contain rounded-lg shadow-sm border border-[#E2E8F0]"
                      />
                    </div>
                    <div className="p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-[#0F172A] truncate">
                          Page {page.pageNumber}
                        </p>
                        <p className="text-[12px] text-[#475569] font-mono tabular-nums">
                          {page.width}×{page.height} · {formatBytes(page.blob.size)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          downloadBlobUrl(page.url, page.fileName)
                        }
                        className="min-h-[38px] px-3.5 py-1.5 bg-[#EFF6FF] hover:bg-[#2563EB] text-[#1D4ED8] hover:text-white text-[12px] font-semibold rounded-xl inline-flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>JPG</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
