import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Copy,
  Download,
  FileText,
  Loader2,
  MessageSquareText,
  Send,
  ShieldAlert,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { formatBytes } from '../utils/formatters';
import { useGlobalTaskProgress } from '../utils/globalProgress';
import { extractPdfTextLocally } from '../utils/pdfjsSetup';
import { validatePdfFile } from '../utils/pdfValidation';

export type AiWorkspaceMode = 'summarize' | 'chat';

interface AiPdfWorkspaceProps {
  mode: AiWorkspaceMode;
  initialFiles?: File[];
  onConsumeInitialFiles?: () => void;
  onBackToTools: () => void;
}

type SummaryFocus = 'executive' | 'bullet-points' | 'action-items';

interface SummaryResult {
  title: string;
  overview: string;
  keyPoints: string[];
  actionItems: string[];
  suggestedQuestions: string[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

export const AiPdfWorkspace: React.FC<AiPdfWorkspaceProps> = ({
  mode,
  initialFiles,
  onConsumeInitialFiles,
  onBackToTools,
}) => {
  const [activeTab, setActiveTab] = useState<AiWorkspaceMode>(mode);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [pageCount, setPageCount] = useState<number>(0);
  const [extractedPages, setExtractedPages] = useState<number>(0);
  const [isExtracting, setIsExtracting] = useState(false);

  // Summarizer state
  const [summaryFocus, setSummaryFocus] = useState<SummaryFocus>('executive');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryResult, setSummaryResult] = useState<SummaryResult | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);

  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useGlobalTaskProgress(
    isExtracting || isSummarizing || isChatting,
    isExtracting
      ? 'Extracting text from PDF...'
      : isSummarizing
        ? 'Generating AI summary...'
        : 'Analyzing PDF question...',
    { indeterminate: true }
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setActiveTab(mode);
  }, [mode]);

  const resetFile = useCallback(() => {
    setSourceFile(null);
    setExtractedText('');
    setPageCount(0);
    setExtractedPages(0);
    setSummaryResult(null);
    setMessages([]);
    setError(null);
  }, []);

  const loadPdfFile = useCallback(async (file: File) => {
    setError(null);
    setSummaryResult(null);
    setMessages([]);

    const check = await validatePdfFile(file);
    if (!check.valid) {
      setError(check.reason ?? 'Invalid PDF file.');
      return;
    }

    setIsExtracting(true);
    try {
      const buffer = await file.arrayBuffer();
      const result = await extractPdfTextLocally(buffer, 135000);
      setSourceFile(file);
      setExtractedText(result.text);
      setPageCount(result.pageCount);
      setExtractedPages(result.extractedPages);

      if (!result.text) {
        setError(
          `"${file.name}" has ${result.pageCount} pages, but no selectable text was detected. Scanned image-only PDFs require OCR before AI text analysis.`
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : '';
      if (msg.includes('encrypted') || msg.includes('password')) {
        setError(
          `"${file.name}" is encrypted or password-protected. Please unlock it first.`
        );
      } else {
        setError(`"${file.name}" could not be read for text extraction.`);
      }
    } finally {
      setIsExtracting(false);
    }
  }, []);

  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      const f = initialFiles[0];
      onConsumeInitialFiles?.();
      void loadPdfFile(f);
    }
  }, [initialFiles, loadPdfFile, onConsumeInitialFiles]);

  const postAiJson = async <T,>(
    endpoint: string,
    body: Record<string, unknown>,
    fallbackError: string
  ): Promise<T> => {
    const res = await fetch(endpoint, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    const contentType = res.headers.get('content-type') || '';
    const rawText = await res.text();
    const trimmed = rawText.trim();
    const looksLikeHtml =
      contentType.toLowerCase().includes('text/html') ||
      /^<!doctype\b|^<html\b|^</i.test(trimmed);

    if (looksLikeHtml) {
      if (res.status === 502 || res.status === 503 || res.status === 504) {
        throw new Error(
          'The AI server timed out or is temporarily unavailable. Please try again in a moment.'
        );
      }
      throw new Error(
        'The AI API route returned HTML instead of JSON. Please reload the preview so the backend server session reconnects, then try again.'
      );
    }

    let payload: Record<string, unknown> | null = null;
    if (trimmed) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object') {
          payload = parsed as Record<string, unknown>;
        }
      } catch {
        throw new Error(
          res.ok
            ? 'Received an unexpected response format from the AI service. Please try again.'
            : `${fallbackError} (HTTP ${res.status}).`
        );
      }
    }

    if (!res.ok) {
      const serverMsg =
        typeof payload?.error === 'string' && payload.error.trim()
          ? payload.error.trim()
          : `${fallbackError} (HTTP ${res.status}).`;
      throw new Error(serverMsg);
    }

    if (!payload) {
      throw new Error('The AI service returned an empty response. Please try again.');
    }

    return payload as T;
  };

  const handleGenerateSummary = async () => {
    if (!sourceFile || !extractedText) return;
    setError(null);
    setIsSummarizing(true);

    try {
      const payload = await postAiJson<SummaryResult>(
        '/api/ai/summarize',
        {
          fileName: sourceFile.name,
          pageCount,
          mode: summaryFocus,
          text: extractedText,
        },
        'Failed to generate summary'
      );
      setSummaryResult(payload);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to reach AI summary service.'
      );
    } finally {
      setIsSummarizing(false);
    }
  };

  const sendChatQuestion = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!sourceFile || !extractedText || !trimmed || isChatting) return;

    setError(null);
    const userMessage: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      text: trimmed,
    };
    const nextHistory = [...messages, userMessage];
    setMessages(nextHistory);
    setChatInput('');
    setIsChatting(true);

    try {
      const payload = await postAiJson<{ reply?: string }>(
        '/api/ai/chat',
        {
          fileName: sourceFile.name,
          text: extractedText,
          messages: nextHistory.map((m) => ({ role: m.role, text: m.text })),
        },
        'Failed to answer question'
      );
      setMessages((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          role: 'assistant',
          text: String(payload.reply || ''),
        },
      ]);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
      setChatInput(trimmed);
      setError(
        err instanceof Error ? err.message : 'Unable to reach AI chat service.'
      );
    } finally {
      setIsChatting(false);
    }
  };

  const formatSummaryPlaintext = (s: SummaryResult) => {
    const lines = [
      s.title,
      '',
      'OVERVIEW',
      s.overview,
      '',
      'KEY POINTS',
      ...s.keyPoints.map((pt) => `- ${pt}`),
    ];
    if (s.actionItems.length > 0) {
      lines.push('', 'ACTION ITEMS', ...s.actionItems.map((it) => `- ${it}`));
    }
    return lines.join('\n');
  };

  const handleCopySummary = async () => {
    if (!summaryResult) return;
    await navigator.clipboard.writeText(formatSummaryPlaintext(summaryResult));
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 1800);
  };

  const handleDownloadSummaryTxt = () => {
    if (!summaryResult || !sourceFile) return;
    const blob = new Blob([formatSummaryPlaintext(summaryResult)], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sourceFile.name.replace(/\.pdf$/i, '')}-summary.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isSummarize = activeTab === 'summarize';

  return (
    <section
      aria-labelledby="ai-pdf-heading"
      className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14"
    >
      <div className="mb-7 pb-7 border-b border-[#E2E8F0]">
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
            <p className="font-mono text-[12px] font-semibold text-[#7C3AED] mb-2">
              {isSummarize
                ? 'AI Tools · Structured Summary'
                : 'AI Tools · Document Q&A'}
            </p>
            <h1
              id="ai-pdf-heading"
              className="font-display text-[32px] sm:text-[42px] font-extrabold text-[#0F172A] leading-[1.1] tracking-tight"
            >
              {isSummarize ? 'AI PDF Summarizer' : 'Chat with PDF'}
            </h1>
            <p className="mt-2 text-[15px] text-[#475569] max-w-2xl">
              {isSummarize
                ? 'Extract readable text on your device and generate executive summaries, key takeaways, and action items.'
                : 'Ask questions about your loaded PDF and receive factual, page-referenced answers.'}
            </p>
          </div>

          <div className="inline-flex p-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('summarize')}
              className={`px-4 py-2 rounded-lg text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                isSummarize
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Summarize</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              className={`px-4 py-2 rounded-lg text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                !isSummarize
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              <MessageSquareText className="w-3.5 h-3.5" />
              <span>Chat Q&amp;A</span>
            </button>
          </div>
        </div>
      </div>

      {/* Explicit Opt-in AI Privacy Disclosure */}
      <div className="mb-6 bg-amber-50/80 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-[13px] leading-relaxed text-[#0F172A]">
          <strong className="font-semibold">Opt-in AI processing:</strong>{' '}
          Your PDF binary stays on your device—text is extracted locally via
          PDF.js. Only when you click <em className="pr-0.5">Generate Summary</em>{' '}
          or send a chat question is that extracted text transmitted securely to
          Vellum&apos;s server-side Gemini route with zero file storage.
        </p>
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
        aria-label="Select a PDF file for AI analysis"
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
            {isExtracting ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Upload className="w-6 h-6" />
            )}
          </div>
          <p className="text-[16px] font-bold text-[#0F172A]">
            {isExtracting
              ? 'Extracting document text locally...'
              : 'Drop a PDF file here to analyze with AI'}
          </p>
          <p className="mt-1.5 text-[13px] text-[#475569]">
            Single PDF up to 100 MB · Text extracted locally before prompting
          </p>
          <div className="mt-5">
            <span className="inline-flex items-center justify-center px-5 py-2.5 min-h-[42px] text-[13px] font-semibold text-white bg-[#2563EB] rounded-xl shadow-sm shadow-[#2563EB]/25">
              Select PDF File
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Loaded File Header */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[15px] font-bold text-[#0F172A] truncate">
                  {sourceFile.name}
                </p>
                <p className="text-[12px] text-[#475569] font-mono tabular-nums">
                  {pageCount} pages ({extractedPages} extracted) ·{' '}
                  {extractedText.length.toLocaleString()} chars ·{' '}
                  {formatBytes(sourceFile.size)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={resetFile}
              className="min-h-[38px] px-4 py-1.5 text-[12px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Change Document</span>
            </button>
          </div>

          {isSummarize ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Control Card */}
              <div className="lg:col-span-4 bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-5 shadow-[0_12px_32px_-16px_rgba(15,23,42,0.12)]">
                <div>
                  <h2 className="font-display text-[19px] font-bold text-[#0F172A]">
                    Summary Focus
                  </h2>
                  <p className="text-[13px] text-[#475569] mt-1">
                    Choose how Gemini structures your document briefing.
                  </p>
                </div>

                <div className="space-y-2.5">
                  {(
                    [
                      {
                        id: 'executive',
                        title: 'Executive Summary',
                        desc: 'Overview, key findings, and action items',
                      },
                      {
                        id: 'bullet-points',
                        title: 'Key Takeaways',
                        desc: 'Concise page-cited bullet points',
                      },
                      {
                        id: 'action-items',
                        title: 'Action Items & Obligations',
                        desc: 'Deadlines, tasks, and responsibilities',
                      },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSummaryFocus(opt.id)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-colors cursor-pointer ${
                        summaryFocus === opt.id
                          ? 'bg-[#EFF6FF] border-[#2563EB]'
                          : 'bg-[#F8FAFC] border-[#E2E8F0] hover:border-[#93C5FD]'
                      }`}
                    >
                      <p className="text-[13px] font-bold text-[#0F172A]">
                        {opt.title}
                      </p>
                      <p className="text-[12px] text-[#475569] mt-0.5">
                        {opt.desc}
                      </p>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={!extractedText || isSummarizing}
                  onClick={handleGenerateSummary}
                  className="w-full min-h-[48px] px-5 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[14px] font-semibold rounded-xl shadow-md shadow-[#2563EB]/25 disabled:bg-[#E2E8F0] disabled:text-[#94A3B8] disabled:shadow-none disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  {isSummarizing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Summarizing Document...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate Summary</span>
                    </>
                  )}
                </button>
              </div>

              {/* Right Summary Result */}
              <div className="lg:col-span-8">
                {summaryResult ? (
                  <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-8 space-y-6 shadow-[0_12px_32px_-16px_rgba(15,23,42,0.08)]">
                    <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-[#E2E8F0]">
                      <div>
                        <span className="font-mono text-[11px] font-semibold text-[#7C3AED]">
                          Gemini Document Brief
                        </span>
                        <h3 className="font-display text-[22px] font-extrabold text-[#0F172A] mt-1">
                          {summaryResult.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleCopySummary}
                          className="min-h-[38px] px-3.5 py-1.5 text-[12px] font-semibold text-[#0F172A] bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#EFF6FF] hover:text-[#1D4ED8] hover:border-[#BFDBFE] rounded-xl inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          {copiedSummary ? (
                            <Check className="w-3.5 h-3.5 text-[#059669]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>{copiedSummary ? 'Copied' : 'Copy'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadSummaryTxt}
                          className="min-h-[38px] px-3.5 py-1.5 text-[12px] font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Save .TXT</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-mono text-[12px] font-semibold text-[#475569] mb-2">
                        Executive Overview
                      </h4>
                      <p className="text-[15px] leading-[1.7] text-[#0F172A]">
                        {summaryResult.overview}
                      </p>
                    </div>

                    {summaryResult.keyPoints.length > 0 && (
                      <div>
                        <h4 className="font-mono text-[12px] font-semibold text-[#475569] mb-3">
                          Key Takeaways
                        </h4>
                        <ul className="space-y-2.5">
                          {summaryResult.keyPoints.map((pt, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-3 text-[14px] leading-relaxed text-[#0F172A]"
                            >
                              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#2563EB] shrink-0" />
                              <span>{pt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {summaryResult.actionItems.length > 0 && (
                      <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
                        <h4 className="font-mono text-[12px] font-semibold text-[#0F172A] mb-2.5">
                          Action Items &amp; Obligations
                        </h4>
                        <ul className="space-y-2">
                          {summaryResult.actionItems.map((item, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2.5 text-[13px] text-[#475569]"
                            >
                              <span className="font-mono tabular-nums text-[#2563EB] font-bold">
                                0{i + 1}
                              </span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {summaryResult.suggestedQuestions.length > 0 && (
                      <div className="pt-4 border-t border-[#F1F5F9]">
                        <p className="text-[12px] font-semibold text-[#475569] mb-2.5">
                          Ask a follow-up question in Chat with PDF:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {summaryResult.suggestedQuestions.map((q, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setActiveTab('chat');
                                void sendChatQuestion(q);
                              }}
                              className="text-left px-3.5 py-2 rounded-xl bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[12px] font-semibold text-[#1D4ED8] cursor-pointer transition-colors"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-10 text-center">
                    <div className="mx-auto w-12 h-12 rounded-2xl bg-white border border-[#E2E8F0] text-[#2563EB] flex items-center justify-center mb-3">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <p className="font-display text-[16px] font-bold text-[#0F172A]">
                      Ready to Summarize
                    </p>
                    <p className="text-[13px] text-[#475569] mt-1 max-w-md mx-auto">
                      Click &ldquo;Generate Summary&rdquo; to receive an executive
                      overview, cited takeaways, and suggested follow-up
                      questions.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Chat with PDF Interface */
            <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-[0_12px_32px_-16px_rgba(15,23,42,0.08)]">
              <div className="p-4 sm:p-5 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <MessageSquareText className="w-4 h-4 text-[#2563EB]" />
                  <span className="text-[14px] font-bold text-[#0F172A]">
                    Document Q&amp;A Session
                  </span>
                </div>
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setMessages([])}
                    className="text-[12px] font-semibold text-[#475569] hover:text-red-600 cursor-pointer transition-colors"
                  >
                    Clear Conversation
                  </button>
                )}
              </div>

              <div className="p-4 sm:p-6 min-h-[340px] max-h-[540px] overflow-y-auto space-y-4">
                {messages.length === 0 ? (
                  <div className="py-8 text-center space-y-4">
                    <p className="font-display text-[15px] font-bold text-[#0F172A]">
                      Ask anything about &ldquo;{sourceFile.name}&rdquo;
                    </p>
                    <p className="text-[13px] text-[#475569] max-w-md mx-auto">
                      Answers are strictly grounded in the extracted document
                      text with page references where available.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 pt-2">
                      {[
                        'Summarize the main conclusions of this PDF',
                        'List key dates, numbers, or obligations mentioned',
                        'Are there any risks, caveats, or deadlines?',
                      ].map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          disabled={!extractedText || isChatting}
                          onClick={() => void sendChatQuestion(prompt)}
                          className="px-3.5 py-2 rounded-xl bg-[#F8FAFC] hover:bg-[#EFF6FF] text-[12px] font-semibold text-[#0F172A] hover:text-[#1D4ED8] hover:border-[#BFDBFE] border border-[#E2E8F0] cursor-pointer transition-colors"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed whitespace-pre-wrap ${
                          msg.role === 'user'
                            ? 'bg-[#2563EB] text-white'
                            : 'bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A]'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))
                )}

                {isChatting && (
                  <div className="flex justify-start">
                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl px-4 py-3 inline-flex items-center gap-2 text-[13px] text-[#475569]">
                      <Loader2 className="w-4 h-4 animate-spin text-[#2563EB]" />
                      <span>Analyzing document text...</span>
                    </div>
                  </div>
                )}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void sendChatQuestion(chatInput);
                }}
                className="p-4 border-t border-[#E2E8F0] bg-white flex items-center gap-3"
              >
                <input
                  type="text"
                  disabled={!extractedText || isChatting}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={
                    extractedText
                      ? 'Ask a question about this document...'
                      : 'No selectable text detected in this PDF'
                  }
                  aria-label="Ask a question about this PDF"
                  className="flex-1 min-h-[44px] px-4 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[14px] text-[#0F172A] focus:outline-none focus:bg-white focus:border-[#2563EB]"
                />
                <button
                  type="submit"
                  disabled={!extractedText || !chatInput.trim() || isChatting}
                  className="min-h-[44px] px-5 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-semibold rounded-xl disabled:bg-[#E2E8F0] disabled:text-[#94A3B8] disabled:cursor-not-allowed inline-flex items-center gap-2 cursor-pointer shrink-0 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  <span>Ask</span>
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
