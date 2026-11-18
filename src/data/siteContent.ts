import type { AppRouteView, GuideSlug, InfoPageId, ToolId } from '../types/pdf';
import { EDITORIAL_GUIDES, GUIDE_SLUGS, getGuideBySlug } from './guides.ts';
import { PDF_TOOLS } from './tools.ts';

export interface ToolStepItem {
  number: string;
  title: string;
  description: string;
}

export interface ToolFaqItem {
  question: string;
  answer: string;
}

export interface ToolEditorialContent {
  path: string;
  title: string;
  metaDescription: string;
  heading: string;
  intro: string;
  steps: [ToolStepItem, ToolStepItem, ToolStepItem];
  faqs: ToolFaqItem[];
}

export interface InfoSectionBlock {
  heading: string;
  paragraphs: string[];
  link?: {
    label: string;
    href: string;
    external?: boolean;
  };
}

export interface InfoPageContent {
  path: string;
  title: string;
  metaDescription: string;
  eyebrow: string;
  heading: string;
  subtitle: string;
  lastUpdated: string;
  sections: InfoSectionBlock[];
}

export const SITE_LASTMOD_ISO = '2026-11-17';

export const SITE_HOME_SEO = {
  path: '/',
  title: 'Vellum — Free Private PDF Tools: Merge, Split & Sign',
  metaDescription:
    'Merge, split, compress, sign, crop, convert, and summarize PDFs privately in your browser. Use 15 free PDF & AI tools with zero uploads or accounts.',
  heading: 'Precision PDF Tools. Convert, Edit & Sign Locally.',
  intro:
    'Vellum brings together 15 specialized PDF utilities in a fast, uncluttered workspace. Core document editing, conversion, and page organization tools execute directly in your browser without file uploads, while optional Gemini AI workflows help summarize and query lengthy PDFs.',
};

export const HOME_FAQS: ToolFaqItem[] = [
  {
    question: 'Are my PDF files uploaded to a server on Vellum?',
    answer:
      'No. All 13 core PDF tools—including Merge, Split, Compress, Organize, Rotate, Delete, Extract, Sign, Watermark, Page Numbers, Crop, PDF to JPG, and JPG to PDF—run directly inside your browser tab so your files never leave your device.',
  },
  {
    question: 'Is Vellum free to use without watermarks or accounts?',
    answer:
      'Yes. Every PDF utility is free to use with no account signup, no forced branding watermarks on your exports, and immediate browser downloads.',
  },
  {
    question: 'What file sizes and batch limits are supported?',
    answer:
      'You can open individual PDFs up to 100 MB, merge up to 20 PDF files totaling 250 MB in one batch, and convert up to 20 JPG or PNG images up to 25 MB each.',
  },
  {
    question: 'Do Vellum PDF tools work offline after installing?',
    answer:
      'Yes. Vellum is a Progressive Web App (PWA). Once installed or cached in your browser, the 13 local PDF tools keep working even without an active internet connection.',
  },
  {
    question: 'How do AI PDF Summarizer and Chat with PDF handle my data?',
    answer:
      'Vellum extracts readable text from your PDF locally inside your browser first. Only when you explicitly click Generate Summary or send a chat question is that extracted text forwarded to Google Gemini, with zero database storage.',
  },
];

export const RELATED_TOOLS_MAP: Record<ToolId, ToolId[]> = {
  'merge-pdf': ['split-pdf', 'organize-pdf', 'compress-pdf', 'page-numbers'],
  'split-pdf': ['extract-pages', 'delete-pages', 'merge-pdf', 'compress-pdf'],
  'compress-pdf': ['merge-pdf', 'split-pdf', 'pdf-to-jpg', 'crop-pdf'],
  'pdf-to-jpg': ['jpg-to-pdf', 'compress-pdf', 'split-pdf', 'crop-pdf'],
  'jpg-to-pdf': ['pdf-to-jpg', 'compress-pdf', 'merge-pdf', 'rotate-pdf'],
  'organize-pdf': ['rotate-pdf', 'delete-pages', 'extract-pages', 'merge-pdf'],
  'rotate-pdf': ['organize-pdf', 'crop-pdf', 'delete-pages', 'merge-pdf'],
  'delete-pages': ['extract-pages', 'organize-pdf', 'split-pdf', 'compress-pdf'],
  'extract-pages': ['split-pdf', 'delete-pages', 'organize-pdf', 'merge-pdf'],
  'sign-pdf': ['watermark-pdf', 'page-numbers', 'compress-pdf', 'merge-pdf'],
  'watermark-pdf': ['sign-pdf', 'page-numbers', 'crop-pdf', 'compress-pdf'],
  'page-numbers': ['merge-pdf', 'watermark-pdf', 'organize-pdf', 'crop-pdf'],
  'crop-pdf': ['rotate-pdf', 'compress-pdf', 'page-numbers', 'organize-pdf'],
  'ai-summarizer': ['chat-with-pdf', 'extract-pages', 'split-pdf', 'compress-pdf'],
  'chat-with-pdf': ['ai-summarizer', 'extract-pages', 'split-pdf', 'merge-pdf'],
};

export const TOOL_IDS: ToolId[] = [
  'merge-pdf',
  'split-pdf',
  'compress-pdf',
  'pdf-to-jpg',
  'jpg-to-pdf',
  'organize-pdf',
  'rotate-pdf',
  'delete-pages',
  'extract-pages',
  'sign-pdf',
  'watermark-pdf',
  'page-numbers',
  'crop-pdf',
  'ai-summarizer',
  'chat-with-pdf',
];

export const INFO_PAGE_IDS: InfoPageId[] = [
  'about',
  'privacy',
  'terms',
  'contact',
];

