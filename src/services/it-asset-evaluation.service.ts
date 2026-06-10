import type { ItAssetEvaluationCriteria } from '../features/it-assets/types';
import { defaultItAssetEvaluationCriteria } from '../features/it-assets/utils/assetMetrics';

const storageKey = 'ptdms_it_asset_evaluation_criteria';

function mergeCriteria(value: unknown): ItAssetEvaluationCriteria {
  const criteria = value as Partial<ItAssetEvaluationCriteria> | null | undefined;

  return {
    ram: { ...defaultItAssetEvaluationCriteria.ram, ...(criteria?.ram || {}) },
    disk: { ...defaultItAssetEvaluationCriteria.disk, ...(criteria?.disk || {}) },
    os: { ...defaultItAssetEvaluationCriteria.os, ...(criteria?.os || {}) },
    penalty: { ...defaultItAssetEvaluationCriteria.penalty, ...(criteria?.penalty || {}) },
    grades: { ...defaultItAssetEvaluationCriteria.grades, ...(criteria?.grades || {}) },
  };
}

export async function getItAssetEvaluationCriteria(): Promise<ItAssetEvaluationCriteria> {
  try {
    const saved = window.localStorage.getItem(storageKey);
    return saved ? mergeCriteria(JSON.parse(saved)) : defaultItAssetEvaluationCriteria;
  } catch {
    return defaultItAssetEvaluationCriteria;
  }
}

export async function updateItAssetEvaluationCriteria(criteria: ItAssetEvaluationCriteria): Promise<ItAssetEvaluationCriteria> {
  const merged = mergeCriteria(criteria);

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(merged));
  } catch {
    throw new Error('Unable to save IT asset evaluation criteria');
  }

  return merged;
}
