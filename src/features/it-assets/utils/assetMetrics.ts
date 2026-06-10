import type { ItAsset, ItAssetEvaluationCriteria, ItAssetHealth, ItAssetViewModel } from '../types';

export const itAssetChartColors = ['#2563eb', '#16a34a', '#f97316', '#dc2626', '#0891b2', '#7c3aed', '#ca8a04', '#475569'];

export const defaultItAssetEvaluationCriteria: ItAssetEvaluationCriteria = {
  ram: {
    highMinGb: 16,
    highScore: 30,
    mediumMinGb: 8,
    mediumScore: 20,
    lowScore: 5,
  },
  disk: {
    nvmeScore: 40,
    ssdScore: 30,
    otherScore: 10,
  },
  os: {
    windows11Score: 30,
    windows10Score: 20,
    otherScore: 0,
  },
  penalty: {
    diskHoursOver: 43800,
    points: -20,
  },
  grades: {
    aMin: 80,
    bMin: 60,
    cMin: 40,
  },
};

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

export function calculateHealthScore(
  asset: Pick<ItAsset, 'memory_gb' | 'disk1_type' | 'operating_system' | 'disk1_hours'>,
  criteria: ItAssetEvaluationCriteria = defaultItAssetEvaluationCriteria,
): ItAssetHealth {
  let score = 0;
  const memory = Number(asset.memory_gb || 0);
  const diskType = (asset.disk1_type || '').toLowerCase();
  const osName = (asset.operating_system || '').toLowerCase();
  const diskHours = asset.disk1_hours || 0;

  const ramScore = memory >= criteria.ram.highMinGb ? criteria.ram.highScore : memory >= criteria.ram.mediumMinGb ? criteria.ram.mediumScore : criteria.ram.lowScore;
  const diskScore = diskType.includes('nvme') || diskType.includes('m.2') ? criteria.disk.nvmeScore : diskType.includes('ssd') ? criteria.disk.ssdScore : criteria.disk.otherScore;
  const osScore = osName.includes('windows 11') ? criteria.os.windows11Score : osName.includes('windows 10') ? criteria.os.windows10Score : criteria.os.otherScore;
  const penalty = diskHours > criteria.penalty.diskHoursOver ? criteria.penalty.points : 0;

  score = Math.max(0, Math.min(100, ramScore + diskScore + osScore + penalty));

  if (score >= criteria.grades.aMin) {
    return {
      score,
      grade: 'A',
      colorClass: 'border-green-200 bg-green-50 text-green-700',
      breakdown: { ramScore, diskScore, osScore, penalty },
    };
  }

  if (score >= criteria.grades.bMin) {
    return {
      score,
      grade: 'B',
      colorClass: 'border-blue-200 bg-blue-50 text-blue-700',
      breakdown: { ramScore, diskScore, osScore, penalty },
    };
  }

  if (score >= criteria.grades.cMin) {
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

export function toItAssetViewModel(asset: ItAsset, criteria: ItAssetEvaluationCriteria = defaultItAssetEvaluationCriteria): ItAssetViewModel {
  const age = calculateAssetAge(asset.received_date);

  return {
    ...asset,
    ageText: asset.received_date ? age.text : '-',
    ageYears: age.years,
    health: calculateHealthScore(asset, criteria),
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
