import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkRioBranco() {
  console.log('🔍 Procurando Rio Branco...');
  
  // Busca exata
  const { data: exact } = await supabase
    .from('municipios')
    .select('nome, codigo_uf, latitude, longitude')
    .ilike('nome', 'Rio Branco');
  
  console.log('✅ Busca exata:');
  console.log(exact);
  
  // Busca similar
  const { data: similar } = await supabase
    .from('municipios')
    .select('nome, codigo_uf, latitude, longitude')
    .ilike('nome', '%rio%branco%')
    .limit(5);
  
  console.log('\n🔍 Busca similar:');
  console.log(similar);
}

checkRioBranco();