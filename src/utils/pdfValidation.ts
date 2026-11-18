export const MAX_SINGLE_FILE_BYTES = 100 * 1024 * 1024; // 100 MB per PDF
export const MAX_BATCH_TOTAL_BYTES = 250 * 1024 * 1024; // 250 MB combined batch
export const MAX_FILES_IN_BATCH = 50;
export const MAX_IMAGE_FILE_BYTES = 25 * 1024 * 1024; // 25 MB per image

export interface PdfValidationResult {
  valid: boolean;
  reason?: string;
}

const PDF_MAGIC_SIGNATURE = '%PDF-';

/**
 * Validates file type, size limits, and PDF magic header bytes locally
 * before passing any buffer to PDF parsers or Web Workers.
 */
export async function validatePdfFile(file: File): Promise<PdfValidationResult> {
  if (!file) {
    return { valid: false, reason: 'No file reference was provided.' };
  }

  const lowerName = file.name.toLowerCase();
  const hasPdfExtension = lowerName.endsWith('.pdf');
  const allowedMime =
    file.type === 'application/pdf' ||
    file.type === 'application/x-pdf' ||
    file.type === '';

  if (!hasPdfExtension && file.type !== 'application/pdf') {
    return {
      valid: false,
      reason: `"${file.name}" is not a PDF document. Only .pdf files are accepted.`,
    };
  }

  if (!allowedMime && !hasPdfExtension) {
    return {
      valid: false,
      reason: `"${file.name}" has an unsupported file type (${file.type}).`,
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      reason: `"${file.name}" is empty (0 bytes) and cannot be processed.`,
    };
  }

  if (file.size > MAX_SINGLE_FILE_BYTES) {
    return {
      valid: false,
      reason: `"${file.name}" exceeds the 100 MB single-file limit for safe browser processing.`,
    };
  }

  try {
    const headerSlice = file.slice(0, 1024);
    const headerBuffer = await headerSlice.arrayBuffer();
    const headerBytes = new Uint8Array(headerBuffer);
    const headerText = new TextDecoder('latin1').decode(headerBytes);

    if (!headerText.includes(PDF_MAGIC_SIGNATURE)) {
      return {
        valid: false,
        reason: `"${file.name}" does not contain a valid PDF header signature.`,
      };
    }
  } catch {
    return {
      valid: false,
      reason: `Could not read "${file.name}" from your device. Please check file permissions.`,
    };
  }

  return { valid: true };
}

/**
 * Validates JPG/JPEG/PNG images via extension, MIME, size, and magic bytes.
 */
export async function validateImageFile(
  file: File
): Promise<PdfValidationResult> {
  if (!file) {
    return { valid: false, reason: 'No image file reference was provided.' };
  }

  const lower = file.name.toLowerCase();
  const isJpgExt = lower.endsWith('.jpg') || lower.endsWith('.jpeg');
  const isPngExt = lower.endsWith('.png');
  const isAllowedMime =
    file.type === 'image/jpeg' ||
    file.type === 'image/jpg' ||
    file.type === 'image/png' ||
    file.type === '';

  if ((!isJpgExt && !isPngExt) || !isAllowedMime) {
    return {
      valid: false,
      reason: `"${file.name}" is not a supported image. Please choose JPG, JPEG, or PNG files.`,
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      reason: `"${file.name}" is empty (0 bytes).`,
    };
  }

  if (file.size > MAX_IMAGE_FILE_BYTES) {
    return {
      valid: false,
      reason: `"${file.name}" exceeds the 25 MB per-image limit.`,
    };
  }

  try {
    const header = new Uint8Array(await file.slice(0, 8).arrayBuffer());
    const isJpegMagic =
      header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
    const isPngMagic =
      header[0] === 0x89 &&
      header[1] === 0x50 &&
      header[2] === 0x4e &&
      header[3] === 0x47;

    if (!isJpegMagic && !isPngMagic) {
      return {
        valid: false,
        reason: `"${file.name}" has an invalid JPG/PNG file header.`,
      };
    }
  } catch {
    return {
      valid: false,
      reason: `Could not read "${file.name}" from your device.`,
    };
  }

  return { valid: true };
}

/**
 * Parses page range syntax such as "1-3, 5, 8-10" into sorted or ordered page numbers (1-indexed).
 */
export function parsePageRanges(
  input: string,
  totalPages: number
): { ok: true; pages: number[]; groups: number[][] } | { ok: false; error: string } {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, error: 'Enter at least one page number or range (e.g. 1-3, 5).' };
  }

  const parts = trimmed
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return { ok: false, error: 'Enter valid page numbers separated by commas.' };
  }

  const allPages: number[] = [];
  const groups: number[][] = [];

  for (const part of parts) {
    if (/^\d+$/.test(part)) {
      const page = Number(part);
      if (page < 1 || page > totalPages) {
        return {
          ok: false,
          error: `Page ${page} is out of bounds. This document has ${totalPages} ${totalPages === 1 ? 'page' : 'pages'}.`,
        };
      }
      allPages.push(page);
      groups.push([page]);
      continue;
    }

    const rangeMatch = /^(\d+)\s*-\s*(\d+)$/.exec(part);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      if (start < 1 || end < 1 || start > totalPages || end > totalPages) {
        return {
          ok: false,
          error: `Range "${part}" is out of bounds (1–${totalPages}).`,
        };
      }
      if (start > end) {
        return {
          ok: false,
          error: `Invalid range "${part}": start page must be less than or equal to end page.`,
        };
      }
      const group: number[] = [];
      for (let p = start; p <= end; p += 1) {
        allPages.push(p);
        group.push(p);
      }
      groups.push(group);
      continue;
    }

    return {
      ok: false,
      error: `Invalid syntax "${part}". Use single pages or ranges like "1-3, 5".`,
    };
  }

  return { ok: true, pages: allPages, groups };
}
