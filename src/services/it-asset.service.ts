import { supabase } from '../lib/supabase';
import type { ItAsset, ItAssetFormValues } from '../features/it-assets/types';

export async function getItAssets(): Promise<ItAsset[]> {
  const { data, error } = await supabase
    .from('it_assets')
    .select('*')
    .order('source_row_number', { ascending: true, nullsFirst: false })
    .order('asset_code', { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []) as ItAsset[];
}

export async function createItAsset(values: ItAssetFormValues): Promise<ItAsset> {
  const { data, error } = await supabase.from('it_assets').insert(values).select('*').single();

  if (error) {
    throw error;
  }

  return data as ItAsset;
}

export async function updateItAsset(id: string, values: ItAssetFormValues): Promise<ItAsset> {
  const { data, error } = await supabase.from('it_assets').update(values).eq('id', id).select('*').single();

  if (error) {
    throw error;
  }

  return data as ItAsset;
}

export async function deleteItAsset(id: string): Promise<void> {
  const { error } = await supabase.from('it_assets').delete().eq('id', id);

  if (error) {
    throw error;
  }
}
