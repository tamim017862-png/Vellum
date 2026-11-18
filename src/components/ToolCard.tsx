import React, { useRef } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Crop,
  FileImage,
  FileOutput,
  Hash,
  ImagePlus,
  Layers,
  LayoutGrid,
  MessageSquareText,
  Minimize2,
  PenTool,
  RotateCw,
  Scissors,
  Sparkles,
  Stamp,
  Star,
  Trash2,
} from 'lucide-react';
import type { PdfToolDefinition, ToolId } from '../types/pdf';

interface ToolCardProps {
  tool: PdfToolDefinition;
  isFavorite: boolean;
  onToggleFavorite: (id: ToolId) => void;
  onOpenTool: (id: ToolId) => void;
}

export function getToolIcon(id: ToolId) {
  switch (id) {
    case 'merge-pdf':
      return Layers;
    case 'split-pdf':
      return Scissors;
    case 'compress-pdf':
      return Minimize2;
    case 'pdf-to-jpg':
      return FileImage;
    case 'jpg-to-pdf':
      return ImagePlus;
    case 'organize-pdf':
      return LayoutGrid;
    case 'rotate-pdf':
      return RotateCw;
    case 'delete-pages':
      return Trash2;
    case 'extract-pages':
      return FileOutput;
    case 'sign-pdf':
      return PenTool;
    case 'watermark-pdf':
      return Stamp;
    case 'page-numbers':
      return Hash;
    case 'crop-pdf':
      return Crop;
    case 'ai-summarizer':
      return Sparkles;
    case 'chat-with-pdf':
      return MessageSquareText;
  }
}

export const ToolCard: React.FC<ToolCardProps> = ({
  tool,
  isFavorite,
  onToggleFavorite,
  onOpenTool,
}) => {
  const cardRef = useRef<HTMLElement | null>(null);
  const Icon = getToolIcon(tool.id);
  const isPrimary = tool.id === 'merge-pdf';
  const isAi = tool.executionScope === 'gemini-server';

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--spot-x', `${e.clientX - rect.left}px`);
    el.style.setProperty('--spot-y', `${e.clientY - rect.top}px`);
  };

  return (
    <motion.article
      ref={cardRef}
      onMouseMove={handleMouseMove}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 460, damping: 30 }}
      className={`card-spotlight group relative h-full flex flex-col justify-between bg-white rounded-xl p-4 sm:p-5 transition-[border-color,box-shadow] duration-200 ${
        isPrimary
          ? 'border border-blue-200 hover:border-[#2563EB] shadow-[0_12px_28px_-18px_rgba(37,99,235,0.28)] hover:shadow-[0_18px_36px_-18px_rgba(37,99,235,0.32)]'
          : 'border border-slate-200/90 hover:border-slate-400 hover:shadow-[0_14px_32px_-18px_rgba(11,17,32,0.16)]'
      }`}
    >
      <div className="relative z-[1]">
        {/* Top Row: Cohesive Category Icon + Favorite Pin */}
        <div className="flex items-start justify-between gap-2 mb-3.5">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 ease-out group-hover:scale-105 ${
              isPrimary
                ? 'bg-[#2563EB] text-white shadow-[0_8px_18px_-6px_rgba(37,99,235,0.55)]'
                : `${tool.accentBg} ${tool.accentText}`
            }`}
          >
            <Icon className="w-[18px] h-[18px]" strokeWidth={2} />
          </div>

          <motion.button
            type="button"
            whileTap={{ scale: 0.82 }}
            onClick={() => onToggleFavorite(tool.id)}
            aria-label={
              isFavorite
                ? `Remove ${tool.name} from favorites`
                : `Add ${tool.name} to favorites`
            }
            aria-pressed={isFavorite}
            className="relative z-10 inline-flex items-center justify-center w-8 h-8 -mr-1.5 -mt-1.5 rounded-lg text-slate-400 hover:text-[#2563EB] hover:bg-slate-100 transition-colors duration-150 cursor-pointer shrink-0"
          >
            <Star
              className={`w-3.5 h-3.5 transition-all duration-150 ${
                isFavorite
                  ? 'fill-[#2563EB] text-[#2563EB] scale-110'
                  : 'text-slate-300 group-hover:text-slate-400'
              }`}
            />
          </motion.button>
        </div>

        {/* Title (Full-card accessible link via after:inset-0) */}
        <h3 className="font-display text-[15.5px] sm:text-[16.5px] font-bold text-[#0B1120] tracking-[-0.02em] leading-snug">
          <a
            href={`/${tool.id}`}
            onClick={(e) => {
              e.preventDefault();
              onOpenTool(tool.id);
            }}
            className="after:absolute after:inset-0 focus:outline-none group-hover:text-[#2563EB] transition-colors duration-150"
          >
            {tool.name}
          </a>
        </h3>

        {/* Concise Scannable Description */}
        <p className="mt-1.5 text-[12.5px] sm:text-[13px] leading-[1.58] text-slate-600 line-clamp-3">
          {tool.description}
        </p>
      </div>

      {/* Unboxed Clean Metadata Strip */}
      <div className="relative z-[1] mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-[11.5px]">
        <span className="text-slate-500 font-medium truncate">
          {tool.category}{' '}
          <span aria-hidden="true" className="text-slate-300">
            ·
          </span>{' '}
          <span
            className={
              isAi ? 'text-violet-700 font-semibold' : 'text-slate-500'
            }
          >
            {isAi ? 'Opt-in AI' : 'On-device'}
          </span>
        </span>
        <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#2563EB] group-hover:translate-x-1 transition-all duration-200 shrink-0" />
      </div>
    </motion.article>
  );
};
