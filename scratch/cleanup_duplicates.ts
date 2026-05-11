import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();

const supabase = createClient(url, key);

async function cleanup() {
  console.log('Cleaning up duplicates...');
  
  const { data: certs } = await supabase.from('certificates').select('id, training_id');
  if (certs) {
    const keep = new Map();
    const toDelete = [];
    for (const c of certs) {
      if (!keep.has(c.training_id)) {
        keep.set(c.training_id, c.id);
      } else {
        toDelete.push(c.id);
      }
    }
    if (toDelete.length > 0) {
      console.log(`Deleting ${toDelete.length} duplicate certificates...`);
      await supabase.from('certificates').delete().in('id', toDelete);
    }
  }

  const { data: analysis } = await supabase.from('development_analysis').select('id, training_id');
  if (analysis) {
    const keep = new Map();
    const toDelete = [];
    for (const a of analysis) {
      if (!keep.has(a.training_id)) {
        keep.set(a.training_id, a.id);
      } else {
        toDelete.push(a.id);
      }
    }
    if (toDelete.length > 0) {
      console.log(`Deleting ${toDelete.length} duplicate analysis...`);
      await supabase.from('development_analysis').delete().in('id', toDelete);
    }
  }
  
  console.log('Cleanup done.');
}

cleanup();