export const TOOL_PAGE_CONTENT: Record<ToolId, ToolEditorialContent> = {
  'merge-pdf': {
    path: '/merge-pdf',
    title: 'Merge PDF Online Free — Combine PDF Files | Vellum',
    metaDescription:
      'Combine multiple PDF documents into one unified file locally in your browser. Drag to reorder pages, inspect page counts, and download instantly.',
    heading: 'How to Merge PDF Files with Vellum',
    intro:
      'Combining separate reports, scanned invoices, or slide handouts into a single PDF should never require uploading sensitive records to an external queue. Vellum inspects each selected PDF header locally, counts pages inside an isolated background Web Worker, and assembles your unified document directly in browser memory.',
    steps: [
      {
        number: '01',
        title: 'Add Two or More PDFs',
        description:
          'Drag and drop PDF files into the workspace or browse from your device. Up to 20 files and 250 MB combined can be queued per merge.',
      },
      {
        number: '02',
        title: 'Arrange the Document Order',
        description:
          'Reorder files using drag-and-drop handles or arrow buttons, review verified page totals, and choose a clean output filename.',
      },
      {
        number: '03',
        title: 'Merge & Download Locally',
        description:
          'Click Merge PDFs to assemble the combined file in your browser Web Worker and save it immediately without waiting for remote uploads.',
      },
    ],
    faqs: [
      {
        question: 'Are my PDFs uploaded to a server when merging?',
        answer:
          'No. Merge PDF runs inside a local Web Worker using pdf-lib inside your browser tab. Your files never leave your device.',
      },
      {
        question: 'Does merging alter text quality or clickable links?',
        answer:
          'Vellum copies original PDF pages structurally rather than rasterizing them, preserving crisp vector typography and page dimensions.',
      },
      {
        question: 'What happens if one of my PDFs is password-protected?',
        answer:
          'Encrypted PDFs are flagged during local inspection with a clear message so you can remove the password before merging.',
      },
    ],
  },
  'split-pdf': {
    path: '/split-pdf',
    title: 'Split PDF Online — Extract Pages & Ranges | Vellum',
    metaDescription:
      'Split a multi-page PDF by custom page ranges, fixed intervals, or single pages right in your browser. Download standalone PDFs or a batch ZIP.',
    heading: 'How to Split a PDF into Exact Sections',
    intro:
      'Large manuals, multi-invoice exports, and combined contracts often contain only a few pages you actually need to share. Vellum parses your PDF locally and lets you carve out custom page ranges, split every N pages, or turn every page into an individual PDF packaged in a clean ZIP archive.',
    steps: [
      {
        number: '01',
        title: 'Select Your Source PDF',
        description:
          'Drop a PDF up to 100 MB into the Split PDF workspace. Vellum validates the document header and displays the total page count immediately.',
      },
      {
        number: '02',
        title: 'Choose Split Mode & Ranges',
        description:
          'Pick Custom Page Ranges (such as 1-3, 5, 8-10), Split Every N Pages for uniform chunks, or Extract Every Page separately.',
      },
      {
        number: '03',
        title: 'Export Single PDF or ZIP Archive',
        description:
          'Generate either a unified PDF containing your chosen ranges or a single ZIP download containing every split file neatly numbered.',
      },
    ],
    faqs: [
      {
        question: 'Can I extract non-consecutive pages into one file?',
        answer:
          'Yes. Enter comma-separated numbers and ranges such as 1, 4-6, 12 and keep them combined into one output PDF, or export each range separately.',
      },
      {
        question: 'How are multiple split files delivered?',
        answer:
          'Whenever an operation produces more than one PDF, Vellum bundles all resulting documents cleanly into a single local ZIP archive using JSZip.',
      },
      {
        question: 'Does splitting work offline once the page is loaded?',
        answer:
          'Yes. Splitting uses client-side memory and pdf-lib with zero network transfers after the page loads.',
      },
    ],
  },
  'compress-pdf': {
    path: '/compress-pdf',
    title: 'Compress PDF Online — Reduce PDF File Size | Vellum',
    metaDescription:
      'Shrink oversized PDFs locally in your browser. Choose visual compression presets for email attachments or lossless object-stream compaction.',
    heading: 'How to Reduce PDF File Size Safely',
    intro:
      'Email gateways, scholarship portals, and government forms frequently enforce strict attachment limits. Vellum gives you full control over size reduction directly on your device—offering three visual DPI compression tiers alongside a lossless structural mode that keeps selectable vector text intact.',
    steps: [
      {
        number: '01',
        title: 'Load Your Oversized PDF',
        description:
          'Drop or select a PDF up to 100 MB. Vellum checks the current byte size and page count before you pick a preset.',
      },
      {
        number: '02',
        title: 'Select a Compression Balance',
        description:
          'Choose Strong Compression (96 DPI), Recommended Balance (130 DPI), High Clarity (165 DPI), or Lossless Structure Only.',
      },
      {
        number: '03',
        title: 'Compare Savings & Download',
        description:
          'Vellum renders and rebuilds the optimized PDF locally, shows the exact percentage saved, and lets you download the lighter file.',
      },
    ],
    faqs: [
      {
        question: 'What is the difference between visual presets and Lossless mode?',
        answer:
          'Visual presets re-encode heavy pages as calibrated JPEG streams at 96–165 DPI for maximum byte reduction, while Lossless mode compacts object streams and strips redundant metadata without altering text.',
      },
      {
        question: 'Why might an already compressed PDF shrink only slightly?',
        answer:
          'If a PDF already contains minimal vector text or compressed images, Vellum displays accurate before-and-after byte metrics so you can switch presets immediately.',
      },
      {
        question: 'Are compressed files sent over the internet?',
        answer:
          'Never. PDF.js rasterization and pdf-lib reconstruction execute strictly in your browser tab.',
      },
    ],
  },
  'pdf-to-jpg': {
    path: '/pdf-to-jpg',
    title: 'PDF to JPG Converter — Export Pages as Images | Vellum',
    metaDescription:
      'Convert PDF pages into crisp JPEG images locally in your browser. Pick 1× to 3× DPI resolution, preview each page, and download individually or as a ZIP.',
    heading: 'How to Convert PDF Pages into Crisp JPG Images',
    intro:
      'Turn presentation decks, design proofs, receipts, or single pages of a PDF into universal JPEG images ready for slides, web publishing, or messaging apps. Vellum uses Mozilla PDF.js and HTML5 Canvas to render every selected page at your chosen DPI and quality setting without uploading documents.',
    steps: [
      {
        number: '01',
        title: 'Upload Your PDF Document',
        description:
          'Select any valid PDF up to 100 MB. You can convert the entire document or enter a custom page range like 1-4, 7.',
      },
      {
        number: '02',
        title: 'Dial In Resolution & Quality',
        description:
          'Choose Standard (1×), Sharp (2×), or Print-Ready (3×) DPI scale and adjust JPEG quality before rendering previews.',
      },
      {
        number: '03',
        title: 'Preview & Download JPGs or ZIP',
        description:
          'Inspect live rendered thumbnails for each page, save individual JPG images, or download every exported page together in one ZIP.',
      },
    ],
    faqs: [
      {
        question: 'Which resolution setting should I pick?',
        answer:
          'Use 2× Sharp for crisp slides and screen sharing, or 3× Print-Ready when zooming into detailed charts or small typography.',
      },
      {
        question: 'Can I convert only specific pages instead of the whole PDF?',
        answer:
          'Yes. Switch page selection from All Pages to Custom Range and specify any pages or ranges you want exported.',
      },
    ],
  },
  'jpg-to-pdf': {
    path: '/jpg-to-pdf',
    title: 'JPG to PDF Converter — Images to PDF Online | Vellum',
    metaDescription:
      'Convert JPG and PNG photos into a polished multi-page PDF in your browser. Reorder images, rotate sideways shots, and pick A4, Letter, or Fit sizing.',
    heading: 'How to Combine JPG and PNG Images into a PDF',
    intro:
      'Receipts, photographed forms, whiteboard snapshots, and portfolio spreads are much easier to share when bound into a single calibrated PDF. Vellum lets you queue up to 20 JPG or PNG images, fix sideways phone orientations, choose page margins and paper sizes, and build a clean PDF in seconds.',
    steps: [
      {
        number: '01',
        title: 'Drop JPG or PNG Images',
        description:
          'Add one or multiple photos up to 25 MB each. Vellum verifies image headers locally and generates instant previews.',
      },
      {
        number: '02',
        title: 'Rotate, Reorder & Calibrate Layout',
        description:
          'Fix orientation in 90° steps, drag rows into sequence, and set Page Size (A4, US Letter, or Fit to Image), Orientation, and Margins.',
      },
      {
        number: '03',
        title: 'Build & Save Your PDF',
        description:
          'Click Create PDF to embed every image into a properly sized PDF document directly in your browser.',
      },
    ],
    faqs: [
      {
        question: 'What is the difference between A4/Letter and Fit to Image?',
        answer:
          'A4 and US Letter place your images onto uniform print-standard pages, while Fit to Image matches each PDF page dimension directly to the photo aspect ratio.',
      },
      {
        question: 'Are PNG transparency and sideways EXIF shots supported?',
        answer:
          'Yes. Vellum normalizes images on an HTML5 canvas onto a crisp white background so rotated photos and PNGs embed reliably.',
      },
    ],
  },
  'organize-pdf': {
    path: '/organize-pdf',
    title: 'Organize PDF Pages — Reorder, Rotate & Clean | Vellum',
    metaDescription:
      'Visually organize PDF pages using a live thumbnail grid. Drag and drop pages into a new order, rotate sideways scans, or delete unwanted sheets locally.',
    heading: 'How to Visually Organize PDF Pages',
    intro:
      'When scans arrive out of order, upside down, or padded with blank separator sheets, fixing the structure visually saves time. Vellum renders live thumbnails for your document so you can drag pages into sequence, rotate individual scans, remove extras, and rebuild a clean PDF locally.',
    steps: [
      {
        number: '01',
        title: 'Open Your PDF in Page Studio',
        description:
          'Drop a PDF to render a responsive visual grid showing every page thumbnail in clear detail.',
      },
      {
        number: '02',
        title: 'Drag, Rotate & Trim Pages',
        description:
          'Drag thumbnails or click directional arrows to reorder, rotate sideways pages 90°, or mark unwanted pages for removal.',
      },
      {
        number: '03',
        title: 'Export Your Rebuilt PDF',
        description:
          'Review the resulting page count, name your output file, and save the freshly ordered PDF to your device.',
      },
    ],
    faqs: [
      {
        question: 'How many pages can be previewed in the visual grid?',
        answer:
          'Vellum renders live thumbnails for up to the first 60 pages in the browser grid to keep memory usage smooth and responsive.',
      },
      {
        question: 'Can I undo edits before downloading?',
        answer:
          'Yes. Click Reset in the studio toolbar at any point to restore the original page sequence, orientation, and deleted states.',
      },
    ],
  },
  'rotate-pdf': {
    path: '/rotate-pdf',
    title: 'Rotate PDF Pages Permanently Online | Vellum',
    metaDescription:
      'Rotate sideways or upside-down PDF pages by 90°, 180°, or 270° locally in your browser. Rotate one page or every page at once and save permanently.',
    heading: 'How to Permanently Fix Sideways PDF Pages',
    intro:
      'Rotating a document inside a viewer only changes how it looks temporarily—the next recipient still sees sideways text. Vellum updates the underlying PDF page rotation metadata permanently for individual pages or the entire document at once, showing live thumbnail previews before you save.',
    steps: [
      {
        number: '01',
        title: 'Load the Sideways PDF',
        description:
          'Upload your PDF into the local workspace to inspect visual thumbnails of every page.',
      },
      {
        number: '02',
        title: 'Rotate Individual Pages or All at Once',
        description:
          'Click the rotate icon under any specific page thumbnail, or click Rotate All 90° to turn the entire document together.',
      },
      {
        number: '03',
        title: 'Save the Permanently Rotated PDF',
        description:
          'Export the updated PDF so every viewer opens your pages right-side up automatically.',
      },
    ],
    faqs: [
      {
        question: 'Does rotating pages reduce text crispness?',
        answer:
          'No. Vellum modifies the structural PDF rotation angle directly via pdf-lib without re-compressing or rasterizing your text.',
      },
      {
        question: 'Can I rotate only page 2 while leaving other pages portrait?',
        answer:
          'Yes. Every page thumbnail includes its own 90° rotation control so mixed portrait and landscape packets are easy to fix.',
      },
    ],
  },
  'delete-pages': {
    path: '/delete-pages',
    title: 'Delete Pages from PDF Online Free | Vellum',
    metaDescription:
      'Remove blank, cover, or confidential pages from a PDF visually in your browser. Click thumbnails to mark pages for deletion and download a clean PDF.',
    heading: 'How to Remove Unwanted Pages from a PDF',
    intro:
      'Blank trailing pages, fax cover sheets, and outdated appendix pages bloat documents and confuse readers. Vellum displays visual thumbnails of your PDF so you can mark exact pages for deletion, preview what remains, and generate a clean document locally.',
    steps: [
      {
        number: '01',
        title: 'Inspect Page Thumbnails',
        description:
          'Drop a PDF file into Vellum to render clear page-by-page thumbnails without uploading your document.',
      },
      {
        number: '02',
        title: 'Mark Pages to Remove',
        description:
          'Click any thumbnail or its trash button to toggle removal. You can restore any marked page with a single click before exporting.',
      },
      {
        number: '03',
        title: 'Export Your Cleaned PDF',
        description:
          'Click Export Cleaned PDF to rebuild the file with only your kept pages and download immediately.',
      },
    ],
    faqs: [
      {
        question: 'Is my original PDF file modified?',
        answer:
          'Never. Vellum creates a brand-new output PDF containing only the remaining pages, leaving the file on your disk untouched.',
      },
      {
        question: 'What if I accidentally mark the wrong page?',
        answer:
          'Click the marked thumbnail again or press Reset to restore removed pages before clicking export.',
      },
    ],
  },
  'extract-pages': {
    path: '/extract-pages',
    title: 'Extract Pages from PDF Visually Online | Vellum',
    metaDescription:
      'Pick exact pages from a live PDF thumbnail grid and export them into a focused new PDF document locally in your browser.',
    heading: 'How to Extract Specific PDF Pages Visually',
    intro:
      'When you do not know exact page numbers offhand, scrolling through thumbnails beats guessing ranges. Vellum lets you click the exact chapters, receipts, or signatures you want from a visual grid and compile them into a standalone PDF in seconds.',
    steps: [
      {
        number: '01',
        title: 'Open Your PDF',
        description:
          'Load any PDF document locally to view crisp thumbnails for up to 60 pages side by side.',
      },
      {
        number: '02',
        title: 'Select Pages to Keep',
        description:
          'Click thumbnails to select or deselect pages, or use Select All and Clear shortcuts to speed up selection.',
      },
      {
        number: '03',
        title: 'Download Extracted PDF',
        description:
          'Click Extract Selected Pages to compile your chosen subset into a standalone PDF.',
      },
    ],
    faqs: [
      {
        question: 'When should I use Extract Pages vs. Split PDF?',
        answer:
          'Use Extract PDF Pages when you want to visually pick thumbnails and save one clean subset; use Split PDF when you need typed range intervals or batch ZIP exports.',
      },
      {
        question: 'Do extracted pages preserve original resolution?',
        answer:
          'Yes. Vellum copies original vector objects, fonts, and embedded graphics verbatim into the new PDF.',
      },
    ],
  },
  'sign-pdf': {
    path: '/sign-pdf',
    title: 'Sign PDF Online Free — Draw or Type Signature | Vellum',
    metaDescription:
      'Sign PDF documents directly in your browser. Draw a handwritten signature or type a styled signature, click to place and resize on any page, and export.',
    heading: 'How to Sign a PDF Document Locally',
    intro:
      'Printing, signing with a pen, and scanning contracts back in wastes paper and time. Vellum includes a responsive signature pad and cursive typography generator so you can draw or type your signature, pick navy, charcoal, or crimson ink, click anywhere on your PDF preview to place it, and download a clean signed copy.',
    steps: [
      {
        number: '01',
        title: 'Load the Document to Sign',
        description:
          'Drop your PDF agreement, waiver, or form into Vellum. Switch between pages using the page selector at the top of the preview.',
      },
      {
        number: '02',
        title: 'Draw or Type Your Signature',
        description:
          'Sketch your signature on the smooth pointer canvas or type your name, then choose ink color and adjust signature width.',
      },
      {
        number: '03',
        title: 'Click to Place & Export',
        description:
          'Click anywhere on the PDF page preview to position your signature—optionally across all pages—and save the signed PDF locally.',
      },
    ],
    faqs: [
      {
        question: 'Does my signature or contract get uploaded to a cloud signing service?',
        answer:
          'No. Signature drawing, PNG generation, and PDF embedding occur entirely inside your browser via HTML5 Canvas and pdf-lib.',
      },
      {
        question: 'Can I sign multiple pages or resize my signature?',
        answer:
          'Yes. Use the Signature Size slider to scale cleanly and check "Place signature on all pages" if every sheet requires initials or a signature.',
      },
      {
        question: 'Is this an encrypted digital certificate signature?',
        answer:
          'Vellum embeds a crisp visual signature image cleanly into your PDF. For cryptographic PKI certificate workflows, dedicated certificate hardware is required.',
      },
    ],
  },
  'watermark-pdf': {
    path: '/watermark-pdf',
    title: 'Add Watermark to PDF Online Free | Vellum',
    metaDescription:
      'Stamp diagonal, centered, or tiled text watermarks onto PDF pages in your browser. Customize size, opacity, color, and page ranges with live preview.',
    heading: 'How to Add a Custom Watermark to PDF Pages',
    intro:
      'Mark proposals as DRAFT, label confidential client packets, or stamp brand attribution across shared handouts before sending them out. Vellum shows a live Page 1 watermark overlay while you adjust layout, size, opacity, color, and target page ranges—writing clean vector text into your PDF.',
    steps: [
      {
        number: '01',
        title: 'Select Your PDF File',
        description:
          'Open any PDF up to 100 MB. Vellum displays a live preview of Page 1 so you can check readability immediately.',
      },
      {
        number: '02',
        title: 'Customize Text & Placement Style',
        description:
          'Enter watermark copy such as CONFIDENTIAL, pick Diagonal, Centered, or Tiled Grid layout, and tune font size, opacity, and color.',
      },
      {
        number: '03',
        title: 'Choose Pages & Export',
        description:
          'Apply to all pages or a custom range, click Apply Watermark & Export, and save your stamped document locally.',
      },
    ],
    faqs: [
      {
        question: 'Will a watermark obscure the text underneath?',
        answer:
          'No. By lowering opacity between 15% and 35% and watching the live Page 1 preview, you keep underlying text crisp and readable.',
      },
      {
        question: 'Can I watermark only the first few pages?',
        answer:
          'Yes. Switch Target Pages from All Pages to Custom Range and enter ranges like 1-3 or 2, 5.',
      },
    ],
  },
  'page-numbers': {
    path: '/page-numbers',
    title: 'Add Page Numbers to PDF Online Free | Vellum',
    metaDescription:
      'Insert clean header or footer page numbers into PDF documents locally. Pick from 6 corner/center positions, custom label formats, and cover-page skip.',
    heading: 'How to Insert Page Numbers into a PDF',
    intro:
      'Merged packets, legal exhibits, and printed handbooks often arrive without consistent pagination. Vellum lets you add clean header or footer numbering across six anchor positions, pick formats like "Page 1 of N", skip title cover pages, and preview placement live before exporting.',
    steps: [
      {
        number: '01',
        title: 'Upload Your PDF',
        description:
          'Drop a PDF file locally to inspect page count, dimensions, and a live Page 1 numbering preview.',
      },
      {
        number: '02',
        title: 'Pick Position, Format & Starting Number',
        description:
          'Choose from 6 header/footer anchors, select "Page 1 of N", "1 / N", or "1", set starting page number, and optionally skip Page 1.',
      },
      {
        number: '03',
        title: 'Insert Numbers & Download',
        description:
          'Click Add Page Numbers & Export to write crisp vector pagination onto every chosen page.',
      },
    ],
    faqs: [
      {
        question: 'Can I skip numbering on the title cover page?',
        answer:
          'Yes. Enable "Skip numbering on first cover page" so numbering starts cleanly on Page 2 while keeping accurate page counts.',
      },
      {
        question: 'Can I start numbering from a number higher than 1?',
        answer:
          'Yes. Use the Start From field if your document is an appendix or continuation of an earlier volume.',
      },
    ],
  },
  'crop-pdf': {
    path: '/crop-pdf',
    title: 'Crop PDF Margins & Borders Online Free | Vellum',
    metaDescription:
      'Trim white borders and outer margins from PDF pages visually in your browser. Adjust top, bottom, left, and right trim points and export non-destructively.',
    heading: 'How to Crop White Borders and Margins from a PDF',
    intro:
      'Oversized scanner margins, wide presentation borders, and stray print bleed make documents hard to read on tablets and e-readers. Vellum gives you visual margin sliders with a live crop overlay on Page 1 and updates the PDF CropBox cleanly across all pages or a custom range.',
    steps: [
      {
        number: '01',
        title: 'Load Your PDF Document',
        description:
          'Drop a PDF to view Page 1 dimensions in PDF points (72 pt = 1 inch) alongside a live shaded crop mask.',
      },
      {
        number: '02',
        title: 'Dial In Margin Trims',
        description:
          'Use quick presets (18pt, 36pt, 64pt) or fine-tune Top, Bottom, Left, and Right sliders while checking the dashed red crop boundary.',
      },
      {
        number: '03',
        title: 'Apply Crop & Save',
        description:
          'Target all pages or specific page ranges, click Apply Crop & Export PDF, and save your trimmed document.',
      },
    ],
    faqs: [
      {
        question: 'Does cropping reduce image quality or blur text?',
        answer:
          'No. Vellum updates the non-destructive PDF CropBox geometry directly without re-rendering text or images.',
      },
      {
        question: 'What happens if I set trim values wider than the page?',
        answer:
          'Vellum checks remaining width and height on every targeted page and asks you to reduce trim amounts if a page would become smaller than 40 pt.',
      },
    ],
  },
  'ai-summarizer': {
    path: '/ai-summarizer',
    title: 'AI PDF Summarizer — Instant Summaries & Insights | Vellum',
    metaDescription:
      'Extract PDF text locally and generate structured executive summaries, bullet takeaways, and action items with page citations via Google Gemini.',
    heading: 'How to Summarize Long PDFs with Vellum AI',
    intro:
      'Digesting dense research papers, policy memos, and multi-page contracts takes focus. Vellum extracts readable text locally in your browser using PDF.js and—only when you click Generate Summary—sends that extracted text to our server-side Google Gemini route to return an executive overview, page-cited takeaways, action items, and follow-up questions.',
    steps: [
      {
        number: '01',
        title: 'Extract Text Locally from Your PDF',
        description:
          'Drop a text-based PDF into the workspace. Vellum reads text page by page inside your browser first and displays extracted page and character counts.',
      },
      {
        number: '02',
        title: 'Choose Your Summary Focus',
        description:
          'Select Executive Summary, Key Takeaways, or Action Items & Obligations depending on what you want highlighted.',
      },
      {
        number: '03',
        title: 'Generate, Copy, or Ask Follow-Ups',
        description:
          'Click Generate Summary to receive structured insights with [Page X] references, export as .TXT, or click any suggested question to continue in Chat.',
      },
    ],
    faqs: [
      {
        question: 'What data is sent to the server when using AI PDF Summarizer?',
        answer:
          'Your original PDF binary stays on your device. Only the locally extracted plain text and selected summary mode are sent to Vellum’s server and forwarded to Google Gemini to produce your summary, with zero database persistence.',
      },
      {
        question: 'Why did my scanned PDF report zero readable text?',
        answer:
          'Image-only scans without an embedded text layer require optical character recognition (OCR) before text-based AI summarization can read them.',
      },
      {
        question: 'Are there request limits on AI tools?',
        answer:
          'Yes. To keep the free service reliable for everyone, AI summary and chat endpoints allow up to 10 requests per minute per IP address.',
      },
    ],
  },
  'chat-with-pdf': {
    path: '/chat-with-pdf',
    title: 'Chat with PDF — AI Document Q&A with Citations | Vellum',
    metaDescription:
      'Ask targeted questions about any text-based PDF and get page-cited answers powered by Google Gemini. Text is extracted locally in your browser first.',
    heading: 'How to Chat and Ask Questions About a PDF',
    intro:
      'Instead of reading dozens of pages to locate a single clause, deadline, or methodology detail, ask directly. Vellum extracts text from your PDF locally in the browser and sends only the extracted text plus your prompt to our server-side Gemini AI route when you submit a question.',
    steps: [
      {
        number: '01',
        title: 'Load a Text-Readable PDF',
        description:
          'Drop your document into the workspace so PDF.js can extract readable page text locally in your browser.',
      },
      {
        number: '02',
        title: 'Pick a Starter Prompt or Ask Anything',
        description:
          'Click a quick starter question or type your own specific query about clauses, numbers, dates, or conclusions.',
      },
      {
        number: '03',
        title: 'Review Grounded Page-Cited Answers',
        description:
          'Read clear answers grounded strictly in the extracted document text with [Page X] citations when available.',
      },
    ],
    faqs: [
      {
        question: 'Are my chat messages or PDF text saved on Vellum servers?',
        answer:
          'No. Vellum does not store uploaded PDFs, extracted text, or chat histories in any database. Conversation state lives solely inside your open browser tab.',
      },
      {
        question: 'Does Chat with PDF invent answers not found in the file?',
        answer:
          'Vellum instructs Gemini to answer strictly from the extracted text and to tell you clearly if the requested information is not present in the document.',
      },
      {
        question: 'Can I switch between summarizing and chatting on the same PDF?',
        answer:
          'Yes. Use the Summarize / Chat Q&A toggle in the top right of the workspace to run both workflows without re-loading your file.',
      },
    ],
  },
};

