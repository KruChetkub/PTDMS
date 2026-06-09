import type { ItAsset, ItAssetHealth, ItAssetViewModel } from '../types';

export const itAssetChartColors = ['#2563eb', '#16a34a', '#f97316', '#dc2626', '#0891b2', '#7c3aed', '#ca8a04', '#475569'];

export function calculateAssetAge(receivedDate: string | null): { text: string; years: number } {
  if (!receivedDate) {
    return { text: '-', years: 0 };
  }

  const date = new Date(receivedDate);
  if (Number.isNaN(date.getTime())) {
    return { text: '-', years: 0 };
  }

  const now = new Date();
  let years = now.getFullYear() - date.getFullYear();
  let months = now.getMonth() - date.getMonth();

  if (months < 0 || (months === 0 && now.getDate() < date.getDate())) {
    years -= 1;
    months += 12;
  }

  if (now.getDate() < date.getDate()) {
    months -= 1;
  }

  if (years < 0) {
    return { text: 'ใหม่', years: 0 };
  }

  return {
    text: `${years} ปี${months > 0 ? ` ${months} เดือน` : ''}`,
    years: years + months / 12,
  };
}

export function calculateHealthScore(asset: Pick<ItAsset, 'memory_gb' | 'disk1_type' | 'operating_system' | 'disk1_hours'>): ItAssetHealth {
  let score = 0;
  const memory = Number(asset.memory_gb || 0);
  const diskType = (asset.disk1_type || '').toLowerCase();
  const osName = (asset.operating_system || '').toLowerCase();
  const diskHours = asset.disk1_hours || 0;

  const ramScore = memory >= 16 ? 30 : memory >= 8 ? 20 : 5;
  const diskScore = diskType.includes('nvme') || diskType.includes('m.2') ? 40 : diskType.includes('ssd') ? 30 : 10;
  const osScore = osName.includes('windows 11') ? 30 : osName.includes('windows 10') ? 20 : 0;
  const penalty = diskHours > 43800 ? -20 : 0;

  score = Math.max(0, Math.min(100, ramScore + diskScore + osScore + penalty));

  if (score >= 80) {
    return {
      score,
      grade: 'A',
      colorClass: 'border-green-200 bg-green-50 text-green-700',
      breakdown: { ramScore, diskScore, osScore, penalty },
    };
  }

  if (score >= 60) {
    return {
      score,
      grade: 'B',
      colorClass: 'border-blue-200 bg-blue-50 text-blue-700',
      breakdown: { ramScore, diskScore, osScore, penalty },
    };
  }

  if (score >= 40) {
    return {
      score,
      grade: 'C',
      colorClass: 'border-orange-200 bg-orange-50 text-orange-700',
      breakdown: { ramScore, diskScore, osScore, penalty },
    };
  }

  return {
    score,
    grade: 'D',
    colorClass: 'border-red-200 bg-red-50 text-red-700',
    breakdown: { ramScore, diskScore, osScore, penalty },
  };
}

export function toItAssetViewModel(asset: ItAsset): ItAssetViewModel {
  const age = calculateAssetAge(asset.received_date);

  return {
    ...asset,
    ageText: asset.received_date ? age.text : '-',
    ageYears: age.years,
    health: calculateHealthScore(asset),
  };
}

export function cleanFilterValue(value: string | number | null | undefined) {
  const normalized = String(value ?? '').trim();
  if (!normalized || normalized === '-' || normalized.toLowerCase() === 'unknown' || normalized.toLowerCase() === 'n/a') {
    return null;
  }

  return normalized;
}

export function countByLabel(values: string[]) {
  const counts = values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, 'th'));
}
