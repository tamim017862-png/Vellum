import * as pdfjsLib from 'pdfjs-dist';

let isConfigured = false;

export function getPdfJs() {
  if (!isConfigured) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
    isConfigured = true;
  }
  return pdfjsLib;
}

export async function renderPdfPageToCanvas(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  scale: number
): Promise<HTMLCanvasElement> {
  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Browser 2D canvas context is unavailable.');
  }

  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));

  context.fillStyle = '#FFFFFF';
  context.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvas,
    canvasContext: context,
    viewport,
  }).promise;

  page.cleanup();
  return canvas;
}

export interface PdfThumbnailItem {
  pageNumber: number;
  dataUrl: string;
  widthPt: number;
  heightPt: number;
}

/**
 * Generates lightweight JPEG data URL thumbnails for visual PDF page studios.
 */
export async function renderPdfThumbnails(
  buffer: ArrayBuffer,
  options: { maxPages?: number; targetWidth?: number } = {}
): Promise<{ thumbnails: PdfThumbnailItem[]; totalPages: number }> {
  const pdfjs = getPdfJs();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer.slice(0)),
  });
  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;
  const limit = Math.min(totalPages, options.maxPages ?? 60);
  const targetWidth = options.targetWidth ?? 220;

  const thumbnails: PdfThumbnailItem[] = [];

  for (let p = 1; p <= limit; p += 1) {
    const page = await pdfDoc.getPage(p);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.max(0.2, Math.min(1.2, targetWidth / baseViewport.width));
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvas,
        canvasContext: ctx,
        viewport,
      }).promise;

      thumbnails.push({
        pageNumber: p,
        dataUrl: canvas.toDataURL('image/jpeg', 0.78),
        widthPt: baseViewport.width,
        heightPt: baseViewport.height,
      });

      canvas.width = 0;
      canvas.height = 0;
    }
    page.cleanup();
  }

  await pdfDoc.cleanup();
  await loadingTask.destroy();

  return { thumbnails, totalPages };
}

/**
 * Extracts readable text page-by-page locally in the browser using PDF.js.
 */
export async function extractPdfTextLocally(
  buffer: ArrayBuffer,
  maxChars = 135000
): Promise<{
  text: string;
  pageCount: number;
  extractedPages: number;
  charCount: number;
}> {
  const pdfjs = getPdfJs();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer.slice(0)),
  });
  const pdfDoc = await loadingTask.promise;
  const pageCount = pdfDoc.numPages;

  let collected = '';
  let extractedPages = 0;

  for (let p = 1; p <= pageCount; p += 1) {
    const page = await pdfDoc.getPage(p);
    const textContent = await page.getTextContent();
    const pageStrings = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .filter(Boolean);
    const pageBody = pageStrings.join(' ').replace(/\s+/g, ' ').trim();
    page.cleanup();

    if (pageBody) {
      const chunk = `[Page ${p}]\n${pageBody}\n\n`;
      if (collected.length + chunk.length > maxChars) {
        const remaining = maxChars - collected.length;
        if (remaining > 80) {
          collected += chunk.slice(0, remaining);
          extractedPages += 1;
        }
        break;
      }
      collected += chunk;
      extractedPages += 1;
    }
  }

  await pdfDoc.cleanup();
  await loadingTask.destroy();

  return {
    text: collected.trim(),
    pageCount,
    extractedPages,
    charCount: collected.trim().length,
  };
}