export const INFO_PAGE_CONTENT: Record<InfoPageId, InfoPageContent> = {
  about: {
    path: '/about',
    title: 'About Vellum — Private Browser PDF Productivity Suite',
    metaDescription:
      'Learn how Vellum delivers 13 browser-local PDF editing tools and 2 opt-in Google Gemini AI document tools with clarity, speed, and zero account friction.',
    eyebrow: 'About Vellum',
    heading: 'Built to make PDF work fast, private, and clutter-free.',
    subtitle:
      'Vellum combines modern browser-native document processing with clean editorial design so everyday PDF tasks happen in seconds without software installs or logins.',
    lastUpdated: 'November 2026',
    sections: [
      {
        heading: '13 Core PDF Tools Running Locally in Your Browser',
        paragraphs: [
          'Most online PDF sites ask you to upload confidential tax forms, signed leases, and personal records onto remote queues before performing simple operations. Vellum takes a local-first approach: Merge, Split, Compress, Organize, Rotate, Delete Pages, Extract Pages, Sign, Watermark, Page Numbers, Crop, PDF to JPG, and JPG to PDF all execute directly inside your browser memory using pdf-lib, Mozilla PDF.js, HTML5 Canvas, JSZip, and dedicated Web Workers.',
          'Because core file manipulation happens straight on your own device, there are no upload queues, no arbitrary daily watermarks, and no server storage of your personal documents.',
        ],
      },
      {
        heading: 'Opt-In Gemini AI Intelligence When You Need It',
        paragraphs: [
          'For lengthy reports, contracts, and research papers, Vellum also provides two clearly labeled AI workspaces: AI PDF Summarizer and Chat with PDF. When you open either AI tool, PDF.js still extracts text locally in your browser first.',
          'Only when you explicitly press Generate Summary or send a chat question is that extracted plain text sent securely to Vellum’s server endpoint and forwarded to Google Gemini to produce your page-cited brief or answer.',
        ],
      },
      {
        heading: 'Open Access & Support',
        paragraphs: [
          'Every live tool on Vellum is available immediately with no registration wall. Have feedback, spotted an unusual PDF structure, or want to get in touch? Visit our Contact page or email support@vellumpdf.app.',
        ],
        link: {
          label: 'Contact Vellum Support',
          href: '/contact',
        },
      },
    ],
  },
  privacy: {
    path: '/privacy',
    title: 'Privacy Policy — Local Processing, AI & AdSense | Vellum',
    metaDescription:
      'Read Vellum’s Privacy Policy covering local browser PDF processing, Gemini AI text requests, localStorage preferences, and Google AdSense advertising cookies.',
    eyebrow: 'Legal & Privacy',
    heading: 'Privacy Policy',
    subtitle:
      'Transparency comes first. Here is exactly how Vellum handles your documents, browser preferences, AI requests, and advertising cookies.',
    lastUpdated: 'November 15, 2026',
    sections: [
      {
        heading: '1. Core PDF Tools Run Locally in Your Browser',
        paragraphs: [
          'Vellum’s 13 core PDF utilities (Merge PDF, Split PDF, Compress PDF, PDF to JPG, JPG to PDF, Organize PDF, Rotate PDF, Delete PDF Pages, Extract PDF Pages, Sign PDF, Watermark PDF, Add Page Numbers, and Crop PDF) execute locally inside your web browser memory.',
          'Files selected for these tools are validated locally and processed using client-side libraries (pdf-lib, Mozilla PDF.js, HTML5 Canvas, JSZip, and Web Workers). They are never uploaded to or stored on Vellum servers. Generated output files exist solely as temporary in-memory Blob URLs inside your active browser tab and are discarded when cleared or when you close the tab.',
        ],
      },
      {
        heading: '2. AI PDF Tools & Google Gemini Processing',
        paragraphs: [
          'When you choose to use Vellum’s AI tools (AI PDF Summarizer and Chat with PDF), your browser extracts readable text from the PDF locally using PDF.js. When you submit a summary request or ask a question, Vellum transmits the extracted document text and your prompt over HTTPS to our server, which forwards that request to Google Gemini strictly to generate your response.',
          'Vellum does not maintain user accounts and does not persist your PDF files, extracted document text, or AI chat conversations in any server database.',
        ],
      },
      {
        heading: '3. Local Storage Preferences',
        paragraphs: [
          'To personalize shortcuts without requiring a login, Vellum saves your starred favorite tool IDs and recently used tool list locally in your browser using localStorage. This preference data stays on your device and can be cleared anytime from your browser settings or via the Recent Tools clear button.',
        ],
      },
      {
        heading: '4. Google AdSense, Advertising Cookies & Consent Choices',
        paragraphs: [
          'Vellum uses Google AdSense to help keep our 13 browser-local PDF utilities and core productivity features free to use. Third-party vendors, including Google, use cookies or similar identifiers to serve ads based on a user’s prior visits to Vellum or other websites across the internet.',
          'Google’s use of advertising cookies enables it and its partners to serve personalized or non-personalized ads to visitors. Where required by law (including in the EEA, UK, and Switzerland), consent choices are requested before personalized advertising cookies are activated. Users may opt out of personalized advertising anytime through Google Ads Settings or review Google’s Advertising Privacy & Terms.',
        ],
        link: {
          label: 'Manage Google Ads Settings & Advertising Privacy',
          href: 'https://adssettings.google.com',
          external: true,
        },
      },
      {
        heading: '5. Server Logs, Performance Diagnostics & Contact',
        paragraphs: [
          'Our server environment processes standard HTTP request metadata (such as IP address for up to 10 AI requests per minute and daily fair-use rate limiting) plus anonymous aggregate Core Web Vitals metrics (LCP, CLS, INP) to maintain site speed without storing personal files or user profiles. If you have questions about this Privacy Policy or data rights, email support@vellumpdf.app.',
        ],
      },
    ],
  },
  terms: {
    path: '/terms',
    title: 'Terms of Service | Vellum PDF Tools',
    metaDescription:
      'Review Vellum’s Terms of Service covering acceptable use of our free browser PDF tools, Gemini AI fair-use limits, and document ownership.',
    eyebrow: 'Legal & Compliance',
    heading: 'Terms of Service',
    subtitle:
      'Plain-language terms governing your use of Vellum’s browser PDF utilities and AI document tools.',
    lastUpdated: 'November 15, 2026',
    sections: [
      {
        heading: '1. Free Browser & AI Utilities',
        paragraphs: [
          'Vellum provides online PDF preparation, conversion, editing, and AI analysis utilities free of charge for personal, educational, and business productivity workflows. By accessing Vellum, you agree to use the service lawfully and responsibly.',
        ],
      },
      {
        heading: '2. Your Documents & Responsibility',
        paragraphs: [
          'You retain full ownership and copyright over every PDF, image, and document you process with Vellum. Because core processing happens locally inside your browser tab with zero remote backups, always maintain backup copies of important original documents before modifying or discarding source files.',
        ],
      },
      {
        heading: '3. Technical Limits & Fair Use',
        paragraphs: [
          'To protect browser memory stability, individual PDF files are capped at 100 MB (250 MB combined per Merge batch) and individual images are capped at 25 MB. To protect availability of our AI tools, server-side /api/ai/* endpoints enforce automated rate limits of 10 requests per minute and daily fair-use caps per IP address. Automated scraping or abusive traffic against API endpoints is prohibited.',
        ],
      },
      {
        heading: '4. Service Disclaimer',
        paragraphs: [
          'Vellum is provided on an "as is" and "as available" basis without warranties of uninterrupted availability or fitness for a particular legal or regulatory compliance workflow. AI summaries and Q&A answers should always be verified against the underlying primary document.',
        ],
      },
    ],
  },
  contact: {
    path: '/contact',
    title: 'Contact Support & Feedback | Vellum PDF Tools',
    metaDescription:
      'Contact the Vellum team at support@vellumpdf.app for PDF tool support, bug reports, privacy inquiries, or partnership questions.',
    eyebrow: 'Get in Touch',
    heading: 'Contact Vellum',
    subtitle:
      'Have feedback on a PDF tool, encountered an unusual document layout, or have a privacy or advertising question? Reach us directly by email.',
    lastUpdated: 'November 2026',
    sections: [
      {
        heading: 'Direct Support Email',
        paragraphs: [
          'You can reach our team directly at support@vellumpdf.app. When reporting a browser or PDF compatibility issue, sharing your browser name (for example Chrome, Safari, or Firefox) and which tool you were using helps us reproduce and resolve the issue quickly—never attach sensitive confidential documents unless necessary.',
        ],
      },
      {
        heading: 'Common Topics We Assist With',
        paragraphs: [
          'Bug reports and edge-case PDF rendering feedback across desktop and mobile browsers, questions about local processing or Gemini AI data handling, and advertising or compliance inquiries.',
        ],
      },
    ],
  },
};

