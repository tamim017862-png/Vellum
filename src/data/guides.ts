import type { GuideSlug, ToolId } from '../types/pdf';

export interface GuideSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface EditorialGuide {
  slug: GuideSlug;
  path: `/guides/${GuideSlug}`;
  title: string;
  seoTitle: string;
  metaDescription: string;
  category: string;
  readTime: string;
  updatedAt: string;
  publishedAtIso: string;
  updatedAtIso: string;
  relatedToolId: ToolId;
  relatedToolName: string;
  summary: string;
  sections: GuideSection[];
}

export interface ToolBestPractice {
  heading: string;
  points: { label: string; detail: string }[];
  proTip: string;
}

export const GUIDE_SLUGS: GuideSlug[] = [
  'reduce-pdf-size-under-2mb',
  'merge-pdfs-privately-in-browser',
  'split-and-extract-pdf-pages',
  'sign-and-watermark-contracts-safely',
  'convert-scanned-images-to-compact-pdf',
];

export const EDITORIAL_GUIDES: EditorialGuide[] = [
  {
    slug: 'reduce-pdf-size-under-2mb',
    path: '/guides/reduce-pdf-size-under-2mb',
    title: 'How to Compress a PDF Under 2 MB Without Losing Readability',
    seoTitle: 'How to Compress a PDF Under 2 MB Safely | Vellum Guides',
    metaDescription:
      'Step-by-step guide to shrinking large scanned PDFs under 2 MB for visa portals, job applications, and email attachments without sacrificing readable text.',
    category: 'Optimize',
    readTime: '5 min read',
    updatedAt: 'November 2026',
    publishedAtIso: '2026-11-01',
    updatedAtIso: '2026-11-15',
    relatedToolId: 'compress-pdf',
    relatedToolName: 'Compress PDF',
    summary:
      'Learn why PDFs balloon in size, when to choose lossless structural compaction versus DPI recompression, and how to hit strict 1 MB or 2 MB portal upload caps cleanly.',
    sections: [
      {
        heading: 'Why Some PDFs Become Unexpectedly Huge',
        paragraphs: [
          'Most oversized PDFs are not bloated by text—a hundred pages of pure digital text rarely exceeds 400 KB. Instead, multi-megabyte PDFs usually come from uncompressed phone scans, embedded high-resolution photographs from Word or PowerPoint exports, or duplicated font subsets left behind when documents are repeatedly saved.',
          'Before compressing blindly, checking whether your PDF contains selectable vector text or full-page scanned bitmaps tells you which optimization strategy will give the biggest savings without making small print blurry.',
        ],
        bullets: [
          'Scanned multi-page forms saved at 300–600 DPI often consume 1.5–4 MB per single page.',
          'Presentations exported with full camera photos embed uncompressed RGB streams inside PDF objects.',
          'Digital invoices or text contracts with large file sizes often carry redundant metadata or uncompacted object streams.',
        ],
      },
      {
        heading: 'Choosing Between Lossless Compaction and DPI Presets',
        paragraphs: [
          'If your document is mostly crisp digital typography, tables, or clickable links—such as a resume or financial statement—start with Lossless Structure Only. It compacts internal PDF object streams and strips bloated metadata while keeping vector text 100% sharp and selectable.',
          'If your PDF contains heavy scanned images or slide graphics and needs to drop from 15 MB down to under 2 MB, visual recompression is far more effective. Re-encoding pages at 130 DPI (Recommended Balance) preserves clear legibility on laptops and tablets while cutting file weight dramatically; 96 DPI (Strong Compression) targets tight 1 MB–2 MB government and job portal limits.',
        ],
      },
      {
        heading: 'Workflow to Hit Strict Upload Limits Cleanly',
        paragraphs: [
          'Start with Recommended Balance (130 DPI) in Vellum Compress PDF, inspect the exact before-and-after byte readout in the output card, and zoom into a dense text page to confirm crispness. If the portal requires an even smaller attachment, switch directly to Strong Compression (96 DPI) or split unnecessary appendix pages out first using Split PDF.',
        ],
        bullets: [
          'Target 130 DPI (72% JPEG quality) for balanced legibility on contracts and academic packets.',
          'Use 96 DPI (56% JPEG quality) when a form caps uploads strictly at 1 MB or 2 MB.',
          'Trim blank separator sheets or unused annex pages before compressing to save extra megabytes without lowering image clarity.',
        ],
      },
    ],
  },
  {
    slug: 'merge-pdfs-privately-in-browser',
    path: '/guides/merge-pdfs-privately-in-browser',
    title: 'How to Combine Multiple PDFs Without Uploading Confidential Files',
    seoTitle: 'Merge PDFs Privately Without Server Uploads | Vellum Guides',
    metaDescription:
      'Keep tax returns, contracts, and ID scans off third-party servers. Learn how browser Web Workers combine PDFs locally in memory with original vector quality.',
    category: 'Organize',
    readTime: '4 min read',
    updatedAt: 'November 2026',
    publishedAtIso: '2026-11-03',
    updatedAtIso: '2026-11-15',
    relatedToolId: 'merge-pdf',
    relatedToolName: 'Merge PDF',
    summary:
      'Understand how client-side PDF merging works inside an isolated Web Worker, why vector typography stays intact, and how to prep encrypted or mixed-orientation files.',
    sections: [
      {
        heading: 'The Hidden Privacy Cost of Traditional PDF Mergers',
        paragraphs: [
          'Combining bank statements, passport copies, tax forms, or signed employment agreements is an everyday chore. Unfortunately, conventional online converters upload your raw files across the network to temporary cloud storage buckets just to stitch a few pages together.',
          'Processing files locally inside your browser avoids remote transmission entirely. Vellum reads selected PDFs straight from disk into isolated browser tab memory and runs pdf-lib inside a background Web Worker so the interface stays responsive even on 20-document packets.',
        ],
      },
      {
        heading: 'Preserving Bookmarks, Vector Text, and Page Geometry',
        paragraphs: [
          'Cheap PDF utilities sometimes convert every page to a flat image before re-assembling the file, which destroys selectable text and blurs thin fonts. Structural merging copies page trees directly at the PDF object level, preserving crisp typography, exact page sizes (such as A4 mixed with US Letter), and embedded vector graphics.',
        ],
        bullets: [
          'Verify PDF headers and page counts locally before starting the merge.',
          'Drag rows or use arrow buttons to place cover letters, main reports, and appendices in exact reading order.',
          'Watch per-file progress and estimated remaining time while large batches compile in the worker.',
        ],
      },
      {
        heading: 'Handling Password-Protected Files Before Combining',
        paragraphs: [
          'Standard PDF security prevents unauthenticated software from copying encrypted page streams silently. If one document in your packet asks for an owner or user password on open, remove that restriction in your OS print-to-PDF or viewer first, then drop the unlocked copy into Merge PDF for instant local assembly.',
        ],
      },
    ],
  },
  {
    slug: 'split-and-extract-pdf-pages',
    path: '/guides/split-and-extract-pdf-pages',
    title: 'How to Split Large PDFs and Extract Exact Pages Cleanly',
    seoTitle: 'Split PDFs & Extract Pages Cleanly | Vellum Guides',
    metaDescription:
      'Learn when to use syntax page-range splitting vs visual thumbnail extraction to pull exact chapters, invoices, or signature pages from large PDF documents.',
    category: 'Organize',
    readTime: '4 min read',
    updatedAt: 'November 2026',
    publishedAtIso: '2026-11-05',
    updatedAtIso: '2026-11-15',
    relatedToolId: 'split-pdf',
    relatedToolName: 'Split PDF',
    summary:
      'Compare fast text-range splitting, fixed N-page chunking, and visual thumbnail extraction so you can break apart bulky manuals and multi-invoice exports effortlessly.',
    sections: [
      {
        heading: 'Three Practical Ways to Break Up a Multi-Page PDF',
        paragraphs: [
          'Not every document split calls for the same workflow. Sometimes you know the exact page numbers you need—like pages 1–3 and 14 of a lease—while other times you are scanning through a 40-page packet trying to spot which pages contain the signed exhibits.',
          'Splitting by ranges excels when you already know page boundaries, whereas visual extraction lets you inspect thumbnail previews before committing to an output file.',
        ],
        bullets: [
          'Custom Page Ranges (e.g. 1-4, 7, 10-12): Best for extracting specific chapters or combined non-contiguous sections.',
          'Fixed Interval (Every N Pages): Ideal when a scanner saves 50 two-page invoices into a single continuous file.',
          'All Individual Pages: Converts a multi-page file into separate numbered PDFs bundled in a clean ZIP archive.',
        ],
      },
      {
        heading: 'Keeping Extracted Ranges Combined vs Separate Files',
        paragraphs: [
          'In Vellum Split PDF, toggling whether custom ranges export as one unified file or separate PDFs saves an extra merge step. Keep separate ranges unchecked when compiling an executive packet (for example cover sheet page 1 plus financial tables on pages 12–15), or enable separate exports to receive each section as its own named PDF inside a ZIP download.',
        ],
      },
      {
        heading: 'Visual Cleanup After Splitting',
        paragraphs: [
          'After isolating a chapter, if you notice a sideways chart or a trailing blank sheet, open the trimmed file in Rotate PDF or Delete PDF Pages. Because all tools run locally, moving an output between tools via My Files takes zero network wait.',
        ],
      },
    ],
  },
  {
    slug: 'sign-and-watermark-contracts-safely',
    path: '/guides/sign-and-watermark-contracts-safely',
    title: 'How to Sign and Watermark PDF Contracts Online Safely',
    seoTitle: 'Sign & Watermark PDF Documents Privately | Vellum Guides',
    metaDescription:
      'Add crisp handwritten or typed signatures and draft/confidential watermarks directly to PDF contracts in your browser without exposing client agreements.',
    category: 'Edit & Sign',
    readTime: '5 min read',
    updatedAt: 'November 2026',
    publishedAtIso: '2026-11-08',
    updatedAtIso: '2026-11-15',
    relatedToolId: 'sign-pdf',
    relatedToolName: 'Sign PDF',
    summary:
      'Best practices for placing clean signatures on agreements, stamping "CONFIDENTIAL" or "DRAFT" watermarks across specific page ranges, and keeping client records local.',
    sections: [
      {
        heading: 'Why Contract Workflows Belong Client-Side',
        paragraphs: [
          'NDAs, freelancer agreements, rental leases, and offer letters contain personal addresses, compensation terms, and signatures. Routing private contracts through random cloud signature uploaders adds unnecessary exposure when all you need is a visual signature placement or approval stamp.',
          'Vellum renders PDF pages directly onto a local canvas where you can draw a pressure-smoothed signature, switch between crisp ink colors, or type a formatted signature before embedding it straight into the PDF page coordinates.',
        ],
      },
      {
        heading: 'Signature Placement & Scaling Tips',
        paragraphs: [
          'When placing a signature over a printed line, avoid making the stroke overly tiny or stretched horizontally. Resize proportionally above the signature line, verify legibility on the live page preview, and double-check whether initials or dates are needed on earlier pages before exporting.',
        ],
        bullets: [
          'Use deep ink (#202124) or navy/blue ink to stand out cleanly on printed or scanned contracts.',
          'Preview the exact page number before saving so multi-page agreements stay properly aligned.',
          'Always store a copy of the signed PDF locally in your permanent folder alongside your session My Files drawer.',
        ],
      },
      {
        heading: 'Applying Non-Intrusive Draft & Confidential Watermarks',
        paragraphs: [
          'When sharing pre-release proposals or sensitive slide decks, Watermark PDF lets you choose diagonal, centered, or tiled 2×3 layouts across all pages or custom ranges. Keeping opacity between 15% and 30% ensures reviewers can still read underlying charts and clauses without obstruction while keeping document status unmistakable.',
        ],
      },
    ],
  },
  {
    slug: 'convert-scanned-images-to-compact-pdf',
    path: '/guides/convert-scanned-images-to-compact-pdf',
    title: 'How to Turn Phone Photos and JPG Scans into Print-Ready A4 PDFs',
    seoTitle: 'Convert JPG & PNG Scans to A4 PDF | Vellum Guides',
    metaDescription:
      'Fix sideways phone orientations, align receipt photos onto A4 or Letter sheets with clean margins, and create organized multi-page PDFs locally.',
    category: 'Convert',
    readTime: '4 min read',
    updatedAt: 'November 2026',
    publishedAtIso: '2026-11-10',
    updatedAtIso: '2026-11-15',
    relatedToolId: 'jpg-to-pdf',
    relatedToolName: 'JPG to PDF',
    summary:
      'Prepare receipt scans, whiteboard notes, and ID photos cleanly by calibrating paper size, orientation, white margins, and image rotation before compiling your PDF.',
    sections: [
      {
        heading: 'Fixing Common Phone-to-PDF Formatting Mistakes',
        paragraphs: [
          'Dropping raw smartphone photos straight into a basic converter often produces awkward results: one giant 4000-pixel page followed by a sideways landscape page that prints clipped at the edges. Standardizing paper size and orientation fixes print alignment immediately.',
        ],
        bullets: [
          'Choose A4 or US Letter when your PDF will be printed or submitted to schools, banks, or HR portals.',
          'Choose Fit to Image when archiving digital portfolio spreads or screenshots without white borders.',
          'Add 18 pt or 36 pt margins around document scans so printers never clip handwritten notes near edges.',
        ],
      },
      {
        heading: 'Rotating Sideways Photos & Normalizing PNG Transparency',
        paragraphs: [
          'Use the 90° rotate button on any queued photo thumbnail to orient receipts upright before generating the file. Vellum also normalizes PNG images onto clean white canvas backgrounds so transparent diagrams never render as solid black blocks in older PDF viewers.',
        ],
      },
      {
        heading: 'Keeping Final Image PDFs Lightweight',
        paragraphs: [
          'If you combine 10+ high-megapixel phone photos and the resulting PDF exceeds your email attachment cap, pass the compiled PDF straight into Compress PDF at 130 DPI. Combining structured A4 layout with light recompression produces crisp, shareable packets under a couple megabytes.',
        ],
      },
    ],
  },
];

