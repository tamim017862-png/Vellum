import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, FolderOpen, Menu, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { GUIDE_SLUGS } from '../data/guides';
import { PDF_TOOLS } from '../data/tools';
import type {
  AppRouteView,
  InfoPageId,
  ToolCategory,
  ToolId,
} from '../types/pdf';
import { BrandLogo } from './BrandLogo';
import { getToolIcon } from './ToolCard';

interface HeaderProps {
  activeView: AppRouteView;
  sessionFileCount: number;
  onNavigateHome: (sectionId?: string) => void;
  onOpenTool: (id: ToolId) => void;
  onOpenInfoPage: (id: InfoPageId) => void;
  onOpenGuidesIndex: () => void;
  onOpenMyFiles: () => void;
  onOpenCommandPalette: () => void;
}

const MENU_CATEGORIES: ToolCategory[] = [
  'Organize',
  'Optimize',
  'Convert',
  'Edit & Sign',
  'AI Tools',
];

export const Header: React.FC<HeaderProps> = ({
  activeView,
  sessionFileCount,
  onNavigateHome,
  onOpenTool,
  onOpenInfoPage,
  onOpenGuidesIndex,
  onOpenMyFiles,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toolsDropdownOpen, setToolsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setToolsDropdownOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setToolsDropdownOpen(false);
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleNavSection = (sectionId?: string) => {
    setMobileMenuOpen(false);
    setToolsDropdownOpen(false);
    onNavigateHome(sectionId);
  };

  const handleToolSelect = (id: ToolId) => {
    setMobileMenuOpen(false);
    setToolsDropdownOpen(false);
    onOpenTool(id);
  };

  const handleInfoSelect = (id: InfoPageId) => {
    setMobileMenuOpen(false);
    setToolsDropdownOpen(false);
    onOpenInfoPage(id);
  };

  const handleGuidesSelect = () => {
    setMobileMenuOpen(false);
    setToolsDropdownOpen(false);
    onOpenGuidesIndex();
  };

  const isGuideActive =
    activeView === 'guides' || (GUIDE_SLUGS as string[]).includes(activeView);

  const isToolActive =
    activeView !== 'home' &&
    activeView !== 'not-found' &&
    activeView !== 'about' &&
    activeView !== 'privacy' &&
    activeView !== 'terms' &&
    activeView !== 'contact' &&
    !isGuideActive;

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 text-[#0B1120]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Clean single-line brand mark + wordmark */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            handleNavSection();
          }}
          className="inline-flex items-center gap-2.5 text-[#0B1120] whitespace-nowrap shrink-0 group rounded-lg"
          aria-label="Vellum Home"
        >
          <BrandLogo className="w-8 h-8 transition-transform duration-200 group-hover:scale-105" />
          <span className="font-display text-[21px] font-bold tracking-[-0.035em] leading-none">
            Vellum
          </span>
        </a>

        {/* Zone 2: 5 clean single-line navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-7 text-[14px] font-medium text-slate-600"
        >
          {/* Categorized Mega-Menu for all 15 tools */}
          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setToolsDropdownOpen((prev) => !prev)}
              aria-expanded={toolsDropdownOpen}
              aria-haspopup="menu"
              className={`inline-flex items-center gap-1 py-1.5 transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                isToolActive || toolsDropdownOpen
                  ? 'text-[#2563EB] font-semibold'
                  : 'hover:text-[#0B1120]'
              }`}
            >
              <span>Tools</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-150 ${
                  toolsDropdownOpen ? 'rotate-180 text-[#2563EB]' : ''
                }`}
              />
            </button>

            <AnimatePresence>
              {toolsDropdownOpen && (
                <motion.div
                  role="menu"
                  aria-label="PDF Tools Menu"
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute left-1/2 -translate-x-1/2 top-full mt-3 w-[760px] max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-2xl shadow-[0_24px_60px_-20px_rgba(11,17,32,0.22)] p-5 z-50 origin-top"
                >
                  <div className="grid grid-cols-3 gap-5">
                    {MENU_CATEGORIES.map((category) => {
                      const tools = PDF_TOOLS.filter(
                        (t) => t.category === category
                      );
                      return (
                        <div key={category} className="space-y-1.5">
                          <p className="px-2 text-[11.5px] font-display font-semibold text-slate-500">
                            {category}
                          </p>
                          <div className="space-y-0.5">
                            {tools.map((tool) => {
                              const Icon = getToolIcon(tool.id);
                              const isActive = activeView === tool.id;
                              return (
                                <a
                                  key={tool.id}
                                  role="menuitem"
                                  href={`/${tool.id}`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleToolSelect(tool.id);
                                  }}
                                  className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition-colors ${
                                    isActive
                                      ? 'bg-blue-50 text-[#1D4ED8]'
                                      : 'hover:bg-slate-50 text-slate-900'
                                  }`}
                                >
                                  <span
                                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${tool.accentBg} ${tool.accentText}`}
                                  >
                                    <Icon className="w-3.5 h-3.5" />
                                  </span>
                                  <span className="text-[13px] font-semibold leading-tight truncate">
                                    {tool.name}
                                  </span>
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <a
            href="/guides"
            onClick={(e) => {
              e.preventDefault();
              handleGuidesSelect();
            }}
            className={`py-1.5 transition-colors duration-150 whitespace-nowrap shrink-0 ${
              isGuideActive
                ? 'text-[#2563EB] font-semibold'
                : 'hover:text-[#0B1120]'
            }`}
          >
            Guides
          </a>
          <a
            href="/#favorites"
            onClick={(e) => {
              e.preventDefault();
              handleNavSection('favorites');
            }}
            className="py-1.5 hover:text-[#0B1120] transition-colors duration-150 whitespace-nowrap shrink-0"
          >
            Favorites
          </a>
          <a
            href="/about"
            onClick={(e) => {
              e.preventDefault();
              handleInfoSelect('about');
            }}
            className={`py-1.5 transition-colors duration-150 whitespace-nowrap shrink-0 ${
              activeView === 'about'
                ? 'text-[#2563EB] font-semibold'
                : 'hover:text-[#0B1120]'
            }`}
          >
            About
          </a>
          <a
            href="/#security"
            onClick={(e) => {
              e.preventDefault();
              handleNavSection('security');
            }}
            className="py-1.5 hover:text-[#0B1120] transition-colors duration-150 whitespace-nowrap shrink-0"
          >
            Security
          </a>
        </nav>

        {/* Zone 3: Single Primary Action + Mobile Menu Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenMyFiles();
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[40px] text-[13px] font-semibold text-white bg-[#0B1120] hover:bg-[#2563EB] rounded-lg shadow-xs transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5 text-blue-300 hidden sm:inline" />
            <span>My Files</span>
            {sessionFileCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[11px] font-mono tabular-nums bg-white text-[#0B1120] rounded-sm font-bold">
                {sessionFileCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-expanded={mobileMenuOpen}
            aria-label={
              mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'
            }
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden border-t border-slate-200 bg-white max-h-[calc(100vh-4rem)] overflow-y-auto shadow-2xl"
          >
            <nav
              aria-label="Mobile Navigation"
              className="max-w-[1200px] mx-auto px-4 py-4 space-y-4"
            >
              {MENU_CATEGORIES.map((category) => {
                const tools = PDF_TOOLS.filter((t) => t.category === category);
                return (
                  <div key={category}>
                    <p className="px-3 text-[12px] font-display font-semibold text-slate-500 mb-1.5">
                      {category}
                    </p>
                    <div className="grid grid-cols-1 gap-1">
                      {tools.map((tool) => {
                        const Icon = getToolIcon(tool.id);
                        return (
                          <a
                            key={tool.id}
                            href={`/${tool.id}`}
                            onClick={(e) => {
                              e.preventDefault();
                              handleToolSelect(tool.id);
                            }}
                            className={`px-3 min-h-[44px] flex items-center gap-3 rounded-xl text-left text-[14px] font-medium transition-colors ${
                              activeView === tool.id
                                ? 'bg-blue-50 text-[#1D4ED8]'
                                : 'text-slate-900 hover:bg-slate-50'
                            }`}
                          >
                            <span
                              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${tool.accentBg} ${tool.accentText}`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                            </span>
                            <span>{tool.name}</span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <div className="pt-2 border-t border-slate-200 flex flex-col gap-1">
                <a
                  href="/guides"
                  onClick={(e) => {
                    e.preventDefault();
                    handleGuidesSelect();
                  }}
                  className={`px-3 min-h-[44px] flex items-center text-[14px] font-medium rounded-xl ${
                    isGuideActive
                      ? 'bg-blue-50 text-[#1D4ED8]'
                      : 'text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Guides
                </a>
                <a
                  href="/#favorites"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavSection('favorites');
                  }}
                  className="px-3 min-h-[44px] flex items-center text-[14px] font-medium text-slate-900 rounded-xl hover:bg-slate-50"
                >
                  Favorites
                </a>
                <a
                  href="/about"
                  onClick={(e) => {
                    e.preventDefault();
                    handleInfoSelect('about');
                  }}
                  className="px-3 min-h-[44px] flex items-center text-[14px] font-medium text-slate-900 rounded-xl hover:bg-slate-50"
                >
                  About
                </a>
                <a
                  href="/#security"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavSection('security');
                  }}
                  className="px-3 min-h-[44px] flex items-center text-[14px] font-medium text-slate-900 rounded-xl hover:bg-slate-50"
                >
                  Security
                </a>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
