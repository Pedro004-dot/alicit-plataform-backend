import { supabase } from '../../config/supabase';

/**
 * Service para limpeza de licitações órfãs (que estão no Supabase mas não no Pinecone)
 */

interface CleanupResult {
  licitacoesApagadas: number;
  itensApagados: number;
  idsApagados: string[];
  erros: string[];
}

/**
 * Apaga as 28 licitações órfãs identificadas no diagnóstico
 */
export const apagarLicitacoesOrfas = async (): Promise<CleanupResult> => {
  const idsOrfas = [
    "00394429000100-1-002280/2025",
    "31803125000183-1-000047/2025", 
    "53212344000120-1-000004/2026",
    "96480850000103-1-000027/2025",
    "77001311000108-1-000439/2025",
    "01653199000110-1-000027/2025",
    "76282656000106-1-000326/2025",
    "24772246000140-1-000098/2025",
    "46392171000104-1-000075/2025",
    "46392171000104-1-000076/2025",
    "91997072000100-1-000119/2025",
    "67995027000132-1-000365/2025",
    "05604369000127-1-000027/2025",
    "04214419000105-1-000163/2025",
    "46393500000131-1-000011/2025",
    "17577524000142-1-000002/2026",
    "37226644000102-1-000091/2025",
    "92465210000173-1-000138/2025",
    "46392171000104-1-000096/2025",
    "46392171000104-1-000097/2025",
    "10358190000177-1-000331/2025",
    "44733608000109-1-000697/2025",
    "75927582000155-1-000166/2025",
    "46392106000189-1-000019/2025",
    "90898487000164-1-000299/2025",
    "15479751000100-1-000053/2025",
    "17912015000129-1-000079/2025",
    "78103884000105-1-000170/2025"
  ];

  const resultado: CleanupResult = {
    licitacoesApagadas: 0,
    itensApagados: 0,
    idsApagados: [],
    erros: []
  };

  try {
    console.log('🗑️ Iniciando limpeza de 28 licitações órfãs...');
    
    // 1. APAGAR ITENS DAS LICITAÇÕES (foreign key constraint)
    console.log('🔄 Apagando itens das licitações órfãs...');
    const { data: itensData, error: itensError } = await supabase
      .from('licitacao_itens')
      .delete()
      .in('numero_controle_pncp', idsOrfas)
      .select('numero_controle_pncp');

    if (itensError) {
      console.error('❌ Erro ao apagar itens:', itensError);
      resultado.erros.push(`Erro nos itens: ${itensError.message}`);
    } else {
      resultado.itensApagados = itensData?.length || 0;
      console.log(`✅ ${resultado.itensApagados} itens apagados`);
    }

    // 2. APAGAR LICITAÇÕES PRINCIPAIS
    console.log('🔄 Apagando licitações órfãs...');
    const { data: licitacoesData, error: licitacoesError } = await supabase
      .from('licitacoes')
      .delete()
      .in('numero_controle_pncp', idsOrfas)
      .select('numero_controle_pncp');

    if (licitacoesError) {
      console.error('❌ Erro ao apagar licitações:', licitacoesError);
      resultado.erros.push(`Erro nas licitações: ${licitacoesError.message}`);
    } else {
      resultado.licitacoesApagadas = licitacoesData?.length || 0;
      resultado.idsApagados = licitacoesData?.map(l => l.numero_controle_pncp) || [];
      console.log(`✅ ${resultado.licitacoesApagadas} licitações apagadas`);
    }

    // 3. RELATÓRIO FINAL
    console.log('📊 LIMPEZA CONCLUÍDA:');
    console.log(`  🗑️ Licitações: ${resultado.licitacoesApagadas}/28`);
    console.log(`  📋 Itens: ${resultado.itensApagados}`);
    console.log(`  ❌ Erros: ${resultado.erros.length}`);

    if (resultado.erros.length > 0) {
      console.log('⚠️ ERROS ENCONTRADOS:');
      resultado.erros.forEach(erro => console.log(`  - ${erro}`));
    }

    return resultado;

  } catch (error) {
    console.error('❌ Erro crítico na limpeza:', error);
    resultado.erros.push(`Erro crítico: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    return resultado;
  }
};

export default {
  apagarLicitacoesOrfas
};