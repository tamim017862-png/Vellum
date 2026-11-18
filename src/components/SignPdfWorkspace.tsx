import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Download,
  Eraser,
  Loader2,
  PenTool,
  ShieldCheck,
  Trash2,
  Type,
  Upload,
  X,
} from 'lucide-react';
import type { ProcessedFileRecord } from '../types/pdf';
import { formatBytes, sanitizePdfFilename } from '../utils/formatters';
import { useGlobalTaskProgress } from '../utils/globalProgress';
import { renderPdfThumbnails, type PdfThumbnailItem } from '../utils/pdfjsSetup';
import { validatePdfFile } from '../utils/pdfValidation';

interface SignPdfWorkspaceProps {
  initialFiles?: File[];
  onConsumeInitialFiles?: () => void;
  onBackToTools: () => void;
  onSaveToSession: (record: Omit<ProcessedFileRecord, 'id' | 'createdAt'>) => void;
}

type SignTab = 'draw' | 'type';

export const SignPdfWorkspace: React.FC<SignPdfWorkspaceProps> = ({
  initialFiles,
  onConsumeInitialFiles,
  onBackToTools,
  onSaveToSession,
}) => {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceBytes, setSourceBytes] = useState<ArrayBuffer | null>(null);
  const [thumbnails, setThumbnails] = useState<PdfThumbnailItem[]>([]);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [isInspecting, setIsInspecting] = useState(false);

  const [signTab, setSignTab] = useState<SignTab>('draw');
  const [inkColor, setInkColor] = useState<'#0E1A2B' | '#202124' | '#C81D36'>('#0E1A2B');
  const [typedSignature, setTypedSignature] = useState('Alex Morgan');
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  // Normalized placement relative to displayed page preview (0..1)
  const [posX, setPosX] = useState(0.58);
  const [posY, setPosY] = useState(0.76);
  const [sigWidthPct, setSigWidthPct] = useState(28);
  const [applyAllPages, setApplyAllPages] = useState(false);
  const [outputName, setOutputName] = useState('vellum-signed-document');

  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useGlobalTaskProgress(
    isInspecting || isProcessing,
    isProcessing ? 'Embedding signature into PDF...' : 'Rendering PDF preview...',
    { indeterminate: true }
  );
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<{
    url: string;
    fileName: string;
    sizeBytes: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const pageContainerRef = useRef<HTMLDivElement | null>(null);

  const resetFile = useCallback(() => {
    setSourceFile(null);
    setSourceBytes(null);
    setThumbnails([]);
    setActivePageIndex(0);
    setOutput(null);
    setError(null);
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
      await PDFDocument.load(buffer.slice(0), { updateMetadata: false });
      const { thumbnails: rendered } = await renderPdfThumbnails(buffer, {
        maxPages: 30,
        targetWidth: 680,
      });

      setSourceFile(file);
      setSourceBytes(buffer);
      setThumbnails(rendered);
      setActivePageIndex(0);
      const base = file.name.replace(/\.pdf$/i, '');
      setOutputName(`${base}-signed`);
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
  }, []);

  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      const f = initialFiles[0];
      onConsumeInitialFiles?.();
      void loadPdfFile(f);
    }
  }, [initialFiles, loadPdfFile, onConsumeInitialFiles]);

  // Render typed signature cleanly onto transparent PNG
  useEffect(() => {
    if (signTab !== 'type') return;
    const text = typedSignature.trim();
    if (!text) {
      setSignatureDataUrl(null);
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = 560;
    canvas.height = 170;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = inkColor;
    ctx.font = 'italic 64px Georgia, "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    setSignatureDataUrl(canvas.toDataURL('image/png'));
  }, [inkColor, signTab, typedSignature]);

  const exportDrawnCanvas = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    setSignatureDataUrl(canvas.toDataURL('image/png'));
  };

  const clearDrawCanvas = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureDataUrl(null);
  };

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handleDrawPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    canvas.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    const pt = getCanvasPoint(e);
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = 4.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
  };

  const handleDrawPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const ctx = drawCanvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pt = getCanvasPoint(e);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  };

  const handleDrawPointerUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    exportDrawnCanvas();
  };

  const handlePlaceSignatureClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = pageContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / rect.width;
    const clickY = (e.clientY - rect.top) / rect.height;
    setPosX(Math.max(0.05, Math.min(0.85, clickX - sigWidthPct / 200)));
    setPosY(Math.max(0.05, Math.min(0.88, clickY - 0.04)));
    setOutput(null);
  };

  const handleApplySignature = async () => {
    if (!sourceBytes || !signatureDataUrl) return;
    setError(null);
    setIsProcessing(true);

    try {
      const pdfDoc = await PDFDocument.load(sourceBytes.slice(0), {
        updateMetadata: false,
      });
      const base64Part = signatureDataUrl.split(',')[1] ?? '';
      const binary = atob(base64Part);
      const pngBytes = new Uint8Array(binary.length);
      for (let idx = 0; idx < binary.length; idx += 1) {
        pngBytes[idx] = binary.charCodeAt(idx);
      }
      const embeddedSig = await pdfDoc.embedPng(pngBytes);

      const allPages = pdfDoc.getPages();
      const targetIndices = applyAllPages
        ? allPages.map((_, i) => i)
        : [Math.min(activePageIndex, allPages.length - 1)];

      const aspect = embeddedSig.height / Math.max(embeddedSig.width, 1);

      for (const pageIdx of targetIndices) {
        const page = allPages[pageIdx];
        const { width: pageW, height: pageH } = page.getSize();
        const drawW = (sigWidthPct / 100) * pageW;
        const drawH = drawW * aspect;
        const drawX = Math.max(0, Math.min(pageW - drawW, posX * pageW));
        // Convert top-left normalized Y into PDF bottom-left coordinate
        const drawY = Math.max(
          0,
          Math.min(pageH - drawH, pageH - posY * pageH - drawH)
        );

        page.drawImage(embeddedSig, {
          x: drawX,
          y: drawY,
          width: drawW,
          height: drawH,
        });
      }

      const savedBytes = await pdfDoc.save({ useObjectStreams: true });
      const blob = new Blob([new Uint8Array(savedBytes)], {
        type: 'application/pdf',
      });
      const url = URL.createObjectURL(blob);
      const fileName = sanitizePdfFilename(outputName);

      setOutput({ url, fileName, sizeBytes: blob.size });
      onSaveToSession({
        name: fileName,
        sizeBytes: blob.size,
        toolId: 'sign-pdf',
        toolName: 'Sign PDF',
        detailText: applyAllPages
          ? `Signed all ${allPages.length} pages`
          : `Signed page ${activePageIndex + 1}`,
        url,
        mimeType: 'application/pdf',
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to embed signature into PDF.'
      );
    } finally {
      setIsProcessing(false);
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

  const activeThumb = thumbnails[activePageIndex];

  return (
    <section
      aria-labelledby="sign-pdf-heading"
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
              Edit &amp; Sign · Electronic Signature
            </p>
            <h1
              id="sign-pdf-heading"
              className="font-display text-[32px] sm:text-[42px] font-extrabold text-[#0F172A] leading-[1.1] tracking-tight"
            >
              Sign PDF
            </h1>
            <p className="mt-2 text-[15px] text-[#475569] max-w-2xl">
              Draw or type your signature, click anywhere on your PDF preview to
              position it, and download a signed document privately.
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
        aria-label="Select PDF file to sign"
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
              ? 'Preparing document preview...'
              : 'Drop a PDF file here, or browse from your device'}
          </p>
          <p className="mt-1.5 text-[13px] text-[#475569]">
            Single PDF up to 100 MB · Interactive visual signing
          </p>
          <div className="mt-5">
            <span className="inline-flex items-center justify-center px-5 py-2.5 min-h-[42px] text-[13px] font-semibold text-white bg-[#2563EB] rounded-xl shadow-sm shadow-[#2563EB]/25">
              Select PDF File
            </span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Interactive Page Placement Canvas */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold text-[#0F172A] tabular-nums">
                  Page {activePageIndex + 1} of {thumbnails.length}
                </span>
                <span className="text-[12px] text-[#475569]">
                  · Click page to place signature
                </span>
              </div>

              <div className="flex items-center gap-2">
                {thumbnails.length > 1 && (
                  <select
                    aria-label="Select page to sign"
                    value={activePageIndex}
                    onChange={(e) => setActivePageIndex(Number(e.target.value))}
                    className="px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[12px] font-semibold text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                  >
                    {thumbnails.map((t, i) => (
                      <option key={t.pageNumber} value={i}>
                        Page {t.pageNumber}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  type="button"
                  onClick={resetFile}
                  className="min-h-[34px] px-3 py-1 text-[12px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl inline-flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Change File</span>
                </button>
              </div>
            </div>

            {activeThumb && (
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4 sm:p-6 flex justify-center">
                <div
                  ref={pageContainerRef}
                  onClick={handlePlaceSignatureClick}
                  className="relative inline-block shadow-lg border border-[#E2E8F0] bg-white cursor-crosshair select-none overflow-hidden"
                >
                  <img
                    src={activeThumb.dataUrl}
                    alt={`Page ${activeThumb.pageNumber} preview`}
                    className="block max-w-full max-h-[620px] w-auto h-auto pointer-events-none"
                  />

                  {signatureDataUrl && (
                    <div
                      style={{
                        left: `${posX * 100}%`,
                        top: `${posY * 100}%`,
                        width: `${sigWidthPct}%`,
                      }}
                      className="absolute border-2 border-dashed border-[#2563EB] bg-[#EFF6FF]/30 rounded-md p-1 pointer-events-none"
                    >
                      <img
                        src={signatureDataUrl}
                        alt="Placed signature preview"
                        className="w-full h-auto block"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right: Signature Builder & Export */}
          <aside className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-5 shadow-[0_12px_32px_-16px_rgba(15,23,42,0.12)] lg:sticky lg:top-24">
            <div>
              <h2 className="font-display text-[20px] font-bold text-[#0F172A]">
                Create Signature
              </h2>
              <p className="text-[13px] text-[#475569] mt-1">
                Draw with your mouse/finger or type a crisp signature.
              </p>
            </div>

            {/* Draw vs Type Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setSignTab('draw')}
                className={`py-2 px-3 rounded-lg text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  signTab === 'draw'
                    ? 'bg-white text-[#0F172A] shadow-xs'
                    : 'text-[#475569] hover:text-[#0F172A]'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Draw</span>
              </button>
              <button
                type="button"
                onClick={() => setSignTab('type')}
                className={`py-2 px-3 rounded-lg text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  signTab === 'type'
                    ? 'bg-white text-[#0F172A] shadow-xs'
                    : 'text-[#475569] hover:text-[#0F172A]'
                }`}
              >
                <Type className="w-3.5 h-3.5" />
                <span>Type</span>
              </button>
            </div>

            {/* Ink Color Picker */}
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-[#475569]">
                Ink Color
              </span>
              <div className="flex items-center gap-2">
                {(
                  [
                    { hex: '#0E1A2B', label: 'Navy Ink' },
                    { hex: '#202124', label: 'Black Ink' },
                    { hex: '#C81D36', label: 'Crimson Ink' },
                  ] as const
                ).map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    aria-label={c.label}
                    onClick={() => setInkColor(c.hex)}
                    className={`w-7 h-7 rounded-full border-2 cursor-pointer transition-transform ${
                      inkColor === c.hex
                        ? 'border-[#2563EB] ring-2 ring-[#2563EB]/30 scale-110'
                        : 'border-[#E2E8F0]'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>

            {signTab === 'draw' ? (
              <div className="space-y-2">
                <div className="relative rounded-2xl border border-[#CBD5E1] bg-[#F8FAFC] overflow-hidden">
                  <canvas
                    ref={drawCanvasRef}
                    width={520}
                    height={170}
                    onPointerDown={handleDrawPointerDown}
                    onPointerMove={handleDrawPointerMove}
                    onPointerUp={handleDrawPointerUp}
                    onPointerCancel={handleDrawPointerUp}
                    className="w-full h-36 touch-none cursor-crosshair block"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={clearDrawCanvas}
                    className="text-[12px] font-semibold text-[#475569] hover:text-red-600 inline-flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Eraser className="w-3.5 h-3.5" />
                    <span>Clear Signature Pad</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  value={typedSignature}
                  onChange={(e) => setTypedSignature(e.target.value)}
                  placeholder="Type your signature..."
                  aria-label="Typed signature text"
                  className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[15px] text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#2563EB]"
                />
                {signatureDataUrl && (
                  <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center">
                    <img
                      src={signatureDataUrl}
                      alt="Typed signature preview"
                      className="max-h-16 w-auto"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Size & Scope Controls */}
            <div className="space-y-3 pt-2 border-t border-[#F1F5F9]">
              <div>
                <div className="flex justify-between text-[12px] font-semibold text-[#0F172A] mb-1">
                  <span>Signature Size</span>
                  <span className="font-mono tabular-nums">{sigWidthPct}%</span>
                </div>
                <input
                  type="range"
                  min={14}
                  max={52}
                  value={sigWidthPct}
                  onChange={(e) => setSigWidthPct(Number(e.target.value))}
                  className="w-full accent-[#2563EB]"
                />
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={applyAllPages}
                  onChange={(e) => setApplyAllPages(e.target.checked)}
                  className="w-4 h-4 accent-[#2563EB]"
                />
                <span className="text-[13px] font-medium text-[#0F172A]">
                  Place signature on all {thumbnails.length} pages
                </span>
              </label>
            </div>

            {isProcessing ? (
              <div className="p-4 bg-[#EFF6FF]/75 border border-[#BFDBFE] rounded-2xl flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-[#2563EB]" />
                <span className="text-[13px] font-semibold text-[#0F172A]">
                  Embedding signature locally...
                </span>
              </div>
            ) : output ? (
              <div className="p-4 bg-[#EFF6FF]/75 border border-[#BFDBFE] rounded-2xl space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#059669] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-[14px] font-bold text-[#0F172A]">
                      Signed PDF Ready
                    </h3>
                    <p className="text-[12px] text-[#475569] font-mono tabular-nums mt-0.5">
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
                  <span>Download Signed PDF</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={!signatureDataUrl}
                onClick={handleApplySignature}
                className="w-full min-h-[48px] px-5 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[14px] font-semibold rounded-xl shadow-md shadow-[#2563EB]/25 disabled:bg-[#E2E8F0] disabled:text-[#94A3B8] disabled:shadow-none disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Apply Signature &amp; Export PDF
              </button>
            )}
          </aside>
        </div>
      )}
    </section>
  );
};
