import { PDFDocument } from 'pdf-lib';
import type { PdfWorkerRequest, PdfWorkerResponse } from '../types/pdf';

function postResponse(message: PdfWorkerResponse, transfer?: Transferable[]) {
  if (transfer && transfer.length > 0) {
    self.postMessage(message, { transfer });
  } else {
    self.postMessage(message);
  }
}

function formatPdfError(err: unknown, fileName?: string): string {
  const prefix = fileName ? `"${fileName}": ` : '';
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes('encrypted') || msg.includes('password')) {
      return `${prefix}This PDF is encrypted or password-protected. Please remove the password before merging.`;
    }
    if (msg.includes('header') || msg.includes('parse') || msg.includes('xref')) {
      return `${prefix}The PDF structure appears damaged or unsupported.`;
    }
    return `${prefix}${err.message}`;
  }
  return `${prefix}Unable to process this PDF file.`;
}

self.onmessage = async (event: MessageEvent<PdfWorkerRequest>) => {
  const payload = event.data;

  if (payload.type === 'INSPECT_PDF') {
    try {
      const doc = await PDFDocument.load(payload.buffer, {
        updateMetadata: false,
      });
      postResponse({
        type: 'INSPECT_RESULT',
        id: payload.id,
        ok: true,
        pageCount: doc.getPageCount(),
      });
    } catch (error) {
      postResponse({
        type: 'INSPECT_RESULT',
        id: payload.id,
        ok: false,
        error: formatPdfError(error),
      });
    }
    return;
  }

  if (payload.type === 'MERGE_PDFS') {
    const startedAt = performance.now();
    const { requestId, files } = payload;

    try {
      if (files.length < 2) {
        postResponse({
          type: 'MERGE_RESULT',
          requestId,
          ok: false,
          error: 'At least two valid PDF documents are required to merge.',
        });
        return;
      }

      const mergedPdf = await PDFDocument.create();
      mergedPdf.setProducer('Vellum Local PDF Engine');
      mergedPdf.setCreator('Vellum');
      mergedPdf.setCreationDate(new Date());

      for (let i = 0; i < files.length; i += 1) {
        const entry = files[i];
        postResponse({
          type: 'MERGE_PROGRESS',
          requestId,
          current: i,
          total: files.length,
          stage: `Reading and copying "${entry.name}" (${i + 1} of ${files.length})`,
        });

        try {
          const sourceDoc = await PDFDocument.load(entry.buffer, {
            updateMetadata: false,
          });
          const pageIndices = sourceDoc.getPageIndices();
          const copiedPages = await mergedPdf.copyPages(sourceDoc, pageIndices);
          for (const page of copiedPages) {
            mergedPdf.addPage(page);
          }
          postResponse({
            type: 'MERGE_PROGRESS',
            requestId,
            current: i + 1,
            total: files.length,
            stage:
              i + 1 < files.length
                ? `Completed "${entry.name}"`
                : 'Finalizing combined PDF document',
          });
        } catch (fileErr) {
          postResponse({
            type: 'MERGE_RESULT',
            requestId,
            ok: false,
            error: formatPdfError(fileErr, entry.name),
          });
          return;
        }
      }

      postResponse({
        type: 'MERGE_PROGRESS',
        requestId,
        current: files.length,
        total: files.length,
        stage: 'Finalizing combined PDF document',
      });

      const mergedBytes = await mergedPdf.save({
        useObjectStreams: true,
      });

      const outputBytes = new Uint8Array(mergedBytes.byteLength);
      outputBytes.set(mergedBytes);
      const outputBuffer: ArrayBuffer = outputBytes.buffer;

      postResponse(
        {
          type: 'MERGE_RESULT',
          requestId,
          ok: true,
          buffer: outputBuffer,
          totalPages: mergedPdf.getPageCount(),
          durationMs: performance.now() - startedAt,
        },
        [outputBuffer]
      );
    } catch (error) {
      postResponse({
        type: 'MERGE_RESULT',
        requestId,
        ok: false,
        error: formatPdfError(error),
      });
    }
  }
};
