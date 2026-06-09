import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

type ItAssetFilterSectionProps = {
  title: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  defaultOpen?: boolean;
};

export function ItAssetFilterSection({ title, options, selected, onToggle, defaultOpen = false }: ItAssetFilterSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-slate-200 py-3">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 text-left text-sm font-semibold text-slate-700 transition hover:text-blue-700"
        onClick={() => setIsOpen((value) => !value)}
      >
        <span>{title}</span>
        {isOpen ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
      </button>

      {isOpen ? (
        <div className="mt-3 max-h-48 space-y-2 overflow-y-auto pr-1">
          {options.length > 0 ? (
            options.map((option) => (
              <label key={option} className="flex cursor-pointer items-start gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={selected.includes(option)}
                  onChange={() => onToggle(option)}
                  className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="min-w-0 break-words">{option}</span>
              </label>
            ))
          ) : (
            <p className="text-xs text-slate-400">ไม่พบข้อมูลตัวเลือก</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
