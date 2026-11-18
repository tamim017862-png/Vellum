export type ToolId =
  | 'merge-pdf'
  | 'split-pdf'
  | 'compress-pdf'
  | 'pdf-to-jpg'
  | 'jpg-to-pdf'
  | 'organize-pdf'
  | 'rotate-pdf'
  | 'delete-pages'
  | 'extract-pages'
  | 'sign-pdf'
  | 'watermark-pdf'
  | 'page-numbers'
  | 'crop-pdf'
  | 'ai-summarizer'
  | 'chat-with-pdf';

export type InfoPageId = 'about' | 'privacy' | 'terms' | 'contact';

export type GuideSlug =
  | 'reduce-pdf-size-under-2mb'
  | 'merge-pdfs-privately-in-browser'
  | 'split-and-extract-pdf-pages'
  | 'sign-and-watermark-contracts-safely'
  | 'convert-scanned-images-to-compact-pdf';

export type AppRouteView =
  | 'home'
  | ToolId
  | InfoPageId
  | 'guides'
  | GuideSlug
  | 'not-found';

export type ToolCategory =
  | 'Organize'
  | 'Optimize'
  | 'Convert'
  | 'Edit & Sign'
  | 'AI Tools';

export type ExecutionScope = 'local-browser' | 'gemini-server';

export interface PdfToolDefinition {
  id: ToolId;
  indexNumber: string;
  name: string;
  description: string;
  category: ToolCategory;
  executionScope: ExecutionScope;
  keywords: string[];
  capabilityNote: string;
  accentBg: string;
  accentText: string;
  popular?: boolean;
  acceptsImages?: boolean;
}

export type PdfItemStatus = 'validating' | 'ready' | 'error';

export interface MergePdfFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  pageCount: number | null;
  status: PdfItemStatus;
  errorMessage?: string;
}

export interface ProcessedFileRecord {
  id: string;
  name: string;
  sizeBytes: number;
  toolId: ToolId;
  toolName: string;
  detailText: string;
  url: string;
  mimeType: string;
  createdAt: number;
}

export interface InspectWorkerRequest {
  type: 'INSPECT_PDF';
  id: string;
  buffer: ArrayBuffer;
}

export interface MergeWorkerInput {
  name: string;
  buffer: ArrayBuffer;
}

export interface MergeWorkerRequest {
  type: 'MERGE_PDFS';
  requestId: string;
  files: MergeWorkerInput[];
}

export type PdfWorkerRequest = InspectWorkerRequest | MergeWorkerRequest;

export type PdfWorkerResponse =
  | {
      type: 'INSPECT_RESULT';
      id: string;
      ok: true;
      pageCount: number;
    }
  | {
      type: 'INSPECT_RESULT';
      id: string;
      ok: false;
      error: string;
    }
  | {
      type: 'MERGE_PROGRESS';
      requestId: string;
      current: number;
      total: number;
      stage: string;
    }
  | {
      type: 'MERGE_RESULT';
      requestId: string;
      ok: true;
      buffer: ArrayBuffer;
      totalPages: number;
      durationMs: number;
    }
  | {
      type: 'MERGE_RESULT';
      requestId: string;
      ok: false;
      error: string;
    };
