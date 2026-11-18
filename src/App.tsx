import React, {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { CommandPaletteModal } from './components/CommandPaletteModal';
import { Footer } from './components/Footer';
import { GlobalProgressBar } from './components/GlobalProgressBar';
import { Header } from './components/Header';
import { HomePage } from './components/HomePage';
import { InfoPageView } from './components/InfoPageView';
import { MyFilesDrawer } from './components/MyFilesDrawer';
import { NotFoundPage } from './components/NotFoundPage';
import { OfflineIndicator } from './components/OfflineIndicator';
import { SecuritySection } from './components/SecuritySection';
import { ToolGuideSection } from './components/ToolGuideSection';
import { WatchDemoModal } from './components/WatchDemoModal';
import { WorkspaceCommandBar } from './components/WorkspaceCommandBar';
import { WorkspaceSkeleton } from './components/WorkspaceSkeleton';
import { GUIDE_SLUGS } from './data/guides';
import {
  INFO_PAGE_IDS,
  TOOL_IDS,
  getPageSeo,
  resolveRouteFromPathname,
} from './data/siteContent';
import { useToolPreferences } from './hooks/useToolPreferences';
import { useWebVitals } from './hooks/useWebVitals';
import type {
  AppRouteView,
  GuideSlug,
  InfoPageId,
  ProcessedFileRecord,
  ToolId,
} from './types/pdf';

const MergePdfWorkspace = lazy(() =>
  import('./components/MergePdfWorkspace').then((mod) => ({
    default: mod.MergePdfWorkspace,
  }))
);

const SplitPdfWorkspace = lazy(() =>
  import('./components/SplitPdfWorkspace').then((mod) => ({
    default: mod.SplitPdfWorkspace,
  }))
);

const CompressPdfWorkspace = lazy(() =>
  import('./components/CompressPdfWorkspace').then((mod) => ({
    default: mod.CompressPdfWorkspace,
  }))
);

const PdfToJpgWorkspace = lazy(() =>
  import('./components/PdfToJpgWorkspace').then((mod) => ({
    default: mod.PdfToJpgWorkspace,
  }))
);

const JpgToPdfWorkspace = lazy(() =>
  import('./components/JpgToPdfWorkspace').then((mod) => ({
    default: mod.JpgToPdfWorkspace,
  }))
);

const PageStudioWorkspace = lazy(() =>
  import('./components/PageStudioWorkspace').then((mod) => ({
    default: mod.PageStudioWorkspace,
  }))
);

const SignPdfWorkspace = lazy(() =>
  import('./components/SignPdfWorkspace').then((mod) => ({
    default: mod.SignPdfWorkspace,
  }))
);

const WatermarkPdfWorkspace = lazy(() =>
  import('./components/WatermarkPdfWorkspace').then((mod) => ({
    default: mod.WatermarkPdfWorkspace,
  }))
);

const PageNumbersCropWorkspace = lazy(() =>
  import('./components/PageNumbersCropWorkspace').then((mod) => ({
    default: mod.PageNumbersCropWorkspace,
  }))
);

const AiPdfWorkspace = lazy(() =>
  import('./components/AiPdfWorkspace').then((mod) => ({
    default: mod.AiPdfWorkspace,
  }))
);

const GuidesView = lazy(() =>
  import('./components/GuidesView').then((mod) => ({
    default: mod.GuidesView,
  }))
);

const LEGACY_HASH_MAP: Record<string, ToolId> = {
  '#merge': 'merge-pdf',
  '#merge-pdf': 'merge-pdf',
  '#split-pdf': 'split-pdf',
  '#compress-pdf': 'compress-pdf',
  '#pdf-to-jpg': 'pdf-to-jpg',
  '#jpg-to-pdf': 'jpg-to-pdf',
  '#organize-pdf': 'organize-pdf',
  '#rotate-pdf': 'rotate-pdf',
  '#delete-pages': 'delete-pages',
  '#extract-pages': 'extract-pages',
  '#sign-pdf': 'sign-pdf',
  '#watermark-pdf': 'watermark-pdf',
  '#page-numbers': 'page-numbers',
  '#crop-pdf': 'crop-pdf',
  '#ai-summarizer': 'ai-summarizer',
  '#chat-with-pdf': 'chat-with-pdf',
};

function getInitialView(): AppRouteView {
  if (typeof window !== 'undefined') {
    const legacy = LEGACY_HASH_MAP[window.location.hash];
    if (legacy && window.location.pathname === '/') {
      return legacy;
    }
    return resolveRouteFromPathname(window.location.pathname);
  }
  return 'home';
}

function isToolView(view: AppRouteView): view is ToolId {
  return (TOOL_IDS as string[]).includes(view);
}

function isInfoView(view: AppRouteView): view is InfoPageId {
  return (INFO_PAGE_IDS as string[]).includes(view);
}

function isGuideArticleView(view: AppRouteView): view is GuideSlug {
  return (GUIDE_SLUGS as string[]).includes(view);
}

function updateDocumentHead(view: AppRouteView) {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  const seo = getPageSeo(view, window.location.origin);
  const ogImageUrl = `${window.location.origin}/og-image.png`;
  const canonicalUrl = seo.noindex
    ? `${window.location.origin}${window.location.pathname}`
    : `${window.location.origin}${seo.path}`;
  const robotsValue = seo.noindex
    ? 'noindex, nofollow'
    : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

  document.title = seo.title;

  const setMeta = (selector: string, content: string) => {
    const el = document.querySelector<HTMLMetaElement>(selector);
    if (el) el.content = content;
  };

  const upsertPropertyMeta = (property: string, content?: string) => {
    const selector = `meta[property="${property}"]`;
    const existing = document.querySelector<HTMLMetaElement>(selector);
    if (!content) {
      existing?.remove();
      return;
    }
    if (existing) {
      existing.content = content;
    } else {
      const created = document.createElement('meta');
      created.setAttribute('property', property);
      created.content = content;
      document.head.appendChild(created);
    }
  };

  setMeta('meta[name="description"]', seo.metaDescription);
  setMeta('meta[name="robots"]', robotsValue);
  setMeta('meta[property="og:type"]', seo.ogType);
  setMeta('meta[property="og:title"]', seo.title);
  setMeta('meta[property="og:description"]', seo.metaDescription);
  setMeta('meta[property="og:url"]', canonicalUrl);
  setMeta('meta[property="og:image"]', ogImageUrl);
  setMeta('meta[property="og:image:alt"]', seo.ogImageAlt);
  setMeta('meta[name="twitter:url"]', canonicalUrl);
  setMeta('meta[name="twitter:title"]', seo.title);
  setMeta('meta[name="twitter:description"]', seo.metaDescription);
  setMeta('meta[name="twitter:image"]', ogImageUrl);
  setMeta('meta[name="twitter:image:alt"]', seo.ogImageAlt);

  if (seo.ogType === 'article') {
    upsertPropertyMeta('article:published_time', seo.publishedTime);
    upsertPropertyMeta('article:modified_time', seo.modifiedTime);
    upsertPropertyMeta('article:section', seo.articleSection);
  } else {
    upsertPropertyMeta('article:published_time');
    upsertPropertyMeta('article:modified_time');
    upsertPropertyMeta('article:section');
  }

  const canonicalEl = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (seo.noindex) {
    canonicalEl?.remove();
  } else if (canonicalEl) {
    canonicalEl.href = canonicalUrl;
  } else {
    const created = document.createElement('link');
    created.rel = 'canonical';
    created.href = canonicalUrl;
    document.head.appendChild(created);
  }

  const ldJsonEl = document.querySelector<HTMLScriptElement>(
    'script[type="application/ld+json"]'
  );
  if (!seo.structuredData) {
    ldJsonEl?.remove();
  } else {
    const serialized = JSON.stringify(seo.structuredData);
    if (ldJsonEl) {
      ldJsonEl.textContent = serialized;
    } else {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = serialized;
      document.head.appendChild(script);
    }
  }
}

export default function App() {
  const [activeView, setActiveView] = useState<AppRouteView>(getInitialView);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [myFilesOpen, setMyFilesOpen] = useState(false);
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [sessionFiles, setSessionFiles] = useState<ProcessedFileRecord[]>([]);

  const sessionFilesRef = useRef<ProcessedFileRecord[]>([]);
  useEffect(() => {
    sessionFilesRef.current = sessionFiles;
  }, [sessionFiles]);

  useEffect(() => {
    return () => {
      for (const file of sessionFilesRef.current) {
        URL.revokeObjectURL(file.url);
      }
    };
  }, []);

  const {
    favoriteIds,
    recentIds,
    toggleFavorite,
    recordRecent,
    clearRecent,
  } = useToolPreferences();

  const webVitalsRoute =
    activeView === 'home'
      ? '/'
      : isGuideArticleView(activeView)
        ? `/guides/${activeView}`
        : `/${activeView}`;

  useWebVitals({
    route: webVitalsRoute,
    reportEndpoint: '/api/vitals',
  });

  // Migrate legacy #hash links cleanly to real URLs on initial visit
  useEffect(() => {
    const legacy = LEGACY_HASH_MAP[window.location.hash];
    if (legacy && window.location.pathname === '/') {
      window.history.replaceState(null, '', `/${legacy}`);
    }
  }, []);

  // Synchronize document title, meta description, and canonical link with route
  useEffect(() => {
    updateDocumentHead(activeView);
  }, [activeView]);

  // Listen for browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      setActiveView(resolveRouteFromPathname(window.location.pathname));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Global Cmd+K / Ctrl+K shortcut for Command Palette
  useEffect(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  const handleOpenTool = useCallback(
    (id: ToolId, files?: File[]) => {
      recordRecent(id);
      if (files && files.length > 0) {
        setPendingFiles(files);
      }
      setActiveView(id);
      const targetPath = `/${id}`;
      if (window.location.pathname !== targetPath) {
        window.history.pushState(null, '', targetPath);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [recordRecent]
  );

  const handleOpenInfoPage = useCallback((id: InfoPageId) => {
    setPendingFiles([]);
    setActiveView(id);
    const targetPath = `/${id}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleOpenGuidesIndex = useCallback(() => {
    setPendingFiles([]);
    setActiveView('guides');
    const targetPath = '/guides';
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleOpenGuideArticle = useCallback((slug: GuideSlug) => {
    setPendingFiles([]);
    setActiveView(slug);
    const targetPath = `/guides/${slug}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleConsumePendingFiles = useCallback(() => {
    setPendingFiles([]);
  }, []);

  const handleChainFileToTool = useCallback(
    async (url: string, fileName: string, targetToolId: ToolId) => {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const safeName = fileName.toLowerCase().endsWith('.pdf')
          ? fileName
          : `${fileName}.pdf`;
        const file = new File([blob], safeName, {
          type: blob.type || 'application/pdf',
        });
        setMyFilesOpen(false);
        handleOpenTool(targetToolId, [file]);
      } catch {
        setMyFilesOpen(false);
        handleOpenTool(targetToolId);
      }
    },
    [handleOpenTool]
  );

  const handleNavigateHome = useCallback((sectionId?: string) => {
    setActiveView('home');
    setPendingFiles([]);
    const targetUrl = sectionId ? `/#${sectionId}` : '/';
    if (`${window.location.pathname}${window.location.hash}` !== targetUrl) {
      window.history.pushState(null, '', targetUrl);
    }
    if (sectionId) {
      requestAnimationFrame(() => {
        setTimeout(() => {
          const target = document.getElementById(sectionId);
          target?.scrollIntoView({ behavior: 'smooth' });
        }, 40);
      });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const handleSaveToSession = useCallback(
    (record: Omit<ProcessedFileRecord, 'id' | 'createdAt'>) => {
      const newEntry: ProcessedFileRecord = {
        ...record,
        id:
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        createdAt: Date.now(),
      };
      setSessionFiles((prev) => [newEntry, ...prev].slice(0, 20));
    },
    []
  );

  const handleRemoveSessionFile = useCallback((id: string) => {
    setSessionFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const handleClearSessionFiles = useCallback(() => {
    setSessionFiles((prev) => {
      for (const file of prev) {
        URL.revokeObjectURL(file.url);
      }
      return [];
    });
  }, []);

  const renderWorkspace = () => {
    switch (activeView) {
      case 'merge-pdf':
        return (
          <MergePdfWorkspace
            initialFiles={pendingFiles}
            onConsumeInitialFiles={handleConsumePendingFiles}
            onBackToTools={() => handleNavigateHome('tools')}
            onSaveToSession={handleSaveToSession}
            onChainToTool={(url, name, target) =>
              void handleChainFileToTool(url, name, target)
            }
          />
        );
      case 'split-pdf':
        return (
          <SplitPdfWorkspace
            initialFiles={pendingFiles}
            onConsumeInitialFiles={handleConsumePendingFiles}
            onBackToTools={() => handleNavigateHome('tools')}
            onSaveToSession={handleSaveToSession}
            onChainToTool={(url, name, target) =>
              void handleChainFileToTool(url, name, target)
            }
          />
        );
      case 'compress-pdf':
        return (
          <CompressPdfWorkspace
            initialFiles={pendingFiles}
            onConsumeInitialFiles={handleConsumePendingFiles}
            onBackToTools={() => handleNavigateHome('tools')}
            onSaveToSession={handleSaveToSession}
            onChainToTool={(url, name, target) =>
              void handleChainFileToTool(url, name, target)
            }
          />
        );
      case 'pdf-to-jpg':
        return (
          <PdfToJpgWorkspace
            initialFiles={pendingFiles}
            onConsumeInitialFiles={handleConsumePendingFiles}
            onBackToTools={() => handleNavigateHome('tools')}
            onSaveToSession={handleSaveToSession}
          />
        );
      case 'jpg-to-pdf':
        return (
          <JpgToPdfWorkspace
            initialFiles={pendingFiles}
            onConsumeInitialFiles={handleConsumePendingFiles}
            onBackToTools={() => handleNavigateHome('tools')}
            onSaveToSession={handleSaveToSession}
          />
        );
      case 'organize-pdf':
        return (
          <PageStudioWorkspace
            mode="organize"
            initialFiles={pendingFiles}
            onConsumeInitialFiles={handleConsumePendingFiles}
            onBackToTools={() => handleNavigateHome('tools')}
            onSaveToSession={handleSaveToSession}
          />
        );
      case 'rotate-pdf':
        return (
          <PageStudioWorkspace
            mode="rotate"
            initialFiles={pendingFiles}
            onConsumeInitialFiles={handleConsumePendingFiles}
            onBackToTools={() => handleNavigateHome('tools')}
            onSaveToSession={handleSaveToSession}
          />
        );
      case 'delete-pages':
        return (
          <PageStudioWorkspace
            mode="delete"
            initialFiles={pendingFiles}
            onConsumeInitialFiles={handleConsumePendingFiles}
            onBackToTools={() => handleNavigateHome('tools')}
            onSaveToSession={handleSaveToSession}
          />
        );
      case 'extract-pages':
        return (
          <PageStudioWorkspace
            mode="extract"
            initialFiles={pendingFiles}
            onConsumeInitialFiles={handleConsumePendingFiles}
            onBackToTools={() => handleNavigateHome('tools')}
            onSaveToSession={handleSaveToSession}
          />
        );
      case 'sign-pdf':
        return (
          <SignPdfWorkspace
            initialFiles={pendingFiles}
            onConsumeInitialFiles={handleConsumePendingFiles}
            onBackToTools={() => handleNavigateHome('tools')}
            onSaveToSession={handleSaveToSession}
          />
        );
      case 'watermark-pdf':
        return (
          <WatermarkPdfWorkspace
            initialFiles={pendingFiles}
            onConsumeInitialFiles={handleConsumePendingFiles}
            onBackToTools={() => handleNavigateHome('tools')}
            onSaveToSession={handleSaveToSession}
          />
        );
      case 'page-numbers':
        return (
          <PageNumbersCropWorkspace
            mode="page-numbers"
            initialFiles={pendingFiles}
            onConsumeInitialFiles={handleConsumePendingFiles}
            onBackToTools={() => handleNavigateHome('tools')}
            onSaveToSession={handleSaveToSession}
          />
        );
      case 'crop-pdf':
        return (
          <PageNumbersCropWorkspace
            mode="crop"
            initialFiles={pendingFiles}
            onConsumeInitialFiles={handleConsumePendingFiles}
            onBackToTools={() => handleNavigateHome('tools')}
            onSaveToSession={handleSaveToSession}
          />
        );
      case 'ai-summarizer':
        return (
          <AiPdfWorkspace
            mode="summarize"
            initialFiles={pendingFiles}
            onConsumeInitialFiles={handleConsumePendingFiles}
            onBackToTools={() => handleNavigateHome('tools')}
          />
        );
      case 'chat-with-pdf':
        return (
          <AiPdfWorkspace
            mode="chat"
            initialFiles={pendingFiles}
            onConsumeInitialFiles={handleConsumePendingFiles}
            onBackToTools={() => handleNavigateHome('tools')}
          />
        );
      default:
        return null;
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <div
        id="top"
        className="min-h-screen flex flex-col bg-white text-[#0F172A]"
      >
        <GlobalProgressBar />

        <Header
          activeView={activeView}
          sessionFileCount={sessionFiles.length}
          onNavigateHome={handleNavigateHome}
          onOpenTool={handleOpenTool}
          onOpenInfoPage={handleOpenInfoPage}
          onOpenGuidesIndex={handleOpenGuidesIndex}
          onOpenMyFiles={() => setMyFilesOpen(true)}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        />

        <main className="flex-1">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              {activeView === 'home' ? (
                <>
                  <HomePage
                    favoriteIds={favoriteIds}
                    recentIds={recentIds}
                    onToggleFavorite={toggleFavorite}
                    onOpenTool={handleOpenTool}
                    onClearRecent={clearRecent}
                    onOpenDemo={() => setDemoModalOpen(true)}
                    onOpenGuidesIndex={handleOpenGuidesIndex}
                    onOpenGuideArticle={handleOpenGuideArticle}
                    onOpenCommandPalette={() => setCommandPaletteOpen(true)}
                  />
                  <SecuritySection onOpenMyFiles={() => setMyFilesOpen(true)} />
                </>
              ) : activeView === 'guides' || isGuideArticleView(activeView) ? (
                <>
                  <Suspense fallback={<WorkspaceSkeleton />}>
                    <GuidesView
                      activeSlug={
                        isGuideArticleView(activeView) ? activeView : undefined
                      }
                      onNavigateHome={() => handleNavigateHome()}
                      onOpenGuidesIndex={handleOpenGuidesIndex}
                      onOpenGuideArticle={handleOpenGuideArticle}
                      onOpenTool={(id) => handleOpenTool(id)}
                    />
                  </Suspense>
                  <SecuritySection onOpenMyFiles={() => setMyFilesOpen(true)} />
                </>
              ) : isInfoView(activeView) ? (
                <InfoPageView
                  pageId={activeView}
                  onNavigateHome={() => handleNavigateHome()}
                  onOpenInfoPage={handleOpenInfoPage}
                />
              ) : isToolView(activeView) ? (
                <>
                  <WorkspaceCommandBar
                    activeToolId={activeView}
                    onNavigateHome={() => handleNavigateHome('tools')}
                    onOpenTool={(id) => handleOpenTool(id)}
                    onOpenCommandPalette={() => setCommandPaletteOpen(true)}
                  />
                  <Suspense fallback={<WorkspaceSkeleton />}>
                    {renderWorkspace()}
                  </Suspense>
                  <ToolGuideSection
                    toolId={activeView}
                    onOpenGuideArticle={handleOpenGuideArticle}
                    onOpenTool={(id) => handleOpenTool(id)}
                  />
                  <SecuritySection onOpenMyFiles={() => setMyFilesOpen(true)} />
                </>
              ) : activeView === 'not-found' ? (
                <NotFoundPage
                  onNavigateHome={handleNavigateHome}
                  onOpenTool={handleOpenTool}
                />
              ) : null}
            </motion.div>
          </AnimatePresence>
        </main>

        <Footer
          onNavigateHome={handleNavigateHome}
          onOpenTool={handleOpenTool}
          onOpenInfoPage={handleOpenInfoPage}
          onOpenGuidesIndex={handleOpenGuidesIndex}
          onOpenGuideArticle={handleOpenGuideArticle}
        />

        <MyFilesDrawer
          isOpen={myFilesOpen}
          files={sessionFiles}
          onClose={() => setMyFilesOpen(false)}
          onRemoveFile={handleRemoveSessionFile}
          onClearAll={handleClearSessionFiles}
          onChainToTool={(url, name, target) =>
            void handleChainFileToTool(url, name, target)
          }
        />

        <WatchDemoModal
          isOpen={demoModalOpen}
          onClose={() => setDemoModalOpen(false)}
          onLaunchTool={handleOpenTool}
        />

        <CommandPaletteModal
          isOpen={commandPaletteOpen}
          sessionFileCount={sessionFiles.length}
          onClose={() => setCommandPaletteOpen(false)}
          onOpenTool={(id) => handleOpenTool(id)}
          onOpenGuideArticle={handleOpenGuideArticle}
          onOpenGuidesIndex={handleOpenGuidesIndex}
          onOpenInfoPage={handleOpenInfoPage}
          onOpenMyFiles={() => setMyFilesOpen(true)}
          onOpenDemo={() => setDemoModalOpen(true)}
          onNavigateHome={handleNavigateHome}
        />

        <OfflineIndicator />
      </div>
    </MotionConfig>
  );
}
