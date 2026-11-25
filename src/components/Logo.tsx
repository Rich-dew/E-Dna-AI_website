import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  showWordmark?: boolean;
  className?: string;
}

export function Logo({
  size = 'md',
  showTagline = false,
  showWordmark = true,
  className = '',
}: LogoProps) {
  const iconDim = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : 'w-9 h-9';
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl';

  return (
    <div className={`inline-flex items-center gap-2.5 shrink-0 select-none ${className}`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
        width="280"
        height="280"
        viewBox="120 56 280 280"
        className={`${iconDim} shrink-0`}
        aria-hidden="true"
      >
        <defs />
        <g />
        <g />
        <g />
        <g />
        <g />
        <g />
        <g />
        <g id="svg1" role="img" mask="url(#mask-for-svg11)">
          <g />
          <g />
          <g />
          <g />
          <g />
          <g />
          <g />
          <mask id="mask-for-svg11">
            <rect width="280" height="280" x="120" y="56" fill="#ffffff" />
          </mask>
          <g transform="matrix(1.4 0 0 1.4 120 56)">
            <rect
              x="0"
              y="0"
              width="200"
              height="200"
              rx="46"
              fill="rgb(15, 76, 74)"
              color="rgb(0, 0, 0)"
              stroke="none"
            />
            <g
              transform="matrix(0.9, 0, 0, 0.9, 10, 12.7)"
              color="rgb(0, 0, 0)"
              fill="rgb(0, 0, 0)"
              stroke="none"
            >
              <line
                x1="79"
                y1="70"
                x2="121"
                y2="70"
                stroke="rgb(242, 184, 75)"
                strokeWidth="5px"
                strokeLinecap="round"
                color="rgb(0, 0, 0)"
                fill="rgb(0, 0, 0)"
              />
              <line
                x1="79"
                y1="94"
                x2="121"
                y2="94"
                stroke="rgb(232, 114, 90)"
                strokeWidth="5px"
                strokeLinecap="round"
                color="rgb(0, 0, 0)"
                fill="rgb(0, 0, 0)"
              />
              <line
                x1="79"
                y1="118"
                x2="121"
                y2="118"
                stroke="rgb(126, 214, 181)"
                strokeWidth="5px"
                strokeLinecap="round"
                color="rgb(0, 0, 0)"
                fill="rgb(0, 0, 0)"
              />
              <line
                x1="79"
                y1="142"
                x2="121"
                y2="142"
                stroke="rgb(91, 182, 232)"
                strokeWidth="5px"
                strokeLinecap="round"
                color="rgb(0, 0, 0)"
                fill="rgb(0, 0, 0)"
              />
              <line
                x1="79"
                y1="166"
                x2="121"
                y2="166"
                stroke="rgb(242, 184, 75)"
                strokeWidth="5px"
                strokeLinecap="round"
                color="rgb(0, 0, 0)"
                fill="rgb(0, 0, 0)"
              />
              <path
                d="M70 34 C70 58 130 58 130 82 C130 106 70 106 70 130 C70 154 130 154 130 178"
                fill="none"
                stroke="rgb(244, 241, 232)"
                strokeWidth="6px"
                strokeLinecap="round"
                color="rgb(0, 0, 0)"
              />
              <path
                d="M130 34 C130 58 70 58 70 82 C70 106 130 106 130 130 C130 154 70 154 70 178"
                fill="none"
                stroke="rgb(205, 235, 221)"
                strokeWidth="6px"
                strokeLinecap="round"
                color="rgb(0, 0, 0)"
              />
              <path
                d="M100 46 C88 38 89 24 100 16 C111 24 112 38 100 46 Z"
                fill="rgb(126, 214, 181)"
                color="rgb(0, 0, 0)"
                stroke="none"
              />
              <path
                d="M100 43 L100 24"
                fill="none"
                stroke="rgb(15, 76, 74)"
                strokeWidth="2px"
                strokeLinecap="round"
                color="rgb(0, 0, 0)"
              />
            </g>
          </g>
        </g>
      </svg>

      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span
            className={`font-display font-bold tracking-tight whitespace-nowrap ${textSize}`}
          >
            <span className="text-[#0F4C4A] dark:text-[#FAF9F5]">Taxa</span>
            <span className="text-[#1F8A72] dark:text-[#7ED6B5]">Trace</span>
          </span>
          {showTagline && (
            <span className="text-[10px] font-medium tracking-[0.14em] text-[#4A6361] dark:text-[#9DB6B3] mt-1 whitespace-nowrap">
              eDNA · TAXONOMY · BIODIVERSITY
            </span>
          )}
        </div>
      )}
    </div>
  );
}
