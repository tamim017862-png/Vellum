import React, { useId } from 'react';

interface BrandLogoProps {
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = 'w-8 h-8',
}) => {
  const uid = useId().replace(/:/g, '');
  const bgId = `vellum-bg-${uid}`;
  const foldId = `vellum-fold-${uid}`;

  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={bgId}
          x1="4"
          y1="2"
          x2="32"
          y2="34"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#1E3A8A" />
          <stop offset="48%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
        <linearGradient
          id={foldId}
          x1="18"
          y1="10"
          x2="28"
          y2="27"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#DBEAFE" />
        </linearGradient>
      </defs>
      {/* Precision architectural squircle */}
      <rect x="2" y="2" width="32" height="32" rx="9" fill={`url(#${bgId})`} />
      <rect
        x="2.5"
        y="2.5"
        width="31"
        height="31"
        rx="8.5"
        stroke="white"
        strokeOpacity="0.18"
      />
      {/* Precision folded-sheet V monogram (two interlocking planes) */}
      <path
        d="M9.6 10.6L16.7 25.4C17.1 26.2 18.2 26.2 18.6 25.4L19.9 22.6L14.5 10.6H9.6Z"
        fill="#FFFFFF"
      />
      <path
        d="M21.6 10.6L17.9 18.6L19.9 22.6L26.4 10.6H21.6Z"
        fill={`url(#${foldId})`}
        fillOpacity="0.88"
      />
    </svg>
  );
};
