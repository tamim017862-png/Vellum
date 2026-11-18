import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PDFDocument, degrees } from 'pdf-lib';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  RotateCcw,
  RotateCw,
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
import { renderPdfThumbnails } from '../utils/pdfjsSetup';
import { validatePdfFile } from '../utils/pdfValidation';

export type PageStudioMode = 'organize' | 'rotate' | 'delete' | 'extract';

interface PageStudioWorkspaceProps {
  mode: PageStudioMode;
  initialFiles?: File[];
  onConsumeInitialFiles?: () => void;
  onBackToTools: () => void;
  onSaveToSession: (record: Omit<ProcessedFileRecord, 'id' | 'createdAt'>) => void;
}

interface StudioPageItem {
  uid: string;
  originalPageNumber: number;
  dataUrl: string;
  addedRotation: 0 | 90 | 180 | 270;
  deleted: boolean;
  selectedForExtract: boolean;
}

const MODE_META: Record<
  PageStudioMode,
  {
    toolId: ToolId;
    badge: string;
    title: string;
    subtitle: string;
    accentPill: string;
    actionLabel: string;
    defaultSuffix: string;
  }
> = {
  organize: {
    toolId: 'organize-pdf',
    badge: 'Organize · Visual Page Grid',
    title: 'Organize PDF',
    subtitle:
      'Drag and drop thumbnails to reorder pages, rotate sideways scans, or remove unwanted pages privately in your browser.',
    accentPill: 'text-[#2563EB]',
    actionLabel: 'Save Organized PDF',
    defaultSuffix: 'organized',
  },
  rotate: {
    toolId: 'rotate-pdf',
    badge: 'Organize · Page Orientation',
    title: 'Rotate PDF',
    subtitle:
      'Rotate individual PDF pages or the entire document by 90°, 180°, or 270° with instant visual thumbnail previews.',
    accentPill: 'text-[#0D9488]',
    actionLabel: 'Save Rotated PDF',
    defaultSuffix: 'rotated',
  },
  delete: {
    toolId: 'delete-pages',
    badge: 'Organize · Page Removal',
    title: 'Delete PDF Pages',
    subtitle:
      'Click any page thumbnail to mark it for removal, then download a clean rebuilt PDF.',
    accentPill: 'text-[#DC2626]',
    actionLabel: 'Export Cleaned PDF',
    defaultSuffix: 'trimmed',
  },
  extract: {
    toolId: 'extract-pages',
    badge: 'Organize · Visual Extraction',
    title: 'Extract PDF Pages',
    subtitle:
      'Select the exact pages you need from live thumbnails and save them into a focused new PDF.',
    accentPill: 'text-[#6D28D9]',
    actionLabel: 'Extract Selected Pages',
    defaultSuffix: 'extracted',
  },
};

