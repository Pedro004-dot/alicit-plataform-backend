import pineconeLicitacaoRepository from '../../repositories/pineconeLicitacaoRepository';
import supabaseLicitacaoRepository from '../../repositories/supabaseLicitacaoRepository';

interface SyncDiagnostic {
  supabaseTotal: number;
  pineconeTotal: number;
  diferenca: number;
  licitacoesOrfas: string[]; // Apenas no Supabase
  licitacoesSemSupabase: string[]; // Apenas no Pinecone
  amostrasOrfas: Array<{
    numeroControlePNCP: string;
    objetoCompra: string;
    createdAt: string;
  }>;
}

/**
 * Cruza dados entre Supabase e Pinecone para identificar dessincronização
 */
export const diagnosticarSincronizacao = async (): Promise<SyncDiagnostic> => {
  try {
    console.log('🔍 Iniciando diagnóstico de sincronização Supabase vs Pinecone...');
    
    // 1. BUSCAR TODOS OS IDs DO SUPABASE (via query direta)
    console.log('📊 Buscando licitações do Supabase...');
    const { supabase } = await import('../../config/supabase');
    const { data: licitacoesSupabase, error } = await supabase
      .from('licitacoes')
      .select('numero_controle_pncp, objeto_compra, created_at');
    
    if (error || !licitacoesSupabase) {
      console.error('❌ Erro ao buscar licitações do Supabase:', error);
      throw new Error('Falha ao buscar licitações do Supabase');
    }
    
    const idsSupabase = new Set(licitacoesSupabase.map(l => l.numero_controle_pncp));
    
    console.log(`✅ Supabase: ${idsSupabase.size} licitações encontradas`);
    
    // 2. BUSCAR TODOS OS IDs DO PINECONE
    console.log('🎯 Buscando licitações do Pinecone...');
    const idsPinecone = new Set<string>();
    
    // Usar busca paginada para pegar todos os IDs do Pinecone
    await buscarTodosIdsPinecone(idsPinecone);
    
    console.log(`✅ Pinecone: ${idsPinecone.size} licitações encontradas`);
    
    // 3. IDENTIFICAR ÓRFÃS (no Supabase mas não no Pinecone)
    const licitacoesOrfas: string[] = [];
    for (const id of idsSupabase) {
      if (!idsPinecone.has(id)) {
        licitacoesOrfas.push(id);
      }
    }
    
    // 4. IDENTIFICAR ÓRFÃS INVERSAS (no Pinecone mas não no Supabase)
    const licitacoesSemSupabase: string[] = [];
    for (const id of idsPinecone) {
      if (!idsSupabase.has(id)) {
        licitacoesSemSupabase.push(id);
      }
    }
    
    // 5. BUSCAR DETALHES DAS ÓRFÃS (primeiras 10)
    const amostrasOrfas = [];
    for (const id of licitacoesOrfas.slice(0, 10)) {
      const licitacao = licitacoesSupabase.find(l => l.numero_controle_pncp === id);
      if (licitacao) {
        amostrasOrfas.push({
          numeroControlePNCP: licitacao.numero_controle_pncp,
          objetoCompra: (licitacao.objeto_compra || '').substring(0, 100) + '...',
          createdAt: licitacao.created_at || 'N/A'
        });
      }
    }
    
    const resultado: SyncDiagnostic = {
      supabaseTotal: idsSupabase.size,
      pineconeTotal: idsPinecone.size,
      diferenca: idsSupabase.size - idsPinecone.size,
      licitacoesOrfas,
      licitacoesSemSupabase,
      amostrasOrfas
    };
    
    console.log('📈 DIAGNÓSTICO COMPLETO:');
    console.log(`  📊 Supabase: ${resultado.supabaseTotal}`);
    console.log(`  🎯 Pinecone: ${resultado.pineconeTotal}`);
    console.log(`  ⚠️ Órfãs (só Supabase): ${resultado.licitacoesOrfas.length}`);
    console.log(`  🔄 Órfãs inversas (só Pinecone): ${resultado.licitacoesSemSupabase.length}`);
    console.log(`  📉 Diferença total: ${resultado.diferenca}`);
    
    return resultado;
    
  } catch (error) {
    console.error('❌ Erro no diagnóstico de sincronização:', error);
    throw error;
  }
};

/**
 * Busca todos os IDs do Pinecone usando paginação
 */
async function buscarTodosIdsPinecone(idsPinecone: Set<string>): Promise<void> {
  try {
    // Estratégia: múltiplas consultas para cobrir toda a base
    const estrategias = [
      // Por modalidade
      { filtro: { modalidadeNome: { $exists: true } }, topK: 2000 },
      // Por UF
      { filtro: { uf: { $exists: true } }, topK: 2000 },
      // Por valor
      { filtro: { valorTotal: { $gte: 0 } }, topK: 2000 },
      // Busca geral
      { filtro: { numeroControlePNCP: { $exists: true } }, topK: 5000 }
    ];
    
    const { Pinecone } = await import('@pinecone-database/pinecone');
    const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
    const index = pinecone.index('alicit-editais');
    
    for (const estrategia of estrategias) {
      try {
        const queryResponse = await index.query({
          vector: new Array(1536).fill(0.1), // Vector dummy
          topK: estrategia.topK,
          includeValues: false,
          includeMetadata: true,
          filter: estrategia.filtro
        });
        
        // Extrair IDs únicos
        for (const match of queryResponse.matches || []) {
          if (match.metadata?.numeroControlePNCP) {
            idsPinecone.add(match.metadata.numeroControlePNCP as string);
          }
        }
        
        console.log(`  🔍 Estratégia encontrou ${queryResponse.matches?.length || 0} registros (${idsPinecone.size} únicos total)`);
        
        // Pausa para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.warn('⚠️ Erro em uma estratégia de busca:', error);
      }
    }
  } catch (error) {
    console.error('❌ Erro ao buscar IDs do Pinecone:', error);
    throw error;
  }
}

export default {
  diagnosticarSincronizacao
};