export const NOT_FOUND_SEO = {
  path: '/404',
  title: '404 — Page Not Found | Vellum PDF Tools',
  metaDescription:
    'The page you requested could not be found. Return to Vellum or explore our free browser-based PDF and AI tools.',
  heading: 'Page not found',
  intro:
    'Sorry, we could not find the page you were looking for. The URL may be mistyped or no longer available. Return home or jump directly into one of our popular PDF tools below.',
};

export const GUIDES_INDEX_SEO = {
  path: '/guides',
  title: 'PDF Productivity Guides & Tutorials | Vellum',
  metaDescription:
    'Step-by-step PDF tutorials on compressing files under 2 MB, merging documents privately, splitting pages cleanly, signing contracts, and scan setup.',
  heading: 'Vellum PDF Guides & Workflows',
  intro:
    'Practical, plain-English guides covering document compression, local privacy workflows, page organization, signing contracts, and converting scans.',
};

export const ALL_INDEXABLE_PATHS: string[] = [
  '/',
  ...TOOL_IDS.map((id) => TOOL_PAGE_CONTENT[id].path),
  '/guides',
  ...EDITORIAL_GUIDES.map((g) => g.path),
  ...INFO_PAGE_IDS.map((id) => INFO_PAGE_CONTENT[id].path),
];

