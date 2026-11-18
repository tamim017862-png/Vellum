import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  FolderOpen,
  Play,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { EDITORIAL_GUIDES } from '../data/guides';
import { PDF_TOOLS } from '../data/tools';
import type { GuideSlug, InfoPageId, ToolId } from '../types/pdf';
import { getToolIcon } from './ToolCard';

interface CommandPaletteModalProps {
  isOpen: boolean;
  sessionFileCount: number;
  onClose: () => void;
  onOpenTool: (id: ToolId) => void;
  onOpenGuideArticle: (slug: GuideSlug) => void;
  onOpenGuidesIndex: () => void;
  onOpenInfoPage: (id: InfoPageId) => void;
  onOpenMyFiles: () => void;
  onOpenDemo: () => void;
  onNavigateHome: (sectionId?: string) => void;
}

interface CommandItem {
  id: string;
  group: 'Tools' | 'Actions' | 'Guides';
  title: string;
  subtitle: string;
  tag: string;
  keywords: string;
  icon: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  sessionFileCount,
  onClose,
  onOpenTool,
  onOpenGuideArticle,
  onOpenGuidesIndex,
  onOpenInfoPage,
  onOpenMyFiles,
  onOpenDemo,
  onNavigateHome,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const items: CommandItem[] = useMemo(() => {
    const toolItems: CommandItem[] = PDF_TOOLS.map((tool) => ({
      id: `tool:${tool.id}`,
      group: 'Tools',
      title: tool.name,
      subtitle: tool.description,
      tag: tool.executionScope === 'gemini-server' ? 'Opt-in AI' : 'On-device',
      keywords: `${tool.name} ${tool.category} ${tool.keywords.join(' ')}`,
      icon: getToolIcon(tool.id),
      onSelect: () => {
        onClose();
        onOpenTool(tool.id);
      },
    }));

    const actionItems: CommandItem[] = [
      {
        id: 'action:my-files',
        group: 'Actions',
        title: 'Open My Files Session Memory',
        subtitle: `${sessionFileCount} processed ${sessionFileCount === 1 ? 'file' : 'files'} stored locally`,
        tag: 'Drawer',
        keywords: 'my files downloads session memory exports',
        icon: FolderOpen,
        onSelect: () => {
          onClose();
          onOpenMyFiles();
        },
      },
      {
        id: 'action:tour',
        group: 'Actions',
        title: 'Interactive Platform Tour',
        subtitle: 'Preview how Vellum executes PDF pipelines inside browser memory',
        tag: 'Demo',
        keywords: 'tour demo tutorial preview help',
        icon: Play,
        onSelect: () => {
          onClose();
          onOpenDemo();
        },
      },
      {
        id: 'action:security',
        group: 'Actions',
        title: 'Zero-Upload Architecture & Privacy',
        subtitle: 'Inspect client-side Web Worker & binary header safeguards',
        tag: 'Security',
        keywords: 'security privacy architecture zero upload csp',
        icon: ShieldCheck,
        onSelect: () => {
          onClose();
          onNavigateHome('security');
        },
      },
      {
        id: 'action:guides',
        group: 'Actions',
        title: 'Browse All PDF Guides',
        subtitle: 'Read practical workflows for compression, signing, merging, and AI',
        tag: 'Guides',
        keywords: 'guides tutorials documentation articles',
        icon: BookOpen,
        onSelect: () => {
          onClose();
          onOpenGuidesIndex();
        },
      },
      {
        id: 'action:about',
        group: 'Actions',
        title: 'About Vellum',
        subtitle: 'Architecture principles, limits, and licensing overview',
        tag: 'Info',
        keywords: 'about vellum team company contact privacy terms',
        icon: ShieldCheck,
        onSelect: () => {
          onClose();
          onOpenInfoPage('about');
        },
      },
    ];

    const guideItems: CommandItem[] = EDITORIAL_GUIDES.map((guide) => ({
      id: `guide:${guide.slug}`,
      group: 'Guides',
      title: guide.title,
      subtitle: guide.summary,
      tag: guide.readTime,
      keywords: `${guide.title} ${guide.category} ${guide.relatedToolName}`,
      icon: BookOpen,
      onSelect: () => {
        onClose();
        onOpenGuideArticle(guide.slug);
      },
    }));

    return [...toolItems, ...actionItems, ...guideItems];
  }, [
    onClose,
    onNavigateHome,
    onOpenDemo,
    onOpenGuideArticle,
    onOpenGuidesIndex,
    onOpenInfoPage,
    onOpenMyFiles,
    onOpenTool,
    sessionFileCount,
  ]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 10);
    return items
      .filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q) ||
          item.keywords.toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [items, query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          filteredItems.length === 0 ? 0 : (prev + 1) % filteredItems.length
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          filteredItems.length === 0
            ? 0
            : (prev - 1 + filteredItems.length) % filteredItems.length
        );
      } else if (e.key === 'Enter' && filteredItems[selectedIndex]) {
        e.preventDefault();
        filteredItems[selectedIndex].onSelect();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredItems, isOpen, onClose, selectedIndex]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4"
          role="dialog"
          aria-modal="true"
          aria-label="Quick command palette"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 bg-[#0B1120]/60 backdrop-blur-xs"
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 460, damping: 34 }}
            className="relative z-10 w-full max-w-xl bg-[#0B1120] text-white border border-slate-800 rounded-2xl shadow-[0_28px_80px_-16px_rgba(0,0,0,0.65)] overflow-hidden"
          >
            {/* Search Input Row */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800">
              <Search className="w-4 h-4 text-blue-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Jump to any PDF tool, workflow guide, or action..."
                className="w-full bg-transparent text-[14.5px] text-white placeholder:text-slate-400 focus:outline-none"
                aria-label="Command search input"
              />
              <button
                type="button"
                onClick={onClose}
                aria-label="Close command palette"
                className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Results List */}
            <div className="max-h-[380px] overflow-y-auto p-2">
              {filteredItems.length > 0 ? (
                <ul className="space-y-0.5">
                  {filteredItems.map((item, idx) => {
                    const Icon = item.icon;
                    const active = idx === selectedIndex;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onMouseEnter={() => setSelectedIndex(idx)}
                          onClick={item.onSelect}
                          className={`w-full px-3 py-2.5 rounded-xl text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#2563EB] text-white'
                              : 'text-slate-200 hover:bg-white/[0.06]'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                active
                                  ? 'bg-white/20 text-white'
                                  : 'bg-slate-900 border border-slate-800 text-blue-400'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13.5px] font-semibold truncate">
                                {item.title}
                              </p>
                              <p
                                className={`text-[11.5px] truncate ${
                                  active ? 'text-blue-100' : 'text-slate-400'
                                }`}
                              >
                                {item.subtitle}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`font-mono text-[11px] ${
                                active ? 'text-blue-100' : 'text-slate-400'
                              }`}
                            >
                              {item.tag}
                            </span>
                            <ArrowRight
                              className={`w-3.5 h-3.5 ${
                                active ? 'text-white' : 'text-slate-500'
                              }`}
                            />
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="py-10 px-4 text-center text-[13px] text-slate-400">
                  No matching PDF tools or guides for &ldquo;{query}&rdquo;.
                </div>
              )}
            </div>

            {/* Footer Hint */}
            <div className="px-4 py-2.5 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <div className="flex items-center gap-3">
                <span>↑↓ Navigate</span>
                <span>↵ Launch</span>
                <span>ESC Close</span>
              </div>
              <span className="text-slate-500">15 Tools · 5 Guides</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
