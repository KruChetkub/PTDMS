import { supabase } from '../src/lib/supabase';

async function checkData() {
  const { data: profiles, error: pError } = await supabase.from('profiles').select('user_id, work_group');
  if (pError) {
    console.log('Error fetching profiles:', pError.message);
    return;
  }
  console.log('Profiles data:', profiles);

  const { data: records, error: rError } = await supabase.from('training_records').select('user_id');
  if (rError) {
    console.log('Error fetching records:', rError.message);
    return;
  }
  console.log('Training records count:', records.length);
}

checkData();