export function resolveRouteFromPathname(pathname: string): AppRouteView {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean === '/') return 'home';
  if (clean === '/guides') return 'guides';

  if (clean.startsWith('/guides/')) {
    const guideSlug = clean.slice('/guides/'.length);
    if ((GUIDE_SLUGS as string[]).includes(guideSlug)) {
      return guideSlug as GuideSlug;
    }
    return 'not-found';
  }

  const slug = clean.slice(1);
  if ((TOOL_IDS as string[]).includes(slug)) {
    return slug as ToolId;
  }
  if ((INFO_PAGE_IDS as string[]).includes(slug)) {
    return slug as InfoPageId;
  }
  return 'not-found';
}

export function getRouteLastMod(routePath: string): string {
  if (routePath.startsWith('/guides/')) {
    const slug = routePath.slice('/guides/'.length);
    const guide = getGuideBySlug(slug);
    if (guide?.updatedAtIso) return guide.updatedAtIso;
  }
  if (routePath === '/privacy' || routePath === '/terms') {
    return '2026-11-15';
  }
  if (routePath === '/about' || routePath === '/contact') {
    return '2026-11-15';
  }
  return SITE_LASTMOD_ISO;
}

export interface PageSeoMetadata {
  path: string;
  title: string;
  metaDescription: string;
  ogType: 'website' | 'article';
  ogImageAlt: string;
  publishedTime?: string;
  modifiedTime?: string;
  articleSection?: string;
  noindex?: boolean;
  structuredData: Record<string, unknown> | null;
}

