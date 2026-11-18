import React from 'react';
import { ArrowLeft, ArrowRight, FileQuestion, Home } from 'lucide-react';
import { NOT_FOUND_SEO } from '../data/siteContent';
import { PDF_TOOLS } from '../data/tools';
import type { ToolId } from '../types/pdf';
import { getToolIcon } from './ToolCard';

interface NotFoundPageProps {
  onNavigateHome: (sectionId?: string) => void;
  onOpenTool: (id: ToolId) => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({
  onNavigateHome,
  onOpenTool,
}) => {
  const popularTools = PDF_TOOLS.filter((tool) => tool.popular);

  return (
    <section
      aria-labelledby="not-found-heading"
      className="bg-white py-14 sm:py-20"
    >
      <div className="max-w-[960px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-[600px] mx-auto">
          <div className="inline-flex items-center gap-2 font-mono text-[13px] font-semibold text-[#2563EB] mb-4">
            <FileQuestion className="w-4 h-4" />
            <span>Error 404</span>
          </div>

          <h1
            id="not-found-heading"
            className="font-display text-[36px] sm:text-[46px] font-extrabold text-[#0F172A] tracking-[-0.025em] leading-[1.1]"
          >
            {NOT_FOUND_SEO.heading}
          </h1>

          <p className="mt-4 text-[16px] leading-[1.65] text-[#475569]">
            {NOT_FOUND_SEO.intro}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onNavigateHome();
              }}
              className="min-h-[46px] px-6 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[14px] font-semibold rounded-xl shadow-[0_12px_24px_-8px_rgba(37,99,235,0.42)] transition-all inline-flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              <span>Return to Home</span>
            </a>

            <a
              href="/#tools"
              onClick={(e) => {
                e.preventDefault();
                onNavigateHome('tools');
              }}
              className="min-h-[46px] px-5 py-2.5 bg-white hover:bg-[#F8FAFC] text-[#0F172A] border border-[#E2E8F0] hover:border-[#CBD5E1] text-[14px] font-semibold rounded-xl transition-colors inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4 text-[#475569]" />
              <span>Browse All Tools</span>
            </a>
          </div>
        </div>

        <div className="mt-14 pt-10 border-t border-[#E2E8F0]">
          <div className="flex items-center justify-between gap-4 mb-5">
            <h2 className="font-display text-[18px] font-bold text-[#0F172A]">
              Popular PDF Tools
            </h2>
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onNavigateHome('tools');
              }}
              className="text-[13px] font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition-colors inline-flex items-center gap-1"
            >
              <span>View all 15 tools</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {popularTools.map((tool) => {
              const Icon = getToolIcon(tool.id);
              return (
                <a
                  key={tool.id}
                  href={`/${tool.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenTool(tool.id);
                  }}
                  className="group p-4 rounded-2xl border border-[#E2E8F0] bg-white hover:border-[#2563EB]/45 hover:shadow-[0_14px_30px_-16px_rgba(37,99,235,0.22)] transition-all flex items-start gap-3.5"
                >
                  <span
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-black/[0.04] ${tool.accentBg} ${tool.accentText}`}
                  >
                    <Icon className="w-5 h-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-[14px] font-bold text-[#0F172A] group-hover:text-[#2563EB] transition-colors truncate">
                        {tool.name}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#94A3B8] group-hover:text-[#2563EB] shrink-0 transition-colors" />
                    </div>
                    <p className="mt-1 text-[12px] text-[#475569] line-clamp-2 leading-relaxed">
                      {tool.description}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
