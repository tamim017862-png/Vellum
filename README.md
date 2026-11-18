# Vellum

Vellum is a browser-based PDF workspace. Its local tools merge, split, compress, convert, organize, rotate, crop, sign, watermark, and number PDF pages. Two optional Gemini-backed tools summarize PDFs and answer questions about extracted document text. Images (JPG/JPEG/PNG) can also be converted into PDFs.

> **Current scope:** this release is PDF- and image-focused. DOCX, spreadsheets, presentations, OCR for scanned PDFs, and broad-purpose document editing are not implemented. AI analysis requires readable/selectable PDF text and an available server-side Gemini API key.

## Requirements

- Node.js `^20.19.0` or `>=22.12.0`
- npm
- A Gemini API key only if you intend to use AI summary/chat

## Development

```bash
npm ci
npm run dev
```

Open the local URL printed by the server (usually `http://localhost:3000`). The Express server runs Vite middleware in development.

## Production

```bash
npm ci
npm run check
npm start
```

Build with `npm run build` before starting the production server. The Express server serves the production build from `dist/`; do not deploy this as a static-only site because the API and Gemini endpoints are served by Express.

## Environment variables

Copy `.env.example` to `.env` for local configuration. Never commit secrets.

| Variable | Required | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | For AI tools | Server-side Google Gemini API key. `GOOGLE_API_KEY` and `API_KEY` are fallbacks. |
| `APP_URL` | Recommended in production | Public origin used for canonical URLs and SEO. |
| `PORT` | No | HTTP port; defaults to `3000`. |
| `ADSENSE_CLIENT_ID` | No | Enables AdSense integration when configured. |
| `VITE_ADSENSE_SLOT_HOME`, `VITE_ADSENSE_SLOT_TOOL`, `VITE_ADSENSE_SLOT_GUIDE` | No | Optional display ad slots; exposed to the client build. |

AI requests send extracted PDF text to the Vellum server and then to Google Gemini only when the user explicitly requests a summary or sends a chat question. PDF files are not uploaded by the local PDF tools.

## Quality checks

```bash
npm run lint   # TypeScript check
npm test       # Utility tests
npm run build  # Production frontend and service worker
npm run check  # All checks
```

## Known limitations

- OCR is not provided. Scanned/image-only PDFs need OCR elsewhere before AI text analysis.
- Visual Page Studio displays at most 60 thumbnails. Large-document editing must preserve pages that are not currently rendered.
- AI extraction has a text-size cap; long documents may not be fully represented in an AI request.
- Browser memory limits vary, especially for large image batches and high-resolution rendering.
- Web Vitals reports are accepted by the API but are not persisted or aggregated by this repository.

## Repository layout

- `src/components/`: UI and PDF workspaces
- `src/data/`: tool catalog, guides, and SEO content
- `src/utils/`: PDF validation, rendering, and progress utilities
- `src/workers/`: Web Workers
- `server.ts`: Express API and development/production server
- `vite.config.ts`: Vite and PWA configuration
