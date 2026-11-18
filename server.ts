import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  EDITORIAL_GUIDES,
  GUIDE_SLUGS,
  TOOL_BEST_PRACTICES,
  getGuideBySlug,
} from './src/data/guides.ts';
import {
  ALL_INDEXABLE_PATHS,
  GUIDES_INDEX_SEO,
  HOME_FAQS,
  INFO_PAGE_CONTENT,
  INFO_PAGE_IDS,
  NOT_FOUND_SEO,
  RELATED_TOOLS_MAP,
  SITE_HOME_SEO,
  TOOL_IDS,
  TOOL_PAGE_CONTENT,
  getPageSeo,
  getRouteLastMod,
  resolveRouteFromPathname,
} from './src/data/siteContent.ts';
import { PDF_TOOLS } from './src/data/tools.ts';
import type {
  AppRouteView,
  GuideSlug,
  InfoPageId,
  ToolId,
} from './src/types/pdf.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MODEL_ID = 'gemini-4-hydrogen';
const MAX_DOCUMENT_CHARS = 140000;

function getAdSenseClientId(): string | null {
  const val = process.env.ADSENSE_CLIENT_ID?.trim();
  if (val && /^ca-pub-\d{10,20}$/.test(val)) {
    return val;
  }
  return null;
}

// Rate limit: 10 requests/min and 120 requests/24h per IP on /api/ai/*
const AI_RATE_LIMIT_MAX = 10;
const AI_RATE_LIMIT_WINDOW_MS = 60_000;
const AI_DAILY_LIMIT_MAX = 120;
const AI_DAILY_WINDOW_MS = 24 * 60 * 60_000;
const aiRequestLog = new Map<string, number[]>();
const aiDailyLog = new Map<string, number[]>();

// Periodically prune stale IP timestamps so memory stays bounded
setInterval(() => {
  const now = Date.now();
  const minCutoff = now - AI_RATE_LIMIT_WINDOW_MS;
  for (const [ip, timestamps] of aiRequestLog.entries()) {
    const active = timestamps.filter((ts) => ts > minCutoff);
    if (active.length === 0) {
      aiRequestLog.delete(ip);
    } else {
      aiRequestLog.set(ip, active);
    }
  }
  const dayCutoff = now - AI_DAILY_WINDOW_MS;
  for (const [ip, timestamps] of aiDailyLog.entries()) {
    const active = timestamps.filter((ts) => ts > dayCutoff);
    if (active.length === 0) {
      aiDailyLog.delete(ip);
    } else {
      aiDailyLog.set(ip, active);
    }
  }
}, AI_RATE_LIMIT_WINDOW_MS).unref();

function getGeminiApiKey(): string | null {
  const candidates = [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.API_KEY,
  ];
  for (const raw of candidates) {
    const val = raw?.trim();
    if (val && val !== 'MY_GEMINI_API_KEY') {
      return val;
    }
  }
  return null;
}

function sanitizeApiStatus(status: number): number {
  if (status === 403) return 401;
  if (status === 502 || status === 503 || status === 504) return 500;
  if (status >= 400 && status < 600) return status;
  return 500;
}

function aiRateLimiter(req: Request, res: Response, next: NextFunction) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (!getGeminiApiKey()) {
    res.status(500).json({
      error:
        'Gemini AI is not configured on the server yet. Please add or select GEMINI_API_KEY in Settings > Secrets, then reload and try again.',
    });
    return;
  }

  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const minCutoff = now - AI_RATE_LIMIT_WINDOW_MS;
  const recentTimestamps = (aiRequestLog.get(clientIp) ?? []).filter(
    (ts) => ts > minCutoff
  );

  if (recentTimestamps.length >= AI_RATE_LIMIT_MAX) {
    const oldest = recentTimestamps[0] ?? now;
    const retryAfterSec = Math.max(
      1,
      Math.ceil((oldest + AI_RATE_LIMIT_WINDOW_MS - now) / 1000)
    );
    res.setHeader('Retry-After', String(retryAfterSec));
    res.setHeader('X-RateLimit-Limit', String(AI_RATE_LIMIT_MAX));
    res.setHeader('X-RateLimit-Remaining', '0');
    res.status(429).json({
      error: `Rate limit reached: you can send up to ${AI_RATE_LIMIT_MAX} AI requests per minute. Please wait ${retryAfterSec} seconds and try again.`,
    });
    return;
  }

  const dayCutoff = now - AI_DAILY_WINDOW_MS;
  const dailyTimestamps = (aiDailyLog.get(clientIp) ?? []).filter(
    (ts) => ts > dayCutoff
  );
  if (dailyTimestamps.length >= AI_DAILY_LIMIT_MAX) {
    const oldestDaily = dailyTimestamps[0] ?? now;
    const retryAfterSec = Math.max(
      60,
      Math.ceil((oldestDaily + AI_DAILY_WINDOW_MS - now) / 1000)
    );
    res.setHeader('Retry-After', String(retryAfterSec));
    res.status(429).json({
      error: `Daily fair-use limit reached (${AI_DAILY_LIMIT_MAX} AI requests per 24 hours). All 13 browser-local PDF tools remain unlimited.`,
    });
    return;
  }

  recentTimestamps.push(now);
  aiRequestLog.set(clientIp, recentTimestamps);
  dailyTimestamps.push(now);
  aiDailyLog.set(clientIp, dailyTimestamps);

  res.setHeader('X-RateLimit-Limit', String(AI_RATE_LIMIT_MAX));
  res.setHeader(
    'X-RateLimit-Remaining',
    String(Math.max(0, AI_RATE_LIMIT_MAX - recentTimestamps.length))
  );
  next();
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured in the server environment.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function isRetryableGeminiError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : '';
  return (
    msg.includes('503') ||
    msg.includes('unavailable') ||
    msg.includes('overloaded') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('fetch failed')
  );
}

