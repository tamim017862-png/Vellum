import React from 'react';
import { ArrowRight, Lightbulb } from 'lucide-react';
import { EDITORIAL_GUIDES, TOOL_BEST_PRACTICES } from '../data/guides';
import { RELATED_TOOLS_MAP, TOOL_PAGE_CONTENT } from '../data/siteContent';
import { PDF_TOOLS } from '../data/tools';
import type { GuideSlug, ToolId } from '../types/pdf';
import { AdSlot } from './AdSlot';
import { getToolIcon } from './ToolCard';

interface ToolGuideSectionProps {
  toolId: ToolId;
  onOpenGuideArticle?: (slug: GuideSlug) => void;
  onOpenTool?: (id: ToolId) => void;
}

export const ToolGuideSection: React.FC<ToolGuideSectionProps> = ({
  toolId,
  onOpenGuideArticle,
  onOpenTool,
}) => {
  const guide = TOOL_PAGE_CONTENT[toolId];
  const bestPractices = TOOL_BEST_PRACTICES[toolId];
  const relatedGuide = EDITORIAL_GUIDES.find((g) => g.relatedToolId === toolId);
  const relatedTools = (RELATED_TOOLS_MAP[toolId] ?? [])
    .map((id) => PDF_TOOLS.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  if (!guide) return null;

  return (
    <section
      aria-labelledby="tool-guide-heading"
      className="border-t border-[#E2E8F0] bg-[#F8FAFC]"
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 space-y-14">
        {/* Unique Tool Introduction */}
        <div className="max-w-3xl">
          <p className="text-[12px] font-mono font-semibold text-[#2563EB] mb-2">
            Guide &amp; Documentation
          </p>
          <h2
            id="tool-guide-heading"
            className="font-display text-[26px] sm:text-[34px] font-extrabold text-[#0F172A] leading-[1.15] tracking-tight"
          >
            {guide.heading}
          </h2>
          <p className="mt-4 text-[15px] sm:text-[16px] leading-[1.7] text-[#475569]">
            {guide.intro}
          </p>
        </div>

        {/* 3 Numbered How-To Steps */}
        <div>
          <h3 className="text-[14px] font-mono font-bold text-[#0F172A] mb-5">
            Step-by-Step Instructions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {guide.steps.map((step) => (
              <div
                key={step.number}
                id={`step-${step.number}`}
                className="bg-white rounded-2xl border border-[#E2E8F0] p-6 sm:p-7 flex flex-col justify-between shadow-[0_6px_20px_-14px_rgba(15,23,42,0.08)]"
              >
                <div>
                  <span className="font-mono tabular-nums text-[22px] font-bold text-[#2563EB] block mb-3">
                    {step.number}
                  </span>
                  <h4 className="font-display text-[17px] font-bold text-[#0F172A] leading-snug">
                    {step.title}
                  </h4>
                  <p className="mt-2.5 text-[14px] leading-[1.65] text-[#475569]">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Best Practices & Technical Reference */}
        {bestPractices && (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[#F1F5F9]">
              <h3 className="font-display text-[18px] sm:text-[20px] font-bold text-[#0F172A]">
                {bestPractices.heading}
              </h3>
              {relatedGuide && onOpenGuideArticle && (
                <a
                  href={relatedGuide.path}
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenGuideArticle(relatedGuide.slug);
                  }}
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#2563EB] hover:text-[#1D4ED8] shrink-0"
                >
                  <span>Read Full Tutorial</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {bestPractices.points.map((point) => (
                <div key={point.label} className="space-y-1.5">
                  <h4 className="text-[14px] font-bold text-[#0F172A]">
                    {point.label}
                  </h4>
                  <p className="text-[14px] leading-[1.65] text-[#475569]">
                    {point.detail}
                  </p>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-[#EFF6FF]/75 border border-[#BFDBFE] flex items-start gap-3">
              <Lightbulb
                className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <p className="text-[13px] leading-[1.6] text-[#0F172A]">
                <strong className="font-semibold">Tip:</strong>{' '}
                {bestPractices.proTip}
              </p>
            </div>
          </div>
        )}

        <AdSlot
          slotId={import.meta.env.VITE_ADSENSE_SLOT_TOOL}
          variant="leaderboard"
        />

        {/* Tool-Specific Frequently Asked Questions */}
        <div>
          <h3 className="text-[14px] font-mono font-bold text-[#0F172A] mb-5">
            Frequently Asked Questions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {guide.faqs.map((faq) => (
              <article
                key={faq.question}
                className="bg-white rounded-2xl border border-[#E2E8F0] p-6"
              >
                <h4 className="text-[15px] font-bold text-[#0F172A] leading-snug">
                  {faq.question}
                </h4>
                <p className="mt-2.5 text-[14px] leading-[1.65] text-[#475569]">
                  {faq.answer}
                </p>
              </article>
            ))}
          </div>
        </div>

        {/* Related PDF Tools Internal-Linking Cluster */}
        {relatedTools.length > 0 && (
          <div className="pt-10 border-t border-[#E2E8F0]">
            <h3 className="text-[14px] font-mono font-bold text-[#0F172A] mb-5">
              Related PDF Tools
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {relatedTools.map((relTool) => {
                const Icon = getToolIcon(relTool.id);
                return (
                  <a
                    key={relTool.id}
                    href={`/${relTool.id}`}
                    onClick={(e) => {
                      if (onOpenTool) {
                        e.preventDefault();
                        onOpenTool(relTool.id);
                      }
                    }}
                    className="group bg-white rounded-xl border border-[#E2E8F0] hover:border-[#2563EB]/45 hover:shadow-[0_14px_30px_-16px_rgba(37,99,235,0.22)] p-5 flex flex-col justify-between transition-all hover:-translate-y-0.5"
                  >
                    <div>
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${relTool.accentBg} ${relTool.accentText} border border-black/[0.04]`}
                      >
                        <Icon className="w-4 h-4" strokeWidth={2} />
                      </div>
                      <h4 className="font-display text-[15px] font-bold text-[#0F172A] group-hover:text-[#2563EB] transition-colors">
                        {relTool.name}
                      </h4>
                      <p className="mt-1.5 text-[13px] leading-[1.55] text-[#475569] line-clamp-2">
                        {relTool.description}
                      </p>
                    </div>
                    <span className="mt-3.5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#0F172A] group-hover:text-[#2563EB]">
                      <span>Open tool</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};


