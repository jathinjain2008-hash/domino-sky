import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface HelpTooltipProps {
  text: string;
  label?: string;
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({ text, label = 'More information' }) => {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="relative inline-flex items-center align-middle"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-label={label}
        title={text}
        className="inline-flex items-center justify-center p-0.5 text-[#8B98A7] hover:text-[#5EC8D8] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#5EC8D8] transition-colors"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-64 rounded bg-[#151B22] border border-[#28313B] px-3 py-2 text-xs font-normal text-[#E8EDF2] leading-relaxed pointer-events-none text-left whitespace-normal"
        >
          {text}
        </span>
      )}
    </span>
  );
};
