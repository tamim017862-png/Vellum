import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Copy,
  Mail,
} from 'lucide-react';
import { INFO_PAGE_CONTENT } from '../data/siteContent';
import type { InfoPageId } from '../types/pdf';

interface InfoPageViewProps {
  pageId: InfoPageId;
  onNavigateHome: () => void;
  onOpenInfoPage: (pageId: InfoPageId) => void;
}

export const InfoPageView: React.FC<InfoPageViewProps> = ({
  pageId,
  onNavigateHome,
  onOpenInfoPage,
}) => {
  const [copied, setCopied] = useState(false);
  const content = INFO_PAGE_CONTENT[pageId];

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText('support@vellumpdf.app');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard failures in restricted contexts
    }
  };

  return (
    <section
      aria-labelledby="info-page-heading"
      className="max-w-[920px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16"
    >
      <div className="mb-8 pb-8 border-b border-[#E2E8F0]">
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
          {content.eyebrow} · Updated {content.lastUpdated}
        </p>

        <h1
          id="info-page-heading"
          className="font-display text-[32px] sm:text-[44px] font-extrabold text-[#0F172A] leading-[1.1] tracking-tight"
        >
          {content.heading}
        </h1>

        <p className="mt-4 text-[16px] sm:text-[17px] leading-[1.65] text-[#475569]">
          {content.subtitle}
        </p>
      </div>

      {/* Special Direct Contact Card on /contact */}
      {pageId === 'contact' && (
        <div className="mb-10 p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-[#475569]">
                Support &amp; Inquiries
              </p>
              <a
                href="mailto:support@vellumpdf.app"
                className="font-mono text-[15px] font-semibold text-[#0F172A] hover:text-[#2563EB] truncate block"
              >
                support@vellumpdf.app
              </a>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleCopyEmail}
              className="min-h-[42px] px-4 py-2 bg-white border border-[#E2E8F0] hover:border-[#2563EB] rounded-xl text-[13px] font-semibold text-[#0F172A] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-[#059669]" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Email</span>
                </>
              )}
            </button>
            <a
              href="mailto:support@vellumpdf.app"
              className="min-h-[42px] px-5 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-semibold rounded-xl shadow-sm shadow-[#2563EB]/25 inline-flex items-center gap-1.5 transition-colors"
            >
              <span>Send Email</span>
              <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}

      {/* Structured Content Sections */}
      <div className="space-y-9">
        {content.sections.map((section) => (
          <article
            key={section.heading}
            className="pb-8 border-b border-[#F1F5F9] last:border-b-0"
          >
            <h2 className="font-display text-[20px] sm:text-[22px] font-bold text-[#0F172A] leading-snug">
              {section.heading}
            </h2>
            <div className="mt-3 space-y-3.5 text-[15px] leading-[1.75] text-[#475569]">
              {section.paragraphs.map((p, idx) => (
                <p key={idx}>{p}</p>
              ))}
            </div>
            {section.link && (
              <div className="mt-4">
                {section.link.external ? (
                  <a
                    href={section.link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#2563EB] hover:text-[#1D4ED8] underline underline-offset-4"
                  >
                    <span>{section.link.label}</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </a>
                ) : (
                  <a
                    href={section.link.href}
                    onClick={(e) => {
                      e.preventDefault();
                      const target = section.link?.href.replace(/^\//, '') as InfoPageId;
                      onOpenInfoPage(target);
                    }}
                    className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#2563EB] hover:text-[#1D4ED8] underline underline-offset-4"
                  >
                    <span>{section.link.label}</span>
                  </a>
                )}
              </div>
            )}
          </article>
        ))}
      </div>

      {/* Cross-Navigation Footer inside Info Pages */}
      <div className="mt-10 pt-6 border-t border-[#E2E8F0] flex flex-wrap items-center gap-5 text-[13px] font-medium text-[#475569]">
        {(['about', 'privacy', 'terms', 'contact'] as InfoPageId[]).map((id) => (
          <a
            key={id}
            href={`/${id}`}
            onClick={(e) => {
              e.preventDefault();
              onOpenInfoPage(id);
            }}
            className={
              id === pageId
                ? 'text-[#2563EB] font-semibold'
                : 'hover:text-[#0F172A] transition-colors'
            }
          >
            {id === 'about'
              ? 'About Vellum'
              : id === 'privacy'
                ? 'Privacy Policy'
                : id === 'terms'
                  ? 'Terms of Service'
                  : 'Contact'}
          </a>
        ))}
      </div>
    </section>
  );
};
