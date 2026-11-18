import React, { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  ArrowRight,
  ChevronDown,
  Clock,
  Command,
  FileImage,
  FileText,
  LayoutGrid,
  Loader2,
  PenTool,
  Play,
  Search,
  Sparkles,
  Star,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { EDITORIAL_GUIDES } from '../data/guides';
import { HOME_FAQS } from '../data/siteContent';
import { PDF_TOOLS } from '../data/tools';
import type { GuideSlug, ToolCategory, ToolId } from '../types/pdf';
import { formatBytes } from '../utils/formatters';
import { useGlobalTaskProgress } from '../utils/globalProgress';
import { validateImageFile, validatePdfFile } from '../utils/pdfValidation';
import { AdSlot } from './AdSlot';
import { HeroDocumentStudio } from './HeroDocumentStudio';
import { HowItWorksSection } from './HowItWorksSection';
import {
  RevealSection,
  StaggerGroup,
  StaggerItem,
  VELLUM_EASE,
} from './RevealSection';
import { ToolCard, getToolIcon } from './ToolCard';

type FilterTab = 'All' | ToolCategory | 'Favorites';

interface HomePageProps {
  favoriteIds: ToolId[];
  recentIds: ToolId[];
  onToggleFavorite: (id: ToolId) => void;
  onOpenTool: (id: ToolId, files?: File[]) => void;
  onClearRecent: () => void;
  onOpenDemo: () => void;
  onOpenGuidesIndex: () => void;
  onOpenGuideArticle: (slug: GuideSlug) => void;
  onOpenCommandPalette?: () => void;
}

interface StagedHeroDrop {
  kind: 'pdf' | 'image';
  files: File[];
  summaryTitle: string;
  summaryMeta: string;
}

const FILTER_TABS: { label: string; value: FilterTab }[] = [
  { label: 'All Tools', value: 'All' },
  { label: 'Organize', value: 'Organize' },
  { label: 'Optimize', value: 'Optimize' },
  { label: 'Convert', value: 'Convert' },
  { label: 'Edit & Sign', value: 'Edit & Sign' },
  { label: 'AI Tools', value: 'AI Tools' },
  { label: 'Favorites', value: 'Favorites' },
];

const QUICK_PDF_ROUTES: { id: ToolId; label: string }[] = [
  { id: 'merge-pdf', label: 'Merge PDF' },
  { id: 'organize-pdf', label: 'Organize Pages' },
  { id: 'split-pdf', label: 'Split PDF' },
  { id: 'compress-pdf', label: 'Compress PDF' },
  { id: 'sign-pdf', label: 'Sign PDF' },
  { id: 'pdf-to-jpg', label: 'PDF to JPG' },
];

const PROOF_SPECS = [
  {
    value: '13 Engines',
    label: '100% On-Device',
    detail: 'Core PDF tools run inside your browser',
  },
  {
    value: '0 Bytes',
    label: 'No Cloud Uploads',
    detail: 'Private PDFs never leave your device',
  },
  {
    value: '100 MB',
    label: 'Large Document Support',
    detail: 'Merge up to 20 files at once locally',
  },
  {
    value: 'Free',
    label: 'No Sign-Up Needed',
    detail: 'Clean downloads with zero watermarks',
  },
];

export const HomePage: React.FC<HomePageProps> = ({
  favoriteIds,
  recentIds,
  onToggleFavorite,
  onOpenTool,
  onClearRecent,
  onOpenDemo,
  onOpenGuidesIndex,
  onOpenGuideArticle,
  onOpenCommandPalette,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Interactive Hero Dropzone state
  const [isHeroDragOver, setIsHeroDragOver] = useState(false);
  const [isInspectingHeroFile, setIsInspectingHeroFile] = useState(false);
  const [heroDropError, setHeroDropError] = useState<string | null>(null);
  const [stagedDrop, setStagedDrop] = useState<StagedHeroDrop | null>(null);
  const heroInputRef = useRef<HTMLInputElement | null>(null);

  useGlobalTaskProgress(isInspectingHeroFile, 'Verifying PDF file locally...', {
    indeterminate: true,
  });

  const filteredTools = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return PDF_TOOLS.filter((tool) => {
      if (activeFilter === 'Favorites' && !favoriteIds.includes(tool.id)) {
        return false;
      }
      if (
        activeFilter !== 'All' &&
        activeFilter !== 'Favorites' &&
        tool.category !== activeFilter
      ) {
        return false;
      }

      if (!query) return true;

      return (
        tool.name.toLowerCase().includes(query) ||
        tool.description.toLowerCase().includes(query) ||
        tool.category.toLowerCase().includes(query) ||
        tool.keywords.some((kw) => kw.includes(query))
      );
    });
  }, [activeFilter, favoriteIds, searchQuery]);

  const favoriteTools = useMemo(
    () =>
      favoriteIds
        .map((id) => PDF_TOOLS.find((tool) => tool.id === id))
        .filter((tool): tool is NonNullable<typeof tool> => Boolean(tool)),
    [favoriteIds]
  );

  const recentTools = useMemo(
    () =>
      recentIds
        .map((id) => PDF_TOOLS.find((tool) => tool.id === id))
        .filter((tool): tool is NonNullable<typeof tool> => Boolean(tool)),
    [recentIds]
  );

  const handleHeroFiles = async (fileList: FileList | File[]) => {
    const incoming = Array.from(fileList);
    if (incoming.length === 0) return;
    setHeroDropError(null);
    setIsInspectingHeroFile(true);

    try {
      const first = incoming[0];
      const lowerName = first.name.toLowerCase();
      const isLikelyImage =
        first.type.startsWith('image/') ||
        lowerName.endsWith('.jpg') ||
        lowerName.endsWith('.jpeg') ||
        lowerName.endsWith('.png');

      if (isLikelyImage) {
        const validImages: File[] = [];
        for (const f of incoming.slice(0, 20)) {
          const check = await validateImageFile(f);
          if (check.valid) validImages.push(f);
        }
        if (validImages.length === 0) {
          setHeroDropError(
            'Unsupported or oversized image. Please drop JPG or PNG files up to 25 MB.'
          );
          return;
        }
        const totalBytes = validImages.reduce((sum, f) => sum + f.size, 0);
        setStagedDrop({
          kind: 'image',
          files: validImages,
          summaryTitle:
            validImages.length === 1
              ? validImages[0].name
              : `${validImages.length} images selected`,
          summaryMeta: `${formatBytes(totalBytes)} · Ready for JPG to PDF`,
        });
        return;
      }

      const validPdfs: File[] = [];
      for (const f of incoming.slice(0, 20)) {
        const check = await validatePdfFile(f);
        if (check.valid) {
          validPdfs.push(f);
        } else if (incoming.length === 1 && check.reason) {
          setHeroDropError(check.reason);
          return;
        }
      }

      if (validPdfs.length === 0) {
        setHeroDropError(
          'Please drop a valid PDF document or JPG/PNG image.'
        );
        return;
      }

      const primary = validPdfs[0];
      let pageLabel = '';
      if (validPdfs.length === 1) {
        try {
          const [{ PDFDocument }, buf] = await Promise.all([
            import('pdf-lib'),
            primary.arrayBuffer(),
          ]);
          const doc = await PDFDocument.load(buf, { updateMetadata: false });
          const pages = doc.getPageCount();
          pageLabel = `${pages} ${pages === 1 ? 'page' : 'pages'} · `;
        } catch {
          pageLabel = '';
        }
      }

      const totalBytes = validPdfs.reduce((sum, f) => sum + f.size, 0);
      setStagedDrop({
        kind: 'pdf',
        files: validPdfs,
        summaryTitle:
          validPdfs.length === 1
            ? primary.name
            : `${validPdfs.length} PDF files staged`,
        summaryMeta: `${pageLabel}${formatBytes(totalBytes)} · Pick a workspace below`,
      });
    } finally {
      setIsInspectingHeroFile(false);
    }
  };

  return (
    <>
      {/* Hero Section: Luminous Swiss Architectural Canvas + Live Animated Document Workbench */}
      <section
        aria-labelledby="hero-heading"
        className="relative overflow-hidden bg-white text-[#0B1120]"
      >
        {/* Subtle Architectural Grid & Cool Sapphire Atmospheric Wash */}
        <div
          className="absolute inset-0 bg-arch-grid [mask-image:radial-gradient(ellipse_80%_75%_at_50%_20%,#000_55%,transparent_100%)] pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute -top-32 right-[6%] w-[520px] h-[520px] rounded-full bg-blue-600/[0.06] blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-14 sm:pt-14 sm:pb-18">
          <input
            ref={heroInputRef}
            type="file"
            multiple
            accept=".pdf,application/pdf,.jpg,.jpeg,.png,image/jpeg,image/png"
            onChange={(e) => {
              if (e.target.files) {
                void handleHeroFiles(e.target.files);
                e.target.value = '';
              }
            }}
            className="sr-only"
            aria-label="Drop PDF or image files to route to a tool"
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            {/* Left Column: Clear Value Proposition + Dominant Focal Dropzone */}
            <div className="lg:col-span-6 flex flex-col justify-center">
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.42, ease: VELLUM_EASE }}
                className="text-[13.5px] font-semibold text-[#2563EB] mb-3.5"
              >
                Private browser PDF workspace · Zero uploads
              </motion.p>

              <motion.h1
                id="hero-heading"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.48, delay: 0.05, ease: VELLUM_EASE }}
                className="font-display text-[36px] sm:text-[48px] lg:text-[54px] font-bold text-[#0B1120] leading-[1.06] tracking-[-0.036em]"
              >
                Edit, compress &amp; sign PDFs{' '}
                <span className="text-[#2563EB]">
                  directly on your device.
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.46, delay: 0.11, ease: VELLUM_EASE }}
                className="mt-5 text-[16px] sm:text-[17px] leading-[1.65] text-slate-600 max-w-[50ch]"
              >
                Merge, split, compress, sign, convert, and analyze documents
                inside your browser with instant local exports—no accounts, no
                wait queues, and no watermarks.
              </motion.p>

              {/* Single Dominant Focal Dropzone Card */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.46, delay: 0.17, ease: VELLUM_EASE }}
                className="mt-7"
              >
                <div className="rounded-2xl bg-white border border-slate-200/95 shadow-[0_24px_60px_-28px_rgba(11,17,32,0.18)] p-3.5 sm:p-4">
                  <AnimatePresence mode="wait" initial={false}>
                    {!stagedDrop ? (
                      <motion.div
                        key="hero-drop-idle"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.2, ease: VELLUM_EASE }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsHeroDragOver(true);
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          setIsHeroDragOver(false);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsHeroDragOver(false);
                          if (e.dataTransfer.files) {
                            void handleHeroFiles(e.dataTransfer.files);
                          }
                        }}
                        className={`rounded-xl border border-dashed transition-all duration-200 p-4 sm:p-5 ${
                          isHeroDragOver
                            ? 'border-[#2563EB] bg-blue-50/75 scale-[1.005]'
                            : 'border-slate-300/90 bg-[#F8FAFC] hover:border-blue-400 hover:bg-blue-50/30'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-start gap-3.5 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-[#2563EB] flex items-center justify-center shrink-0">
                              {isInspectingHeroFile ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                <UploadCloud className="w-5 h-5" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-display text-[15px] font-bold text-[#0B1120] leading-snug">
                                {isInspectingHeroFile
                                  ? 'Verifying file headers locally...'
                                  : 'Drop a PDF or image to begin'}
                              </p>
                              <p className="text-[12.5px] text-slate-500 mt-0.5">
                                Stays in browser memory · Instant routing to any
                                tool
                              </p>
                            </div>
                          </div>

                          <motion.button
                            type="button"
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.98 }}
                            transition={{
                              type: 'spring',
                              stiffness: 460,
                              damping: 28,
                            }}
                            onClick={() => heroInputRef.current?.click()}
                            className="min-h-[44px] px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13.5px] font-semibold rounded-lg shadow-[0_10px_24px_-8px_rgba(37,99,235,0.6)] transition-colors duration-150 inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                          >
                            <span>Select File</span>
                            <ArrowRight className="w-4 h-4" />
                          </motion.button>
                        </div>

                        <div className="mt-4 pt-3.5 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-[12.5px]">
                          <span className="text-slate-500">
                            Supports PDF, JPG, and PNG up to{' '}
                            <span className="font-mono tabular-nums font-medium text-slate-700">
                              100 MB
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={onOpenDemo}
                            className="inline-flex items-center gap-1.5 font-semibold text-[#0B1120] hover:text-[#2563EB] transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <Play className="w-3.5 h-3.5 fill-[#2563EB] text-[#2563EB]" />
                            <span>Interactive Tour</span>
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="hero-drop-staged"
                        initial={{ opacity: 0, scale: 0.98, y: 6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: -6 }}
                        transition={{ duration: 0.22, ease: VELLUM_EASE }}
                        className="rounded-xl bg-[#F8FAFC] border border-blue-200 p-4 space-y-3.5"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-blue-100 text-[#1D4ED8] flex items-center justify-center shrink-0">
                              {stagedDrop.kind === 'pdf' ? (
                                <FileText className="w-4 h-4" />
                              ) : (
                                <FileImage className="w-4 h-4" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13.5px] font-bold text-[#0B1120] truncate">
                                {stagedDrop.summaryTitle}
                              </p>
                              <p className="text-[11.5px] font-mono text-slate-500 tabular-nums truncate">
                                {stagedDrop.summaryMeta}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setStagedDrop(null);
                              setHeroDropError(null);
                            }}
                            aria-label="Clear staged files"
                            className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-[#0B1120] hover:bg-slate-200/70 cursor-pointer shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {stagedDrop.kind === 'image' ? (
                          <button
                            type="button"
                            onClick={() => {
                              const files = stagedDrop.files;
                              setStagedDrop(null);
                              onOpenTool('jpg-to-pdf', files);
                            }}
                            className="w-full min-h-[42px] px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-semibold rounded-lg inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
                          >
                            <span>Convert Images to PDF</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {(stagedDrop.files.length > 1
                              ? QUICK_PDF_ROUTES.slice(0, 2)
                              : QUICK_PDF_ROUTES
                            ).map((route) => {
                              const Icon = getToolIcon(route.id);
                              return (
                                <button
                                  key={route.id}
                                  type="button"
                                  onClick={() => {
                                    const files = stagedDrop.files;
                                    setStagedDrop(null);
                                    onOpenTool(route.id, files);
                                  }}
                                  className="group min-h-[38px] px-3 py-1.5 rounded-lg bg-white hover:bg-[#2563EB] border border-slate-200 hover:border-[#2563EB] text-[12px] font-semibold text-slate-800 hover:text-white flex items-center gap-2 transition-colors cursor-pointer text-left"
                                >
                                  <Icon className="w-3.5 h-3.5 text-[#2563EB] group-hover:text-white shrink-0" />
                                  <span className="truncate">{route.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {heroDropError && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.18 }}
                        role="alert"
                        className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2 text-[12.5px] font-medium text-red-700"
                      >
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{heroDropError}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* Quiet Unboxed Trust Metadata Line */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.45, delay: 0.25, ease: VELLUM_EASE }}
                className="mt-5 text-[13px] text-slate-500 flex flex-wrap items-center gap-x-2.5 gap-y-1"
              >
                <span>Zero server uploads</span>
                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>
                <span>Offline PWA ready</span>
                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>
                <span>No sign-up or watermarks</span>
              </motion.p>
            </div>

            {/* Right Column: Live Animated Interactive Document Studio */}
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.56, delay: 0.1, ease: VELLUM_EASE }}
              className="lg:col-span-6"
            >
              <HeroDocumentStudio onOpenTool={onOpenTool} />
            </motion.div>
          </div>
        </div>

        {/* Full-Width Architectural Proof Rail Directly Below Hero Split */}
        <div className="border-y border-slate-200/80 bg-[#F8FAFC]">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
            <StaggerGroup
              stagger={0.05}
              className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 divide-x divide-slate-200/80"
            >
              {PROOF_SPECS.map((spec) => (
                <StaggerItem key={spec.label} className="py-5 px-4 first:pl-0">
                  <p className="font-mono tabular-nums text-[20px] sm:text-[22px] font-bold text-[#0B1120]">
                    {spec.value}
                  </p>
                  <p className="font-display text-[13.5px] font-semibold text-slate-800 mt-0.5">
                    {spec.label}
                  </p>
                  <p className="text-[12px] text-slate-500 mt-0.5 leading-snug">
                    {spec.detail}
                  </p>
                </StaggerItem>
              ))}
            </StaggerGroup>
          </div>
        </div>
      </section>

      {/* Complete 15-Tool Directory */}
      <section
        id="tools"
        aria-labelledby="tools-heading"
        className="bg-white border-b border-slate-200/80"
      >
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-7">
            <div>
              <p className="text-[13px] font-semibold text-[#2563EB] mb-1.5">
                Document toolkit
              </p>
              <h2
                id="tools-heading"
                className="font-display text-[30px] sm:text-[38px] font-bold text-[#0B1120] leading-[1.1] tracking-[-0.028em]"
              >
                Every PDF tool, ready in one click.
              </h2>
            </div>

            <div className="w-full md:w-[340px]">
              <label htmlFor="tool-search" className="sr-only">
                Search PDF tools
              </label>
              <div className="relative flex items-center">
                <Search
                  className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="tool-search"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search merge, compress, sign, AI..."
                  className="w-full min-h-[42px] pl-10 pr-16 py-2 bg-[#F8FAFC] border border-slate-200 rounded-xl text-[13.5px] text-[#0B1120] placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#2563EB] transition-colors"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search query"
                    className="absolute right-2 w-7 h-7 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-[#0B1120] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : (
                  onOpenCommandPalette && (
                    <button
                      type="button"
                      onClick={onOpenCommandPalette}
                      aria-label="Open quick command palette"
                      title="Open Command Palette (Ctrl+K)"
                      className="absolute right-2 inline-flex items-center gap-0.5 px-2 py-1 rounded-md bg-white border border-slate-200 text-[11px] font-mono text-slate-500 hover:text-[#2563EB] hover:border-blue-200 transition-colors cursor-pointer"
                    >
                      <Command className="w-3 h-3" />
                      <span>K</span>
                    </button>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Clean Segmented Category Filter Bar with Spring Active Tab */}
          <div className="mb-8 overflow-x-auto pb-1">
            <div
              role="tablist"
              aria-label="Filter PDF tools by category"
              className="inline-flex items-center gap-1 p-1 bg-slate-100/90 border border-slate-200/80 rounded-xl"
            >
              {FILTER_TABS.map((tab) => {
                const isSelected = activeFilter === tab.value;
                const count =
                  tab.value === 'All'
                    ? PDF_TOOLS.length
                    : tab.value === 'Favorites'
                      ? favoriteTools.length
                      : PDF_TOOLS.filter((t) => t.category === tab.value).length;

                return (
                  <button
                    key={tab.value}
                    role="tab"
                    aria-selected={isSelected}
                    type="button"
                    onClick={() => setActiveFilter(tab.value)}
                    className={`relative px-3.5 py-2 min-h-[36px] text-[12.5px] font-semibold rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                      isSelected
                        ? 'text-[#0B1120]'
                        : 'text-slate-600 hover:text-[#0B1120]'
                    }`}
                  >
                    {isSelected && (
                      <motion.span
                        layoutId="tool-filter-pill"
                        transition={{
                          type: 'spring',
                          stiffness: 450,
                          damping: 34,
                        }}
                        className="absolute inset-0 rounded-lg bg-white shadow-xs border border-slate-200/80"
                        aria-hidden="true"
                      />
                    )}
                    <span className="relative z-10">{tab.label}</span>
                    <span
                      className={`relative z-10 ml-1.5 font-mono tabular-nums text-[11px] ${
                        isSelected ? 'text-[#2563EB]' : 'text-slate-400'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {filteredTools.length > 0 ? (
            <motion.div
              key={`${activeFilter}-${searchQuery.trim().toLowerCase()}`}
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: {
                  transition: {
                    staggerChildren: 0.022,
                  },
                },
              }}
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4"
            >
              {filteredTools.map((tool) => (
                <motion.div
                  key={tool.id}
                  variants={{
                    hidden: { opacity: 0, y: 12, scale: 0.985 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      scale: 1,
                      transition: { duration: 0.26, ease: VELLUM_EASE },
                    },
                  }}
                  className="h-full"
                >
                  <ToolCard
                    tool={tool}
                    isFavorite={favoriteIds.includes(tool.id)}
                    onToggleFavorite={onToggleFavorite}
                    onOpenTool={onOpenTool}
                  />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: VELLUM_EASE }}
              className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-10 text-center"
            >
              <p className="font-display text-[17px] font-bold text-[#0B1120]">
                No tools match your current filter
              </p>
              <p className="text-[13.5px] text-slate-600 mt-1.5">
                {activeFilter === 'Favorites'
                  ? 'You have not pinned any favorite tools yet. Click the star icon on any tool card to pin it here.'
                  : 'Try adjusting your search keywords or switching back to all tools.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveFilter('All');
                }}
                className="mt-5 min-h-[40px] px-5 py-2 text-[13px] font-semibold text-white bg-[#0B1120] hover:bg-[#2563EB] rounded-lg transition-colors cursor-pointer"
              >
                Reset Search &amp; Filters
              </button>
            </motion.div>
          )}

          {/* Compact Architectural Recent & Favorites Strip */}
          <div
            id="favorites"
            className="mt-10 pt-10 border-t border-slate-200/80 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5"
          >
            <div className="rounded-2xl bg-[#F8FAFC] border border-slate-200/90 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200/80 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#2563EB]" />
                  <h3 className="font-display text-[14px] font-bold text-[#0B1120]">
                    Recent Tools
                  </h3>
                </div>
                {recentTools.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearRecent}
                    className="inline-flex items-center gap-1 text-[12px] font-medium text-slate-500 hover:text-red-600 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              {recentTools.length > 0 ? (
                <ul className="divide-y divide-slate-200/70 px-5">
                  {recentTools.map((tool) => (
                    <li
                      key={tool.id}
                      className="py-3 flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <p className="font-display text-[14px] font-semibold text-[#0B1120] truncate">
                          {tool.name}
                        </p>
                        <p className="text-[12px] text-slate-500 truncate">
                          {tool.category} · {tool.capabilityNote}
                        </p>
                      </div>
                      <a
                        href={`/${tool.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          onOpenTool(tool.id);
                        }}
                        className="min-h-[34px] px-3.5 py-1 inline-flex items-center text-[12px] font-semibold text-[#0B1120] bg-white border border-slate-200 hover:border-[#2563EB] hover:text-[#2563EB] rounded-lg transition-colors shrink-0"
                      >
                        Open
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 py-6 text-[13px] text-slate-500">
                  Recently launched workspaces appear here automatically inside
                  your local browser storage.
                </p>
              )}
            </div>

            <div className="rounded-2xl bg-[#F8FAFC] border border-slate-200/90 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200/80 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-[#2563EB] fill-[#2563EB]" />
                  <h3 className="font-display text-[14px] font-bold text-[#0B1120]">
                    Pinned Favorites
                  </h3>
                </div>
                <span className="font-mono tabular-nums text-[11.5px] text-slate-500">
                  {favoriteTools.length} pinned
                </span>
              </div>

              {favoriteTools.length > 0 ? (
                <ul className="divide-y divide-slate-200/70 px-5">
                  {favoriteTools.map((tool) => (
                    <li
                      key={tool.id}
                      className="py-3 flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <p className="font-display text-[14px] font-semibold text-[#0B1120] truncate">
                          {tool.name}
                        </p>
                        <p className="text-[12px] text-slate-500 truncate">
                          {tool.category} · {tool.capabilityNote}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={`/${tool.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            onOpenTool(tool.id);
                          }}
                          className="min-h-[34px] px-3.5 py-1 inline-flex items-center text-[12px] font-semibold text-white bg-[#0B1120] hover:bg-[#2563EB] rounded-lg transition-colors"
                        >
                          Open
                        </a>
                        <button
                          type="button"
                          onClick={() => onToggleFavorite(tool.id)}
                          aria-label={`Remove ${tool.name} from favorites`}
                          className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-[#2563EB] hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <Star className="w-4 h-4 fill-[#2563EB]" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 py-6 text-[13px] text-slate-500">
                  Star any tool card above to keep your everyday workflows
                  pinned for one-click access.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Asymmetric Flagship Capabilities Bento */}
      <section className="bg-[#F8FAFC] border-b border-slate-200/80">
        <RevealSection className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-18 sm:py-22">
          <div className="mb-10 max-w-2xl">
            <p className="text-[13px] font-semibold text-[#2563EB] mb-2">
              Flagship workspaces
            </p>
            <h2 className="font-display text-[30px] sm:text-[38px] font-bold text-[#0B1120] leading-[1.1] tracking-[-0.028em]">
              Engineered for high-stakes everyday documents.
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Marquee Obsidian Spotlight */}
            <motion.a
              href="/organize-pdf"
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.99 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              onClick={(e) => {
                e.preventDefault();
                onOpenTool('organize-pdf');
              }}
              className="lg:col-span-7 group text-left p-7 sm:p-8 rounded-2xl bg-[#0B1120] bg-arch-grid-dark text-white border border-slate-800 hover:border-blue-500/60 shadow-[0_24px_60px_-28px_rgba(11,17,32,0.45)] transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-400/30 text-blue-400 flex items-center justify-center">
                    <LayoutGrid className="w-5 h-5" />
                  </div>
                  <span className="text-[12px] font-mono text-slate-400">
                    Up to 60 pages · Visual canvas
                  </span>
                </div>
                <h3 className="font-display text-[23px] sm:text-[26px] font-bold text-white tracking-[-0.024em] leading-snug">
                  Visual Page Studio &amp; Precision Compression
                </h3>
                <p className="mt-3 text-[14.5px] sm:text-[15.5px] leading-relaxed text-slate-300 max-w-xl">
                  Inspect crisp local canvas thumbnails to drag-reorder pages,
                  fix sideways scans with lossless 90° rotations, remove blank
                  sheets, and export compact packets in one pass.
                </p>

                <div className="mt-7 pt-5 border-t border-slate-800 grid grid-cols-3 gap-4 font-mono">
                  <div>
                    <p className="text-[15px] font-bold text-white tabular-nums">
                      96–165 DPI
                    </p>
                    <p className="text-[11.5px] text-slate-400 mt-0.5">
                      Quality presets
                    </p>
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-white">Lossless</p>
                    <p className="text-[11.5px] text-slate-400 mt-0.5">
                      Text preserved
                    </p>
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-blue-400">
                      Web Worker
                    </p>
                    <p className="text-[11.5px] text-slate-400 mt-0.5">
                      Non-blocking UI
                    </p>
                  </div>
                </div>
              </div>

              <span className="mt-8 inline-flex items-center gap-2 text-[13.5px] font-semibold text-white">
                <span>Launch Page Studio</span>
                <ArrowRight className="w-4 h-4 text-blue-400 group-hover:translate-x-1 transition-transform" />
              </span>
            </motion.a>

            {/* Stacked Right Architectural Capabilities */}
            <div className="lg:col-span-5 flex flex-col gap-5 justify-between">
              <motion.a
                href="/sign-pdf"
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.99 }}
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                onClick={(e) => {
                  e.preventDefault();
                  onOpenTool('sign-pdf');
                }}
                className="flex-1 group text-left p-6 rounded-2xl bg-white border border-slate-200 hover:border-[#2563EB] hover:shadow-[0_18px_40px_-24px_rgba(37,99,235,0.25)] transition-[border-color,box-shadow] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 group-hover:bg-[#2563EB] text-slate-800 group-hover:text-white flex items-center justify-center transition-colors">
                      <PenTool className="w-4 h-4" />
                    </div>
                    <span className="text-[12px] text-slate-500">
                      On-device editor
                    </span>
                  </div>
                  <h3 className="font-display text-[18px] font-bold text-[#0B1120] tracking-[-0.02em]">
                    Sign, Watermark &amp; Crop Geometry
                  </h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-slate-600">
                    Draw smooth handwritten or typed signatures directly onto
                    live page previews, stamp watermarks, and trim margins in
                    points.
                  </p>
                </div>
                <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#0B1120] group-hover:text-[#2563EB] transition-colors">
                  <span>Open Sign PDF</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </span>
              </motion.a>

              <motion.a
                href="/ai-summarizer"
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.99 }}
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                onClick={(e) => {
                  e.preventDefault();
                  onOpenTool('ai-summarizer');
                }}
                className="flex-1 group text-left p-6 rounded-2xl bg-white border border-slate-200 hover:border-violet-400 hover:shadow-[0_18px_40px_-24px_rgba(124,58,237,0.22)] transition-[border-color,box-shadow] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-violet-50 group-hover:bg-violet-600 text-violet-700 group-hover:text-white flex items-center justify-center transition-colors">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <span className="text-[12px] text-slate-500">
                      Opt-in Gemini AI
                    </span>
                  </div>
                  <h3 className="font-display text-[18px] font-bold text-[#0B1120] tracking-[-0.02em]">
                    Gemini Document Intelligence
                  </h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-slate-600">
                    Extract PDF text locally first, then generate executive
                    briefings, action items, or ask page-cited Q&amp;A
                    questions.
                  </p>
                </div>
                <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#0B1120] group-hover:text-violet-700 transition-colors">
                  <span>Try AI Summarizer</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </span>
              </motion.a>
            </div>
          </div>
        </RevealSection>
      </section>

      {/* Interactive 3-Stage Animated Structural Pipeline */}
      <HowItWorksSection />

      {/* Featured Editorial Workflow Guides */}
      <section
        aria-labelledby="featured-guides-heading"
        className="border-t border-slate-200/80 bg-[#F8FAFC]"
      >
        <RevealSection className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-18 sm:py-20">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-9">
            <div>
              <p className="text-[13px] font-semibold text-[#2563EB] mb-2">
                Guides &amp; playbooks
              </p>
              <h2
                id="featured-guides-heading"
                className="font-display text-[30px] sm:text-[36px] font-bold text-[#0B1120] leading-[1.12] tracking-[-0.026em]"
              >
                Practical document workflows
              </h2>
            </div>

            <a
              href="/guides"
              onClick={(e) => {
                e.preventDefault();
                onOpenGuidesIndex();
              }}
              className="group inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[#0B1120] hover:text-[#2563EB] transition-colors shrink-0"
            >
              <span>Browse all 5 guides</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </a>
          </div>

          <StaggerGroup
            stagger={0.07}
            className="grid grid-cols-1 md:grid-cols-3 gap-5"
          >
            {EDITORIAL_GUIDES.slice(0, 3).map((guide) => (
              <StaggerItem key={guide.slug} className="h-full">
                <article className="group h-full bg-white rounded-2xl border border-slate-200/90 hover:border-[#2563EB]/70 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgba(11,17,32,0.16)] p-6 flex flex-col justify-between transition-all duration-200">
                  <div>
                    <p className="text-[12px] text-slate-500 mb-3">
                      <span className="font-semibold text-[#2563EB]">
                        {guide.category}
                      </span>{' '}
                      <span aria-hidden="true" className="text-slate-300">
                        ·
                      </span>{' '}
                      <span>{guide.readTime}</span>
                    </p>
                    <h3 className="font-display text-[18px] font-bold text-[#0B1120] tracking-[-0.02em] leading-snug">
                      <a
                        href={guide.path}
                        onClick={(e) => {
                          e.preventDefault();
                          onOpenGuideArticle(guide.slug);
                        }}
                        className="hover:text-[#2563EB] transition-colors"
                      >
                        {guide.title}
                      </a>
                    </h3>
                    <p className="mt-2.5 text-[13.5px] leading-[1.62] text-slate-600">
                      {guide.summary}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                    <a
                      href={guide.path}
                      onClick={(e) => {
                        e.preventDefault();
                        onOpenGuideArticle(guide.slug);
                      }}
                      className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#0B1120] group-hover:text-[#2563EB] transition-colors"
                    >
                      <span>Read guide</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </a>
                    <a
                      href={`/${guide.relatedToolId}`}
                      onClick={(e) => {
                        e.preventDefault();
                        onOpenTool(guide.relatedToolId);
                      }}
                      className="text-[12px] font-mono text-slate-500 hover:text-[#0B1120] transition-colors"
                    >
                      {guide.relatedToolName}
                    </a>
                  </div>
                </article>
              </StaggerItem>
            ))}
          </StaggerGroup>

          <AdSlot
            slotId={import.meta.env.VITE_ADSENSE_SLOT_HOME}
            variant="leaderboard"
            className="mt-10 mb-0"
          />
        </RevealSection>
      </section>

      {/* Interactive Accordion FAQ (Synced 1:1 with Home FAQPage JSON-LD) */}
      <section
        id="faq"
        aria-labelledby="home-faq-heading"
        className="border-t border-slate-200/80 bg-white"
      >
        <RevealSection className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-18 sm:py-22">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
            <div className="lg:col-span-4">
              <p className="text-[13px] font-semibold text-[#2563EB] mb-2">
                Common questions
              </p>
              <h2
                id="home-faq-heading"
                className="font-display text-[30px] sm:text-[36px] font-bold text-[#0B1120] leading-[1.12] tracking-[-0.026em]"
              >
                Frequently asked questions
              </h2>
              <p className="mt-3 text-[14.5px] leading-[1.65] text-slate-600">
                Straight answers about local privacy, file size limits, offline
                usage, and opt-in Gemini AI tools.
              </p>
            </div>

            <div className="lg:col-span-8 divide-y divide-slate-200 border-y border-slate-200">
              {HOME_FAQS.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div key={faq.question}>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenFaqIndex((prev) => (prev === idx ? null : idx))
                      }
                      aria-expanded={isOpen}
                      className="w-full py-5 text-left flex items-center justify-between gap-4 cursor-pointer group"
                    >
                      <h3 className="font-display text-[16.5px] sm:text-[17.5px] font-bold text-[#0B1120] group-hover:text-[#2563EB] transition-colors leading-snug">
                        {faq.question}
                      </h3>
                      <span
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isOpen
                            ? 'bg-blue-50 text-[#2563EB]'
                            : 'bg-slate-100 text-slate-500 group-hover:text-[#0B1120]'
                        }`}
                      >
                        <ChevronDown
                          className={`w-4 h-4 transition-transform duration-200 ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </span>
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.22, ease: VELLUM_EASE }}
                          className="overflow-hidden"
                        >
                          <p className="pb-5 pr-10 text-[14.5px] leading-[1.68] text-slate-600">
                            {faq.answer}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </RevealSection>
      </section>
    </>
  );
};