export const TOOL_BEST_PRACTICES: Record<ToolId, ToolBestPractice> = {
  'merge-pdf': {
    heading: 'Optimization & Compatibility Notes',
    points: [
      {
        label: 'Batch Capacity',
        detail:
          'Combine up to 20 PDF documents (up to 250 MB combined) smoothly inside a dedicated browser Web Worker.',
      },
      {
        label: 'Structural Quality',
        detail:
          'Vector fonts, hyperlinks, and mixed A4/Letter page sizes remain unaltered without rasterization.',
      },
      {
        label: 'Encryption Handling',
        detail:
          'Password-locked PDFs are detected immediately during inspection so you can unlock them before merging.',
      },
    ],
    proTip:
      'Need to trim unwanted cover sheets from one of your inputs first? Run it through Delete PDF Pages and grab the cleaned output straight from My Files.',
  },
  'split-pdf': {
    heading: 'Splitting Modes & Output Guide',
    points: [
      {
        label: 'Range Syntax',
        detail:
          'Supports single pages and inclusive ranges such as 1-3, 5, 9-12 cleanly.',
      },
      {
        label: 'Automatic Packaging',
        detail:
          'Single-output splits download as a direct PDF; multi-file splits bundle neatly into a local ZIP archive.',
      },
      {
        label: 'Zero Quality Loss',
        detail:
          'Pages are extracted at original structural fidelity via pdf-lib object copying.',
      },
    ],
    proTip:
      'When separating multi-invoice exports printed as one batch file, use Split Every N Pages to slice uniform 1-page or 2-page packets automatically.',
  },
  'compress-pdf': {
    heading: 'Compression Tier Comparison',
    points: [
      {
        label: 'Strong (96 DPI)',
        detail:
          'Best for tight 1–2 MB portal limits on heavy image scans or photo-laden decks.',
      },
      {
        label: 'Recommended (130 DPI)',
        detail:
          'Calibrated balance between readable screen clarity and meaningful file weight savings.',
      },
      {
        label: 'Lossless Structure',
        detail:
          'Preserves 100% selectable vector text and strips redundant metadata without rasterizing.',
      },
    ],
    proTip:
      'Always verify small print legibility after compressing scanned forms; switch up to 130 DPI or 165 DPI if fine numbers soften.',
  },
  'pdf-to-jpg': {
    heading: 'Resolution & Export Guidelines',
    points: [
      {
        label: '1× Standard',
        detail:
          'Lightweight web previews and quick chat attachments (~72–96 DPI screen baseline).',
      },
      {
        label: '2× Sharp',
        detail:
          'Recommended default for presentation slides, social posts, and crisp text legibility.',
      },
      {
        label: '3× Print-Ready',
        detail:
          'High-density rendering suited for detailed architectural diagrams and zoomed inspection.',
      },
    ],
    proTip:
      'Exporting just one slide or receipt? Enter its page number under Custom Range to download a single JPG immediately instead of a ZIP.',
  },
  'jpg-to-pdf': {
    heading: 'Layout & Print Calibration',
    points: [
      {
        label: 'A4 & US Letter',
        detail:
          'Fits photos proportionally onto uniform print sheets ready for office printing or HR uploads.',
      },
      {
        label: 'Fit to Image',
        detail:
          'Creates custom page dimensions matching every photo’s exact pixel aspect ratio.',
      },
      {
        label: 'Batch Ordering',
        detail:
          'Supports up to 20 JPG or PNG files up to 25 MB each with per-image 90° rotation.',
      },
    ],
    proTip:
      'Use Auto orientation when mixing horizontal whiteboard snaps and vertical receipt scans so each sheet rotates cleanly.',
  },
  'organize-pdf': {
    heading: 'Page Studio Capabilities',
    points: [
      {
        label: 'Live Grid Preview',
        detail:
          'Renders visual page thumbnails up to 60 pages for drag-and-drop sequence adjustments.',
      },
      {
        label: 'Combined Edits',
        detail:
          'Reorder, rotate individual pages 90°, and remove redundant sheets in one pass.',
      },
      {
        label: 'Instant Reset',
        detail:
          'Revert all ordering, rotation, and deletion changes cleanly at any time before saving.',
      },
    ],
    proTip:
      'For PDFs larger than 60 pages, slice out the chapter you need with Split PDF first, then organize visually in Page Studio.',
  },
  'rotate-pdf': {
    heading: 'Rotation Accuracy & Quality',
    points: [
      {
        label: 'Lossless Metadata',
        detail:
          'Updates underlying PDF /Rotate page attributes cleanly without re-encoding fonts or scans.',
      },
      {
        label: 'Selective or Global',
        detail:
          'Turn single sideways landscape exhibits or rotate the entire packet 90° with one click.',
      },
      {
        label: 'Permanent Save',
        detail:
          'Every standard PDF viewer (Chrome, Preview, Acrobat) respects the saved orientation.',
      },
    ],
    proTip:
      'Use Rotate All 90° when a scanner fed an entire sheaf of paper sideways, then fine-tune any single upside-down sheet individually.',
  },
  'delete-pages': {
    heading: 'Safe Document Trimming',
    points: [
      {
        label: 'Non-Destructive Preview',
        detail:
          'Marked pages remain visible until export so you can restore any sheet in one click.',
      },
      {
        label: 'Exact Page Retention',
        detail:
          'Rebuilds a clean PDF containing strictly your kept pages without touching your original file.',
      },
      {
        label: 'Guardrail Check',
        detail:
          'Prevents exporting an empty 0-page document if every thumbnail is marked deleted.',
      },
    ],
    proTip:
      'Double-check the Resulting Pages count in the right-hand sidebar before exporting lengthy packets.',
  },
  'extract-pages': {
    heading: 'Visual Extraction vs Split Ranges',
    points: [
      {
        label: 'Visual Confirmation',
        detail:
          'See exact thumbnails before selecting pages—ideal when table-of-contents page numbers differ from PDF page indices.',
      },
      {
        label: 'Select All / Clear',
        detail:
          'Quickly invert workflows by selecting everything then unchecking the few pages to omit.',
      },
      {
        label: 'Clean Output PDF',
        detail:
          'Selected pages keep their original dimensions, text layers, and graphics.',
      },
    ],
    proTip:
      'Keep your original document untouched and check My Files in the header if you want to pull a second set of pages right after.',
  },
  'sign-pdf': {
    heading: 'Signature Quality & Privacy Specs',
    points: [
      {
        label: 'Two Signature Styles',
        detail:
          'Draw smooth freehand signatures via mouse/touch or generate clean typed ink signatures.',
      },
      {
        label: 'Zero Remote Upload',
        detail:
          'Your handwritten signature image and contract bytes remain strictly inside your browser tab.',
      },
      {
        label: 'Precise Positioning',
        detail:
          'Drag and scale placement visually on the live PDF canvas before embedding.',
      },
    ],
    proTip:
      'Match your signature color to dark ink (#202124) or deep blue (#2563EB) for natural contrast against white contract paper.',
  },
  'watermark-pdf': {
    heading: 'Watermark Visibility Recommendations',
    points: [
      {
        label: 'Three Stamp Styles',
        detail:
          'Pick bold Diagonal bands, Centered notices, or a 2×3 Tiled Grid for maximum coverage.',
      },
      {
        label: 'Optimal Opacity',
        detail:
          'Keep opacity between 15% and 35% so stamped pages stay clearly readable underneath.',
      },
      {
        label: 'Selective Range',
        detail:
          'Apply stamps to every page or limit strictly to sensitive exhibits using Custom Range.',
      },
    ],
    proTip:
      'Use Custom Range like 2-10 when you want a clean unwatermarked cover page while marking internal slides CONFIDENTIAL.',
  },
  'page-numbers': {
    heading: 'Pagination Formatting Tips',
    points: [
      {
        label: 'Flexible Formats',
        detail:
          'Switch between "Page X of Y", "X / Y", or clean numeric "X" styles.',
      },
      {
        label: '6-Point Anchors',
        detail:
          'Place numbers cleanly at Top or Bottom across Left, Center, or Right margins.',
      },
      {
        label: 'Cover Page Skip',
        detail:
          'Enable Skip First Page to keep title covers clean while numbering body pages starting at 1 or 2.',
      },
    ],
    proTip:
      'Keep margin padding at 24–32 pt for standard office printouts so footers stay well clear of printer hardware margins.',
  },
  'crop-pdf': {
    heading: 'Non-Destructive Margin Cropping',
    points: [
      {
        label: 'Standard Point Units',
        detail:
          'Trim margins precisely in PDF points (72 pt = 1 inch / 25.4 mm) from Top, Right, Bottom, or Left.',
      },
      {
        label: 'Visual Crop Frame',
        detail:
          'Live dashed crop overlay updates in real time on the document preview before exporting.',
      },
      {
        label: 'Minimum Dimension Guard',
        detail:
          'Validates trimmed box dimensions automatically so pages never collapse below usable bounds.',
      },
    ],
    proTip:
      'Use Custom Range when an e-book or scanned packet only needs excess margins trimmed on specific landscape appendices.',
  },
  'ai-summarizer': {
    heading: 'Getting Better AI Summaries',
    points: [
      {
        label: 'Text-First Extraction',
        detail:
          'Extracts selectable text locally via PDF.js before sending clean document prose to Gemini.',
      },
      {
        label: 'Three Summary Lenses',
        detail:
          'Switch between Executive Brief, Bullet Takeaways, or Action Items & Deadlines.',
      },
      {
        label: 'Page-Cited Output',
        detail:
          'Includes [Page X] references and follow-up suggestions you can copy or save as TXT.',
      },
    ],
    proTip:
      'If a PDF is purely camera images with zero selectable text, OCR it first before running text-based AI analysis.',
  },
  'chat-with-pdf': {
    heading: 'Document Q&A Best Practices',
    points: [
      {
        label: 'Grounded Answers',
        detail:
          'Instructed to answer strictly from the extracted PDF text and cite specific [Page X] locations.',
      },
      {
        label: 'Multi-Turn Context',
        detail:
          'Retains recent conversation turns in active session state for natural follow-up questions.',
      },
      {
        label: 'Fair-Use Guardrails',
        detail:
          'Protected by automated rate limiting with zero permanent server-side document storage.',
      },
    ],
    proTip:
      'Ask targeted questions referencing terms, dates, or clauses—like "What is the termination notice period and where is it stated?"',
  },
};

export function getGuideBySlug(slug: string): EditorialGuide | undefined {
  return EDITORIAL_GUIDES.find((g) => g.slug === slug);
}
