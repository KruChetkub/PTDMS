import { supabase } from './src/lib/supabase';

async function checkTable() {
  const { data, error } = await supabase.from('work_groups').select('*').limit(1);
  if (error) {
    console.log('Table work_groups does not exist or error:', error.message);
  } else {
    console.log('Table work_groups exists!');
  }
}

checkTable();