async function withGeminiRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === maxRetries || !isRetryableGeminiError(err)) {
        throw err;
      }
      const delayMs = Math.min(2500, 450 * 2 ** attempt + Math.random() * 200);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

function parseSummaryJson(rawText: string): Record<string, unknown> {
  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        const sliced = JSON.parse(cleaned.slice(start, end + 1));
        if (sliced && typeof sliced === 'object' && !Array.isArray(sliced)) {
          return sliced as Record<string, unknown>;
        }
      } catch {
        // Fall through to plain-text fallback below
      }
    }
  }

  return {
    overview: cleaned || 'Summary generated.',
    keyPoints: [],
    actionItems: [],
    suggestedQuestions: [],
  };
}

function sanitizeTextSlice(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.trim().slice(0, MAX_DOCUMENT_CHARS);
}

function formatGeminiError(err: unknown): { status: number; message: string } {
  const rawMessage =
    err instanceof Error ? err.message : 'Unable to complete AI request.';
  const lower = rawMessage.toLowerCase();

  if (
    lower.includes('free tier is not available') ||
    lower.includes('project-unavailable') ||
    lower.includes('set up billing') ||
    lower.includes('upgrade to the paid tier')
  ) {
    return {
      status: 401,
      message:
        'The Gemini API free tier is not available for the currently selected API key project. Please select a billing-enabled or eligible Gemini API key in Settings > Secrets, or enable billing at aistudio.google.com/billing.',
    };
  }
  if (
    lower.includes('api_key') ||
    lower.includes('api key') ||
    lower.includes('permission_denied') ||
    lower.includes('403')
  ) {
    return {
      status: 401,
      message:
        'AI service authentication failed for the configured API key. Please check or select a valid Gemini API key in Settings > Secrets.',
    };
  }
  if (
    lower.includes('resource_exhausted') ||
    lower.includes('quota') ||
    lower.includes('429')
  ) {
    return {
      status: 429,
      message:
        'AI request rate limit or quota reached. Please wait a moment or check your billing-enabled key in Settings > Secrets.',
    };
  }
  if (lower.includes('not_found') || lower.includes('404')) {
    return {
      status: 500,
      message:
        'The requested Gemini model is temporarily unavailable. Please try again shortly.',
    };
  }
  return { status: 500, message: rawMessage };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getBaseUrl(req: Request): string {
  const envUrl = process.env.APP_URL?.trim();
  if (
    envUrl &&
    envUrl !== 'MY_APP_URL' &&
    (envUrl.startsWith('https://') || envUrl.startsWith('http://'))
  ) {
    return envUrl.replace(/\/+$/, '');
  }
  const host = req.get('host');
  if (host) {
    return `${req.protocol}://${host}`.replace(/\/+$/, '');
  }
  return `http://localhost:${PORT}`;
}

function renderSsrBodyHtml(view: AppRouteView): string {
  const navLinks = [
    '<a href="/">Home</a>',
    '<a href="/guides">Guides</a>',
    ...TOOL_IDS.map((id) => {
      const t = PDF_TOOLS.find((item) => item.id === id);
      return `<a href="/${id}">${escapeHtml(t?.name ?? id)}</a>`;
    }),
    '<a href="/about">About</a>',
    '<a href="/privacy">Privacy Policy</a>',
    '<a href="/terms">Terms of Service</a>',
    '<a href="/contact">Contact</a>',
  ].join(' · ');

  let mainHtml = '';

  if (view === 'home') {
    const toolsList = PDF_TOOLS.map(
      (t) =>
        `<li><a href="/${t.id}">${escapeHtml(t.name)}</a> — ${escapeHtml(
          t.description
        )}</li>`
    ).join('');

    const guidesList = EDITORIAL_GUIDES.map(
      (g) =>
        `<li><a href="${escapeHtml(g.path)}">${escapeHtml(
          g.title
        )}</a> — ${escapeHtml(g.summary)}</li>`
    ).join('');

    const homeFaqsHtml = HOME_FAQS.map(
      (faq) =>
        `<article><h3>${escapeHtml(faq.question)}</h3><p>${escapeHtml(
          faq.answer
        )}</p></article>`
    ).join('');

    mainHtml = `
      <main>
        <h1>${escapeHtml(SITE_HOME_SEO.heading)}</h1>
        <p>${escapeHtml(SITE_HOME_SEO.intro)}</p>
        <section>
          <h2>All 15 PDF &amp; AI Tools</h2>
          <ul>${toolsList}</ul>
        </section>
        <section>
          <h2>Practical PDF Guides</h2>
          <ul>${guidesList}</ul>
        </section>
        <section>
          <h2>Frequently Asked Questions</h2>
          ${homeFaqsHtml}
        </section>
      </main>`;
  } else if (view === 'guides') {
    const guidesList = EDITORIAL_GUIDES.map(
      (g) =>
        `<article><h2><a href="${escapeHtml(g.path)}">${escapeHtml(
          g.title
        )}</a></h2><p>${escapeHtml(g.category)} · ${escapeHtml(
          g.readTime
        )} · <time datetime="${escapeHtml(g.updatedAtIso)}">${escapeHtml(
          g.updatedAt
        )}</time></p><p>${escapeHtml(g.summary)}</p></article>`
    ).join('');

    mainHtml = `
      <main>
        <nav aria-label="Breadcrumb"><a href="/">Home</a> / Guides</nav>
        <h1>${escapeHtml(GUIDES_INDEX_SEO.heading)}</h1>
        <p>${escapeHtml(GUIDES_INDEX_SEO.intro)}</p>
        ${guidesList}
      </main>`;
  } else if ((GUIDE_SLUGS as string[]).includes(view)) {
    const guide = getGuideBySlug(view as GuideSlug)!;
    const sectionsHtml = guide.sections
      .map((section) => {
        const paras = section.paragraphs
          .map((p) => `<p>${escapeHtml(p)}</p>`)
          .join('');
        const bullets =
          section.bullets && section.bullets.length > 0
            ? `<ul>${section.bullets
                .map((b) => `<li>${escapeHtml(b)}</li>`)
                .join('')}</ul>`
            : '';
        return `<section><h2>${escapeHtml(section.heading)}</h2>${paras}${bullets}</section>`;
      })
      .join('');

    mainHtml = `
      <main>
        <article>
          <nav aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/guides">Guides</a> / ${escapeHtml(guide.relatedToolName)}</nav>
          <h1>${escapeHtml(guide.title)}</h1>
          <p>${escapeHtml(guide.category)} · ${escapeHtml(guide.readTime)} · Updated <time datetime="${escapeHtml(guide.updatedAtIso)}">${escapeHtml(guide.updatedAt)}</time></p>
          <p>${escapeHtml(guide.summary)}</p>
          ${sectionsHtml}
          <p><a href="/${guide.relatedToolId}">Launch ${escapeHtml(guide.relatedToolName)}</a></p>
        </article>
      </main>`;
  } else if (view === 'not-found') {
    const popularList = PDF_TOOLS.filter((t) => t.popular)
      .map(
        (t) =>
          `<li><a href="/${t.id}">${escapeHtml(t.name)}</a> — ${escapeHtml(
            t.description
          )}</li>`
      )
      .join('');

    mainHtml = `
      <main>
        <h1>${escapeHtml(NOT_FOUND_SEO.heading)}</h1>
        <p>${escapeHtml(NOT_FOUND_SEO.intro)}</p>
        <p><a href="/">Return to Home</a></p>
        <section>
          <h2>Popular PDF Tools</h2>
          <ul>${popularList}</ul>
        </section>
      </main>`;
  } else if ((INFO_PAGE_IDS as string[]).includes(view)) {
    const info = INFO_PAGE_CONTENT[view as InfoPageId];
    const sectionsHtml = info.sections
      .map((section) => {
        const paras = section.paragraphs
          .map((p) => `<p>${escapeHtml(p)}</p>`)
          .join('');
        const linkHtml = section.link
          ? `<p><a href="${escapeHtml(section.link.href)}"${
              section.link.external
                ? ' target="_blank" rel="noopener noreferrer"'
                : ''
            }>${escapeHtml(section.link.label)}</a></p>`
          : '';
        return `<section><h2>${escapeHtml(section.heading)}</h2>${paras}${linkHtml}</section>`;
      })
      .join('');

    const extraContactHtml =
      view === 'contact'
        ? '<p>Email: <a href="mailto:support@vellumpdf.app">support@vellumpdf.app</a></p>'
        : '';

    mainHtml = `
      <main>
        <nav aria-label="Breadcrumb"><a href="/">Home</a> / ${escapeHtml(info.heading)}</nav>
        <h1>${escapeHtml(info.heading)}</h1>
        <p>${escapeHtml(info.subtitle)}</p>
        ${extraContactHtml}
        ${sectionsHtml}
      </main>`;
  } else {
    const toolId = view as ToolId;
    const tool = PDF_TOOLS.find((t) => t.id === toolId);
    const guide = TOOL_PAGE_CONTENT[toolId];
    const bestPractice = TOOL_BEST_PRACTICES[toolId];

    const stepsHtml = guide.steps
      .map(
        (step) =>
          `<li id="step-${escapeHtml(step.number)}"><h3>${escapeHtml(step.number)} — ${escapeHtml(
            step.title
          )}</h3><p>${escapeHtml(step.description)}</p></li>`
      )
      .join('');

    const bestPracticeHtml = bestPractice
      ? `<section><h2>${escapeHtml(bestPractice.heading)}</h2><ul>${bestPractice.points
          .map(
            (pt) =>
              `<li><strong>${escapeHtml(pt.label)}:</strong> ${escapeHtml(
                pt.detail
              )}</li>`
          )
          .join('')}</ul><p>Tip: ${escapeHtml(bestPractice.proTip)}</p></section>`
      : '';

    const faqsHtml = guide.faqs
      .map(
        (faq) =>
          `<article><h3>${escapeHtml(faq.question)}</h3><p>${escapeHtml(
            faq.answer
          )}</p></article>`
      )
      .join('');

    const relatedToolsHtml = (RELATED_TOOLS_MAP[toolId] ?? [])
      .map((relId) => {
        const rel = PDF_TOOLS.find((t) => t.id === relId);
        return rel
          ? `<li><a href="/${rel.id}">${escapeHtml(rel.name)}</a> — ${escapeHtml(
              rel.description
            )}</li>`
          : '';
      })
      .join('');

    mainHtml = `
      <main>
        <nav aria-label="Breadcrumb"><a href="/">Home</a> / ${escapeHtml(tool?.name ?? guide.heading)}</nav>
        <h1>${escapeHtml(tool?.name ?? guide.heading)}</h1>
        <p>${escapeHtml(tool?.description ?? guide.metaDescription)}</p>
        <section>
          <h2>${escapeHtml(guide.heading)}</h2>
          <p>${escapeHtml(guide.intro)}</p>
        </section>
        <section>
          <h2>Step-by-Step Instructions</h2>
          <ol>${stepsHtml}</ol>
        </section>
        ${bestPracticeHtml}
        <section>
          <h2>Frequently Asked Questions</h2>
          ${faqsHtml}
        </section>
        ${
          relatedToolsHtml
            ? `<section><h2>Related PDF Tools</h2><ul>${relatedToolsHtml}</ul></section>`
            : ''
        }
      </main>`;
  }

  return `<div data-ssr-fallback="true" style="max-width:960px;margin:0 auto;padding:32px 20px;font-family:'Plus Jakarta Sans Variable','Plus Jakarta Sans','Outfit Variable',system-ui,sans-serif;color:#0F172A;">
    <header style="margin-bottom:24px;border-bottom:1px solid #EAECEF;padding-bottom:16px;">
      <nav aria-label="Primary">${navLinks}</nav>
    </header>
    ${mainHtml}
    <footer style="margin-top:32px;border-top:1px solid #EAECEF;padding-top:16px;">
      <p><a href="/guides">Guides</a> · <a href="/about">About</a> · <a href="/privacy">Privacy Policy</a> · <a href="/terms">Terms of Service</a> · <a href="/contact">Contact</a></p>
    </footer>
  </div>`;
}

function injectSeoAndContentHtml(
  templateHtml: string,
  req: Request
): { html: string; statusCode: number; canonicalUrl: string; noindex: boolean } {
  const view = resolveRouteFromPathname(req.path);
  const baseUrl = getBaseUrl(req);
  const seo = getPageSeo(view, baseUrl);
  const canonicalUrl = seo.noindex
    ? `${baseUrl}${req.path}`
    : `${baseUrl}${seo.path === '/' ? '/' : seo.path}`;
  const ogImageUrl = `${baseUrl}/og-image.png`;

  const safeTitle = escapeHtml(seo.title);
  const safeDesc = escapeHtml(seo.metaDescription);
  const safeCanonical = escapeHtml(canonicalUrl);
  const safeOgImage = escapeHtml(ogImageUrl);
  const safeOgImageAlt = escapeHtml(seo.ogImageAlt);
  const safeOgType = escapeHtml(seo.ogType);
  const robotsValue = seo.noindex
    ? 'noindex, nofollow'
    : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

  let html = templateHtml;
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${safeTitle}</title>`);
  html = html.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${safeDesc}" />`
  );
  html = html.replace(
    /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="robots" content="${robotsValue}" />`
  );
  html = html.replace(
    /<meta\s+property="og:type"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:type" content="${safeOgType}" />`
  );
  html = html.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:url" content="${safeCanonical}" />`
  );
  html = html.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:title" content="${safeTitle}" />`
  );
  html = html.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${safeDesc}" />`
  );
  html = html.replace(
    /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:image" content="${safeOgImage}" />`
  );
  html = html.replace(
    /<meta\s+property="og:image:alt"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:image:alt" content="${safeOgImageAlt}" />`
  );
  html = html.replace(
    /<meta\s+name="twitter:url"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:url" content="${safeCanonical}" />`
  );
  html = html.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:title" content="${safeTitle}" />`
  );
  html = html.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:description" content="${safeDesc}" />`
  );
  html = html.replace(
    /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:image" content="${safeOgImage}" />`
  );
  html = html.replace(
    /<meta\s+name="twitter:image:alt"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:image:alt" content="${safeOgImageAlt}" />`
  );

  const articleMetaTags =
    seo.ogType === 'article'
      ? [
          seo.publishedTime
            ? `<meta property="article:published_time" content="${escapeHtml(seo.publishedTime)}" />`
            : '',
          seo.modifiedTime
            ? `<meta property="article:modified_time" content="${escapeHtml(seo.modifiedTime)}" />`
            : '',
          seo.articleSection
            ? `<meta property="article:section" content="${escapeHtml(seo.articleSection)}" />`
            : '',
        ]
          .filter(Boolean)
          .join('\n    ')
      : '';
  html = html.replace(/<!--\s*article-meta\s*-->/i, articleMetaTags);

  const canonicalTag = seo.noindex
    ? ''
    : `<link rel="canonical" href="${safeCanonical}" />`;
  if (/<!--\s*canonical-link\s*-->/i.test(html)) {
    html = html.replace(/<!--\s*canonical-link\s*-->/i, canonicalTag);
  } else {
    html = html.replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
      canonicalTag
    );
  }

  const adsenseClientId = getAdSenseClientId();
  const adsenseTags = adsenseClientId
    ? `<meta name="google-adsense-account" content="${adsenseClientId}" />\n    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}" crossorigin="anonymous"></script>`
    : '';
  html = html.replace(/<!--\s*adsense-head\s*-->/i, adsenseTags);

  const structuredDataScript = seo.structuredData
    ? `<script type="application/ld+json">${JSON.stringify(
        seo.structuredData
      ).replace(/<\/script/gi, '<\\/script')}</script>`
    : '';
  html = html.replace(
    /<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/i,
    structuredDataScript
  );

  const ssrContent = renderSsrBodyHtml(view);
  html = html.replace(
    /<div id="root"><\/div>/i,
    `<div id="root">${ssrContent}</div>`
  );

  return {
    html,
    statusCode: view === 'not-found' ? 404 : 200,
    canonicalUrl,
    noindex: Boolean(seo.noindex),
  };
}

