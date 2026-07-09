import { useEffect, useState } from 'react';
import { UsersRound } from 'lucide-react';
import { getPublicVisitStats, type PublicVisitStats } from '../../../services/public-analytics.service';
import { homeBrandHighlights } from '../data/publicHome.mock';

const emptyStats: PublicVisitStats = {
  totalVisitors: 0,
  todayVisitors: 0,
  totalPageViews: 0,
  todayPageViews: 0,
  updatedAt: null,
};

function formatCount(value: number) {
  return new Intl.NumberFormat('th-TH').format(value);
}

export function HomeFooter() {
  const [stats, setStats] = useState<PublicVisitStats>(emptyStats);

  useEffect(() => {
    let isMounted = true;
    const loadStats = async () => {
      try {
        const data = await getPublicVisitStats();
        if (isMounted) setStats(data);
      } catch (error) {
        console.error('Failed to load public visit stats:', error);
      }
    };

    void loadStats();
    window.addEventListener('smartdsp-cookie-consent-updated', loadStats);
    window.addEventListener('smartdsp-public-analytics-updated', loadStats);
    return () => {
      isMounted = false;
      window.removeEventListener('smartdsp-cookie-consent-updated', loadStats);
      window.removeEventListener('smartdsp-public-analytics-updated', loadStats);
    };
  }, []);

  return (
    <footer className="bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-5 border-b border-white/10 pb-8 sm:grid-cols-2 lg:grid-cols-4">
          {homeBrandHighlights.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white/10 text-cyan-200">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <p className="text-sm font-medium text-white/85">{item.label}</p>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3 pt-6">
          <div className="min-w-0">
            <div className="text-base font-semibold">SmartDSP</div>
            <p className="mt-1 text-sm text-white/60">กองยุทธศาสตร์และแผนงาน</p>
          </div>
          <div className="shrink-0 rounded-md bg-white/5 px-3 py-1.5 sm:ml-auto sm:min-w-44">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/55 sm:gap-2 sm:text-xs">
              <UsersRound className="h-4 w-4" aria-hidden="true" />
              ผู้เข้าชมทั้งหมด
            </div>
            <div className="mt-1 text-sm font-semibold text-white sm:text-base">{formatCount(stats.totalVisitors)}</div>
          </div>
        </div>
      </div>
    </footer>
  );
}
