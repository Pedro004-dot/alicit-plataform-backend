import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * SCRIPT PARA ENRIQUECER LICITAÇÕES COM COORDENADAS
 * Usa codigo_ibge para fazer match com tabela municipios
 */
async function enrichLicitacoesWithCoordinates() {
  console.log('🗺️ INICIANDO ENRIQUECIMENTO DE LICITAÇÕES COM COORDENADAS\n');

  try {
    // 1. Verificar situação atual
    await checkCurrentStatus();

    // 2. Executar enriquecimento
    await processEnrichment();

    // 3. Verificar resultado final
    await checkFinalStatus();

    console.log('\n🎉 ENRIQUECIMENTO CONCLUÍDO COM SUCESSO!');

  } catch (error) {
    console.error('\n❌ ERRO NO ENRIQUECIMENTO:', error);
    process.exit(1);
  }
}

async function checkCurrentStatus(): Promise<void> {
  console.log('📊 VERIFICANDO STATUS ATUAL...');

  try {
    // Contar licitações totais
    const { count: totalLicitacoes } = await supabase
      .from('licitacoes')
      .select('*', { count: 'exact', head: true });

    // Contar licitações com coordenadas
    const { count: comCoordenadas } = await supabase
      .from('licitacoes')
      .select('*', { count: 'exact', head: true })
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    // Contar licitações sem coordenadas mas com codigo_ibge
    const { count: semCoordenadasComIbge } = await supabase
      .from('licitacoes')
      .select('*', { count: 'exact', head: true })
      .is('latitude', null)
      .not('codigo_ibge', 'is', null);

    console.log(`📈 Total de licitações: ${totalLicitacoes || 0}`);
    console.log(`✅ Com coordenadas: ${comCoordenadas || 0}`);
    console.log(`🔄 Sem coordenadas (com IBGE): ${semCoordenadasComIbge || 0}`);
    console.log(`❌ Sem coordenadas: ${(totalLicitacoes || 0) - (comCoordenadas || 0)}\n`);

  } catch (error) {
    console.error('❌ Erro ao verificar status:', error);
    throw error;
  }
}

async function processEnrichment(): Promise<void> {
  console.log('🔄 INICIANDO PROCESSO DE ENRIQUECIMENTO...');

  let processedCount = 0;
  let enrichedCount = 0;
  let errorCount = 0;
  const BATCH_SIZE = 100;

  try {
    // Buscar licitações sem coordenadas em batches
    let offset = 0;
    let hasMoreData = true;

    while (hasMoreData) {
      console.log(`📦 Processando batch ${Math.floor(offset / BATCH_SIZE) + 1}...`);

      // Buscar batch de licitações sem coordenadas
      const { data: licitacoes, error } = await supabase
        .from('licitacoes')
        .select('numero_controle_pncp, codigo_ibge, municipio_nome')
        .is('latitude', null)
        .not('codigo_ibge', 'is', null)
        .range(offset, offset + BATCH_SIZE - 1);

      if (error) {
        console.error('❌ Erro ao buscar licitações:', error);
        throw error;
      }

      if (!licitacoes || licitacoes.length === 0) {
        hasMoreData = false;
        break;
      }

      console.log(`   📍 Processando ${licitacoes.length} licitações...`);

      // Processar cada licitação do batch
      for (const licitacao of licitacoes) {
        try {
          const coordenadas = await getCoordinatesByIbge(licitacao.codigo_ibge);
          
          if (coordenadas) {
            // Atualizar licitação com coordenadas
            const { error: updateError } = await supabase
              .from('licitacoes')
              .update({
                latitude: coordenadas.latitude,
                longitude: coordenadas.longitude
              })
              .eq('numero_controle_pncp', licitacao.numero_controle_pncp);

            if (updateError) {
              console.log(`   ❌ Erro ao atualizar ${licitacao.numero_controle_pncp}`);
              errorCount++;
            } else {
              enrichedCount++;
              if (enrichedCount % 50 === 0) {
                console.log(`   ✅ ${enrichedCount} licitações enriquecidas...`);
              }
            }
          } else {
            // Log para códigos IBGE não encontrados
            if (processedCount % 100 === 0) {
              console.log(`   ⚠️ IBGE ${licitacao.codigo_ibge} não encontrado (${licitacao.municipio_nome})`);
            }
          }

          processedCount++;

        } catch (itemError) {
          console.log(`   ❌ Erro ao processar ${licitacao.numero_controle_pncp}:`, itemError);
          errorCount++;
        }
      }

      offset += BATCH_SIZE;
      
      // Pequena pausa para não sobrecarregar o banco
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n📊 RESULTADO DO PROCESSAMENTO:`);
    console.log(`   📦 Licitações processadas: ${processedCount}`);
    console.log(`   ✅ Enriquecidas com sucesso: ${enrichedCount}`);
    console.log(`   ❌ Erros: ${errorCount}`);

  } catch (error) {
    console.error('❌ Erro no processo de enriquecimento:', error);
    throw error;
  }
}

async function getCoordinatesByIbge(codigoIbge: string): Promise<{ latitude: number; longitude: number } | null> {
  if (!codigoIbge) return null;

  try {
    const { data: municipio, error } = await supabase
      .from('municipios')
      .select('latitude, longitude')
      .eq('codigo_ibge', codigoIbge)
      .single();

    if (error || !municipio) {
      return null;
    }

    return {
      latitude: parseFloat(municipio.latitude),
      longitude: parseFloat(municipio.longitude)
    };

  } catch (error) {
    return null;
  }
}

async function checkFinalStatus(): Promise<void> {
  console.log('\n📊 VERIFICANDO STATUS FINAL...');

  try {
    // Contar licitações totais
    const { count: totalLicitacoes } = await supabase
      .from('licitacoes')
      .select('*', { count: 'exact', head: true });

    // Contar licitações com coordenadas
    const { count: comCoordenadas } = await supabase
      .from('licitacoes')
      .select('*', { count: 'exact', head: true })
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    const percentual = totalLicitacoes ? ((comCoordenadas || 0) / totalLicitacoes * 100).toFixed(1) : '0';

    console.log(`📈 Total de licitações: ${totalLicitacoes || 0}`);
    console.log(`✅ Com coordenadas: ${comCoordenadas || 0} (${percentual}%)`);
    console.log(`❌ Ainda sem coordenadas: ${(totalLicitacoes || 0) - (comCoordenadas || 0)}`);

  } catch (error) {
    console.error('❌ Erro ao verificar status final:', error);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  enrichLicitacoesWithCoordinates()
    .then(() => {
      console.log('\n🎯 Agora todas as licitações com codigo_ibge válido possuem coordenadas!');
      process.exit(0);
    })
    .catch(() => process.exit(1));
}

export default enrichLicitacoesWithCoordinates;