function extractInlineScriptHashes(html: string): string[] {
  const hashes = new Set<string>();
  const scriptRegex = /<script(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = scriptRegex.exec(html)) !== null) {
    const content = match[1];
    if (content && content.trim().length > 0) {
      const digest = crypto
        .createHash('sha256')
        .update(content, 'utf8')
        .digest('base64');
      hashes.add(`'sha256-${digest}'`);
    }
  }
  return Array.from(hashes);
}

function buildContentSecurityPolicy(html?: string): string {
  const isProd = process.env.NODE_ENV === 'production';
  const hasAdSense = Boolean(getAdSenseClientId());
  const scriptHashes = html ? extractInlineScriptHashes(html) : [];

  const adScriptHosts = hasAdSense
    ? [
        'https://pagead2.googlesyndication.com',
        'https://partner.googleadservices.com',
        'https://www.googletagservices.com',
        'https://tpc.googlesyndication.com',
        'https://fundingchoicesmessages.google.com',
        'https://ep1.adtrafficquality.google',
        'https://ep2.adtrafficquality.google',
      ]
    : [];

  const adFrameHosts = hasAdSense
    ? [
        'https://googleads.g.doubleclick.net',
        'https://tpc.googlesyndication.com',
        'https://www.google.com',
        'https://fundingchoicesmessages.google.com',
        'https://ep1.adtrafficquality.google',
        'https://ep2.adtrafficquality.google',
      ]
    : [];

  const adImgHosts = hasAdSense
    ? [
        'https://pagead2.googlesyndication.com',
        'https://googleads.g.doubleclick.net',
        'https://tpc.googlesyndication.com',
        'https://www.google.com',
        'https://www.gstatic.com',
      ]
    : [];

  const adConnectHosts = hasAdSense
    ? [
        'https://pagead2.googlesyndication.com',
        'https://googleads.g.doubleclick.net',
        'https://ep1.adtrafficquality.google',
        'https://ep2.adtrafficquality.google',
        'https://fundingchoicesmessages.google.com',
      ]
    : [];

  const scriptSources = [
    "'self'",
    "'wasm-unsafe-eval'",
    ...scriptHashes,
    ...adScriptHosts,
  ].join(' ');

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    ...(isProd ? ["frame-ancestors 'none'"] : []),
    `script-src ${scriptSources}`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    `img-src ${["'self'", 'blob:', 'data:', ...adImgHosts].join(' ')}`,
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    `frame-src ${["'self'", ...adFrameHosts].join(' ')}`,
    `connect-src ${["'self'", ...adConnectHosts].join(' ')}`,
  ];

  return directives.join('; ');
}

