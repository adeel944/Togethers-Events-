import { supabase } from './supabase';

export async function testSupabaseConnection() {
  const { data, error } = await supabase
    .from('businesses')
    .select('id, business_name')
    .limit(1);

  if (error) {
    console.error('SUPABASE TEST FAILED:', error);
    return false;
  }

  console.log('SUPABASE TEST PASSED:', data);
  return true;
}
