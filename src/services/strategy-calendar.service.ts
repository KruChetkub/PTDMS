import { supabase } from '../lib/supabase';
import type { StrategyEvent } from '../types/database.types';

const strategyEventSelect =
  'id, title, description, event_date, start_time, end_time, end_date, color, location, owner_work_group, status, created_by, cancelled_at, cancelled_by, created_at, updated_at';

export type StrategyEventForm = {
  title: string;
  description?: string | null;
  eventDate: string;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  color?: string | null;
  location?: string | null;
  ownerWorkGroup?: string | null;
};

function toEventInsert(input: StrategyEventForm) {
  return {
    title: input.title.trim(),
    description: input.description?.trim() || null,
    event_date: input.eventDate,
    end_date: input.endDate || input.eventDate,
    start_time: input.startTime || null,
    end_time: input.endTime || null,
    color: input.color || null,
    location: input.location?.trim() || null,
    owner_work_group: input.ownerWorkGroup?.trim() || null,
    status: 'published' as const,
  };
}

export async function listStrategyEvents(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('strategy_events')
    .select(strategyEventSelect)
    .lte('event_date', endDate)
    .or(`end_date.gte.${startDate},event_date.gte.${startDate}`)
    .order('event_date', { ascending: true })
    .order('start_time', { ascending: true, nullsFirst: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function createStrategyEvent(input: StrategyEventForm) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    throw new Error(userError.message);
  }

  const { data, error } = await supabase
    .from('strategy_events')
    .insert({ ...toEventInsert(input), created_by: userData.user?.id ?? null })
    .select(strategyEventSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function updateStrategyEvent(eventId: string, input: StrategyEventForm) {
  const { data, error } = await supabase
    .from('strategy_events')
    .update({
      ...toEventInsert(input),
      cancelled_at: null,
      cancelled_by: null,
    })
    .eq('id', eventId)
    .select(strategyEventSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function cancelStrategyEvent(eventId: string) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    throw new Error(userError.message);
  }

  const { data, error } = await supabase
    .from('strategy_events')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_by: userData.user?.id ?? null,
    })
    .eq('id', eventId)
    .select(strategyEventSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function restoreStrategyEvent(eventId: string) {
  const { data, error } = await supabase
    .from('strategy_events')
    .update({
      status: 'published',
      cancelled_at: null,
      cancelled_by: null,
    })
    .eq('id', eventId)
    .select(strategyEventSelect)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export type StrategyEventRow = StrategyEvent;