function normalizeOrigin(origin?: string): string {
  return origin ? origin.replace(/\/+$/, '') : '';
}

function buildOrganizationNode(baseOrigin: string): Record<string, unknown> {
  return {
    '@type': 'Organization',
    '@id': `${baseOrigin}/#organization`,
    name: 'Vellum',
    url: `${baseOrigin}/`,
    email: 'support@vellumpdf.app',
    logo: {
      '@type': 'ImageObject',
      url: `${baseOrigin}/icon-512.png`,
      width: 512,
      height: 512,
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'support@vellumpdf.app',
      availableLanguage: ['English'],
    },
  };
}

function buildWebSiteNode(baseOrigin: string): Record<string, unknown> {
  return {
    '@type': 'WebSite',
    '@id': `${baseOrigin}/#website`,
    name: 'Vellum',
    alternateName: 'Vellum PDF Tools',
    url: `${baseOrigin}/`,
    inLanguage: 'en',
    description: SITE_HOME_SEO.metaDescription,
    publisher: {
      '@id': `${baseOrigin}/#organization`,
    },
  };
}

function buildToolStructuredData(
  toolId: ToolId,
  origin?: string
): Record<string, unknown> {
  const guide = TOOL_PAGE_CONTENT[toolId];
  const tool = PDF_TOOLS.find((item) => item.id === toolId);
  const baseOrigin = normalizeOrigin(origin);
  const canonicalUrl = `${baseOrigin}${guide.path}`;
  const homeUrl = `${baseOrigin}/`;
  const ogImageUrl = `${baseOrigin}/og-image.png`;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      buildOrganizationNode(baseOrigin),
      {
        '@type': 'WebApplication',
        '@id': `${canonicalUrl}#app`,
        name: `${tool?.name ?? guide.heading} — Vellum`,
        url: canonicalUrl,
        image: ogImageUrl,
        screenshot: ogImageUrl,
        inLanguage: 'en',
        applicationCategory: 'UtilitiesApplication',
        applicationSubCategory: tool?.category ?? 'PDF Tools',
        operatingSystem: 'All',
        browserRequirements: 'Requires JavaScript and HTML5 Canvas',
        description: guide.metaDescription,
        isAccessibleForFree: true,
        publisher: {
          '@id': `${baseOrigin}/#organization`,
        },
        featureList: tool?.capabilityNote
          ? [tool.description, tool.capabilityNote, 'No account required', 'No export watermarks']
          : [guide.metaDescription],
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
      },
      {
        '@type': 'HowTo',
        name: guide.heading,
        description: guide.intro,
        totalTime: 'PT1M',
        tool: {
          '@type': 'HowToTool',
          name: `Vellum ${tool?.name ?? 'PDF Tool'}`,
        },
        step: guide.steps.map((step, index) => ({
          '@type': 'HowToStep',
          position: index + 1,
          name: step.title,
          text: step.description,
          url: `${canonicalUrl}#step-${step.number}`,
        })),
      },
      {
        '@type': 'FAQPage',
        mainEntity: guide.faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: homeUrl,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: tool?.name ?? guide.heading,
            item: canonicalUrl,
          },
        ],
      },
    ],
  };
}

