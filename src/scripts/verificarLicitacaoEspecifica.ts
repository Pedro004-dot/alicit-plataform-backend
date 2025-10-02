import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verificarLicitacaoEspecifica() {
  const licitacaoId = '04285896000153-1-000137/2025';
  console.log(`🔍 VERIFICANDO LICITAÇÃO: ${licitacaoId}\n`);

  try {
    // 1. Verificar dados da licitação
    const { data: licitacao, error: licitacaoError } = await supabase
      .from('licitacoes')
      .select('numero_controle_pncp, codigo_ibge, municipio_nome, uf_nome, latitude, longitude')
      .eq('numero_controle_pncp', licitacaoId)
      .single();

    if (licitacaoError || !licitacao) {
      console.log('❌ Licitação não encontrada');
      return;
    }

    console.log('📋 DADOS DA LICITAÇÃO:');
    console.log(`   ID: ${licitacao.numero_controle_pncp}`);
    console.log(`   Município: ${licitacao.municipio_nome}`);
    console.log(`   UF: ${licitacao.uf_nome}`);
    console.log(`   Código IBGE: ${licitacao.codigo_ibge}`);
    console.log(`   Latitude: ${licitacao.latitude || 'NULO'}`);
    console.log(`   Longitude: ${licitacao.longitude || 'NULO'}`);

    // 2. Verificar se o município existe na tabela municipios
    if (licitacao.codigo_ibge) {
      console.log('\n🗺️ VERIFICANDO MUNICÍPIO NA TABELA MUNICIPIOS:');
      
      const { data: municipio, error: municipioError } = await supabase
        .from('municipios')
        .select('codigo_ibge, nome, latitude, longitude')
        .eq('codigo_ibge', licitacao.codigo_ibge)
        .single();

      if (municipioError || !municipio) {
        console.log(`❌ Município com código IBGE ${licitacao.codigo_ibge} não encontrado na tabela municipios`);
      } else {
        console.log('✅ Município encontrado:');
        console.log(`   Nome: ${municipio.nome}`);
        console.log(`   Latitude: ${municipio.latitude}`);
        console.log(`   Longitude: ${municipio.longitude}`);

        // 3. Testar atualização manual
        console.log('\n🔄 TESTANDO ATUALIZAÇÃO MANUAL...');
        
        const { error: updateError } = await supabase
          .from('licitacoes')
          .update({
            latitude: municipio.latitude,
            longitude: municipio.longitude
          })
          .eq('numero_controle_pncp', licitacaoId);

        if (updateError) {
          console.log('❌ Erro ao atualizar:', updateError.message);
        } else {
          console.log('✅ Licitação atualizada com sucesso!');
          
          // Verificar se foi salva
          const { data: verificacao } = await supabase
            .from('licitacoes')
            .select('latitude, longitude')
            .eq('numero_controle_pncp', licitacaoId)
            .single();

          console.log(`📍 Verificação: lat=${verificacao?.latitude}, lng=${verificacao?.longitude}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

// Executar
verificarLicitacaoEspecifica()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));