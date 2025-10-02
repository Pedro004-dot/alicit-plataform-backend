import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * INVESTIGAR LICITAÇÕES COM COORDENADAS NULAS
 * Descobrir por que algumas licitações ainda têm lat/lng null após enriquecimento
 */
async function investigateLicitacoesNullas() {
  console.log('🔍 INVESTIGANDO LICITAÇÕES COM COORDENADAS NULAS\n');

  try {
    // 1. Contar licitações por status
    await checkStatusGeral();

    // 2. Investigar licitações recentes sem coordenadas
    await investigarLicitacoesRecentes();

    // 3. Analisar códigos IBGE problemáticos
    await analisarCodigosIbgeProblematicos();

    // 4. Testar processo de enriquecimento manualmente
    await testarEnriquecimentoManual();

  } catch (error) {
    console.error('❌ Erro na investigação:', error);
  }
}

async function checkStatusGeral(): Promise<void> {
  console.log('📊 STATUS GERAL DAS COORDENADAS...');

  try {
    // Total de licitações
    const { count: total } = await supabase
      .from('licitacoes')
      .select('*', { count: 'exact', head: true });

    // Com coordenadas
    const { count: comCoords } = await supabase
      .from('licitacoes')
      .select('*', { count: 'exact', head: true })
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    // Sem coordenadas mas com IBGE
    const { count: semCoordsComIbge } = await supabase
      .from('licitacoes')
      .select('*', { count: 'exact', head: true })
      .is('latitude', null)
      .not('codigo_ibge', 'is', null);

    // Sem coordenadas e sem IBGE
    const { count: semCoordseSemIbge } = await supabase
      .from('licitacoes')
      .select('*', { count: 'exact', head: true })
      .is('latitude', null)
      .is('codigo_ibge', null);

    console.log(`📈 Total de licitações: ${total || 0}`);
    console.log(`✅ Com coordenadas: ${comCoords || 0} (${((comCoords || 0) / (total || 1) * 100).toFixed(1)}%)`);
    console.log(`🔄 Sem coordenadas (com IBGE): ${semCoordsComIbge || 0}`);
    console.log(`❌ Sem coordenadas (sem IBGE): ${semCoordseSemIbge || 0}`);

  } catch (error) {
    console.error('❌ Erro ao verificar status geral:', error);
  }

  console.log('');
}

async function investigarLicitacoesRecentes(): Promise<void> {
  console.log('🕐 INVESTIGANDO LICITAÇÕES RECENTES SEM COORDENADAS...');

  try {
    // Buscar as 10 licitações mais recentes sem coordenadas
    const { data: licitacoes, error } = await supabase
      .from('licitacoes')
      .select('numero_controle_pncp, codigo_ibge, municipio_nome, uf_nome, data_inclusao, created_at')
      .is('latitude', null)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Erro ao buscar licitações recentes:', error);
      return;
    }

    if (!licitacoes || licitacoes.length === 0) {
      console.log('✅ Nenhuma licitação recente sem coordenadas!');
      return;
    }

    console.log(`📋 ${licitacoes.length} licitações recentes sem coordenadas:`);

    for (const licitacao of licitacoes) {
      console.log(`\n🔍 ${licitacao.numero_controle_pncp}:`);
      console.log(`   Município: ${licitacao.municipio_nome || 'NULO'}`);
      console.log(`   UF: ${licitacao.uf_nome || 'NULO'}`);
      console.log(`   Código IBGE: ${licitacao.codigo_ibge || 'NULO'}`);
      console.log(`   Criado em: ${licitacao.created_at}`);

      // Verificar se o código IBGE existe na tabela municípios
      if (licitacao.codigo_ibge) {
        const { data: municipio } = await supabase
          .from('municipios')
          .select('nome, codigo_uf, latitude, longitude')
          .eq('codigo_ibge', licitacao.codigo_ibge)
          .single();

        if (municipio) {
          console.log(`   ✅ IBGE encontrado: ${municipio.nome} (${municipio.codigo_uf}) - ${municipio.latitude}, ${municipio.longitude}`);
          console.log(`   ❗ PROBLEMA: Município existe mas licitação não foi enriquecida!`);
        } else {
          console.log(`   ❌ IBGE ${licitacao.codigo_ibge} não encontrado na tabela municípios`);
        }
      } else {
        console.log(`   ⚠️ Licitação sem código IBGE`);
      }
    }

  } catch (error) {
    console.error('❌ Erro ao investigar licitações recentes:', error);
  }

  console.log('');
}

