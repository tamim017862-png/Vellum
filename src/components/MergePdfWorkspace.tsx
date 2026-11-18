import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  Download,
  FilePlus2,
  FileText,
  GripVertical,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type {
  MergePdfFileItem,
  PdfWorkerResponse,
  ProcessedFileRecord,
  ToolId,
} from '../types/pdf';
import {
  formatBytes,
  formatDuration,
  formatPageCount,
  sanitizePdfFilename,
} from '../utils/formatters';
import { BatchProgressPanel } from './BatchProgressPanel';
import type { BatchProgressState } from '../utils/batchProgress';
import {
  MAX_BATCH_TOTAL_BYTES,
  MAX_FILES_IN_BATCH,
  validatePdfFile,
} from '../utils/pdfValidation';

interface MergePdfWorkspaceProps {
  initialFiles?: File[];
  onConsumeInitialFiles?: () => void;
  onBackToTools: () => void;
  onSaveToSession: (record: Omit<ProcessedFileRecord, 'id' | 'createdAt'>) => void;
  onChainToTool?: (url: string, fileName: string, targetToolId: ToolId) => void;
}

interface MergedOutputState {
  url: string;
  fileName: string;
  totalPages: number;
  sizeBytes: number;
  durationMs: number;
}

function createWorkerInstance(): Worker {
  return new Worker(new URL('../workers/pdfMerge.worker.ts', import.meta.url), {
    type: 'module',
  });
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `pdf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export const MergePdfWorkspace: React.FC<MergePdfWorkspaceProps> = ({
  initialFiles,
  onConsumeInitialFiles,
  onBackToTools,
  onSaveToSession,
  onChainToTool,
}) => {
  const [items, setItems] = useState<MergePdfFileItem[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [outputName, setOutputName] = useState<string>('vellum-merged-document');
  const [isDragOverDropzone, setIsDragOverDropzone] = useState(false);
  const [draggedRowId, setDraggedRowId] = useState<string | null>(null);
  const [dragOverRowId, setDragOverRowId] = useState<string | null>(null);

  const [isMerging, setIsMerging] = useState(false);
  const [mergeProgress, setMergeProgress] = useState<BatchProgressState | null>(
    null
  );
  const [mergedOutput, setMergedOutput] = useState<MergedOutputState | null>(
    null
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const activeMergeRequestIdRef = useRef<string | null>(null);
  const mergeStartedAtRef = useRef<number>(Date.now());
  const outputNameRef = useRef(outputName);
  const onSaveToSessionRef = useRef(onSaveToSession);

  useEffect(() => {
    outputNameRef.current = outputName;
  }, [outputName]);

  useEffect(() => {
    onSaveToSessionRef.current = onSaveToSession;
  }, [onSaveToSession]);

  const attachWorkerListeners = useCallback((worker: Worker) => {
    worker.onmessage = (event: MessageEvent<PdfWorkerResponse>) => {
      const data = event.data;

      if (data.type === 'INSPECT_RESULT') {
        setItems((prev) =>
          prev.map((item) => {
            if (item.id !== data.id) return item;
            if (data.ok) {
              return {
                ...item,
                status: 'ready',
                pageCount: data.pageCount,
                errorMessage: undefined,
              };
            }
            return {
              ...item,
              status: 'error',
              pageCount: null,
              errorMessage: data.error,
            };
          })
        );
        return;
      }

      if (data.type === 'MERGE_PROGRESS') {
        if (data.requestId !== activeMergeRequestIdRef.current) return;
        setMergeProgress({
          current: data.current,
          total: data.total,
          startedAt: mergeStartedAtRef.current,
          stage: data.stage,
        });
        return;
      }

      if (data.type === 'MERGE_RESULT') {
        if (data.requestId !== activeMergeRequestIdRef.current) return;
        activeMergeRequestIdRef.current = null;
        setIsMerging(false);
        setMergeProgress(null);

        if (!data.ok) {
          setErrors((prev) => [...prev, data.error]);
          return;
        }

        const blob = new Blob([data.buffer], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const safeFileName = sanitizePdfFilename(outputNameRef.current);

        setMergedOutput({
          url,
          fileName: safeFileName,
          totalPages: data.totalPages,
          sizeBytes: blob.size,
          durationMs: data.durationMs,
        });

        onSaveToSessionRef.current({
          name: safeFileName,
          sizeBytes: blob.size,
          toolId: 'merge-pdf',
          toolName: 'Merge PDF',
          detailText: `${data.totalPages} pages combined`,
          url,
          mimeType: 'application/pdf',
        });
      }
    };

    worker.onerror = () => {
      activeMergeRequestIdRef.current = null;
      setIsMerging(false);
      setMergeProgress(null);
      setErrors((prev) => [
        ...prev,
        'The local PDF worker encountered an unexpected error. Please try again with valid PDF files.',
      ]);
    };
  }, []);

  useEffect(() => {
    const worker = createWorkerInstance();
    attachWorkerListeners(worker);
    workerRef.current = worker;

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [attachWorkerListeners]);

  const clearMergedResult = useCallback(() => {
    setMergedOutput(null);
  }, []);

  const handleFilesAdded = useCallback(
    async (fileList: FileList | File[]) => {
      const incoming = Array.from(fileList);
      if (incoming.length === 0) return;

      clearMergedResult();
      const newErrors: string[] = [];

      const remainingSlots = MAX_FILES_IN_BATCH - items.length;
      if (remainingSlots <= 0) {
        setErrors((prev) => [
          ...prev,
          `Batch limit reached (${MAX_FILES_IN_BATCH} PDFs maximum). Remove files before adding more.`,
        ]);
        return;
      }

      const filesToCheck = incoming.slice(0, remainingSlots);
      if (incoming.length > remainingSlots) {
        newErrors.push(
          `Only ${remainingSlots} additional file${remainingSlots === 1 ? '' : 's'} could be added (maximum ${MAX_FILES_IN_BATCH} files per merge).`
        );
      }

      let runningTotalBytes = items.reduce((sum, item) => sum + item.size, 0);
      const acceptedItems: MergePdfFileItem[] = [];

      for (const file of filesToCheck) {
        const validation = await validatePdfFile(file);
        if (!validation.valid) {
          if (validation.reason) newErrors.push(validation.reason);
          continue;
        }

        if (runningTotalBytes + file.size > MAX_BATCH_TOTAL_BYTES) {
          newErrors.push(
            `"${file.name}" exceeds the 250 MB combined batch limit. Remove existing files or split into two merges.`
          );
          continue;
        }

        runningTotalBytes += file.size;
        acceptedItems.push({
          id: generateId(),
          file,
          name: file.name,
          size: file.size,
          pageCount: null,
          status: 'validating',
        });
      }

      if (newErrors.length > 0) {
        setErrors((prev) => [...prev, ...newErrors]);
      }

      if (acceptedItems.length === 0) return;

      setItems((prev) => [...prev, ...acceptedItems]);

      for (const item of acceptedItems) {
        try {
          const buffer = await item.file.arrayBuffer();
          workerRef.current?.postMessage(
            {
              type: 'INSPECT_PDF',
              id: item.id,
              buffer,
            },
            [buffer]
          );
        } catch {
          setItems((prev) =>
            prev.map((existing) =>
              existing.id === item.id
                ? {
                    ...existing,
                    status: 'error',
                    errorMessage: 'Failed to read file into browser memory.',
                  }
                : existing
            )
          );
        }
      }
    },
    [clearMergedResult, items]
  );

  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      const filesCopy = [...initialFiles];
      onConsumeInitialFiles?.();
      void handleFilesAdded(filesCopy);
    }
  }, [handleFilesAdded, initialFiles, onConsumeInitialFiles]);

  const handleDropzoneDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOverDropzone(true);
  };

  const handleDropzoneDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    setIsDragOverDropzone(false);
  };

  const handleDropzoneDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    setIsDragOverDropzone(false);
    if (isMerging) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void handleFilesAdded(e.dataTransfer.files);
    }
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    clearMergedResult();
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const removeItem = (id: string) => {
    clearMergedResult();
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleReverseOrder = () => {
    if (items.length < 2) return;
    clearMergedResult();
    setItems((prev) => [...prev].reverse());
  };

  const handleSortAlphabetically = () => {
    if (items.length < 2) return;
    clearMergedResult();
    setItems((prev) =>
      [...prev].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true })
      )
    );
  };

  const handleClearAll = () => {
    clearMergedResult();
    setItems([]);
    setErrors([]);
  };

  const handleRowDragStart = (
    e: React.DragEvent<HTMLLIElement>,
    id: string
  ) => {
    if (isMerging) {
      e.preventDefault();
      return;
    }
    setDraggedRowId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/vellum-row-id', id);
  };

  const handleRowDragOver = (
    e: React.DragEvent<HTMLLIElement>,
    targetId: string
  ) => {
    if (!draggedRowId || draggedRowId === targetId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverRowId !== targetId) {
      setDragOverRowId(targetId);
    }
  };

  const handleRowDrop = (
    e: React.DragEvent<HTMLLIElement>,
    targetId: string
  ) => {
    e.preventDefault();
    const sourceId = draggedRowId || e.dataTransfer.getData('text/vellum-row-id');
    setDraggedRowId(null);
    setDragOverRowId(null);

    if (!sourceId || sourceId === targetId) return;

    clearMergedResult();
    setItems((prev) => {
      const sourceIdx = prev.findIndex((i) => i.id === sourceId);
      const targetIdx = prev.findIndex((i) => i.id === targetId);
      if (sourceIdx === -1 || targetIdx === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(sourceIdx, 1);
      next.splice(targetIdx, 0, moved);
      return next;
    });
  };

  const handleRowDragEnd = () => {
    setDraggedRowId(null);
    setDragOverRowId(null);
  };

  const summary = useMemo(() => {
    let totalSize = 0;
    let totalPages = 0;
    let readyCount = 0;
    let validatingCount = 0;
    let errorCount = 0;

    for (const item of items) {
      totalSize += item.size;
      if (item.status === 'ready') {
        readyCount += 1;
        totalPages += item.pageCount ?? 0;
      } else if (item.status === 'validating') {
        validatingCount += 1;
      } else {
        errorCount += 1;
      }
    }

    return {
      totalSize,
      totalPages,
      readyCount,
      validatingCount,
      errorCount,
    };
  }, [items]);

  const canMerge =
    !isMerging &&
    items.length >= 2 &&
    summary.validatingCount === 0 &&
    summary.errorCount === 0 &&
    summary.readyCount >= 2;

  const handleStartMerge = async () => {
    if (!canMerge || !workerRef.current) return;

    clearMergedResult();
    setErrors([]);
    setIsMerging(true);
    const requestId = generateId();
    const startedAt = Date.now();
    activeMergeRequestIdRef.current = requestId;
    mergeStartedAtRef.current = startedAt;
    setMergeProgress({
      current: 0,
      total: items.length,
      startedAt,
      stage: 'Preparing documents in local memory',
    });

    try {
      const filesPayload: Array<{ name: string; buffer: ArrayBuffer }> = [];
      const transferables: Transferable[] = [];

      for (const item of items) {
        const buffer = await item.file.arrayBuffer();
        filesPayload.push({ name: item.name, buffer });
        transferables.push(buffer);
      }

      if (activeMergeRequestIdRef.current !== requestId) return;

      workerRef.current.postMessage(
        {
          type: 'MERGE_PDFS',
          requestId,
          files: filesPayload,
        },
        transferables
      );
    } catch {
      activeMergeRequestIdRef.current = null;
      setIsMerging(false);
      setMergeProgress(null);
      setErrors((prev) => [
        ...prev,
        'Unable to read one or more selected files. Please re-add your PDFs and try again.',
      ]);
    }
  };

  const handleCancelMerge = () => {
    if (!isMerging) return;
    activeMergeRequestIdRef.current = null;
    workerRef.current?.terminate();
    const freshWorker = createWorkerInstance();
    attachWorkerListeners(freshWorker);
    workerRef.current = freshWorker;
    setIsMerging(false);
    setMergeProgress(null);
  };

  const handleDownloadMerged = () => {
    if (!mergedOutput) return;
    const link = document.createElement('a');
    link.href = mergedOutput.url;
    link.download = sanitizePdfFilename(outputName || mergedOutput.fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section
      aria-labelledby="merge-workspace-heading"
      className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14"
    >
      {/* Breadcrumb & Header */}
      <div className="mb-8 sm:mb-10 pb-7 border-b border-[#E2E8F0]">
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
              Organize · Combine Multiple PDFs
            </p>
            <h1
              id="merge-workspace-heading"
              className="font-display text-[32px] sm:text-[42px] font-extrabold text-[#0F172A] leading-[1.1] tracking-tight"
            >
              Merge PDF
            </h1>
            <p className="mt-2 text-[15px] text-[#475569] max-w-2xl">
              Combine multiple PDF documents in your preferred reading order.
              All parsing and page binding run privately inside your browser.
            </p>
          </div>

          <div className="flex items-center gap-2 text-[12px] font-medium text-[#475569] shrink-0">
            <ShieldCheck className="w-4 h-4 text-[#059669]" />
            <span>Private · No files uploaded</span>
          </div>
        </div>
      </div>

      {/* Dismissible Error Alert */}
      {errors.length > 0 && (
        <div
          role="alert"
          className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 sm:p-5 flex items-start justify-between gap-4"
        >
          <div className="flex items-start gap-3 min-w-0">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h2 className="text-[14px] font-bold text-red-900">
                {errors.length === 1
                  ? 'File validation notice'
                  : `${errors.length} validation notices`}
              </h2>
              <ul className="mt-1.5 space-y-1 text-[13px] text-red-700 list-disc pl-4">
                {errors.map((err, idx) => (
                  <li key={`${err}-${idx}`}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setErrors([])}
            aria-label="Dismiss error messages"
            className="w-9 h-9 inline-flex items-center justify-center rounded-xl text-red-600 hover:bg-white transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Dropzone & Reorderable Queue */}
        <div className="lg:col-span-8 space-y-6">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            multiple
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                void handleFilesAdded(e.target.files);
                e.target.value = '';
              }
            }}
            className="sr-only"
            aria-label="Select PDF files to merge"
          />

          {/* Dropzone */}
          <div
            role="button"
            tabIndex={0}
            aria-label="Drop PDF files here or press Enter to browse from your device"
            onClick={() => {
              if (!isMerging) fileInputRef.current?.click();
            }}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && !isMerging) {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragOver={handleDropzoneDragOver}
            onDragLeave={handleDropzoneDragLeave}
            onDrop={handleDropzoneDrop}
            className={`relative rounded-3xl border-2 border-dashed transition-all duration-150 px-6 py-10 sm:py-12 text-center cursor-pointer ${
              isMerging
                ? 'border-[#E2E8F0] bg-[#F8FAFC] cursor-not-allowed opacity-70'
                : isDragOverDropzone
                  ? 'border-[#2563EB] bg-[#EFF6FF]'
                  : 'border-[#CBD5E1] bg-white hover:border-[#2563EB] hover:bg-[#EFF6FF]/40'
            }`}
          >
            <div className="mx-auto w-14 h-14 rounded-2xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center mb-4 shadow-xs">
              <Upload className="w-6 h-6" strokeWidth={1.8} />
            </div>
            <p className="font-display text-[16px] font-bold text-[#0F172A]">
              {isDragOverDropzone
                ? 'Release to add PDF documents'
                : 'Drop PDF files here, or browse from your device'}
            </p>
            <p className="mt-1.5 text-[13px] text-[#475569]">
              Select multiple PDFs · Up to {MAX_FILES_IN_BATCH} files · 100 MB
              per file · 250 MB total
            </p>
            <div className="mt-5">
              <span className="inline-flex items-center justify-center px-5 py-2.5 min-h-[42px] text-[13px] font-semibold text-white bg-[#2563EB] rounded-xl shadow-sm shadow-[#2563EB]/25">
                Select PDF Files
              </span>
            </div>
          </div>

          {/* Document Queue */}
          {items.length > 0 ? (
            <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
              {/* Queue Toolbar */}
              <div className="px-4 sm:px-6 py-4 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
                <div className="text-[13px] text-[#0F172A] font-semibold tabular-nums">
                  <span>
                    {items.length} {items.length === 1 ? 'document' : 'documents'}
                  </span>
                  <span className="mx-2 text-[#2563EB]" aria-hidden="true">
                    ·
                  </span>
                  <span>
                    {summary.totalPages}{' '}
                    {summary.totalPages === 1 ? 'page' : 'pages'}
                  </span>
                  <span className="mx-2 text-[#2563EB]" aria-hidden="true">
                    ·
                  </span>
                  <span>{formatBytes(summary.totalSize)}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={isMerging}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[36px] text-[12px] font-semibold text-[#0F172A] bg-white border border-[#E2E8F0] rounded-xl hover:border-[#2563EB] hover:text-[#1D4ED8] disabled:opacity-50 cursor-pointer whitespace-nowrap transition-colors"
                  >
                    <FilePlus2 className="w-3.5 h-3.5" />
                    <span>Add More</span>
                  </button>

                  {items.length > 1 && (
                    <>
                      <button
                        type="button"
                        disabled={isMerging}
                        onClick={handleSortAlphabetically}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[36px] text-[12px] font-semibold text-[#0F172A] bg-white border border-[#E2E8F0] rounded-xl hover:border-[#2563EB] hover:text-[#1D4ED8] disabled:opacity-50 cursor-pointer whitespace-nowrap transition-colors"
                        title="Sort files alphabetically A–Z"
                      >
                        <ArrowUpDown className="w-3.5 h-3.5" />
                        <span>Sort A–Z</span>
                      </button>
                      <button
                        type="button"
                        disabled={isMerging}
                        onClick={handleReverseOrder}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[36px] text-[12px] font-semibold text-[#0F172A] bg-white border border-[#E2E8F0] rounded-xl hover:border-[#2563EB] hover:text-[#1D4ED8] disabled:opacity-50 cursor-pointer whitespace-nowrap transition-colors"
                        title="Reverse current file order"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reverse</span>
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    disabled={isMerging}
                    onClick={handleClearAll}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[36px] text-[12px] font-semibold text-red-600 bg-white border border-red-200 rounded-xl hover:bg-red-50 disabled:opacity-50 cursor-pointer whitespace-nowrap transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All</span>
                  </button>
                </div>
              </div>

              {/* Ordered File Rows */}
              <ul
                aria-label="Ordered PDF queue"
                className="divide-y divide-[#F1F5F9]"
              >
                {items.map((item, idx) => {
                  const isDragged = draggedRowId === item.id;
                  const isDragTarget = dragOverRowId === item.id;
                  const isError = item.status === 'error';

                  return (
                    <li
                      key={item.id}
                      draggable={!isMerging}
                      onDragStart={(e) => handleRowDragStart(e, item.id)}
                      onDragOver={(e) => handleRowDragOver(e, item.id)}
                      onDrop={(e) => handleRowDrop(e, item.id)}
                      onDragEnd={handleRowDragEnd}
                      className={`px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors duration-150 ${
                        isError
                          ? 'bg-red-50/75'
                          : isDragTarget
                            ? 'bg-[#EFF6FF] ring-1 ring-inset ring-[#2563EB]'
                            : isDragged
                              ? 'opacity-50 bg-[#F8FAFC]'
                              : 'hover:bg-[#F8FAFC]/80'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="hidden sm:inline-flex items-center justify-center text-[#94A3B8] cursor-grab active:cursor-grabbing shrink-0"
                          title="Drag to reorder"
                          aria-hidden="true"
                        >
                          <GripVertical className="w-4 h-4" />
                        </span>

                        <span className="font-mono tabular-nums text-[12px] font-bold text-[#2563EB] w-6 shrink-0">
                          {String(idx + 1).padStart(2, '0')}
                        </span>

                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            isError
                              ? 'bg-red-100 text-red-600'
                              : 'bg-[#EFF6FF] text-[#2563EB]'
                          }`}
                        >
                          {item.status === 'validating' ? (
                            <Loader2 className="w-4 h-4 animate-spin text-[#2563EB]" />
                          ) : isError ? (
                            <AlertCircle className="w-4 h-4" />
                          ) : (
                            <FileText className="w-4 h-4" strokeWidth={1.8} />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p
                            className="text-[14px] font-semibold text-[#0F172A] truncate"
                            title={item.name}
                          >
                            {item.name}
                          </p>
                          {isError ? (
                            <p className="text-[12px] text-red-600 mt-0.5">
                              {item.errorMessage}
                            </p>
                          ) : (
                            <p className="text-[12px] text-[#475569] font-mono tabular-nums mt-0.5">
                              {formatPageCount(item.pageCount)} ·{' '}
                              {formatBytes(item.size)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={isMerging || idx === 0}
                          onClick={() => moveItem(idx, -1)}
                          aria-label={`Move ${item.name} up`}
                          title="Move up"
                          className="w-10 h-10 inline-flex items-center justify-center rounded-xl text-[#0F172A] hover:bg-[#F1F5F9] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={isMerging || idx === items.length - 1}
                          onClick={() => moveItem(idx, 1)}
                          aria-label={`Move ${item.name} down`}
                          title="Move down"
                          className="w-10 h-10 inline-flex items-center justify-center rounded-xl text-[#0F172A] hover:bg-[#F1F5F9] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={isMerging}
                          onClick={() => removeItem(item.id)}
                          aria-label={`Remove ${item.name}`}
                          title="Remove file"
                          className="w-10 h-10 inline-flex items-center justify-center rounded-xl text-[#475569] hover:text-red-600 hover:bg-red-50 disabled:opacity-30 transition-colors cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-6 text-center">
              <p className="text-[14px] font-semibold text-[#0F172A]">
                No documents queued yet
              </p>
              <p className="text-[13px] text-[#475569] mt-1">
                Add at least two PDF files above to arrange their sequence and
                assemble a combined document.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Merge Summary & Output Panel */}
        <aside className="lg:col-span-4 bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-6 shadow-[0_12px_32px_-16px_rgba(15,23,42,0.12)] lg:sticky lg:top-24">
          <div>
            <h2 className="font-display text-[20px] font-bold text-[#0F172A] leading-tight">
              Document Assembly
            </h2>
            <p className="text-[13px] text-[#475569] mt-1">
              Files are combined sequentially from 01 to{' '}
              {String(Math.max(items.length, 2)).padStart(2, '0')}.
            </p>
          </div>

          <div>
            <label
              htmlFor="output-filename"
              className="block text-[13px] font-semibold text-[#0F172A] mb-2"
            >
              Output Filename
            </label>
            <div className="flex items-center border border-[#CBD5E1] rounded-xl bg-[#F8FAFC] focus-within:border-[#2563EB] focus-within:bg-white transition-colors overflow-hidden">
              <input
                id="output-filename"
                type="text"
                disabled={isMerging}
                value={outputName}
                onChange={(e) => setOutputName(e.target.value)}
                placeholder="vellum-merged-document"
                className="w-full px-3.5 py-2.5 text-[14px] text-[#0F172A] bg-transparent focus:outline-none min-w-0"
              />
              <span className="px-3 py-2.5 text-[13px] font-mono text-[#475569] bg-[#E2E8F0]/60 border-l border-[#CBD5E1] shrink-0">
                .pdf
              </span>
            </div>
          </div>

          <dl className="py-4 border-y border-[#F1F5F9] space-y-2.5 text-[13px]">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-[#475569]">Queued PDFs</dt>
              <dd className="font-mono tabular-nums font-semibold text-[#0F172A]">
                {items.length} / {MAX_FILES_IN_BATCH}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-[#475569]">Combined Pages</dt>
              <dd className="font-mono tabular-nums font-semibold text-[#0F172A]">
                {summary.totalPages}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-[#475569]">Estimated Input Size</dt>
              <dd className="font-mono tabular-nums font-semibold text-[#0F172A]">
                {formatBytes(summary.totalSize)}
              </dd>
            </div>
          </dl>

          {isMerging && mergeProgress && (
            <BatchProgressPanel
              title="Merging PDFs locally..."
              progress={mergeProgress}
              unitLabel="files"
              onCancel={handleCancelMerge}
              cancelLabel="Cancel Merge"
            />
          )}

          {mergedOutput && !isMerging && (
            <div
              role="status"
              aria-live="polite"
              className="p-4 bg-[#EFF6FF]/75 border border-[#BFDBFE] rounded-2xl space-y-4"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#059669] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <h3 className="text-[14px] font-bold text-[#0F172A]">
                    Merged PDF Ready
                  </h3>
                  <p className="text-[12px] text-[#475569] font-mono tabular-nums mt-0.5">
                    {mergedOutput.totalPages} pages ·{' '}
                    {formatBytes(mergedOutput.sizeBytes)} ·{' '}
                    {formatDuration(mergedOutput.durationMs)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownloadMerged}
                className="w-full min-h-[46px] px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[14px] font-semibold rounded-xl shadow-md shadow-[#2563EB]/25 transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Merged PDF</span>
              </button>

              {onChainToTool && (
                <div className="pt-3 border-t border-[#BFDBFE] space-y-2">
                  <p className="text-[11px] font-mono font-semibold text-[#475569]">
                    Send output directly to next tool
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        { id: 'compress-pdf', label: 'Compress' },
                        { id: 'sign-pdf', label: 'Sign PDF' },
                        { id: 'watermark-pdf', label: 'Watermark' },
                        { id: 'ai-summarizer', label: 'AI Brief' },
                      ] as { id: ToolId; label: string }[]
                    ).map((target) => (
                      <button
                        key={target.id}
                        type="button"
                        onClick={() =>
                          onChainToTool(
                            mergedOutput.url,
                            mergedOutput.fileName,
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

              <button
                type="button"
                onClick={handleClearAll}
                className="w-full min-h-[38px] px-3 py-1.5 text-[12px] font-semibold text-[#475569] hover:text-[#0F172A] transition-colors cursor-pointer"
              >
                Start a New Batch
              </button>
            </div>
          )}

          {!mergedOutput && !isMerging && (
            <div className="space-y-3">
              <button
                type="button"
                disabled={!canMerge}
                onClick={handleStartMerge}
                className="w-full min-h-[48px] px-5 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[14px] font-semibold rounded-xl shadow-md shadow-[#2563EB]/25 disabled:bg-[#E2E8F0] disabled:text-[#94A3B8] disabled:shadow-none disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {summary.validatingCount > 0
                  ? 'Inspecting PDF files...'
                  : items.length >= 2
                    ? `Merge ${items.length} PDFs`
                    : 'Merge PDFs'}
              </button>

              <p className="text-[12px] text-[#475569] leading-relaxed">
                {summary.errorCount > 0
                  ? 'Remove files marked with validation errors above before merging.'
                  : items.length === 0
                    ? 'Add 2 or more PDF files to begin.'
                    : items.length === 1
                      ? 'Add at least 1 more PDF file to enable merging.'
                      : 'Drag rows or use the arrow buttons to finalize page sequence.'}
              </p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
};
