import React from 'react';
import {
  ArrowRight,
  Download,
  FileText,
  FolderOpen,
  Trash2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { ProcessedFileRecord, ToolId } from '../types/pdf';
import { formatBytes } from '../utils/formatters';

interface MyFilesDrawerProps {
  isOpen: boolean;
  files: ProcessedFileRecord[];
  onClose: () => void;
  onRemoveFile: (id: string) => void;
  onClearAll: () => void;
  onChainToTool?: (url: string, fileName: string, targetToolId: ToolId) => void;
}

const CHAIN_TARGETS: { id: ToolId; label: string }[] = [
  { id: 'compress-pdf', label: 'Compress' },
  { id: 'sign-pdf', label: 'Sign' },
  { id: 'split-pdf', label: 'Split' },
  { id: 'ai-summarizer', label: 'AI Brief' },
];

export const MyFilesDrawer: React.FC<MyFilesDrawerProps> = ({
  isOpen,
  files,
  onClose,
  onRemoveFile,
  onClearAll,
  onChainToTool,
}) => {
  const handleDownload = (file: ProcessedFileRecord) => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby="my-files-title"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-[#0B1120]/50 backdrop-blur-[2px]"
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 34 }}
            className="relative z-10 w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-200"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center">
                  <FolderOpen className="w-4 h-4" />
                </div>
                <div>
                  <h2
                    id="my-files-title"
                    className="font-display text-[17px] font-bold text-[#0B1120]"
                  >
                    My Files
                  </h2>
                  <p className="text-[12px] text-slate-500">
                    Local outputs from this browser session
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close My Files"
                className="w-10 h-10 inline-flex items-center justify-center rounded-xl text-slate-500 hover:text-[#0B1120] hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {files.length > 0 ? (
                <ul className="space-y-3">
                  {files.map((file) => {
                    const isPdf = file.mimeType === 'application/pdf';
                    const chainOptions = isPdf
                      ? CHAIN_TARGETS.filter(
                          (target) => target.id !== file.toolId
                        )
                      : [];

                    return (
                      <li
                        key={file.id}
                        className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-[#2563EB] flex items-center justify-center shrink-0 mt-0.5">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p
                                className="text-[14px] font-semibold text-[#0B1120] truncate"
                                title={file.name}
                              >
                                {file.name}
                              </p>
                              <p className="text-[12px] text-slate-500 mt-0.5">
                                {file.toolName} ·{' '}
                                <span className="font-mono tabular-nums">
                                  {formatBytes(file.sizeBytes)}
                                </span>
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {file.detailText}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleDownload(file)}
                              aria-label={`Download ${file.name}`}
                              title="Download again"
                              className="w-9 h-9 inline-flex items-center justify-center rounded-xl bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors cursor-pointer"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onRemoveFile(file.id)}
                              aria-label={`Remove ${file.name} from session`}
                              title="Remove from session"
                              className="w-9 h-9 inline-flex items-center justify-center rounded-xl text-slate-500 hover:text-red-600 hover:bg-white transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {onChainToTool && chainOptions.length > 0 && (
                          <div className="pt-2.5 border-t border-slate-200 flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] text-slate-500 mr-1">
                              Send to:
                            </span>
                            {chainOptions.map((target) => (
                              <button
                                key={target.id}
                                type="button"
                                onClick={() =>
                                  onChainToTool(file.url, file.name, target.id)
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white hover:bg-[#0B1120] text-slate-800 hover:text-white border border-slate-200 hover:border-[#0B1120] text-[11px] font-medium transition-colors cursor-pointer"
                              >
                                <span>{target.label}</span>
                                <ArrowRight className="w-2.5 h-2.5" />
                              </button>
                            ))}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center px-4 py-12">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center mb-4">
                    <FolderOpen className="w-6 h-6" />
                  </div>
                  <p className="font-display text-[15.5px] font-bold text-[#0B1120]">
                    No processed files yet
                  </p>
                  <p className="text-[13px] text-slate-500 mt-1.5 max-w-xs">
                    Files you merge, split, compress, or convert appear here
                    during your current browser session so you can re-download
                    them easily.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            {files.length > 0 && (
              <div className="px-6 py-4 border-t border-slate-200 bg-[#F8FAFC] flex items-center justify-between gap-4">
                <span className="text-[12px] text-slate-500">
                  Stored in temporary browser memory only
                </span>
                <button
                  type="button"
                  onClick={onClearAll}
                  className="text-[12px] font-semibold text-red-600 hover:underline cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