function buildHomeStructuredData(origin?: string): Record<string, unknown> {
  const baseOrigin = normalizeOrigin(origin);
  const ogImageUrl = `${baseOrigin}/og-image.png`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      buildOrganizationNode(baseOrigin),
      buildWebSiteNode(baseOrigin),
      {
        '@type': 'WebApplication',
        '@id': `${baseOrigin}/#app`,
        name: 'Vellum',
        url: `${baseOrigin}/`,
        image: ogImageUrl,
        screenshot: ogImageUrl,
        inLanguage: 'en',
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'All',
        browserRequirements: 'Requires JavaScript and HTML5 Canvas',
        description: SITE_HOME_SEO.metaDescription,
        isAccessibleForFree: true,
        publisher: {
          '@id': `${baseOrigin}/#organization`,
        },
        featureList: PDF_TOOLS.map((tool) => `${tool.name}: ${tool.description}`),
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
      },
      {
        '@type': 'ItemList',
        name: 'Vellum PDF & AI Tools',
        numberOfItems: PDF_TOOLS.length,
        itemListElement: PDF_TOOLS.map((tool, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: tool.name,
          description: tool.description,
          url: `${baseOrigin}/${tool.id}`,
        })),
      },
      {
        '@type': 'FAQPage',
        mainEntity: HOME_FAQS.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      },
    ],
  };
}

