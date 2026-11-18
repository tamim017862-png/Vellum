import React from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check } from 'lucide-react';
import { EDITORIAL_GUIDES, getGuideBySlug } from '../data/guides';
import type { GuideSlug, ToolId } from '../types/pdf';
import { AdSlot } from './AdSlot';

interface GuidesViewProps {
  activeSlug?: GuideSlug;
  onNavigateHome: () => void;
  onOpenGuidesIndex: () => void;
  onOpenGuideArticle: (slug: GuideSlug) => void;
  onOpenTool: (id: ToolId) => void;
}

export const GuidesView: React.FC<GuidesViewProps> = ({
  activeSlug,
  onNavigateHome,
  onOpenGuidesIndex,
  onOpenGuideArticle,
  onOpenTool,
}) => {
  const article = activeSlug ? getGuideBySlug(activeSlug) : undefined;

  if (!article) {
    return (
      <section
        aria-labelledby="guides-index-heading"
        className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16"
      >
        <div className="mb-10 pb-8 border-b border-[#E2E8F0] max-w-3xl">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onNavigateHome();
            }}
            className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#475569] hover:text-[#2563EB] transition-colors mb-5 min-h-[36px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Vellum Home</span>
          </a>

          <p className="font-mono text-[12px] font-semibold text-[#2563EB] mb-2">
            PDF Productivity Guides
          </p>
          <h1
            id="guides-index-heading"
            className="font-display text-[32px] sm:text-[44px] font-extrabold text-[#0F172A] leading-[1.1] tracking-tight"
          >
            Practical PDF Guides &amp; Workflows
          </h1>
          <p className="mt-4 text-[16px] sm:text-[17px] leading-[1.65] text-[#475569]">
            Step-by-step tutorials on shrinking oversized PDFs for strict portal
            uploads, combining confidential packets privately in your browser,
            signing contracts, and formatting scan photos cleanly.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {EDITORIAL_GUIDES.map((guide, index) => (
            <article
              key={guide.slug}
              className={`bg-white rounded-2xl border border-[#E2E8F0] p-6 sm:p-7 flex flex-col justify-between shadow-[0_8px_24px_-14px_rgba(15,23,42,0.08)] hover:border-[#BFDBFE] transition-colors ${
                index === 0 ? 'md:col-span-2' : ''
              }`}
            >
              <div>
                <div className="flex flex-wrap items-center gap-2 text-[12px] font-medium text-[#475569] mb-3">
                  <span className="font-semibold text-[#2563EB]">
                    {guide.category}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{guide.readTime}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Updated{' '}
                    <time dateTime={guide.updatedAtIso}>{guide.updatedAt}</time>
                  </span>
                </div>

                <h2 className="font-display text-[20px] sm:text-[24px] font-bold text-[#0F172A] leading-snug">
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
                </h2>

                <p className="mt-3 text-[15px] leading-[1.65] text-[#475569] max-w-3xl">
                  {guide.summary}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-4">
                <a
                  href={guide.path}
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenGuideArticle(guide.slug);
                  }}
                  className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#2563EB] hover:text-[#1D4ED8]"
                >
                  <span>Read Guide</span>
                  <ArrowRight className="w-4 h-4" />
                </a>

                <a
                  href={`/${guide.relatedToolId}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenTool(guide.relatedToolId);
                  }}
                  className="text-[13px] font-medium text-[#475569] hover:text-[#0F172A] transition-colors"
                >
                  Tool: {guide.relatedToolName} →
                </a>
              </div>
            </article>
          ))}
        </div>

        <AdSlot
          slotId={import.meta.env.VITE_ADSENSE_SLOT_GUIDE}
          variant="leaderboard"
        />
      </section>
    );
  }

  const otherGuides = EDITORIAL_GUIDES.filter((g) => g.slug !== article.slug);

  return (
    <article
      aria-labelledby="guide-article-heading"
      className="max-w-[920px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16"
    >
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-2 text-[13px] font-medium text-[#475569] mb-6"
      >
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onNavigateHome();
          }}
          className="hover:text-[#2563EB] transition-colors"
        >
          Home
        </a>
        <span aria-hidden="true">/</span>
        <a
          href="/guides"
          onClick={(e) => {
            e.preventDefault();
            onOpenGuidesIndex();
          }}
          className="hover:text-[#2563EB] transition-colors"
        >
          Guides
        </a>
        <span aria-hidden="true">/</span>
        <span className="text-[#0F172A] truncate max-w-[260px] sm:max-w-none">
          {article.relatedToolName}
        </span>
      </nav>

      <header className="pb-8 border-b border-[#E2E8F0]">
        <div className="flex flex-wrap items-center gap-2 text-[12px] font-medium text-[#475569] mb-3">
          <span className="font-mono font-semibold text-[#2563EB]">
            {article.category}
          </span>
          <span aria-hidden="true">·</span>
          <span>{article.readTime}</span>
          <span aria-hidden="true">·</span>
          <span>
            Updated{' '}
            <time dateTime={article.updatedAtIso}>{article.updatedAt}</time>
          </span>
        </div>

        <h1
          id="guide-article-heading"
          className="font-display text-[30px] sm:text-[42px] font-extrabold text-[#0F172A] leading-[1.12] tracking-tight"
        >
          {article.title}
        </h1>

        <p className="mt-4 text-[16px] sm:text-[17px] leading-[1.65] text-[#475569]">
          {article.summary}
        </p>
      </header>

      <div className="mt-9 space-y-10 max-w-[740px]">
        {article.sections.map((section) => (
          <section key={section.heading} className="space-y-4">
            <h2 className="font-display text-[21px] sm:text-[24px] font-bold text-[#0F172A] leading-snug">
              {section.heading}
            </h2>
            <div className="space-y-3.5 text-[15px] sm:text-[16px] leading-[1.75] text-[#475569]">
              {section.paragraphs.map((p, idx) => (
                <p key={idx}>{p}</p>
              ))}
            </div>
            {section.bullets && section.bullets.length > 0 && (
              <ul className="space-y-2.5 pt-1">
                {section.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="flex items-start gap-2.5 text-[15px] leading-[1.65] text-[#0F172A]"
                  >
                    <Check
                      className="w-4 h-4 text-[#2563EB] shrink-0 mt-1"
                      aria-hidden="true"
                    />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}

        {/* Contextual Action Callout to the Relevant Vellum Tool */}
        <div className="p-6 sm:p-7 rounded-2xl bg-[#EFF6FF]/75 border border-[#BFDBFE] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="font-mono text-[12px] font-semibold text-[#2563EB]">
              Ready to try it
            </p>
            <h3 className="font-display text-[18px] font-bold text-[#0F172A]">
              Open {article.relatedToolName} in Vellum
            </h3>
            <p className="text-[14px] text-[#475569]">
              Runs directly inside your browser with zero uploads or account
              signup.
            </p>
          </div>
          <a
            href={`/${article.relatedToolId}`}
            onClick={(e) => {
              e.preventDefault();
              onOpenTool(article.relatedToolId);
            }}
            className="min-h-[44px] px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[14px] font-semibold rounded-xl shadow-sm shadow-[#2563EB]/25 inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 transition-colors"
          >
            <span>Launch {article.relatedToolName}</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>

      <AdSlot
        slotId={import.meta.env.VITE_ADSENSE_SLOT_GUIDE}
        variant="leaderboard"
      />

      {/* Related Guides */}
      <section className="mt-12 pt-8 border-t border-[#E2E8F0]">
        <div className="flex items-center justify-between gap-4 mb-5">
          <h2 className="font-display text-[18px] font-bold text-[#0F172A] flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#2563EB]" aria-hidden="true" />
            <span>More Vellum Guides</span>
          </h2>
          <a
            href="/guides"
            onClick={(e) => {
              e.preventDefault();
              onOpenGuidesIndex();
            }}
            className="text-[13px] font-semibold text-[#2563EB] hover:text-[#1D4ED8]"
          >
            View All Guides →
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {otherGuides.slice(0, 4).map((other) => (
            <a
              key={other.slug}
              href={other.path}
              onClick={(e) => {
                e.preventDefault();
                onOpenGuideArticle(other.slug);
              }}
              className="p-4 rounded-2xl bg-[#F8FAFC] hover:bg-white border border-[#E2E8F0] hover:border-[#BFDBFE] transition-colors block"
            >
              <span className="font-mono text-[11px] font-semibold text-[#2563EB] block mb-1">
                {other.category} · {other.readTime}
              </span>
              <span className="font-display text-[15px] font-bold text-[#0F172A] leading-snug block">
                {other.title}
              </span>
            </a>
          ))}
        </div>
      </section>
    </article>
  );
};