async function analisarCodigosIbgeProblematicos(): Promise<void> {
  console.log('🔍 ANALISANDO CÓDIGOS IBGE PROBLEMÁTICOS...');

  try {
    // Buscar códigos IBGE mais frequentes sem coordenadas
    const { data: licitacoes } = await supabase
      .from('licitacoes')
      .select('codigo_ibge, municipio_nome')
      .is('latitude', null)
      .not('codigo_ibge', 'is', null);

    if (!licitacoes || licitacoes.length === 0) {
      console.log('✅ Nenhuma licitação com código IBGE sem coordenadas!');
      return;
    }

    // Contar frequência
    const frequencia = new Map<string, { count: number; municipio: string }>();

    for (const item of licitacoes) {
      const key = item.codigo_ibge;
      if (frequencia.has(key)) {
        frequencia.get(key)!.count++;
      } else {
        frequencia.set(key, {
          count: 1,
          municipio: item.municipio_nome || 'N/A'
        });
      }
    }

    // Ordenar por frequência
    const sorted = Array.from(frequencia.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);

    console.log('📊 TOP 5 CÓDIGOS IBGE PROBLEMÁTICOS:');
    for (const [codigo, info] of sorted) {
      console.log(`\n🔍 IBGE ${codigo}: ${info.count}x - ${info.municipio}`);
      
      // Verificar se existe na tabela municípios
      const { data: municipio } = await supabase
        .from('municipios')
        .select('nome, codigo_uf')
        .eq('codigo_ibge', codigo)
        .single();

      if (municipio) {
        console.log(`   ✅ Existe: ${municipio.nome} (${municipio.codigo_uf})`);
        console.log(`   ❗ PROBLEMA: Enriquecimento não funcionou para este IBGE`);
      } else {
        console.log(`   ❌ Não existe na tabela municípios`);
      }
    }

  } catch (error) {
    console.error('❌ Erro ao analisar códigos IBGE:', error);
  }

  console.log('');
}

async function testarEnriquecimentoManual(): Promise<void> {
  console.log('🧪 TESTANDO ENRIQUECIMENTO MANUAL...');

  try {
    // Buscar uma licitação sem coordenadas mas com IBGE válido
    const { data: licitacao } = await supabase
      .from('licitacoes')
      .select('numero_controle_pncp, codigo_ibge, municipio_nome')
      .is('latitude', null)
      .not('codigo_ibge', 'is', null)
      .limit(1)
      .single();

    if (!licitacao) {
      console.log('✅ Nenhuma licitação encontrada para teste!');
      return;
    }

    console.log(`🎯 Testando com: ${licitacao.numero_controle_pncp}`);
    console.log(`   IBGE: ${licitacao.codigo_ibge}`);
    console.log(`   Município: ${licitacao.municipio_nome}`);

    // Buscar coordenadas na tabela municípios
    const { data: municipio } = await supabase
      .from('municipios')
      .select('latitude, longitude, nome')
      .eq('codigo_ibge', licitacao.codigo_ibge)
      .single();

    if (!municipio) {
      console.log('❌ Município não encontrado na tabela');
      return;
    }

    console.log(`📍 Coordenadas encontradas: ${municipio.latitude}, ${municipio.longitude}`);

    // Tentar atualizar
    const { error: updateError } = await supabase
      .from('licitacoes')
      .update({
        latitude: municipio.latitude,
        longitude: municipio.longitude
      })
      .eq('numero_controle_pncp', licitacao.numero_controle_pncp);

    if (updateError) {
      console.log('❌ Erro ao atualizar:', updateError.message);
    } else {
      console.log('✅ Licitação atualizada com sucesso!');
      
      // Verificar se foi salva
      const { data: verificacao } = await supabase
        .from('licitacoes')
        .select('latitude, longitude')
        .eq('numero_controle_pncp', licitacao.numero_controle_pncp)
        .single();

      console.log(`🔍 Verificação: lat=${verificacao?.latitude}, lng=${verificacao?.longitude}`);
    }

  } catch (error) {
    console.error('❌ Erro no teste manual:', error);
  }

  console.log('');
}

// Executar se chamado diretamente
if (require.main === module) {
  investigateLicitacoesNullas()
    .then(() => {
      console.log('🎯 Investigação concluída!');
      process.exit(0);
    })
    .catch(() => process.exit(1));
}

export default investigateLicitacoesNullas;