function buildInfoStructuredData(
  pageId: InfoPageId,
  origin?: string
): Record<string, unknown> {
  const info = INFO_PAGE_CONTENT[pageId];
  const baseOrigin = normalizeOrigin(origin);
  const canonicalUrl = `${baseOrigin}${info.path}`;
  const pageType =
    pageId === 'about'
      ? 'AboutPage'
      : pageId === 'contact'
        ? 'ContactPage'
        : 'WebPage';

  return {
    '@context': 'https://schema.org',
    '@graph': [
      buildOrganizationNode(baseOrigin),
      {
        '@type': pageType,
        name: info.title,
        description: info.metaDescription,
        url: canonicalUrl,
        inLanguage: 'en',
        dateModified: getRouteLastMod(info.path),
        isPartOf: {
          '@id': `${baseOrigin}/#website`,
        },
        ...(pageId === 'contact'
          ? {
              mainEntity: {
                '@id': `${baseOrigin}/#organization`,
              },
            }
          : {}),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: `${baseOrigin}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: info.heading,
            item: canonicalUrl,
          },
        ],
      },
    ],
  };
}

function buildGuidesIndexStructuredData(
  origin?: string
): Record<string, unknown> {
  const baseOrigin = normalizeOrigin(origin);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      buildOrganizationNode(baseOrigin),
      {
        '@type': 'CollectionPage',
        name: GUIDES_INDEX_SEO.title,
        description: GUIDES_INDEX_SEO.metaDescription,
        url: `${baseOrigin}/guides`,
        inLanguage: 'en',
        isPartOf: {
          '@id': `${baseOrigin}/#website`,
        },
      },
      {
        '@type': 'ItemList',
        name: 'Vellum PDF Guides',
        numberOfItems: EDITORIAL_GUIDES.length,
        itemListElement: EDITORIAL_GUIDES.map((g, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: g.title,
          description: g.summary,
          url: `${baseOrigin}${g.path}`,
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: `${baseOrigin}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Guides',
            item: `${baseOrigin}/guides`,
          },
        ],
      },
    ],
  };
}

function buildGuideArticleStructuredData(
  slug: GuideSlug,
  origin?: string
): Record<string, unknown> | null {
  const guide = getGuideBySlug(slug);
  if (!guide) return null;
  const baseOrigin = normalizeOrigin(origin);
  const canonicalUrl = `${baseOrigin}${guide.path}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      buildOrganizationNode(baseOrigin),
      {
        '@type': 'TechArticle',
        headline: guide.title,
        description: guide.metaDescription,
        url: canonicalUrl,
        inLanguage: 'en',
        articleSection: guide.category,
        datePublished: guide.publishedAtIso,
        dateModified: guide.updatedAtIso,
        image: {
          '@type': 'ImageObject',
          url: `${baseOrigin}/og-image.png`,
          width: 1200,
          height: 630,
        },
        author: {
          '@id': `${baseOrigin}/#organization`,
        },
        publisher: {
          '@id': `${baseOrigin}/#organization`,
        },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': canonicalUrl,
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: `${baseOrigin}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Guides',
            item: `${baseOrigin}/guides`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: guide.title,
            item: canonicalUrl,
          },
        ],
      },
    ],
  };
}

export function getPageSeo(
  view: AppRouteView,
  origin?: string
): PageSeoMetadata {
  if (view === 'home') {
    return {
      path: SITE_HOME_SEO.path,
      title: SITE_HOME_SEO.title,
      metaDescription: SITE_HOME_SEO.metaDescription,
      ogType: 'website',
      ogImageAlt: SITE_HOME_SEO.title,
      structuredData: buildHomeStructuredData(origin),
    };
  }
  if (view === 'not-found') {
    return {
      path: NOT_FOUND_SEO.path,
      title: NOT_FOUND_SEO.title,
      metaDescription: NOT_FOUND_SEO.metaDescription,
      ogType: 'website',
      ogImageAlt: NOT_FOUND_SEO.title,
      noindex: true,
      structuredData: null,
    };
  }
  if (view === 'guides') {
    return {
      path: GUIDES_INDEX_SEO.path,
      title: GUIDES_INDEX_SEO.title,
      metaDescription: GUIDES_INDEX_SEO.metaDescription,
      ogType: 'website',
      ogImageAlt: GUIDES_INDEX_SEO.title,
      structuredData: buildGuidesIndexStructuredData(origin),
    };
  }
  if ((GUIDE_SLUGS as string[]).includes(view)) {
    const slug = view as GuideSlug;
    const guide = getGuideBySlug(slug)!;
    return {
      path: guide.path,
      title: guide.seoTitle,
      metaDescription: guide.metaDescription,
      ogType: 'article',
      ogImageAlt: guide.title,
      publishedTime: guide.publishedAtIso,
      modifiedTime: guide.updatedAtIso,
      articleSection: guide.category,
      structuredData: buildGuideArticleStructuredData(slug, origin),
    };
  }
  if ((INFO_PAGE_IDS as string[]).includes(view)) {
    const infoId = view as InfoPageId;
    const info = INFO_PAGE_CONTENT[infoId];
    return {
      path: info.path,
      title: info.title,
      metaDescription: info.metaDescription,
      ogType: 'website',
      ogImageAlt: info.title,
      structuredData: buildInfoStructuredData(infoId, origin),
    };
  }
  const toolId = view as ToolId;
  const tool = TOOL_PAGE_CONTENT[toolId];
  return {
    path: tool.path,
    title: tool.title,
    metaDescription: tool.metaDescription,
    ogType: 'website',
    ogImageAlt: tool.title,
    structuredData: buildToolStructuredData(toolId, origin),
  };
}
