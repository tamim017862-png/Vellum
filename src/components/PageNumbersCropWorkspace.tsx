import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Crop,
  Download,
  FileText,
  Hash,
  Loader2,
  RotateCcw,
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
import { formatBytes, sanitizePdfFilename } from '../utils/formatters';
import { useGlobalTaskProgress } from '../utils/globalProgress';
import { renderPdfThumbnails, type PdfThumbnailItem } from '../utils/pdfjsSetup';
import { parsePageRanges, validatePdfFile } from '../utils/pdfValidation';

export type PageNumbersCropMode = 'page-numbers' | 'crop';

interface PageNumbersCropWorkspaceProps {
  mode: PageNumbersCropMode;
  initialFiles?: File[];
  onConsumeInitialFiles?: () => void;
  onBackToTools: () => void;
  onSaveToSession: (record: Omit<ProcessedFileRecord, 'id' | 'createdAt'>) => void;
}

type NumberAnchor =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

type NumberFormat = 'page-of' | 'slash' | 'simple';

export const PageNumbersCropWorkspace: React.FC<PageNumbersCropWorkspaceProps> = ({
  mode,
  initialFiles,
  onConsumeInitialFiles,
  onBackToTools,
  onSaveToSession,
}) => {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceBytes, setSourceBytes] = useState<ArrayBuffer | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [previewThumb, setPreviewThumb] = useState<PdfThumbnailItem | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);

  useGlobalTaskProgress(isInspecting, 'Loading PDF preview...', {
    indeterminate: true,
  });

  // Page numbers state
  const [anchor, setAnchor] = useState<NumberAnchor>('bottom-center');
  const [numberFormat, setNumberFormat] = useState<NumberFormat>('page-of');
  const [startNumber, setStartNumber] = useState(1);
  const [skipFirstPage, setSkipFirstPage] = useState(false);
  const [fontSize, setFontSize] = useState(11);
  const [marginPt, setMarginPt] = useState(28);
  const [numColor, setNumColor] = useState<'#202124' | '#5F6368' | '#C81D36'>('#5F6368');

  // Crop state (points from edge)
  const [trimTop, setTrimTop] = useState(24);
  const [trimRight, setTrimRight] = useState(24);
  const [trimBottom, setTrimBottom] = useState(24);
  const [trimLeft, setTrimLeft] = useState(24);
  const [cropScope, setCropScope] = useState<'all' | 'custom'>('all');
  const [cropRange, setCropRange] = useState('1');

  const [outputName, setOutputName] = useState(
    mode === 'page-numbers' ? 'vellum-numbered' : 'vellum-cropped'
  );
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<BatchProgressState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<{
    url: string;
    fileName: string;
    sizeBytes: number;
    detail: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resetFile = useCallback(() => {
    setSourceFile(null);
    setSourceBytes(null);
    setTotalPages(0);
    setPreviewThumb(null);
    setOutput(null);
    setError(null);
    setProgress(null);
  }, []);

  const loadPdfFile = useCallback(
    async (file: File) => {
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
        const doc = await PDFDocument.load(buffer.slice(0), {
          updateMetadata: false,
        });
        const count = doc.getPageCount();
        const { thumbnails } = await renderPdfThumbnails(buffer, {
          maxPages: 1,
          targetWidth: 640,
        });

        setSourceFile(file);
        setSourceBytes(buffer);
        setTotalPages(count);
        setPreviewThumb(thumbnails[0] ?? null);
        setCropRange(count > 1 ? `1-${count}` : '1');
        const base = file.name.replace(/\.pdf$/i, '');
        setOutputName(
          mode === 'page-numbers' ? `${base}-numbered` : `${base}-cropped`
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message.toLowerCase() : '';
        if (msg.includes('encrypted') || msg.includes('password')) {
          setError(
            `"${file.name}" is encrypted or password-protected. Please unlock it first.`
          );
        } else {
          setError(`"${file.name}" could not be parsed as a valid PDF.`);
        }
      } finally {
        setIsInspecting(false);
      }
    },
    [mode]
  );

  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      const f = initialFiles[0];
      onConsumeInitialFiles?.();
      void loadPdfFile(f);
    }
  }, [initialFiles, loadPdfFile, onConsumeInitialFiles]);

  useEffect(() => {
    setOutput(null);
    if (sourceFile) {
      const base = sourceFile.name.replace(/\.pdf$/i, '');
      setOutputName(
        mode === 'page-numbers' ? `${base}-numbered` : `${base}-cropped`
      );
    }
  }, [mode, sourceFile]);

  const parsedCropPages = useMemo(() => {
    if (!totalPages) return { ok: false as const, pages: [] as number[], error: '' };
    if (cropScope === 'all') {
      return {
        ok: true as const,
        pages: Array.from({ length: totalPages }, (_, i) => i + 1),
        error: '',
      };
    }
    const parsed = parsePageRanges(cropRange, totalPages);
    if (!parsed.ok) {
      return { ok: false as const, pages: [] as number[], error: parsed.error };
    }
    return {
      ok: true as const,
      pages: Array.from(new Set(parsed.pages)),
      error: '',
    };
  }, [cropRange, cropScope, totalPages]);

  const formatSampleNumber = (pageNum: number, total: number) => {
    if (numberFormat === 'page-of') return `Page ${pageNum} of ${total}`;
    if (numberFormat === 'slash') return `${pageNum} / ${total}`;
    return `${pageNum}`;
  };

  const handleApplyPageNumbers = async () => {
    if (!sourceBytes) return;
    const estTotal = Math.max(1, totalPages || 1);
    const startedAt = Date.now();
    setError(null);
    setIsProcessing(true);
    setProgress({
      current: 0,
      total: estTotal,
      startedAt,
      stage: 'Loading PDF structure & Helvetica font...',
    });

    try {
      await yieldToBrowser();
      const pdfDoc = await PDFDocument.load(sourceBytes.slice(0), {
        updateMetadata: false,
      });
      pdfDoc.setProducer('Vellum Local PDF Engine');
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();
      const pageCount = Math.max(1, pages.length);
      const totalDisplay = pages.length + (startNumber - 1);
      const yieldInterval = pageCount > 40 ? 3 : 1;

      const textColor =
        numColor === '#C81D36'
          ? rgb(200 / 255, 29 / 255, 54 / 255)
          : numColor === '#202124'
            ? rgb(32 / 255, 33 / 255, 36 / 255)
            : rgb(95 / 255, 99 / 255, 104 / 255);

      let stamped = 0;
      for (let idx = 0; idx < pages.length; idx += 1) {
        const page = pages[idx];
        if (!(skipFirstPage && idx === 0)) {
          const displayIndex = idx + startNumber;
          const label = formatSampleNumber(displayIndex, totalDisplay);
          const { width, height } = page.getSize();
          const textWidth = font.widthOfTextAtSize(label, fontSize);

          const isTop = anchor.startsWith('top');
          const y = isTop
            ? Math.max(12, height - marginPt - fontSize)
            : Math.min(height - 20, marginPt);

          let x = (width - textWidth) / 2;
          if (anchor.endsWith('left')) {
            x = marginPt;
          } else if (anchor.endsWith('right')) {
            x = Math.max(marginPt, width - marginPt - textWidth);
          }

          page.drawText(label, {
            x,
            y,
            size: fontSize,
            font,
            color: textColor,
          });
          stamped += 1;
        }

        const completed = idx + 1;
        if (completed % yieldInterval === 0 || completed === pageCount) {
          setProgress({
            current: completed,
            total: pageCount,
            startedAt,
            stage:
              completed < pageCount
                ? `Numbering page ${completed} of ${pageCount}`
                : 'Saving numbered PDF document...',
          });
          await yieldToBrowser();
        }
      }

      const savedBytes = await pdfDoc.save({ useObjectStreams: true });
      const blob = new Blob([new Uint8Array(savedBytes)], {
        type: 'application/pdf',
      });
      const url = URL.createObjectURL(blob);
      const fileName = sanitizePdfFilename(outputName);
      const detail = `${stamped} ${stamped === 1 ? 'page' : 'pages'} numbered`;

      setOutput({ url, fileName, sizeBytes: blob.size, detail });
      onSaveToSession({
        name: fileName,
        sizeBytes: blob.size,
        toolId: 'page-numbers',
        toolName: 'Add Page Numbers',
        detailText: detail,
        url,
        mimeType: 'application/pdf',
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to add page numbers.'
      );
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  const handleApplyCrop = async () => {
    if (!sourceBytes || !parsedCropPages.ok) return;
    const targetCount = Math.max(1, parsedCropPages.pages.length);
    const startedAt = Date.now();
    setError(null);
    setIsProcessing(true);
    setProgress({
      current: 0,
      total: targetCount,
      startedAt,
      stage: 'Loading page crop boxes...',
    });

    try {
      await yieldToBrowser();
      const pdfDoc = await PDFDocument.load(sourceBytes.slice(0), {
        updateMetadata: false,
      });
      pdfDoc.setProducer('Vellum Local PDF Engine');
      const pages = pdfDoc.getPages();
      const yieldInterval = targetCount > 40 ? 3 : 1;

      for (let idx = 0; idx < parsedCropPages.pages.length; idx += 1) {
        const pageNum = parsedCropPages.pages[idx];
        const page = pages[pageNum - 1];
        if (page) {
          const box = page.getCropBox();
          const newWidth = box.width - trimLeft - trimRight;
          const newHeight = box.height - trimTop - trimBottom;

          if (newWidth < 40 || newHeight < 40) {
            throw new Error(
              `Crop margins exceed available dimensions on page ${pageNum}. Please reduce trim amounts.`
            );
          }

          page.setCropBox(
            box.x + trimLeft,
            box.y + trimBottom,
            newWidth,
            newHeight
          );
        }

        const completed = idx + 1;
        if (completed % yieldInterval === 0 || completed === targetCount) {
          setProgress({
            current: completed,
            total: targetCount,
            startedAt,
            stage:
              completed < targetCount
                ? `Cropping page ${pageNum} (${completed} of ${targetCount})`
                : 'Saving cropped PDF document...',
          });
          await yieldToBrowser();
        }
      }

      const savedBytes = await pdfDoc.save({ useObjectStreams: true });
      const blob = new Blob([new Uint8Array(savedBytes)], {
        type: 'application/pdf',
      });
      const url = URL.createObjectURL(blob);
      const fileName = sanitizePdfFilename(outputName);
      const detail = `${parsedCropPages.pages.length} ${
        parsedCropPages.pages.length === 1 ? 'page' : 'pages'
      } cropped`;

      setOutput({ url, fileName, sizeBytes: blob.size, detail });
      onSaveToSession({
        name: fileName,
        sizeBytes: blob.size,
        toolId: 'crop-pdf',
        toolName: 'Crop PDF',
        detailText: detail,
        url,
        mimeType: 'application/pdf',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to crop PDF.');
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  const handleDownload = () => {
    if (!output) return;
    const a = document.createElement('a');
    a.href = output.url;
    a.download = output.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const pageWidthPt = previewThumb?.widthPt || 595;
  const pageHeightPt = previewThumb?.heightPt || 842;

  const cropTopPct = Math.min(42, (trimTop / pageHeightPt) * 100);
  const cropBottomPct = Math.min(42, (trimBottom / pageHeightPt) * 100);
  const cropLeftPct = Math.min(42, (trimLeft / pageWidthPt) * 100);
  const cropRightPct = Math.min(42, (trimRight / pageWidthPt) * 100);

  return (
    <section
      aria-labelledby="page-numbers-crop-heading"
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
            <p
              className={`font-mono text-[12px] font-semibold mb-2 ${
                mode === 'page-numbers' ? 'text-[#B45309]' : 'text-[#059669]'
              }`}
            >
              {mode === 'page-numbers'
                ? 'Edit & Sign · Page Numbering'
                : 'Edit & Sign · Margin Cropping'}
            </p>
            <h1
              id="page-numbers-crop-heading"
              className="font-display text-[32px] sm:text-[42px] font-extrabold text-[#0F172A] leading-[1.1] tracking-tight"
            >
              {mode === 'page-numbers' ? 'Add Page Numbers' : 'Crop PDF'}
            </h1>
            <p className="mt-2 text-[15px] text-[#475569] max-w-2xl">
              {mode === 'page-numbers'
                ? 'Insert crisp header or footer pagination labels across any page corner with custom formatting.'
                : 'Trim outer margins and white borders visually using non-destructive PDF CropBox adjustments.'}
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
            void loadPdfFile(f);
            e.target.value = '';
          }
        }}
        className="sr-only"
        aria-label="Select a PDF file"
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
            if (f) void loadPdfFile(f);
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
          <p className="text-[16px] font-bold text-[#0F172A]">
            {isInspecting
              ? 'Loading page geometry locally...'
              : 'Drop a PDF file here, or browse from your device'}
          </p>
          <p className="mt-1.5 text-[13px] text-[#475569]">
            Single PDF up to 100 MB · Live Page 1 preview
          </p>
          <div className="mt-5">
            <span className="inline-flex items-center justify-center px-5 py-2.5 min-h-[42px] text-[13px] font-semibold text-white bg-[#2563EB] rounded-xl shadow-sm shadow-[#2563EB]/25">
              Select PDF File
            </span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Live Page 1 Preview */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-bold text-[#0F172A] truncate">
                    {sourceFile.name}
                  </p>
                  <p className="text-[12px] text-[#475569] font-mono tabular-nums">
                    {totalPages} {totalPages === 1 ? 'page' : 'pages'} ·{' '}
                    {Math.round(pageWidthPt)}×{Math.round(pageHeightPt)} pt ·{' '}
                    {formatBytes(sourceFile.size)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={resetFile}
                className="min-h-[36px] px-3.5 py-1.5 text-[12px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl inline-flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Change File</span>
              </button>
            </div>

            {previewThumb && (
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4 sm:p-6 flex flex-col items-center">
                <p className="font-mono text-[11px] font-medium text-[#64748B] mb-3">
                  {mode === 'page-numbers'
                    ? 'Live Page 1 Numbering Preview'
                    : 'Live Page 1 Crop Region'}
                </p>
                <div className="relative inline-block bg-white shadow-lg border border-[#E2E8F0] overflow-hidden select-none">
                  <img
                    src={previewThumb.dataUrl}
                    alt="Page 1 preview"
                    className="block max-w-full max-h-[580px] w-auto h-auto"
                  />

                  {mode === 'page-numbers' ? (
                    !(skipFirstPage && totalPages >= 1) && (
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          padding: `${Math.max(10, Math.round(marginPt * 0.65))}px`,
                        }}
                      >
                        <div
                          className={`w-full h-full flex ${
                            anchor.startsWith('top') ? 'items-start' : 'items-end'
                          } ${
                            anchor.endsWith('left')
                              ? 'justify-start'
                              : anchor.endsWith('right')
                                ? 'justify-end'
                                : 'justify-center'
                          }`}
                        >
                          <span
                            className="font-mono font-medium px-1.5 py-0.5 rounded bg-white/80"
                            style={{
                              color: numColor,
                              fontSize: `${Math.max(10, fontSize)}px`,
                            }}
                          >
                            {formatSampleNumber(
                              startNumber,
                              totalPages + (startNumber - 1)
                            )}
                          </span>
                        </div>
                      </div>
                    )
                  ) : (
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 pointer-events-none"
                    >
                      {/* Shaded cropped-away edges */}
                      <div
                        className="absolute top-0 left-0 right-0 bg-[#0B1120]/45"
                        style={{ height: `${cropTopPct}%` }}
                      />
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-[#0B1120]/45"
                        style={{ height: `${cropBottomPct}%` }}
                      />
                      <div
                        className="absolute bg-[#0B1120]/45"
                        style={{
                          top: `${cropTopPct}%`,
                          bottom: `${cropBottomPct}%`,
                          left: 0,
                          width: `${cropLeftPct}%`,
                        }}
                      />
                      <div
                        className="absolute bg-[#0B1120]/45"
                        style={{
                          top: `${cropTopPct}%`,
                          bottom: `${cropBottomPct}%`,
                          right: 0,
                          width: `${cropRightPct}%`,
                        }}
                      />
                      {/* Remaining crop rectangle border */}
                      <div
                        className="absolute border-2 border-dashed border-[#2563EB]"
                        style={{
                          top: `${cropTopPct}%`,
                          bottom: `${cropBottomPct}%`,
                          left: `${cropLeftPct}%`,
                          right: `${cropRightPct}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Settings Card */}
          <aside className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-5 shadow-[0_12px_32px_-16px_rgba(15,23,42,0.12)] lg:sticky lg:top-24">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
                {mode === 'page-numbers' ? (
                  <Hash className="w-4 h-4" />
                ) : (
                  <Crop className="w-4 h-4" />
                )}
              </div>
              <div>
                <h2 className="font-display text-[19px] font-bold text-[#0F172A]">
                  {mode === 'page-numbers' ? 'Pagination Options' : 'Crop Margins'}
                </h2>
                <p className="text-[12px] text-[#475569]">
                  {mode === 'page-numbers'
                    ? 'Configure position & format'
                    : 'Trim borders in PDF points (72 pt = 1 in)'}
                </p>
              </div>
            </div>

            {mode === 'page-numbers' ? (
              <>
                <div>
                  <span className="block text-[13px] font-semibold text-[#0F172A] mb-2">
                    Position
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: 'top-left', label: 'Top Left' },
                        { id: 'top-center', label: 'Top Center' },
                        { id: 'top-right', label: 'Top Right' },
                        { id: 'bottom-left', label: 'Bottom Left' },
                        { id: 'bottom-center', label: 'Bottom Ctr' },
                        { id: 'bottom-right', label: 'Bottom Rgt' },
                      ] as const
                    ).map((pos) => (
                      <button
                        key={pos.id}
                        type="button"
                        onClick={() => {
                          setAnchor(pos.id);
                          setOutput(null);
                        }}
                        className={`py-2 px-2 rounded-xl text-[11px] font-semibold border cursor-pointer transition-colors ${
                          anchor === pos.id
                            ? 'bg-[#EFF6FF] border-[#2563EB] text-[#1D4ED8]'
                            : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#475569] hover:text-[#0F172A]'
                        }`}
                      >
                        {pos.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="block text-[13px] font-semibold text-[#0F172A] mb-2">
                    Label Format
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: 'page-of', label: 'Page 1 of N' },
                        { id: 'slash', label: '1 / N' },
                        { id: 'simple', label: '1' },
                      ] as const
                    ).map((fmt) => (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => {
                          setNumberFormat(fmt.id);
                          setOutput(null);
                        }}
                        className={`py-2 px-2.5 rounded-xl text-[12px] font-semibold border cursor-pointer transition-colors ${
                          numberFormat === fmt.id
                            ? 'bg-[#EFF6FF] border-[#2563EB] text-[#1D4ED8]'
                            : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#475569] hover:text-[#0F172A]'
                        }`}
                      >
                        {fmt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="start-num-input"
                      className="block text-[12px] font-semibold text-[#0F172A] mb-1"
                    >
                      Start From
                    </label>
                    <input
                      id="start-num-input"
                      type="number"
                      min={1}
                      max={9999}
                      value={startNumber}
                      onChange={(e) => {
                        setStartNumber(Math.max(1, Number(e.target.value) || 1));
                        setOutput(null);
                      }}
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[13px] font-mono text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="font-size-num"
                      className="block text-[12px] font-semibold text-[#0F172A] mb-1"
                    >
                      Size ({fontSize} pt)
                    </label>
                    <input
                      id="font-size-num"
                      type="range"
                      min={9}
                      max={18}
                      value={fontSize}
                      onChange={(e) => {
                        setFontSize(Number(e.target.value));
                        setOutput(null);
                      }}
                      className="w-full mt-2 accent-[#2563EB]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-[#475569]">
                    Text Color
                  </span>
                  <div className="flex items-center gap-2">
                    {(
                      [
                        { hex: '#5F6368', label: 'Slate Gray' },
                        { hex: '#202124', label: 'Charcoal Black' },
                        { hex: '#C81D36', label: 'Crimson Red' },
                      ] as const
                    ).map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        aria-label={c.label}
                        onClick={() => {
                          setNumColor(c.hex);
                          setOutput(null);
                        }}
                        className={`w-6 h-6 rounded-full border-2 cursor-pointer transition-transform ${
                          numColor === c.hex
                            ? 'border-[#2563EB] ring-2 ring-[#2563EB]/30 scale-110'
                            : 'border-[#E2E8F0]'
                        }`}
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[12px] font-semibold text-[#0F172A] mb-1">
                    <span>Edge Margin</span>
                    <span className="font-mono tabular-nums">{marginPt} pt</span>
                  </div>
                  <input
                    type="range"
                    min={14}
                    max={56}
                    value={marginPt}
                    onChange={(e) => {
                      setMarginPt(Number(e.target.value));
                      setOutput(null);
                    }}
                    className="w-full accent-[#2563EB]"
                  />
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={skipFirstPage}
                    onChange={(e) => {
                      setSkipFirstPage(e.target.checked);
                      setOutput(null);
                    }}
                    className="w-4 h-4 accent-[#2563EB]"
                  />
                  <span className="text-[13px] font-medium text-[#0F172A]">
                    Skip numbering on first cover page
                  </span>
                </label>
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { label: 'Reset (0)', v: 0 },
                    { label: 'Light (18pt)', v: 18 },
                    { label: 'Standard (36pt)', v: 36 },
                    { label: 'Heavy (64pt)', v: 64 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setTrimTop(preset.v);
                        setTrimRight(preset.v);
                        setTrimBottom(preset.v);
                        setTrimLeft(preset.v);
                        setOutput(null);
                      }}
                      className="px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-[#F8FAFC] hover:bg-[#EFF6FF] text-[#0F172A] hover:text-[#1D4ED8] hover:border-[#BFDBFE] border border-[#E2E8F0] cursor-pointer inline-flex items-center gap-1 transition-colors"
                    >
                      {preset.v === 0 && <RotateCcw className="w-3 h-3" />}
                      <span>{preset.label}</span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  {[
                    { label: 'Top Trim', val: trimTop, set: setTrimTop },
                    { label: 'Bottom Trim', val: trimBottom, set: setTrimBottom },
                    { label: 'Left Trim', val: trimLeft, set: setTrimLeft },
                    { label: 'Right Trim', val: trimRight, set: setTrimRight },
                  ].map((edge) => (
                    <div key={edge.label}>
                      <div className="flex justify-between text-[12px] font-semibold text-[#0F172A] mb-1">
                        <span>{edge.label}</span>
                        <span className="font-mono tabular-nums">{edge.val} pt</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={160}
                        value={edge.val}
                        onChange={(e) => {
                          edge.set(Number(e.target.value));
                          setOutput(null);
                        }}
                        className="w-full accent-[#2563EB]"
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <span className="block text-[13px] font-semibold text-[#0F172A] mb-1.5">
                    Apply Crop To
                  </span>
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setCropScope('all')}
                      className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold border cursor-pointer transition-colors ${
                        cropScope === 'all'
                          ? 'bg-[#2563EB] text-white border-[#2563EB]'
                          : 'bg-[#F8FAFC] text-[#475569] border-[#E2E8F0] hover:text-[#0F172A]'
                      }`}
                    >
                      All Pages ({totalPages})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCropScope('custom')}
                      className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold border cursor-pointer transition-colors ${
                        cropScope === 'custom'
                          ? 'bg-[#2563EB] text-white border-[#2563EB]'
                          : 'bg-[#F8FAFC] text-[#475569] border-[#E2E8F0] hover:text-[#0F172A]'
                      }`}
                    >
                      Custom Range
                    </button>
                  </div>
                  {cropScope === 'custom' && (
                    <div>
                      <input
                        type="text"
                        value={cropRange}
                        onChange={(e) => {
                          setCropRange(e.target.value);
                          setOutput(null);
                        }}
                        placeholder="e.g. 1-3, 5"
                        className="w-full px-3.5 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[13px] font-mono text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#2563EB]"
                      />
                      {!parsedCropPages.ok && parsedCropPages.error && (
                        <p className="mt-1 text-[11px] font-medium text-red-600">
                          {parsedCropPages.error}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            <div>
              <label
                htmlFor="page-tool-output-name"
                className="block text-[13px] font-semibold text-[#0F172A] mb-1.5"
              >
                Output Filename
              </label>
              <div className="flex items-center border border-[#CBD5E1] rounded-xl bg-[#F8FAFC] focus-within:border-[#2563EB] focus-within:bg-white overflow-hidden">
                <input
                  id="page-tool-output-name"
                  type="text"
                  value={outputName}
                  onChange={(e) => setOutputName(e.target.value)}
                  className="w-full px-3.5 py-2 text-[13px] text-[#0F172A] bg-transparent focus:outline-none min-w-0"
                />
                <span className="px-3 py-2 text-[12px] font-mono text-[#475569] bg-[#E2E8F0]/60 border-l border-[#CBD5E1] shrink-0">
                  .pdf
                </span>
              </div>
            </div>

            {isProcessing && progress ? (
              <BatchProgressPanel
                title={
                  mode === 'page-numbers'
                    ? 'Inserting page numbers locally...'
                    : 'Updating PDF crop geometry locally...'
                }
                progress={progress}
                unitLabel="pages"
              />
            ) : output ? (
              <div className="p-4 bg-[#EFF6FF]/75 border border-[#BFDBFE] rounded-2xl space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#059669] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-[14px] font-bold text-[#0F172A]">
                      PDF Ready
                    </h3>
                    <p className="text-[12px] text-[#475569] font-mono tabular-nums mt-0.5">
                      {output.detail} · {formatBytes(output.sizeBytes)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="w-full min-h-[46px] px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[14px] font-semibold rounded-xl shadow-md shadow-[#2563EB]/25 inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={mode === 'crop' && !parsedCropPages.ok}
                onClick={
                  mode === 'page-numbers'
                    ? handleApplyPageNumbers
                    : handleApplyCrop
                }
                className="w-full min-h-[48px] px-5 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[14px] font-semibold rounded-xl shadow-md shadow-[#2563EB]/25 disabled:bg-[#E2E8F0] disabled:text-[#94A3B8] disabled:shadow-none disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {mode === 'page-numbers'
                  ? 'Add Page Numbers & Export'
                  : 'Apply Crop & Export PDF'}
              </button>
            )}
          </aside>
        </div>
      )}
    </section>
  );
};
