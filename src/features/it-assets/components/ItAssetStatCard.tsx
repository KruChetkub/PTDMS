import type { LucideIcon } from 'lucide-react';

type ItAssetStatCardProps = {
  title: string;
  value: string | number;
  subtext: string;
  icon: LucideIcon;
  tone: 'blue' | 'green' | 'orange' | 'violet';
};

const toneClasses: Record<ItAssetStatCardProps['tone'], string> = {
  blue: 'bg-blue-50 text-blue-700 ring-blue-100',
  green: 'bg-green-50 text-green-700 ring-green-100',
  orange: 'bg-orange-50 text-orange-700 ring-orange-100',
  violet: 'bg-violet-50 text-violet-700 ring-violet-100',
};

export function ItAssetStatCard({ title, value, subtext, icon: Icon, tone }: ItAssetStatCardProps) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{subtext}</p>
        </div>
        <div className={`rounded-md p-3 ring-1 ${toneClasses[tone]}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