function applySecurityHeaders(res: Response, html?: string): void {
  const isProd = process.env.NODE_ENV === 'production';
  res.setHeader('Content-Security-Policy', buildContentSecurityPolicy(html));
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (isProd) {
    res.setHeader('X-Frame-Options', 'DENY');
  } else {
    res.removeHeader('X-Frame-Options');
  }
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );
}

const COMPRESSIBLE_CONTENT_TYPE_RE =
  /^(?:text\/(?:html|css|javascript|plain|xml)|application\/(?:javascript|x-javascript|ecmascript|json|ld\+json|xml)|image\/svg\+xml)(?:;|\s|$)/i;

function negotiateEncoding(req: Request): 'br' | 'gzip' | null {
  const header = req.headers['accept-encoding'];
  if (!header) return null;
  const raw = Array.isArray(header) ? header.join(',') : header;
  if (/\bbr\b/i.test(raw)) return 'br';
  if (/\bgzip\b/i.test(raw)) return 'gzip';
  return null;
}

function compressionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (req.path === '/api' || req.path.startsWith('/api/')) {
    next();
    return;
  }

  const encoding = negotiateEncoding(req);
  res.vary('Accept-Encoding');

  if (!encoding || req.method === 'HEAD') {
    next();
    return;
  }

  const origWriteHead = res.writeHead.bind(res);
  const origWrite = res.write.bind(res);
  const origEnd = res.end.bind(res);

  let initialized = false;
  let waitingDrain = false;
  let zStream: zlib.BrotliCompress | zlib.Gzip | null = null;

  const initCompression = (
    statusCode: number,
    explicitHeaders?: Record<string, unknown>
  ) => {
    if (initialized) return;
    initialized = true;

    if (
      statusCode === 204 ||
      statusCode === 304 ||
      res.getHeader('Content-Encoding')
    ) {
      return;
    }

    let contentType = res.getHeader('Content-Type');
    if (!contentType && explicitHeaders) {
      for (const [k, v] of Object.entries(explicitHeaders)) {
        if (k.toLowerCase() === 'content-type' && v !== undefined) {
          contentType = String(v);
          break;
        }
      }
    }

    const typeStr = Array.isArray(contentType)
      ? contentType[0]
      : String(contentType ?? '');

    if (!COMPRESSIBLE_CONTENT_TYPE_RE.test(typeStr)) {
      return;
    }

    res.setHeader('Content-Encoding', encoding);
    res.removeHeader('Content-Length');
    if (explicitHeaders) {
      for (const key of Object.keys(explicitHeaders)) {
        if (key.toLowerCase() === 'content-length') {
          delete explicitHeaders[key];
        }
      }
    }

    zStream =
      encoding === 'br'
        ? zlib.createBrotliCompress({
            params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 },
          })
        : zlib.createGzip();

    zStream.on('data', (chunk: Buffer) => {
      const ok = origWrite(chunk);
      if (!ok && zStream && !zStream.destroyed) {
        zStream.pause();
        res.once('drain', () => {
          if (zStream && !zStream.destroyed) {
            zStream.resume();
          }
        });
      }
    });
    zStream.on('drain', () => {
      if (waitingDrain && !res.writableNeedDrain) {
        waitingDrain = false;
        res.emit('drain');
      }
    });
    zStream.on('end', () => {
      origEnd();
    });
    res.on('close', () => {
      if (zStream && !zStream.destroyed) {
        zStream.destroy();
      }
    });
  };

  res.writeHead = function patchedWriteHead(
    statusCode: number,
    statusMessageOrHeaders?: unknown,
    maybeHeaders?: unknown
  ): Response {
    const headerObj =
      typeof statusMessageOrHeaders === 'object' &&
      statusMessageOrHeaders !== null
        ? (statusMessageOrHeaders as Record<string, unknown>)
        : typeof maybeHeaders === 'object' && maybeHeaders !== null
          ? (maybeHeaders as Record<string, unknown>)
          : undefined;

    if (headerObj && !Array.isArray(headerObj)) {
      for (const [k, v] of Object.entries(headerObj)) {
        if (v !== undefined) {
          res.setHeader(k, v as string | number | readonly string[]);
        }
      }
    }

    initCompression(statusCode, headerObj);

    if (typeof statusMessageOrHeaders === 'string') {
      return origWriteHead(
        statusCode,
        statusMessageOrHeaders
      ) as unknown as Response;
    }
    return origWriteHead(statusCode) as unknown as Response;
  } as typeof res.writeHead;

  res.write = function patchedWrite(
    chunk: unknown,
    encodingOrCb?: unknown,
    cb?: unknown
  ): boolean {
    initCompression(res.statusCode);
    if (!zStream) {
      return (origWrite as (...args: unknown[]) => boolean)(
        chunk,
        encodingOrCb,
        cb
      );
    }
    let ok: boolean;
    if (typeof encodingOrCb === 'function') {
      ok = zStream.write(chunk, encodingOrCb as (err?: Error | null) => void);
    } else if (typeof encodingOrCb === 'string') {
      ok = zStream.write(
        chunk,
        encodingOrCb as BufferEncoding,
        cb as ((err?: Error | null) => void) | undefined
      );
    } else {
      ok = zStream.write(chunk);
    }
    if (!ok) {
      waitingDrain = true;
    }
    return ok;
  } as typeof res.write;

  res.end = function patchedEnd(
    chunk?: unknown,
    encodingOrCb?: unknown,
    cb?: unknown
  ): Response {
    const hasChunk =
      chunk !== undefined && chunk !== null && typeof chunk !== 'function';
    if (hasChunk || initialized) {
      initCompression(res.statusCode);
    } else {
      initialized = true;
    }

    if (!zStream) {
      return (origEnd as (...args: unknown[]) => Response)(
        chunk,
        encodingOrCb,
        cb
      );
    }

    if (typeof chunk === 'function') {
      zStream.end(chunk as () => void);
      return res;
    }
    if (typeof encodingOrCb === 'function') {
      zStream.end(chunk, encodingOrCb as () => void);
      return res;
    }
    if (hasChunk) {
      if (typeof encodingOrCb === 'string') {
        zStream.end(
          chunk,
          encodingOrCb as BufferEncoding,
          cb as (() => void) | undefined
        );
      } else {
        zStream.end(chunk);
      }
    } else {
      zStream.end();
    }
    return res;
  } as typeof res.end;

  next();
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use((_req, res, next) => {
    applySecurityHeaders(res);
    next();
  });
  app.use(compressionMiddleware);

  // Dedicated JSON API router — guarantees JSON responses and JSON errors on all /api/* routes
  const apiRouter = express.Router();
  apiRouter.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  apiRouter.use(express.json({ limit: '10mb' }));

  apiRouter.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  apiRouter.post('/vitals', (req, res) => {
    const metrics = req.body?.metrics;
    if (!Array.isArray(metrics) || metrics.length > 10) {
      res.status(400).json({ error: 'Invalid vitals payload.' });
      return;
    }
    res.status(204).end();
  });

  // Apply 10 req/min/IP rate limiter across all AI routes
  apiRouter.use('/ai', aiRateLimiter);

  apiRouter.post('/ai/summarize', async (req, res) => {
    try {
      const fileName =
        typeof req.body?.fileName === 'string'
          ? req.body.fileName.slice(0, 200)
          : 'Document.pdf';
      const pageCount = Number(req.body?.pageCount) || 1;
      const mode =
        typeof req.body?.mode === 'string' ? req.body.mode : 'executive';
      const documentText = sanitizeTextSlice(req.body?.text);

      if (!documentText) {
        res.status(400).json({
          error:
            'No readable text was found in this PDF. Scanned image-only PDFs require OCR before text summarization.',
        });
        return;
      }

      const ai = getGeminiClient();
      const focusNote =
        mode === 'action-items'
          ? 'Emphasize concrete action items, deadlines, obligations, and next steps.'
          : mode === 'bullet-points'
            ? 'Provide concise, scannable bullet-point takeaways with page citations where available.'
            : 'Provide a balanced executive summary covering purpose, key findings, and notable clauses.';

      const response = await withGeminiRetry(() =>
        ai.models.generateContent({
          model: MODEL_ID,
          contents: `Document Name: ${fileName}\nPages: ${pageCount}\n\nExtracted Document Text:\n${documentText}`,
          config: {
            systemInstruction: `You are Vellum AI, a precise, factual PDF document analyst. Analyze only the provided extracted PDF text. Cite page numbers like [Page X] when referencing specific points. ${focusNote}`,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: {
                  type: Type.STRING,
                  description: 'Concise descriptive title of the document.',
                },
                overview: {
                  type: Type.STRING,
                  description:
                    '2-4 sentence executive overview of the document contents.',
                },
                keyPoints: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description:
                    '4 to 7 key findings or takeaways, with [Page X] citations when present.',
                },
                actionItems: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description:
                    'Up to 5 actionable items, obligations, or next steps found in the text.',
                },
                suggestedQuestions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description:
                    '3 insightful follow-up questions a reader might ask about this document.',
                },
              },
              required: [
                'title',
                'overview',
                'keyPoints',
                'actionItems',
                'suggestedQuestions',
              ],
            },
          },
        })
      );

      const parsed = parseSummaryJson(response.text ?? '{}');
      res.json({
        title:
          typeof parsed.title === 'string' && parsed.title.trim()
            ? parsed.title.trim()
            : fileName,
        overview:
          typeof parsed.overview === 'string' && parsed.overview.trim()
            ? parsed.overview.trim()
            : 'Summary generated.',
        keyPoints: Array.isArray(parsed.keyPoints)
          ? parsed.keyPoints.map((pt) => String(pt))
          : [],
        actionItems: Array.isArray(parsed.actionItems)
          ? parsed.actionItems.map((it) => String(it))
          : [],
        suggestedQuestions: Array.isArray(parsed.suggestedQuestions)
          ? parsed.suggestedQuestions.map((q) => String(q))
          : [],
      });
    } catch (err) {
      const mapped = formatGeminiError(err);
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  apiRouter.post('/ai/chat', async (req, res) => {
    try {
      const fileName =
        typeof req.body?.fileName === 'string'
          ? req.body.fileName.slice(0, 200)
          : 'Document.pdf';
      const documentText = sanitizeTextSlice(req.body?.text);
      const messages = Array.isArray(req.body?.messages)
        ? req.body.messages
        : [];

      if (!documentText) {
        res.status(400).json({
          error: 'No readable text was provided from the PDF.',
        });
        return;
      }

      const lastUserMsg = [...messages]
        .reverse()
        .find((m) => m && m.role === 'user' && typeof m.text === 'string');

      if (!lastUserMsg || !lastUserMsg.text.trim()) {
        res.status(400).json({ error: 'Please enter a question to ask.' });
        return;
      }

      const historyText = messages
        .slice(-8, -1)
        .map(
          (m: { role?: string; text?: string }) =>
            `${m.role === 'user' ? 'User' : 'Assistant'}: ${String(
              m.text ?? ''
            ).slice(0, 2000)}`
        )
        .join('\n');

      const ai = getGeminiClient();
      const response = await withGeminiRetry(() =>
        ai.models.generateContent({
          model: MODEL_ID,
          contents: `Document Name: ${fileName}\n\nExtracted PDF Text:\n${documentText}\n\n${
            historyText ? `Recent Conversation:\n${historyText}\n\n` : ''
          }Current User Question:\n${lastUserMsg.text.trim().slice(0, 3000)}`,
          config: {
            systemInstruction:
              'You are Vellum AI, a factual document assistant. Answer the user question strictly based on the provided PDF text. Cite page numbers like [Page X] whenever possible. If the answer is not present in the document, state clearly that the document does not contain that information.',
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        })
      );

      res.json({
        reply:
          response.text?.trim() ||
          'I could not generate a response for that question.',
      });
    } catch (err) {
      const mapped = formatGeminiError(err);
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  // Catch-all for unknown /api routes — always return JSON, never HTML
  apiRouter.use((_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  // Dedicated JSON error middleware for /api (catches malformed JSON, 413 payload limits, etc.)
  apiRouter.use(
    (
      err: { status?: number; statusCode?: number; type?: string; message?: string },
      _req: Request,
      res: Response,
      _next: NextFunction
    ) => {
      if (err?.type === 'entity.too.large' || err?.status === 413) {
        res.status(413).json({
          error:
            'The extracted PDF text payload is too large for a single request. Please try a shorter document.',
        });
        return;
      }
      if (err?.type === 'entity.parse.failed' || err?.status === 400) {
        res.status(400).json({
          error: 'Invalid JSON request payload.',
        });
        return;
      }
      const rawStatus =
        typeof err?.status === 'number'
          ? err.status
          : typeof err?.statusCode === 'number'
            ? err.statusCode
            : 500;
      res.status(sanitizeApiStatus(rawStatus)).json({
        error: err?.message || 'Unexpected server error while processing API request.',
      });
    }
  );

  app.use('/api', apiRouter);

  // Canonical URL normalization (301 redirect trailing slashes & uppercase route paths)
  app.use((req, res, next) => {
    if (
      (req.method !== 'GET' && req.method !== 'HEAD') ||
      req.path === '/' ||
      req.path.startsWith('/api/') ||
      req.path.startsWith('/@') ||
      req.path.startsWith('/src/') ||
      req.path.startsWith('/node_modules/') ||
      req.path.includes('.')
    ) {
      next();
      return;
    }

    const normalized = req.path.replace(/\/+$/, '').toLowerCase() || '/';
    if (normalized !== req.path) {
      const queryIndex = req.url.indexOf('?');
      const querySuffix = queryIndex >= 0 ? req.url.slice(queryIndex) : '';
      res.redirect(301, `${normalized}${querySuffix}`);
      return;
    }
    next();
  });

  // SEO Crawler & AdSense Verification Files
  app.get('/ads.txt', (_req, res) => {
    const clientId = getAdSenseClientId();
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.type('text/plain; charset=utf-8');
    if (clientId) {
      const publisherId = clientId.replace(/^ca-/, '');
      res.send(`google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`);
      return;
    }
    res.send(
      '# ads.txt — set ADSENSE_CLIENT_ID (e.g. ca-pub-1234567890123456) to publish your Google AdSense record.\n'
    );
  });

  app.get('/robots.txt', (req, res) => {
    const baseUrl = getBaseUrl(req);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.type('text/plain; charset=utf-8');
    res.send(
      [
        'User-agent: *',
        'Allow: /',
        '',
        'Disallow: /api/',
        '',
        `Sitemap: ${baseUrl}/sitemap.xml`,
        '',
      ].join('\n')
    );
  });

  app.get('/sitemap.xml', (req, res) => {
    const baseUrl = getBaseUrl(req);

    const urlEntries = ALL_INDEXABLE_PATHS.map((routePath) => {
      const loc = `${baseUrl}${routePath}`;
      const priority =
        routePath === '/'
          ? '1.0'
          : routePath === '/guides' || routePath.startsWith('/guides/')
            ? '0.85'
            : (INFO_PAGE_IDS as string[]).includes(routePath.slice(1))
              ? '0.6'
              : '0.9';
      const changefreq = routePath === '/' ? 'weekly' : 'monthly';
      const lastmod = getRouteLastMod(routePath);
      return [
        '  <url>',
        `    <loc>${escapeHtml(loc)}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        `    <changefreq>${changefreq}</changefreq>`,
        `    <priority>${priority}</priority>`,
        '  </url>',
      ].join('\n');
    }).join('\n');

    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.type('application/xml; charset=utf-8');
    res.send(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        urlEntries,
        '</urlset>',
        '',
      ].join('\n')
    );
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    app.get('*', async (req, res, next) => {
      if (
        req.path === '/api' ||
        req.path.startsWith('/api/') ||
        req.path.includes('.')
      ) {
        next();
        return;
      }
      try {
        const rawTemplate = await fs.readFile(
          path.resolve(__dirname, 'index.html'),
          'utf-8'
        );
        const viteHtml = await vite.transformIndexHtml(
          req.originalUrl,
          rawTemplate
        );
        const { html, statusCode, canonicalUrl, noindex } =
          injectSeoAndContentHtml(viteHtml, req);
        applySecurityHeaders(res, html);
        if (noindex) {
          res.setHeader('X-Robots-Tag', 'noindex, nofollow');
        } else {
          res.setHeader('Link', `<${canonicalUrl}>; rel="canonical"`);
        }
        res
          .status(statusCode)
          .set({
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache',
          })
          .end(html);
      } catch (err) {
        vite.ssrFixStacktrace(err as Error);
        next(err);
      }
    });
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    const distAssetsPrefix = path.join(distDir, 'assets') + path.sep;
    const distFontsPrefix = path.join(distDir, 'fonts') + path.sep;
    const distTemplate = await fs.readFile(
      path.join(distDir, 'index.html'),
      'utf-8'
    );

    // Serve hashed dist/assets and self-hosted fonts with 1-year immutable caching
    app.use(
      express.static(distDir, {
        index: false,
        setHeaders: (res, filePath) => {
          if (
            filePath.endsWith('sw.js') ||
            filePath.endsWith('.webmanifest') ||
            filePath.endsWith('registerSW.js')
          ) {
            res.setHeader('Cache-Control', 'no-cache');
          } else if (
            filePath.startsWith(distAssetsPrefix) ||
            filePath.startsWith(distFontsPrefix)
          ) {
            res.setHeader(
              'Cache-Control',
              'public, max-age=31536000, immutable'
            );
          } else {
            res.setHeader('Cache-Control', 'public, max-age=3600');
          }
        },
      })
    );

    app.get('*', (req, res, next) => {
      if (req.path === '/api' || req.path.startsWith('/api/')) {
        next();
        return;
      }
      if (req.path.startsWith('/assets/')) {
        res.status(404).end('Not found');
        return;
      }
      const { html, statusCode, canonicalUrl, noindex } =
        injectSeoAndContentHtml(distTemplate, req);
      applySecurityHeaders(res, html);
      if (noindex) {
        res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      } else {
        res.setHeader('Link', `<${canonicalUrl}>; rel="canonical"`);
      }
      res
        .status(statusCode)
        .set({
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache',
        })
        .end(html);
    });
  }

  // Global error fallback — ensure /api requests still receive JSON even on unexpected Express errors
  app.use(
    (
      err: { status?: number; message?: string },
      req: Request,
      res: Response,
      _next: NextFunction
    ) => {
      const status =
        typeof err?.status === 'number' && err.status >= 400 && err.status < 600
          ? err.status
          : 500;
      if (req.path === '/api' || req.path.startsWith('/api/')) {
        res.status(sanitizeApiStatus(status)).json({
          error: err?.message || 'Unexpected server error.',
        });
        return;
      }
      res
        .status(status)
        .type('text/plain; charset=utf-8')
        .send(err?.message || 'Internal Server Error');
    }
  );

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Vellum server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Vellum server:', err);
  process.exit(1);
});
