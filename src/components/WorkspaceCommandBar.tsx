import React from 'react';
import { ChevronRight, Command, Cpu, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { PDF_TOOLS } from '../data/tools';
import type { ToolId } from '../types/pdf';

interface WorkspaceCommandBarProps {
  activeToolId: ToolId;
  onNavigateHome: () => void;
  onOpenTool: (id: ToolId) => void;
  onOpenCommandPalette: () => void;
}

const QUICK_SWITCH_IDS: ToolId[] = [
  'merge-pdf',
  'split-pdf',
  'compress-pdf',
  'organize-pdf',
  'pdf-to-jpg',
  'sign-pdf',
  'ai-summarizer',
];

export const WorkspaceCommandBar: React.FC<WorkspaceCommandBarProps> = ({
  activeToolId,
  onNavigateHome,
  onOpenTool,
  onOpenCommandPalette,
}) => {
  const activeTool = PDF_TOOLS.find((t) => t.id === activeToolId);
  const isAi = activeTool?.executionScope === 'gemini-server';

  return (
    <div className="bg-[#F8FAFC] text-slate-700 border-b border-slate-200/80">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        {/* Left: Semantic Breadcrumb & Processing Scope */}
        <div className="flex items-center justify-between gap-3">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-[12.5px] min-w-0"
          >
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onNavigateHome();
              }}
              className="text-slate-500 hover:text-[#0B1120] transition-colors shrink-0 font-medium"
            >
              All Tools
            </a>
            <ChevronRight
              className="w-3.5 h-3.5 text-slate-400 shrink-0"
              aria-hidden="true"
            />
            {activeTool && (
              <>
                <span className="text-slate-500 hidden sm:inline truncate">
                  {activeTool.category}
                </span>
                <ChevronRight
                  className="w-3.5 h-3.5 text-slate-400 hidden sm:inline shrink-0"
                  aria-hidden="true"
                />
                <span
                  className="text-[#0B1120] font-semibold truncate"
                  aria-current="page"
                >
                  {activeTool.name}
                </span>
              </>
            )}
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-slate-600">
              {isAi ? (
                <Sparkles className="w-3.5 h-3.5 text-violet-600" />
              ) : (
                <Cpu className="w-3.5 h-3.5 text-emerald-600" />
              )}
              <span>{isAi ? 'Opt-in AI' : 'On-device · Private'}</span>
            </span>

            <button
              type="button"
              onClick={onOpenCommandPalette}
              className="lg:hidden inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-slate-200 text-[11px] font-mono text-slate-600 hover:text-[#2563EB] cursor-pointer"
              aria-label="Open command palette"
            >
              <Command className="w-3 h-3 text-[#2563EB]" />
              <span>K</span>
            </button>
          </div>
        </div>

        {/* Right: Quick Engine Switcher Rail + Cmd+K Trigger */}
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 lg:pb-0">
          <nav
            aria-label="Quick tool switcher"
            className="flex items-center gap-1"
          >
            {QUICK_SWITCH_IDS.map((id) => {
              const tool = PDF_TOOLS.find((t) => t.id === id);
              if (!tool) return null;
              const isCurrent = id === activeToolId;
              return (
                <a
                  key={id}
                  href={`/${id}`}
                  aria-current={isCurrent ? 'page' : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenTool(id);
                  }}
                  className={`relative px-2.5 py-1 rounded-md text-[12px] font-medium whitespace-nowrap transition-colors ${
                    isCurrent
                      ? 'text-white font-semibold'
                      : 'text-slate-600 hover:text-[#0B1120] hover:bg-slate-200/60'
                  }`}
                >
                  {isCurrent && (
                    <motion.span
                      layoutId="workspace-switcher-pill"
                      transition={{
                        type: 'spring',
                        stiffness: 460,
                        damping: 34,
                      }}
                      className="absolute inset-0 rounded-md bg-[#2563EB] -z-0"
                    />
                  )}
                  <span className="relative z-10">
                    {tool.name
                      .replace(' PDF', '')
                      .replace('AI Summarizer', 'AI Brief')}
                  </span>
                </a>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white hover:border-blue-300 border border-slate-200 text-[11px] font-mono text-slate-600 hover:text-[#2563EB] transition-colors cursor-pointer shrink-0"
            title="Switch tools or guides (Ctrl+K / Cmd+K)"
          >
            <Command className="w-3 h-3 text-[#2563EB]" />
            <span>K</span>
          </button>
        </div>
      </div>
    </div>
  );
};
