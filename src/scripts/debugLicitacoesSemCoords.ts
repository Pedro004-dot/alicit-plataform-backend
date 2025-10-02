import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * SCRIPT DE DEBUG PARA LICITAÇÕES SEM COORDENADAS
 * Analisa por que algumas licitações não foram enriquecidas
 */
async function debugLicitacoesSemCoordenadas() {
  console.log('🔍 ANALISANDO LICITAÇÕES SEM COORDENADAS\n');

  try {
    // 1. Buscar licitações sem coordenadas
    const { data: licitacoesSemCoords, error } = await supabase
      .from('licitacoes')
      .select('numero_controle_pncp, codigo_ibge, municipio_nome, uf_nome')
      .is('latitude', null)
      .limit(20); // Analisar apenas uma amostra

    if (error) {
      throw error;
    }

    if (!licitacoesSemCoords || licitacoesSemCoords.length === 0) {
      console.log('✅ Todas as licitações já possuem coordenadas!');
      return;
    }

    console.log(`📊 Analisando ${licitacoesSemCoords.length} licitações sem coordenadas:\n`);

    let semCodigoIbge = 0;
    let codigoIbgeNaoEncontrado = 0;
    let problemasDiversos = 0;

    for (const licitacao of licitacoesSemCoords) {
      console.log(`🔍 ${licitacao.numero_controle_pncp}:`);
      console.log(`   Município: ${licitacao.municipio_nome || 'NULO'}`);
      console.log(`   UF: ${licitacao.uf_nome || 'NULO'}`);
      console.log(`   Código IBGE: ${licitacao.codigo_ibge || 'NULO'}`);

      // Caso 1: Não tem código IBGE
      if (!licitacao.codigo_ibge) {
        console.log(`   ❌ Problema: SEM CÓDIGO IBGE`);
        semCodigoIbge++;
      } else {
        // Caso 2: Código IBGE não encontrado na tabela municípios
        const { data: municipio } = await supabase
          .from('municipios')
          .select('nome, codigo_uf')
          .eq('codigo_ibge', licitacao.codigo_ibge)
          .single();

        if (!municipio) {
          console.log(`   ❌ Problema: CÓDIGO IBGE ${licitacao.codigo_ibge} NÃO ENCONTRADO na tabela municípios`);
          codigoIbgeNaoEncontrado++;
        } else {
          console.log(`   ✅ Município encontrado: ${municipio.nome} (${municipio.codigo_uf})`);
          console.log(`   ❓ Problema: OUTRO (verificar lógica do script)`);
          problemasDiversos++;
        }
      }

      console.log(''); // Linha em branco
    }

    console.log('📈 RESUMO DOS PROBLEMAS:');
    console.log(`   🚫 Sem código IBGE: ${semCodigoIbge}`);
    console.log(`   🔍 Código IBGE não encontrado: ${codigoIbgeNaoEncontrado}`);
    console.log(`   ❓ Outros problemas: ${problemasDiversos}`);

    // 2. Verificar alguns códigos IBGE mais comuns
    await verificarCodigosIbgeComuns();

    // 3. Sugerir soluções
    console.log('\n💡 SUGESTÕES DE SOLUÇÃO:');
    
    if (semCodigoIbge > 0) {
      console.log(`   📍 Para ${semCodigoIbge} sem código IBGE: Implementar busca por nome da cidade`);
    }
    
    if (codigoIbgeNaoEncontrado > 0) {
      console.log(`   🗺️ Para ${codigoIbgeNaoEncontrado} com IBGE inválido: Verificar dados da fonte PNCP`);
    }

  } catch (error) {
    console.error('❌ Erro no debug:', error);
  }
}

async function verificarCodigosIbgeComuns(): Promise<void> {
  console.log('\n🔍 VERIFICANDO CÓDIGOS IBGE MAIS COMUNS SEM COORDENADAS...');

  try {
    const { data: codigosComuns, error } = await supabase
      .from('licitacoes')
      .select('codigo_ibge, municipio_nome, uf_nome')
      .is('latitude', null)
      .not('codigo_ibge', 'is', null);

    if (error || !codigosComuns) {
      console.log('❌ Erro ao buscar códigos IBGE comuns');
      return;
    }

    // Contar frequência dos códigos IBGE
    const frequencia = new Map<string, { count: number; municipio: string; uf: string }>();

    for (const item of codigosComuns) {
      const key = item.codigo_ibge;
      if (frequencia.has(key)) {
        frequencia.get(key)!.count++;
      } else {
        frequencia.set(key, {
          count: 1,
          municipio: item.municipio_nome || 'N/A',
          uf: item.uf_nome || 'N/A'
        });
      }
    }

    // Ordenar por frequência e mostrar top 10
    const sorted = Array.from(frequencia.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);

    console.log('📊 TOP 10 CÓDIGOS IBGE SEM COORDENADAS:');
    for (const [codigo, info] of sorted) {
      console.log(`   ${codigo}: ${info.count}x - ${info.municipio}/${info.uf}`);
    }

  } catch (error) {
    console.log('❌ Erro ao verificar códigos comuns:', error);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  debugLicitacoesSemCoordenadas()
    .then(() => {
      console.log('\n🎯 Debug concluído!');
      process.exit(0);
    })
    .catch(() => process.exit(1));
}

export default debugLicitacoesSemCoordenadas;