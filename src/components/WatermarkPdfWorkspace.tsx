import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  ShieldCheck,
  Stamp,
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

interface WatermarkPdfWorkspaceProps {
  initialFiles?: File[];
  onConsumeInitialFiles?: () => void;
  onBackToTools: () => void;
  onSaveToSession: (record: Omit<ProcessedFileRecord, 'id' | 'createdAt'>) => void;
}

type WatermarkColor = '#C81D36' | '#202124' | '#2563EB' | '#6B7280';
type WatermarkLayout = 'diagonal' | 'center' | 'tiled';

function hexToRgb(hex: WatermarkColor) {
  switch (hex) {
    case '#C81D36':
      return rgb(200 / 255, 29 / 255, 54 / 255);
    case '#2563EB':
      return rgb(37 / 255, 99 / 255, 235 / 255);
    case '#6B7280':
      return rgb(107 / 255, 114 / 255, 128 / 255);
    default:
      return rgb(32 / 255, 33 / 255, 36 / 255);
  }
}

export const WatermarkPdfWorkspace: React.FC<WatermarkPdfWorkspaceProps> = ({
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

  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [layout, setLayout] = useState<WatermarkLayout>('diagonal');
  const [fontSize, setFontSize] = useState(48);
  const [opacity, setOpacity] = useState(25);
  const [color, setColor] = useState<WatermarkColor>('#C81D36');
  const [pageScope, setPageScope] = useState<'all' | 'custom'>('all');
  const [customRange, setCustomRange] = useState('1');
  const [outputName, setOutputName] = useState('vellum-watermarked');

  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<BatchProgressState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<{
    url: string;
    fileName: string;
    sizeBytes: number;
    stampedPages: number;
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

  const loadPdfFile = useCallback(async (file: File) => {
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
      setCustomRange(count > 1 ? `1-${count}` : '1');
      const base = file.name.replace(/\.pdf$/i, '');
      setOutputName(`${base}-watermarked`);
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
  }, []);

  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      const f = initialFiles[0];
      onConsumeInitialFiles?.();
      void loadPdfFile(f);
    }
  }, [initialFiles, loadPdfFile, onConsumeInitialFiles]);

  const parsedTargetPages = useMemo(() => {
    if (!totalPages) return { ok: false as const, pages: [] as number[], error: '' };
    if (pageScope === 'all') {
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
    return {
      ok: true as const,
      pages: Array.from(new Set(parsed.pages)),
      error: '',
    };
  }, [customRange, pageScope, totalPages]);

  const handleApplyWatermark = async () => {
    const text = watermarkText.trim();
    if (!sourceBytes || !text || !parsedTargetPages.ok) return;

    const targetCount = Math.max(1, parsedTargetPages.pages.length);
    const startedAt = Date.now();
    setError(null);
    setIsProcessing(true);
    setProgress({
      current: 0,
      total: targetCount,
      startedAt,
      stage: 'Preparing watermark font & PDF document...',
    });

    try {
      await yieldToBrowser();
      const pdfDoc = await PDFDocument.load(sourceBytes.slice(0), {
        updateMetadata: false,
      });
      pdfDoc.setProducer('Vellum Local PDF Engine');
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const pdfColor = hexToRgb(color);
      const alpha = Math.max(0.08, Math.min(0.9, opacity / 100));
      const allPages = pdfDoc.getPages();
      const yieldInterval = targetCount > 40 ? 3 : 1;

      for (let idx = 0; idx < parsedTargetPages.pages.length; idx += 1) {
        const pageNum = parsedTargetPages.pages[idx];
        const page = allPages[pageNum - 1];
        if (page) {
          const { width, height } = page.getSize();
          const textWidth = font.widthOfTextAtSize(text, fontSize);
          const textHeight = font.heightAtSize(fontSize);

          if (layout === 'center') {
            page.drawText(text, {
              x: Math.max(16, (width - textWidth) / 2),
              y: Math.max(16, (height - textHeight) / 2),
              size: fontSize,
              font,
              color: pdfColor,
              opacity: alpha,
            });
          } else if (layout === 'diagonal') {
            const angleRad = (35 * Math.PI) / 180;
            const dx = (textWidth / 2) * Math.cos(angleRad);
            const dy = (textWidth / 2) * Math.sin(angleRad);
            page.drawText(text, {
              x: width / 2 - dx,
              y: height / 2 - dy,
              size: fontSize,
              font,
              color: pdfColor,
              opacity: alpha,
              rotate: degrees(35),
            });
          } else {
            // Tiled 2x3 grid
            const cols = [width * 0.22, width * 0.68];
            const rows = [height * 0.2, height * 0.5, height * 0.8];
            const smallSize = Math.max(16, Math.round(fontSize * 0.62));
            const smallWidth = font.widthOfTextAtSize(text, smallSize);
            for (const cx of cols) {
              for (const cy of rows) {
                page.drawText(text, {
                  x: cx - smallWidth * 0.35,
                  y: cy,
                  size: smallSize,
                  font,
                  color: pdfColor,
                  opacity: alpha,
                  rotate: degrees(32),
                });
              }
            }
          }
        }

        const completed = idx + 1;
        if (completed % yieldInterval === 0 || completed === targetCount) {
          setProgress({
            current: completed,
            total: targetCount,
            startedAt,
            stage:
              completed < targetCount
                ? `Stamped page ${pageNum} (${completed} of ${targetCount})`
                : 'Saving watermarked PDF document...',
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

      setOutput({
        url,
        fileName,
        sizeBytes: blob.size,
        stampedPages: parsedTargetPages.pages.length,
      });

      onSaveToSession({
        name: fileName,
        sizeBytes: blob.size,
        toolId: 'watermark-pdf',
        toolName: 'Watermark PDF',
        detailText: `${parsedTargetPages.pages.length} ${
          parsedTargetPages.pages.length === 1 ? 'page' : 'pages'
        } watermarked`,
        url,
        mimeType: 'application/pdf',
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to apply watermark to PDF.'
      );
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

  return (
    <section
      aria-labelledby="watermark-pdf-heading"
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
            <p className="font-mono text-[12px] font-semibold text-[#475569] mb-2">
              Edit &amp; Sign · Text Watermark
            </p>
            <h1
              id="watermark-pdf-heading"
              className="font-display text-[32px] sm:text-[42px] font-extrabold text-[#0F172A] leading-[1.1] tracking-tight"
            >
              Watermark PDF
            </h1>
            <p className="mt-2 text-[15px] text-[#475569] max-w-2xl">
              Stamp diagonal, centered, or tiled text watermarks onto PDF pages
              with live opacity, typography size, and page-scope controls.
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
        aria-label="Select a PDF file to watermark"
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
              ? 'Loading page preview locally...'
              : 'Drop a PDF file here, or browse from your device'}
          </p>
          <p className="mt-1.5 text-[13px] text-[#475569]">
            Single PDF up to 100 MB · Instant watermark preview
          </p>
          <div className="mt-5">
            <span className="inline-flex items-center justify-center px-5 py-2.5 min-h-[42px] text-[13px] font-semibold text-white bg-[#2563EB] rounded-xl shadow-sm shadow-[#2563EB]/25">
              Select PDF File
            </span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Live Page 1 Watermark Preview */}
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
                  Live Page 1 Watermark Preview
                </p>
                <div className="relative inline-block bg-white shadow-lg border border-[#E2E8F0] overflow-hidden select-none">
                  <img
                    src={previewThumb.dataUrl}
                    alt="Page 1 watermark preview"
                    className="block max-w-full max-h-[580px] w-auto h-auto"
                  />

                  {watermarkText.trim() && (
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center"
                    >
                      {layout === 'tiled' ? (
                        <div
                          className="grid grid-cols-2 gap-10 p-6 w-full h-full place-items-center"
                          style={{ opacity: opacity / 100 }}
                        >
                          {[0, 1, 2, 3, 4, 5].map((idx) => (
                            <span
                              key={idx}
                              className="font-bold tracking-wider uppercase whitespace-nowrap"
                              style={{
                                color,
                                fontSize: `${Math.max(12, Math.round(fontSize * 0.42))}px`,
                                transform: 'rotate(-32deg)',
                              }}
                            >
                              {watermarkText}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span
                          className="font-bold tracking-wider uppercase whitespace-nowrap px-4"
                          style={{
                            color,
                            opacity: opacity / 100,
                            fontSize: `${Math.max(14, Math.round(fontSize * 0.65))}px`,
                            transform:
                              layout === 'diagonal' ? 'rotate(-35deg)' : 'none',
                          }}
                        >
                          {watermarkText}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right: Watermark Controls */}
          <aside className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-5 shadow-[0_12px_32px_-16px_rgba(15,23,42,0.12)] lg:sticky lg:top-24">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
                <Stamp className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-display text-[19px] font-bold text-[#0F172A]">
                  Watermark Settings
                </h2>
                <p className="text-[12px] text-[#475569]">
                  Customize text stamp appearance
                </p>
              </div>
            </div>

            <div>
              <label
                htmlFor="watermark-text-input"
                className="block text-[13px] font-semibold text-[#0F172A] mb-1.5"
              >
                Watermark Text
              </label>
              <input
                id="watermark-text-input"
                type="text"
                value={watermarkText}
                onChange={(e) => {
                  setWatermarkText(e.target.value);
                  setOutput(null);
                }}
                placeholder="CONFIDENTIAL"
                className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[14px] font-medium text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#2563EB]"
              />
            </div>

            <div>
              <span className="block text-[13px] font-semibold text-[#0F172A] mb-1.5">
                Placement Style
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'diagonal', label: 'Diagonal' },
                    { id: 'center', label: 'Centered' },
                    { id: 'tiled', label: 'Tiled Grid' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setLayout(opt.id);
                      setOutput(null);
                    }}
                    className={`py-2 px-2.5 rounded-xl text-[12px] font-semibold border transition-colors cursor-pointer ${
                      layout === opt.id
                        ? 'bg-[#EFF6FF] border-[#2563EB] text-[#1D4ED8]'
                        : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#475569] hover:text-[#0F172A]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-[12px] font-semibold text-[#0F172A] mb-1">
                  <span>Font Size</span>
                  <span className="font-mono tabular-nums">{fontSize} pt</span>
                </div>
                <input
                  type="range"
                  min={22}
                  max={88}
                  value={fontSize}
                  onChange={(e) => {
                    setFontSize(Number(e.target.value));
                    setOutput(null);
                  }}
                  className="w-full accent-[#2563EB]"
                />
              </div>

              <div>
                <div className="flex justify-between text-[12px] font-semibold text-[#0F172A] mb-1">
                  <span>Opacity</span>
                  <span className="font-mono tabular-nums">{opacity}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={80}
                  value={opacity}
                  onChange={(e) => {
                    setOpacity(Number(e.target.value));
                    setOutput(null);
                  }}
                  className="w-full accent-[#2563EB]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-[#0F172A]">
                Stamp Color
              </span>
              <div className="flex items-center gap-2">
                {(
                  [
                    { hex: '#C81D36', label: 'Crimson Red' },
                    { hex: '#202124', label: 'Charcoal Black' },
                    { hex: '#2563EB', label: 'Cobalt Blue' },
                    { hex: '#6B7280', label: 'Slate Gray' },
                  ] as const
                ).map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    aria-label={c.label}
                    onClick={() => {
                      setColor(c.hex);
                      setOutput(null);
                    }}
                    className={`w-7 h-7 rounded-full border-2 cursor-pointer transition-transform ${
                      color === c.hex
                        ? 'border-[#2563EB] ring-2 ring-[#2563EB]/30 scale-110'
                        : 'border-[#E2E8F0]'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>

            <div>
              <span className="block text-[13px] font-semibold text-[#0F172A] mb-1.5">
                Target Pages
              </span>
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setPageScope('all')}
                  className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold border cursor-pointer transition-colors ${
                    pageScope === 'all'
                      ? 'bg-[#2563EB] text-white border-[#2563EB]'
                      : 'bg-[#F8FAFC] text-[#475569] border-[#E2E8F0] hover:text-[#0F172A]'
                  }`}
                >
                  All Pages ({totalPages})
                </button>
                <button
                  type="button"
                  onClick={() => setPageScope('custom')}
                  className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold border cursor-pointer transition-colors ${
                    pageScope === 'custom'
                      ? 'bg-[#2563EB] text-white border-[#2563EB]'
                      : 'bg-[#F8FAFC] text-[#475569] border-[#E2E8F0] hover:text-[#0F172A]'
                  }`}
                >
                  Custom Range
                </button>
              </div>
              {pageScope === 'custom' && (
                <div>
                  <input
                    type="text"
                    value={customRange}
                    onChange={(e) => {
                      setCustomRange(e.target.value);
                      setOutput(null);
                    }}
                    placeholder="e.g. 1-3, 5"
                    className="w-full px-3.5 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[13px] font-mono text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#2563EB]"
                  />
                  {!parsedTargetPages.ok && parsedTargetPages.error && (
                    <p className="mt-1 text-[11px] font-medium text-red-600">
                      {parsedTargetPages.error}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="watermark-output-name"
                className="block text-[13px] font-semibold text-[#0F172A] mb-1.5"
              >
                Output Filename
              </label>
              <div className="flex items-center border border-[#CBD5E1] rounded-xl bg-[#F8FAFC] focus-within:border-[#2563EB] focus-within:bg-white overflow-hidden">
                <input
                  id="watermark-output-name"
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
                title="Applying watermark locally..."
                progress={progress}
                unitLabel="pages"
              />
            ) : output ? (
              <div className="p-4 bg-[#EFF6FF]/75 border border-[#BFDBFE] rounded-2xl space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#059669] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-[14px] font-bold text-[#0F172A]">
                      Watermarked PDF Ready
                    </h3>
                    <p className="text-[12px] text-[#475569] font-mono tabular-nums mt-0.5">
                      {output.stampedPages} pages stamped ·{' '}
                      {formatBytes(output.sizeBytes)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="w-full min-h-[46px] px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[14px] font-semibold rounded-xl shadow-md shadow-[#2563EB]/25 inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Watermarked PDF</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={!watermarkText.trim() || !parsedTargetPages.ok}
                onClick={handleApplyWatermark}
                className="w-full min-h-[48px] px-5 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[14px] font-semibold rounded-xl shadow-md shadow-[#2563EB]/25 disabled:bg-[#E2E8F0] disabled:text-[#94A3B8] disabled:shadow-none disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Apply Watermark &amp; Export
              </button>
            )}
          </aside>
        </div>
      )}
    </section>
  );
};
