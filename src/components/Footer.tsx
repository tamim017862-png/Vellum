import React from 'react';
import { EDITORIAL_GUIDES } from '../data/guides';
import { PDF_TOOLS } from '../data/tools';
import type { GuideSlug, InfoPageId, ToolId } from '../types/pdf';
import { BrandLogo } from './BrandLogo';
import { PWAInstallButton } from './PWAInstallButton';

interface FooterProps {
  onNavigateHome: (sectionId?: string) => void;
  onOpenTool: (id: ToolId) => void;
  onOpenInfoPage: (id: InfoPageId) => void;
  onOpenGuidesIndex: () => void;
  onOpenGuideArticle: (slug: GuideSlug) => void;
}

export const Footer: React.FC<FooterProps> = ({
  onNavigateHome,
  onOpenTool,
  onOpenInfoPage,
  onOpenGuidesIndex,
  onOpenGuideArticle,
}) => {
  return (
    <footer className="bg-[#070B14] text-slate-300 border-t border-slate-800/90">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-10 border-b border-slate-800/80">
          {/* Brand column */}
          <div className="md:col-span-4 space-y-4">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onNavigateHome();
              }}
              className="inline-flex items-center gap-2.5 text-white"
            >
              <BrandLogo className="w-7 h-7" />
              <span className="font-display text-[20px] font-bold tracking-[-0.03em]">
                Vellum
              </span>
            </a>
            <p className="text-[13.5px] text-slate-400 max-w-sm leading-relaxed">
              Private browser-first PDF workspace to merge, split, compress,
              sign, convert, and analyze documents with zero account friction.
            </p>
            <div className="pt-1">
              <PWAInstallButton />
            </div>
          </div>

          {/* PDF Tools links */}
          <div className="md:col-span-5">
            <h3 className="text-[12px] font-display font-semibold text-slate-200 mb-3.5">
              PDF Tools
            </h3>
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-y-2.5 gap-x-3 text-[13px] text-slate-400">
              {PDF_TOOLS.map((tool) => (
                <li key={tool.id}>
                  <a
                    href={`/${tool.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      onOpenTool(tool.id);
                    }}
                    className="hover:text-blue-400 transition-colors block truncate max-w-full"
                  >
                    {tool.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company, Guides & Legal links */}
          <div className="md:col-span-3">
            <h3 className="text-[12px] font-display font-semibold text-slate-200 mb-3.5">
              Resources &amp; Legal
            </h3>
            <ul className="space-y-2.5 text-[13px] text-slate-400">
              <li>
                <a
                  href="/guides"
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenGuidesIndex();
                  }}
                  className="font-medium text-white hover:text-blue-400 transition-colors"
                >
                  PDF Productivity Guides
                </a>
              </li>
              {EDITORIAL_GUIDES.slice(0, 2).map((guide) => (
                <li key={guide.slug}>
                  <a
                    href={guide.path}
                    onClick={(e) => {
                      e.preventDefault();
                      onOpenGuideArticle(guide.slug);
                    }}
                    className="hover:text-blue-400 transition-colors block truncate"
                  >
                    {guide.relatedToolName} Guide
                  </a>
                </li>
              ))}
              <li>
                <a
                  href="/about"
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenInfoPage('about');
                  }}
                  className="hover:text-blue-400 transition-colors"
                >
                  About
                </a>
              </li>
              <li>
                <a
                  href="/privacy"
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenInfoPage('privacy');
                  }}
                  className="hover:text-blue-400 transition-colors"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="/terms"
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenInfoPage('terms');
                  }}
                  className="hover:text-blue-400 transition-colors"
                >
                  Terms of Service
                </a>
              </li>
              <li>
                <a
                  href="/contact"
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenInfoPage('contact');
                  }}
                  className="hover:text-blue-400 transition-colors"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[12px] text-slate-400">
          <p>
            © {new Date().getFullYear()} Vellum. 13 browser-local PDF engines +
            opt-in Gemini AI analysis.
          </p>
          <p className="font-mono tabular-nums text-slate-500">
            Zero file storage · No watermarks
          </p>
        </div>
      </div>
    </footer>
  );
};
