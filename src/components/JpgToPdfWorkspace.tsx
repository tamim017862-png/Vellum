import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  Download,
  ImagePlus,
  RotateCw,
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
import { MAX_FILES_IN_BATCH, validateImageFile } from '../utils/pdfValidation';

interface JpgToPdfWorkspaceProps {
  initialFiles?: File[];
  onConsumeInitialFiles?: () => void;
  onBackToTools: () => void;
  onSaveToSession: (record: Omit<ProcessedFileRecord, 'id' | 'createdAt'>) => void;
}

interface ImageQueueItem {
  id: string;
  file: File;
  name: string;
  size: number;
  previewUrl: string;
  width: number;
  height: number;
  rotation: 0 | 90 | 180 | 270;
}

type PageSizeOption = 'fit' | 'a4' | 'letter';
type OrientationOption = 'auto' | 'portrait' | 'landscape';
type MarginOption = 0 | 18 | 36;

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `img_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

async function readImageDimensions(
  url: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () =>
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Failed to decode image dimensions.'));
    img.src = url;
  });
}

async function renderRotatedJpegBytes(
  file: File,
  rotation: 0 | 90 | 180 | 270
): Promise<{ bytes: ArrayBuffer; width: number; height: number }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error(`Unable to decode "${file.name}".`));
      el.src = url;
    });

    const swap = rotation === 90 || rotation === 270;
    const canvas = document.createElement('canvas');
    canvas.width = swap ? img.naturalHeight : img.naturalWidth;
    canvas.height = swap ? img.naturalWidth : img.naturalHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable.');

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Image conversion failed.'))),
        'image/jpeg',
        0.92
      );
    });

    const bytes = await blob.arrayBuffer();
    const result = { bytes, width: canvas.width, height: canvas.height };
    canvas.width = 0;
    canvas.height = 0;
    return result;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const JpgToPdfWorkspace: React.FC<JpgToPdfWorkspaceProps> = ({
  initialFiles,
  onConsumeInitialFiles,
  onBackToTools,
  onSaveToSession,
}) => {
  const [images, setImages] = useState<ImageQueueItem[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState<PageSizeOption>('a4');
  const [orientation, setOrientation] = useState<OrientationOption>('auto');
  const [margin, setMargin] = useState<MarginOption>(18);
  const [outputName, setOutputName] = useState('vellum-images-to-pdf');

  const [isDragOverDropzone, setIsDragOverDropzone] = useState(false);
  const [draggedRowId, setDraggedRowId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<BatchProgressState | null>(null);
  const [output, setOutput] = useState<{
    url: string;
    fileName: string;
    sizeBytes: number;
    pageCount: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imagesRef = useRef<ImageQueueItem[]>([]);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    return () => {
      for (const img of imagesRef.current) {
        URL.revokeObjectURL(img.previewUrl);
      }
    };
  }, []);

  const handleFilesAdded = useCallback(
    async (fileList: FileList | File[]) => {
      const incoming = Array.from(fileList);
      if (incoming.length === 0) return;
      setOutput(null);

      const newErrors: string[] = [];
      const remainingSlots = MAX_FILES_IN_BATCH - images.length;
      if (remainingSlots <= 0) {
        setErrors((prev) => [
          ...prev,
          `Maximum ${MAX_FILES_IN_BATCH} images per PDF.`,
        ]);
        return;
      }

      const toCheck = incoming.slice(0, remainingSlots);
      const accepted: ImageQueueItem[] = [];

      for (const file of toCheck) {
        const check = await validateImageFile(file);
        if (!check.valid) {
          if (check.reason) newErrors.push(check.reason);
          continue;
        }
        const previewUrl = URL.createObjectURL(file);
        try {
          const dims = await readImageDimensions(previewUrl);
          accepted.push({
            id: generateId(),
            file,
            name: file.name,
            size: file.size,
            previewUrl,
            width: dims.width,
            height: dims.height,
            rotation: 0,
          });
        } catch {
          URL.revokeObjectURL(previewUrl);
          newErrors.push(`"${file.name}" could not be decoded as an image.`);
        }
      }

      if (newErrors.length > 0) {
        setErrors((prev) => [...prev, ...newErrors]);
      }
      if (accepted.length > 0) {
        setImages((prev) => [...prev, ...accepted]);
      }
    },
    [images.length]
  );

  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      const filesCopy = [...initialFiles];
      onConsumeInitialFiles?.();
      void handleFilesAdded(filesCopy);
    }
  }, [handleFilesAdded, initialFiles, onConsumeInitialFiles]);

  const moveImage = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    setOutput(null);
    setImages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    });
  };

  const rotateImage = (id: string) => {
    setOutput(null);
    setImages((prev) =>
      prev.map((img) =>
        img.id === id
          ? {
              ...img,
              rotation: (((img.rotation + 90) % 360) as 0 | 90 | 180 | 270),
            }
          : img
      )
    );
  };

  const removeImage = (id: string) => {
    setOutput(null);
    setImages((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  };

  const clearAll = () => {
    for (const img of images) {
      URL.revokeObjectURL(img.previewUrl);
    }
    setImages([]);
    setErrors([]);
    setOutput(null);
  };

  const handleBuildPdf = async () => {
    if (images.length === 0) return;

    const total = Math.max(1, images.length);
    const startedAt = Date.now();
    setErrors([]);
    setOutput(null);
    setIsProcessing(true);
    setProgress({
      current: 0,
      total,
      startedAt,
      stage: 'Creating PDF document container...',
    });

    try {
      await yieldToBrowser();
      const pdfDoc = await PDFDocument.create();
      pdfDoc.setProducer('Vellum Local PDF Engine');

      for (let i = 0; i < images.length; i += 1) {
        const item = images[i];
        setProgress({
          current: i,
          total,
          startedAt,
          stage: `Embedding "${item.name}" (${i + 1} of ${total})...`,
        });

        const isPng = item.name.toLowerCase().endsWith('.png');
        let embeddedImg;
        let imgW: number;
        let imgH: number;

        if (item.rotation === 0) {
          const rawBytes = await item.file.arrayBuffer();
          embeddedImg = isPng
            ? await pdfDoc.embedPng(rawBytes)
            : await pdfDoc.embedJpg(rawBytes);
          imgW = embeddedImg.width;
          imgH = embeddedImg.height;
        } else {
          const rendered = await renderRotatedJpegBytes(
            item.file,
            item.rotation
          );
          embeddedImg = await pdfDoc.embedJpg(rendered.bytes);
          imgW = rendered.width;
          imgH = rendered.height;
        }

        let pageW: number;
        let pageH: number;

        if (pageSize === 'fit') {
          pageW = imgW + margin * 2;
          pageH = imgH + margin * 2;
        } else {
          const baseDims =
            pageSize === 'a4' ? [595.28, 841.89] : [612, 792];
          const useLandscape =
            orientation === 'landscape' ||
            (orientation === 'auto' && imgW > imgH);
          pageW = useLandscape ? baseDims[1] : baseDims[0];
          pageH = useLandscape ? baseDims[0] : baseDims[1];
        }

        const page = pdfDoc.addPage([pageW, pageH]);
        const availW = Math.max(10, pageW - margin * 2);
        const availH = Math.max(10, pageH - margin * 2);
        const fitScale = Math.min(availW / imgW, availH / imgH);
        const drawW = imgW * fitScale;
        const drawH = imgH * fitScale;
        const drawX = (pageW - drawW) / 2;
        const drawY = (pageH - drawH) / 2;

        page.drawImage(embeddedImg, {
          x: drawX,
          y: drawY,
          width: drawW,
          height: drawH,
        });

        const completed = i + 1;
        setProgress({
          current: completed,
          total,
          startedAt,
          stage:
            completed < total
              ? `Added "${item.name}"`
              : 'Saving combined PDF file...',
        });
        await yieldToBrowser();
      }

      const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
      const blob = new Blob([new Uint8Array(pdfBytes)], {
        type: 'application/pdf',
      });
      const url = URL.createObjectURL(blob);
      const safeName = sanitizePdfFilename(outputName);

      setOutput({
        url,
        fileName: safeName,
        sizeBytes: blob.size,
        pageCount: images.length,
      });

      onSaveToSession({
        name: safeName,
        sizeBytes: blob.size,
        toolId: 'jpg-to-pdf',
        toolName: 'JPG to PDF',
        detailText: `${images.length} ${images.length === 1 ? 'image' : 'images'} combined`,
        url,
        mimeType: 'application/pdf',
      });
    } catch (err) {
      setErrors((prev) => [
        ...prev,
        err instanceof Error ? err.message : 'Failed to create PDF from images.',
      ]);
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

  return (
    <section
      aria-labelledby="jpg-to-pdf-heading"
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
              Convert · Image to PDF
            </p>
            <h1
              id="jpg-to-pdf-heading"
              className="font-display text-[32px] sm:text-[42px] font-extrabold text-[#0F172A] leading-[1.1] tracking-tight"
            >
              JPG to PDF
            </h1>
            <p className="mt-2 text-[15px] text-[#475569] max-w-2xl">
              Assemble JPG, JPEG, or PNG images into a clean multi-page PDF.
              Reorder, rotate, and select A4, US Letter, or exact-fit page
              sizing.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[12px] font-medium text-[#475569] shrink-0">
            <ShieldCheck className="w-4 h-4 text-[#059669]" />
            <span>Private · No files uploaded</span>
          </div>
        </div>
      </div>

      {errors.length > 0 && (
        <div
          role="alert"
          className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 sm:p-5 flex items-start justify-between gap-4"
        >
          <div className="flex items-start gap-3 min-w-0">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <ul className="space-y-1 text-[13px] text-red-700 list-disc pl-4">
              {errors.map((err, idx) => (
                <li key={`${err}-${idx}`}>{err}</li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            onClick={() => setErrors([])}
            aria-label="Dismiss error messages"
            className="w-9 h-9 inline-flex items-center justify-center rounded-xl text-red-600 hover:bg-white cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
        multiple
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            void handleFilesAdded(e.target.files);
            e.target.value = '';
          }
        }}
        className="sr-only"
        aria-label="Select JPG or PNG images"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-6">
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              if (!isProcessing) fileInputRef.current?.click();
            }}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && !isProcessing) {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              if (!e.dataTransfer.types.includes('Files')) return;
              e.preventDefault();
              setIsDragOverDropzone(true);
            }}
            onDragLeave={(e) => {
              if (!e.dataTransfer.types.includes('Files')) return;
              e.preventDefault();
              setIsDragOverDropzone(false);
            }}
            onDrop={(e) => {
              if (!e.dataTransfer.types.includes('Files')) return;
              e.preventDefault();
              setIsDragOverDropzone(false);
              if (e.dataTransfer.files?.length) {
                void handleFilesAdded(e.dataTransfer.files);
              }
            }}
            className={`rounded-3xl border-2 border-dashed transition-all px-6 py-10 text-center cursor-pointer ${
              isDragOverDropzone
                ? 'border-[#2563EB] bg-[#EFF6FF]'
                : 'border-[#CBD5E1] bg-white hover:border-[#2563EB] hover:bg-[#EFF6FF]/40'
            }`}
          >
            <div className="mx-auto w-14 h-14 rounded-2xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center mb-4">
              <Upload className="w-6 h-6" />
            </div>
            <p className="font-display text-[16px] font-bold text-[#0F172A]">
              Drop JPG or PNG images here, or browse from your device
            </p>
            <p className="mt-1.5 text-[13px] text-[#475569]">
              Up to {MAX_FILES_IN_BATCH} images · 25 MB max per image
            </p>
            <div className="mt-5">
              <span className="inline-flex items-center justify-center px-5 py-2.5 min-h-[42px] text-[13px] font-semibold text-white bg-[#2563EB] rounded-xl shadow-sm shadow-[#2563EB]/25">
                Select Images
              </span>
            </div>
          </div>

          {images.length > 0 && (
            <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
              <div className="px-4 sm:px-6 py-4 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
                <span className="text-[13px] font-semibold text-[#0F172A] tabular-nums">
                  {images.length} {images.length === 1 ? 'image' : 'images'} queued
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-1.5 min-h-[36px] text-[12px] font-semibold text-[#0F172A] bg-white border border-[#E2E8F0] rounded-xl hover:border-[#2563EB] hover:text-[#1D4ED8] cursor-pointer transition-colors"
                  >
                    Add More
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={clearAll}
                    className="px-3.5 py-1.5 min-h-[36px] text-[12px] font-semibold text-red-600 bg-white border border-red-200 rounded-xl hover:bg-red-50 inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All</span>
                  </button>
                </div>
              </div>

              <ul className="divide-y divide-[#F1F5F9]">
                {images.map((item, idx) => (
                  <li
                    key={item.id}
                    draggable={!isProcessing}
                    onDragStart={() => setDraggedRowId(item.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (!draggedRowId || draggedRowId === item.id) return;
                      setOutput(null);
                      setImages((prev) => {
                        const s = prev.findIndex((i) => i.id === draggedRowId);
                        const t = prev.findIndex((i) => i.id === item.id);
                        if (s === -1 || t === -1) return prev;
                        const next = [...prev];
                        const [moved] = next.splice(s, 1);
                        next.splice(t, 0, moved);
                        return next;
                      });
                      setDraggedRowId(null);
                    }}
                    onDragEnd={() => setDraggedRowId(null)}
                    className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F8FAFC]/80"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="font-mono tabular-nums text-[12px] font-bold text-[#2563EB] w-6 shrink-0">
                        {String(idx + 1).padStart(2, '0')}
                      </span>

                      <div className="w-12 h-12 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] overflow-hidden flex items-center justify-center shrink-0">
                        <img
                          src={item.previewUrl}
                          alt={item.name}
                          className="w-full h-full object-cover transition-transform duration-150"
                          style={{ transform: `rotate(${item.rotation}deg)` }}
                        />
                      </div>

                      <div className="min-w-0">
                        <p
                          className="text-[14px] font-semibold text-[#0F172A] truncate"
                          title={item.name}
                        >
                          {item.name}
                        </p>
                        <p className="text-[12px] text-[#475569] font-mono tabular-nums mt-0.5">
                          {item.width}×{item.height}px · {formatBytes(item.size)}
                          {item.rotation !== 0 && ` · ${item.rotation}°`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => rotateImage(item.id)}
                        aria-label={`Rotate ${item.name} 90 degrees`}
                        title="Rotate 90°"
                        className="w-10 h-10 inline-flex items-center justify-center rounded-xl text-[#0F172A] hover:bg-[#F1F5F9] cursor-pointer"
                      >
                        <RotateCw className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={isProcessing || idx === 0}
                        onClick={() => moveImage(idx, -1)}
                        aria-label={`Move ${item.name} up`}
                        className="w-10 h-10 inline-flex items-center justify-center rounded-xl text-[#0F172A] hover:bg-[#F1F5F9] disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={isProcessing || idx === images.length - 1}
                        onClick={() => moveImage(idx, 1)}
                        aria-label={`Move ${item.name} down`}
                        className="w-10 h-10 inline-flex items-center justify-center rounded-xl text-[#0F172A] hover:bg-[#F1F5F9] disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => removeImage(item.id)}
                        aria-label={`Remove ${item.name}`}
                        className="w-10 h-10 inline-flex items-center justify-center rounded-xl text-[#475569] hover:text-red-600 hover:bg-red-50 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right: Layout Settings & Build */}
        <aside className="lg:col-span-4 bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-5 shadow-[0_12px_32px_-16px_rgba(15,23,42,0.12)] lg:sticky lg:top-24">
          <div>
            <h2 className="font-display text-[20px] font-bold text-[#0F172A]">
              PDF Page Setup
            </h2>
            <p className="text-[13px] text-[#475569] mt-1">
              Calibrate page dimensions and margins before creating your PDF.
            </p>
          </div>

          <div>
            <label
              htmlFor="jpg-pdf-name"
              className="block text-[13px] font-semibold text-[#0F172A] mb-1.5"
            >
              Output Filename
            </label>
            <div className="flex items-center border border-[#CBD5E1] rounded-xl bg-[#F8FAFC] focus-within:border-[#2563EB] focus-within:bg-white overflow-hidden">
              <input
                id="jpg-pdf-name"
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

          <div>
            <span className="block text-[13px] font-semibold text-[#0F172A] mb-1.5">
              Page Size
            </span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'a4' as PageSizeOption, label: 'A4' },
                { id: 'letter' as PageSizeOption, label: 'Letter' },
                { id: 'fit' as PageSizeOption, label: 'Fit Image' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  disabled={isProcessing}
                  onClick={() => {
                    setPageSize(opt.id);
                    setOutput(null);
                  }}
                  className={`py-2 px-2 rounded-xl border text-[12px] font-semibold cursor-pointer transition-colors ${
                    pageSize === opt.id
                      ? 'bg-[#EFF6FF] border-[#2563EB] text-[#1D4ED8]'
                      : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#0F172A] hover:border-[#93C5FD]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {pageSize !== 'fit' && (
            <div>
              <span className="block text-[13px] font-semibold text-[#0F172A] mb-1.5">
                Orientation
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'auto' as OrientationOption, label: 'Auto' },
                  { id: 'portrait' as OrientationOption, label: 'Portrait' },
                  { id: 'landscape' as OrientationOption, label: 'Landscape' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={isProcessing}
                    onClick={() => {
                      setOrientation(opt.id);
                      setOutput(null);
                    }}
                    className={`py-2 px-2 rounded-xl border text-[12px] font-semibold cursor-pointer transition-colors ${
                      orientation === opt.id
                        ? 'bg-[#EFF6FF] border-[#2563EB] text-[#1D4ED8]'
                        : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#0F172A] hover:border-[#93C5FD]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <span className="block text-[13px] font-semibold text-[#0F172A] mb-1.5">
              Margin
            </span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: 0 as MarginOption, label: 'None' },
                { val: 18 as MarginOption, label: 'Small' },
                { val: 36 as MarginOption, label: 'Standard' },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  disabled={isProcessing}
                  onClick={() => {
                    setMargin(opt.val);
                    setOutput(null);
                  }}
                  className={`py-2 px-2 rounded-xl border text-[12px] font-semibold cursor-pointer transition-colors ${
                    margin === opt.val
                      ? 'bg-[#EFF6FF] border-[#2563EB] text-[#1D4ED8]'
                      : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#0F172A] hover:border-[#93C5FD]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {isProcessing && progress ? (
            <BatchProgressPanel
              title="Building PDF from images..."
              progress={progress}
              unitLabel="images"
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
                    {output.pageCount}{' '}
                    {output.pageCount === 1 ? 'page' : 'pages'} ·{' '}
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
                <span>Download PDF</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={images.length === 0}
              onClick={handleBuildPdf}
              className="w-full min-h-[48px] px-5 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[14px] font-semibold rounded-xl shadow-md shadow-[#2563EB]/25 disabled:bg-[#E2E8F0] disabled:text-[#94A3B8] disabled:shadow-none disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <ImagePlus className="w-4 h-4" />
              <span>
                {images.length > 0
                  ? `Convert ${images.length} ${images.length === 1 ? 'Image' : 'Images'} to PDF`
                  : 'Convert to PDF'}
              </span>
            </button>
          )}
        </aside>
      </div>
    </section>
  );
};
