import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function checkConstraints() {
  const { data, error } = await supabase.rpc('get_table_constraints', { t_name: 'certificates' });
  console.log('Certificates Constraints:', data || error);
  
  const { data: cols } = await supabase.from('certificates').select('*').limit(1);
  console.log('Certificates Columns:', Object.keys(cols?.[0] || {}));
}

// Since I can't use RPC easily if it's not defined, I'll just try an upsert and see the error.
async function testUpsert() {
  const { error } = await supabase
    .from('certificates')
    .upsert({ training_id: '00000000-0000-0000-0000-000000000000', certificate_name: 'test' }, { onConflict: 'training_id' });
  
  console.log('Upsert Error:', error);
}

testUpsert();