export const PageStudioWorkspace: React.FC<PageStudioWorkspaceProps> = ({
  mode,
  initialFiles,
  onConsumeInitialFiles,
  onBackToTools,
  onSaveToSession,
}) => {
  const meta = MODE_META[mode];

  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceBytes, setSourceBytes] = useState<ArrayBuffer | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [pages, setPages] = useState<StudioPageItem[]>([]);
  const [isInspecting, setIsInspecting] = useState(false);

  useGlobalTaskProgress(isInspecting, 'Rendering PDF page thumbnails...', {
    indeterminate: true,
  });
  const [isDragOverDropzone, setIsDragOverDropzone] = useState(false);
  const [draggedUid, setDraggedUid] = useState<string | null>(null);

  const [outputName, setOutputName] = useState(`vellum-${meta.defaultSuffix}`);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<BatchProgressState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<{
    url: string;
    fileName: string;
    sizeBytes: number;
    pageCount: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resetWorkspace = useCallback(() => {
    setSourceFile(null);
    setSourceBytes(null);
    setTotalPages(0);
    setPages([]);
    setOutput(null);
    setError(null);
    setProgress(null);
  }, []);

  const loadPdfFile = useCallback(
    async (file: File) => {
      setError(null);
      setOutput(null);

      const validation = await validatePdfFile(file);
      if (!validation.valid) {
        setError(validation.reason ?? 'Invalid PDF file.');
        return;
      }

      setIsInspecting(true);
      try {
        const buffer = await file.arrayBuffer();
        const checkDoc = await PDFDocument.load(buffer.slice(0), {
          updateMetadata: false,
        });
        const count = checkDoc.getPageCount();
        const { thumbnails } = await renderPdfThumbnails(buffer, {
          maxPages: 60,
          targetWidth: 220,
        });

        const builtPages: StudioPageItem[] = thumbnails.map((thumb) => ({
          uid: `pg_${thumb.pageNumber}_${Math.random().toString(36).slice(2, 7)}`,
          originalPageNumber: thumb.pageNumber,
          dataUrl: thumb.dataUrl,
          addedRotation: 0,
          deleted: false,
          selectedForExtract: mode === 'extract' && thumb.pageNumber === 1,
        }));

        if (count > thumbnails.length) {
          setError(
            `This PDF has ${count} pages. Showing the first ${thumbnails.length} pages for smooth browser thumbnail rendering.`
          );
        }

        setSourceFile(file);
        setSourceBytes(buffer);
        setTotalPages(count);
        setPages(builtPages);
        const base = file.name.replace(/\.pdf$/i, '');
        setOutputName(`${base}-${meta.defaultSuffix}`);
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
    [meta.defaultSuffix, mode]
  );

  // Support hand-off from Hero interactive dropzone
  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      const first = initialFiles[0];
      onConsumeInitialFiles?.();
      void loadPdfFile(first);
    }
  }, [initialFiles, loadPdfFile, onConsumeInitialFiles]);

  // Reset UI mode selections gracefully if switching between Page Studio sub-tools
  useEffect(() => {
    setOutput(null);
    if (sourceFile) {
      const base = sourceFile.name.replace(/\.pdf$/i, '');
      setOutputName(`${base}-${meta.defaultSuffix}`);
    }
  }, [meta.defaultSuffix, mode, sourceFile]);

  const rotateSinglePage = (uid: string, delta: 90 | -90 = 90) => {
    setOutput(null);
    setPages((prev) =>
      prev.map((p) =>
        p.uid === uid
          ? {
              ...p,
              addedRotation: (((p.addedRotation + delta + 360) % 360) as
                | 0
                | 90
                | 180
                | 270),
            }
          : p
      )
    );
  };

  const rotateAllPages = () => {
    setOutput(null);
    setPages((prev) =>
      prev.map((p) => ({
        ...p,
        addedRotation: (((p.addedRotation + 90) % 360) as 0 | 90 | 180 | 270),
      }))
    );
  };

  const toggleDeletePage = (uid: string) => {
    setOutput(null);
    setPages((prev) =>
      prev.map((p) => (p.uid === uid ? { ...p, deleted: !p.deleted } : p))
    );
  };

  const toggleExtractPage = (uid: string) => {
    setOutput(null);
    setPages((prev) =>
      prev.map((p) =>
        p.uid === uid
          ? { ...p, selectedForExtract: !p.selectedForExtract }
          : p
      )
    );
  };

  const movePage = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= pages.length) return;
    setOutput(null);
    setPages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    });
  };

  const resetEdits = () => {
    setOutput(null);
    setPages((prev) =>
      [...prev]
        .sort((a, b) => a.originalPageNumber - b.originalPageNumber)
        .map((p) => ({
          ...p,
          addedRotation: 0,
          deleted: false,
          selectedForExtract: mode === 'extract' && p.originalPageNumber === 1,
        }))
    );
  };

  const activeOutputPages = useMemo(() => {
    if (mode === 'extract') {
      return pages.filter((p) => p.selectedForExtract);
    }
    return pages.filter((p) => !p.deleted);
  }, [mode, pages]);

  const handleExport = async () => {
    if (!sourceBytes || activeOutputPages.length === 0) return;
    const total = activeOutputPages.length;
    const startedAt = Date.now();
    setError(null);
    setIsProcessing(true);
    setProgress({
      current: 0,
      total,
      startedAt,
      stage: 'Loading source PDF pages into local memory...',
    });

    try {
      await yieldToBrowser();
      const srcDoc = await PDFDocument.load(sourceBytes.slice(0), {
        updateMetadata: false,
      });
      const outDoc = await PDFDocument.create();
      outDoc.setProducer('Vellum Local PDF Engine');

      const indices = activeOutputPages.map((p) => p.originalPageNumber - 1);
      const copied = await outDoc.copyPages(srcDoc, indices);
      const yieldInterval = copied.length > 40 ? 3 : 1;

      for (let idx = 0; idx < copied.length; idx += 1) {
        const copiedPage = copied[idx];
        const addedRot = activeOutputPages[idx].addedRotation;
        if (addedRot !== 0) {
          const currentAngle = copiedPage.getRotation().angle;
          copiedPage.setRotation(degrees((currentAngle + addedRot) % 360));
        }
        outDoc.addPage(copiedPage);

        const completed = idx + 1;
        if (completed % yieldInterval === 0 || completed === copied.length) {
          setProgress({
            current: completed,
            total,
            startedAt,
            stage:
              completed < total
                ? `Processed page ${completed} of ${total}`
                : 'Saving rebuilt PDF document...',
          });
          await yieldToBrowser();
        }
      }

      const savedBytes = await outDoc.save({ useObjectStreams: true });
      const blob = new Blob([new Uint8Array(savedBytes)], {
        type: 'application/pdf',
      });
      const url = URL.createObjectURL(blob);
      const fileName = sanitizePdfFilename(outputName);

      setOutput({
        url,
        fileName,
        sizeBytes: blob.size,
        pageCount: activeOutputPages.length,
      });

      onSaveToSession({
        name: fileName,
        sizeBytes: blob.size,
        toolId: meta.toolId,
        toolName: meta.title,
        detailText: `${activeOutputPages.length} ${activeOutputPages.length === 1 ? 'page' : 'pages'}`,
        url,
        mimeType: 'application/pdf',
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to rebuild PDF document.'
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
      aria-labelledby="page-studio-heading"
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
              className={`font-mono text-[12px] font-semibold mb-2 ${meta.accentPill}`}
            >
              {meta.badge}
            </p>
            <h1
              id="page-studio-heading"
              className="font-display text-[32px] sm:text-[42px] font-extrabold text-[#0F172A] leading-[1.1] tracking-tight"
            >
              {meta.title}
            </h1>
            <p className="mt-2 text-[15px] text-[#475569] max-w-2xl">
              {meta.subtitle}
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
            setIsDragOverDropzone(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragOverDropzone(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOverDropzone(false);
            const f = e.dataTransfer.files?.[0];
            if (f) void loadPdfFile(f);
          }}
          className={`rounded-3xl border-2 border-dashed transition-all px-6 py-14 text-center cursor-pointer ${
            isDragOverDropzone
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
              ? 'Rendering page thumbnails locally...'
              : 'Drop a PDF file here, or browse from your device'}
          </p>
          <p className="mt-1.5 text-[13px] text-[#475569]">
            Single PDF up to 100 MB · Interactive thumbnail grid
          </p>
          <div className="mt-5">
            <span className="inline-flex items-center justify-center px-5 py-2.5 min-h-[42px] text-[13px] font-semibold text-white bg-[#2563EB] rounded-xl shadow-sm shadow-[#2563EB]/25">
              Select PDF File
            </span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Interactive Page Thumbnail Grid */}
          <div className="lg:col-span-8 space-y-5">
            {/* Toolbar */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-bold text-[#0F172A] truncate">
                    {sourceFile.name}
                  </p>
                  <p className="text-[12px] text-[#475569] font-mono tabular-nums">
                    {totalPages} pages · {formatBytes(sourceFile.size)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(mode === 'organize' || mode === 'rotate') && (
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={rotateAllPages}
                    className="min-h-[36px] px-3.5 py-1.5 text-[12px] font-semibold text-[#0F172A] bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#EFF6FF] hover:text-[#1D4ED8] hover:border-[#BFDBFE] rounded-xl inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Rotate All 90°</span>
                  </button>
                )}

                {mode === 'extract' && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setPages((prev) =>
                          prev.map((p) => ({ ...p, selectedForExtract: true }))
                        )
                      }
                      className="min-h-[36px] px-3 py-1.5 text-[12px] font-semibold text-[#0F172A] bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#EFF6FF] hover:text-[#1D4ED8] rounded-xl cursor-pointer transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPages((prev) =>
                          prev.map((p) => ({ ...p, selectedForExtract: false }))
                        )
                      }
                      className="min-h-[36px] px-3 py-1.5 text-[12px] font-semibold text-[#475569] bg-[#F8FAFC] border border-[#E2E8F0] hover:text-[#0F172A] rounded-xl cursor-pointer transition-colors"
                    >
                      Clear
                    </button>
                  </>
                )}

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={resetEdits}
                  className="min-h-[36px] px-3 py-1.5 text-[12px] font-semibold text-[#475569] bg-[#F8FAFC] border border-[#E2E8F0] hover:text-[#0F172A] rounded-xl inline-flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={resetWorkspace}
                  className="min-h-[36px] px-3.5 py-1.5 text-[12px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl inline-flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Change File</span>
                </button>
              </div>
            </div>

            {/* Thumbnail Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {pages.map((page, idx) => {
                const isExtractSelected =
                  mode === 'extract' && page.selectedForExtract;
                const isDeleted = mode !== 'extract' && page.deleted;

                return (
                  <div
                    key={page.uid}
                    draggable={mode === 'organize' && !isProcessing}
                    onDragStart={() => setDraggedUid(page.uid)}
                    onDragOver={(e) => {
                      if (mode === 'organize') e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (!draggedUid || draggedUid === page.uid) return;
                      setOutput(null);
                      setPages((prev) => {
                        const s = prev.findIndex((p) => p.uid === draggedUid);
                        const t = prev.findIndex((p) => p.uid === page.uid);
                        if (s === -1 || t === -1) return prev;
                        const next = [...prev];
                        const [moved] = next.splice(s, 1);
                        next.splice(t, 0, moved);
                        return next;
                      });
                      setDraggedUid(null);
                    }}
                    onDragEnd={() => setDraggedUid(null)}
                    onClick={() => {
                      if (mode === 'extract') toggleExtractPage(page.uid);
                      if (mode === 'delete') toggleDeletePage(page.uid);
                    }}
                    className={`group relative rounded-2xl border p-3 bg-white transition-all flex flex-col justify-between ${
                      mode === 'extract' || mode === 'delete'
                        ? 'cursor-pointer'
                        : mode === 'organize'
                          ? 'cursor-grab active:cursor-grabbing'
                          : ''
                    } ${
                      isDeleted
                        ? 'border-red-300 bg-red-50/60 opacity-70'
                        : isExtractSelected
                          ? 'border-[#2563EB] ring-2 ring-[#2563EB]/25 shadow-sm'
                          : 'border-[#E2E8F0] hover:border-[#93C5FD]'
                    }`}
                  >
                    {/* Thumbnail Preview */}
                    <div className="relative aspect-[3/4] rounded-xl bg-[#F8FAFC] overflow-hidden flex items-center justify-center p-2 border border-[#F1F5F9]">
                      <img
                        src={page.dataUrl}
                        alt={`Page ${page.originalPageNumber}`}
                        className="max-w-full max-h-full object-contain shadow-xs transition-transform duration-200"
                        style={{
                          transform: `rotate(${page.addedRotation}deg)`,
                        }}
                      />

                      {isDeleted && (
                        <div className="absolute inset-0 bg-red-600/15 flex items-center justify-center">
                          <span className="px-2.5 py-1 rounded-lg bg-red-600 text-white text-[11px] font-bold">
                            Removed
                          </span>
                        </div>
                      )}

                      {mode === 'extract' && (
                        <div
                          className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${
                            isExtractSelected
                              ? 'bg-[#2563EB] border-[#2563EB] text-white'
                              : 'bg-white/90 border-[#CBD5E1] text-transparent'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                        </div>
                      )}
                    </div>

                    {/* Footer Controls */}
                    <div
                      className="mt-3 flex items-center justify-between gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="font-mono tabular-nums text-[11px] font-semibold text-[#475569]">
                        P.{page.originalPageNumber}
                        {page.addedRotation !== 0 && ` (${page.addedRotation}°)`}
                      </span>

                      <div className="flex items-center gap-0.5">
                        {mode === 'organize' && (
                          <>
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => movePage(idx, -1)}
                              aria-label="Move page earlier"
                              className="w-7 h-7 inline-flex items-center justify-center rounded-lg text-[#475569] hover:bg-[#F8FAFC] disabled:opacity-30 cursor-pointer"
                            >
                              <ArrowLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === pages.length - 1}
                              onClick={() => movePage(idx, 1)}
                              aria-label="Move page later"
                              className="w-7 h-7 inline-flex items-center justify-center rounded-lg text-[#475569] hover:bg-[#F8FAFC] disabled:opacity-30 cursor-pointer"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        {(mode === 'organize' || mode === 'rotate') && (
                          <button
                            type="button"
                            onClick={() => rotateSinglePage(page.uid, 90)}
                            aria-label={`Rotate page ${page.originalPageNumber}`}
                            title="Rotate 90°"
                            className="w-7 h-7 inline-flex items-center justify-center rounded-lg text-[#0F172A] hover:bg-[#EFF6FF] hover:text-[#2563EB] cursor-pointer"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {(mode === 'organize' || mode === 'delete') && (
                          <button
                            type="button"
                            onClick={() => toggleDeletePage(page.uid)}
                            aria-label={
                              isDeleted
                                ? `Restore page ${page.originalPageNumber}`
                                : `Delete page ${page.originalPageNumber}`
                            }
                            title={isDeleted ? 'Restore page' : 'Remove page'}
                            className={`w-7 h-7 inline-flex items-center justify-center rounded-lg cursor-pointer ${
                              isDeleted
                                ? 'text-[#059669] bg-[#ECFDF5]'
                                : 'text-[#475569] hover:bg-red-50 hover:text-red-600'
                            }`}
                          >
                            {isDeleted ? (
                              <RotateCcw className="w-3.5 h-3.5" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Summary Card */}
          <aside className="lg:col-span-4 bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-6 shadow-[0_12px_32px_-16px_rgba(15,23,42,0.12)] lg:sticky lg:top-24">
            <div>
              <h2 className="font-display text-[20px] font-bold text-[#0F172A]">
                Output Configuration
              </h2>
              <p className="text-[13px] text-[#475569] mt-1">
                {mode === 'extract'
                  ? 'Click thumbnails to choose pages to extract.'
                  : mode === 'delete'
                    ? 'Click thumbnails to mark pages for deletion.'
                    : mode === 'rotate'
                      ? 'Rotate individual pages or all pages at once.'
                      : 'Drag thumbnails or use arrows to arrange final sequence.'}
              </p>
            </div>

            <div>
              <label
                htmlFor="studio-output-name"
                className="block text-[13px] font-semibold text-[#0F172A] mb-2"
              >
                Output Filename
              </label>
              <div className="flex items-center border border-[#CBD5E1] rounded-xl bg-[#F8FAFC] focus-within:border-[#2563EB] focus-within:bg-white overflow-hidden">
                <input
                  id="studio-output-name"
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
                <dt className="text-[#475569]">Original Pages</dt>
                <dd className="font-mono tabular-nums font-semibold text-[#0F172A]">
                  {totalPages}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[#475569]">Resulting Pages</dt>
                <dd className="font-mono tabular-nums font-semibold text-[#2563EB]">
                  {activeOutputPages.length}
                </dd>
              </div>
            </dl>

            {isProcessing && progress ? (
              <BatchProgressPanel
                title="Rebuilding PDF locally..."
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
                      {output.pageCount} pages · {formatBytes(output.sizeBytes)}
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
                <button
                  type="button"
                  onClick={resetWorkspace}
                  className="w-full min-h-[36px] text-[12px] font-semibold text-[#475569] hover:text-[#0F172A] cursor-pointer"
                >
                  Process Another File
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={activeOutputPages.length === 0}
                onClick={handleExport}
                className="w-full min-h-[48px] px-5 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[14px] font-semibold rounded-xl shadow-md shadow-[#2563EB]/25 disabled:bg-[#E2E8F0] disabled:text-[#94A3B8] disabled:shadow-none disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {meta.actionLabel}
              </button>
            )}
          </aside>
        </div>
      )}
    </section>
  );
};
