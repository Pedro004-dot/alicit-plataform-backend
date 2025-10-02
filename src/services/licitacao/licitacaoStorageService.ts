import pineconeLicitacaoRepository from '../../repositories/pineconeLicitacaoRepository';
import supabaseLicitacaoRepository from '../../repositories/supabaseLicitacaoRepository';
import coordinateEnrichmentService from './coordinateEnrichmentService';

// Interfaces iguais aos repositórios (mantém compatibilidade)
interface PNCPItem {
  numeroItem: number;
  descricao: string;
  materialOuServico: string;
  materialOuServicoNome: string;
  valorUnitarioEstimado: number;
  valorTotal: number;
  quantidade: number;
  unidadeMedida: string;
  orcamentoSigiloso: boolean;
  itemCategoriaId: number;
  itemCategoriaNome: string;
  patrimonio: any;
  codigoRegistroImobiliario: any;
  criterioJulgamentoId: number;
  criterioJulgamentoNome: string;
  situacaoCompraItem: number;
  situacaoCompraItemNome: string;
  tipoBeneficio: number;
  tipoBeneficioNome: string;
  incentivoProdutivoBasico: boolean;
  dataInclusao: string;
  dataAtualizacao: string;
  temResultado: boolean;
  imagem: number;
  aplicabilidadeMargemPreferenciaNormal: boolean;
  aplicabilidadeMargemPreferenciaAdicional: boolean;
  percentualMargemPreferenciaNormal: any;
  percentualMargemPreferenciaAdicional: any;
  ncmNbsCodigo: any;
  ncmNbsDescricao: any;
  catalogo: any;
  categoriaItemCatalogo: any;
  catalogoCodigoItem: any;
  informacaoComplementar: any;
  tipoMargemPreferencia: any;
  exigenciaConteudoNacional: boolean;
}

interface PNCPLicitacao {
  numeroControlePNCP: string;
  dataAtualizacaoGlobal: string;
  modalidadeId: number;
  srp: boolean;
  orgaoEntidade: {
    cnpj: string;
    razaoSocial: string;
    poderId: string;
    esferaId: string;
  };
  anoCompra: number;
  sequencialCompra: number;
  dataInclusao: string;
  dataPublicacaoPncp: string;
  dataAtualizacao: string;
  numeroCompra: string;
  unidadeOrgao: {
    ufNome: string;
    codigoIbge: string;
    codigoUnidade: string;
    nomeUnidade: string;
    ufSigla: string;
    municipioNome: string;
  };
  amparoLegal: {
    descricao: string;
    nome: string;
    codigo: number;
  };
  dataAberturaProposta: string;
  dataEncerramentoProposta: string;
  informacaoComplementar: string;
  processo: string;
  objetoCompra: string;
  linkSistemaOrigem: string;
  justificativaPresencial: string | null;
  unidadeSubRogada: any;
  orgaoSubRogado: any;
  valorTotalHomologado: number | null;
  modoDisputaId: number;
  linkProcessoEletronico: string | null;
  valorTotalEstimado: number;
  modalidadeNome: string;
  modoDisputaNome: string;
  tipoInstrumentoConvocatorioCodigo: number;
  tipoInstrumentoConvocatorioNome: string;
  fontesOrcamentarias: any[];
  situacaoCompraId: number;
  situacaoCompraNome: string;
  usuarioNome: string;
  itens: PNCPItem[];
  // Campos de coordenadas (adicionados pelo enriquecimento)
  latitude?: number;
  longitude?: number;
}

interface StorageResult {
  supabase: number;
  pinecone: number;
  total: number;
  success: boolean;
  errors?: string[];
}

interface SearchParams {
  texto?: string;
  valorMin?: number;
  valorMax?: number;
  modalidade?: string;
  uf?: string;
  municipio?: string;
  dataInicio?: string;
  dataFim?: string;
  situacao?: string;
  limit?: number;
}

/**
 * Serviço SIMPLIFICADO de coordenação para operações em ambos os bancos
 * FLUXO LINEAR: Recebe → Filtra duplicatas → Salva Supabase → Salva Pinecone
 */
class LicitacaoStorageService {
  
  /**
   * MÉTODO PRINCIPAL - ÚNICO PONTO DE ENTRADA
   * Fluxo simplificado: Filtra duplicatas → Salva Supabase → Salva Pinecone
   */
  async saveLicitacoes(licitacoes: PNCPLicitacao[]): Promise<StorageResult> {
    console.log(`🔄 Salvando ${licitacoes.length} licitações (fluxo simplificado)...`);
    
    if (licitacoes.length === 0) {
      return { supabase: 0, pinecone: 0, total: 0, success: true };
    }
    
    try {
      // 1. FILTRAR APENAS AS QUE NÃO EXISTEM NO SUPABASE (única verificação)
      const novasLicitacoes = await this.filterNewLicitacoes(licitacoes);
      
      if (novasLicitacoes.length === 0) {
        console.log(`✅ Todas as ${licitacoes.length} licitações já existem no Supabase`);
        return { supabase: 0, pinecone: 0, total: 0, success: true };
      }
      
      console.log(`📊 ${novasLicitacoes.length}/${licitacoes.length} são novas, salvando...`);
      
      // 2. ENRIQUECER COM COORDENADAS (baseado em codigo_ibge)
      const licitacoesEnriquecidas = await coordinateEnrichmentService.enrichLicitacoesWithCoordinates(novasLicitacoes);
      
      // 3. SALVAR NO SUPABASE (dados estruturais)
      console.log(`💾 Salvando ${licitacoesEnriquecidas.length} licitações no Supabase...`);
      const supabaseResult = await supabaseLicitacaoRepository.saveLicitacoes(licitacoesEnriquecidas as PNCPLicitacao[]);
      console.log(`✅ Supabase: ${supabaseResult}/${licitacoesEnriquecidas.length} salvas`);
      
      // 4. SALVAR NO PINECONE (embeddings) - COM ROLLBACK SE FALHAR
      console.log(`🎯 Salvando ${licitacoesEnriquecidas.length} embeddings no Pinecone...`);
      let pineconeResult = 0;
      
      try {
        pineconeResult = await pineconeLicitacaoRepository.saveLicitacoes(licitacoesEnriquecidas as PNCPLicitacao[]);
        console.log(`✅ Pinecone: ${pineconeResult}/${licitacoesEnriquecidas.length} embeddings salvos`);
        
        // ✅ SUCESSO: Ambos os bancos salvaram
        return {
          supabase: supabaseResult,
          pinecone: pineconeResult,
          total: Math.max(supabaseResult, pineconeResult),
          success: true
        };
        
      } catch (pineconeError) {
        console.error(`❌ FALHA no Pinecone:`, pineconeError);
        
        await this.rollbackSupabase(licitacoesEnriquecidas as PNCPLicitacao[]);
        
        return {
          supabase: 0, 
          pinecone: 0,
          total: 0,
          success: false,
          errors: [`Pinecone falhou: ${pineconeError}. Rollback executado.`]
        };
      }
      
    } catch (error) {
      console.error(`❌ Erro no fluxo de salvamento:`, error);
      return {
        supabase: 0,
        pinecone: 0,
        total: 0,
        success: false,
        errors: [String(error)]
      };
    }
  }
  
  /**
   * MÉTODO PRIVADO: Rollback - Deletar licitações do Supabase em caso de falha no Pinecone
   */
  private async rollbackSupabase(licitacoes: PNCPLicitacao[]): Promise<void> {
    try {
      const ids = licitacoes.map(l => l.numeroControlePNCP);
      console.log(`🗑️ Deletando ${ids.length} licitações do Supabase para rollback...`);
      
      // Deletar itens primeiro (FK constraint)
      await supabaseLicitacaoRepository.deleteItemsByLicitacaoIds(ids);
      
      // Depois deletar licitações
      await supabaseLicitacaoRepository.deleteLicitacoesByIds(ids);
      
      console.log(`✅ Rollback concluído: ${ids.length} licitações removidas do Supabase`);
      
    } catch (rollbackError) {
      console.error(`❌ ERRO CRÍTICO no rollback:`, rollbackError);
      console.error(`⚠️ ATENÇÃO: Dados podem estar inconsistentes entre Supabase e Pinecone!`);
      // Não propagar erro do rollback para não mascarar o erro original
    }
  }
  
  /**
   * VERIFICAÇÃO SIMPLES - APENAS SUPABASE (fonte da verdade)
   */
  private async filterNewLicitacoes(licitacoes: PNCPLicitacao[]): Promise<PNCPLicitacao[]> {
    console.log(`🔍 [STORAGE DEBUG] Iniciando verificação de duplicatas para ${licitacoes.length} licitações...`);
    
    try {
      const startTime = Date.now();
      const ids = licitacoes.map(l => l.numeroControlePNCP);
      console.log(`📋 [STORAGE DEBUG] IDs extraídos: ${ids.length} (${Date.now() - startTime}ms)`);
      
      console.log(`🔍 [STORAGE DEBUG] Chamando supabaseLicitacaoRepository.getExistingIds()...`);
      const existingIds = await supabaseLicitacaoRepository.getExistingIds(ids);
      const checkTime = Date.now() - startTime;
      console.log(`✅ [STORAGE DEBUG] Verificação concluída: ${existingIds.size} existentes (${checkTime}ms)`);
      
      const novasLicitacoes = licitacoes.filter(l => !existingIds.has(l.numeroControlePNCP));
      const filterTime = Date.now() - startTime;
      
      console.log(`✅ [STORAGE DEBUG] Filtro completo: ${licitacoes.length} → ${novasLicitacoes.length} novas (${filterTime}ms total)`);
      return novasLicitacoes;
      
    } catch (error) {
      console.error(`❌ [STORAGE DEBUG] ERRO na verificação de duplicatas:`, error);
      console.error(`❌ [STORAGE DEBUG] Stack trace:`, error instanceof Error ? error.stack : 'Não disponível');
      
      // Em caso de erro, retornar todas para não perder dados
      console.log(`⚠️ [STORAGE DEBUG] Retornando todas as licitações devido ao erro`);
      return licitacoes;
    }
  }
  
  /**
   * Busca híbrida: semântica (Pinecone) + estruturada (Supabase)
   * @param query Termo de busca para busca semântica
   * @param filters Filtros estruturais
   * @returns Array de licitações encontradas
   */
  async buscarLicitacoes(query?: string, filters?: SearchParams): Promise<PNCPLicitacao[]> {
    try {
      console.log('🔍 LicitacaoStorageService: Iniciando busca híbrida...');
      
      // Estratégia 1: Se há query significativa, usar busca semântica + dados do Supabase
      if (query && query.trim().length > 3) {
        console.log(`🎯 Busca semântica para: "${query}"`);
        
        // Buscar IDs relevantes no Pinecone
        const idsRelevantes = await pineconeLicitacaoRepository.buscarIdsRelevantes(query);
        
        if (idsRelevantes.length > 0) {
          console.log(`📋 Encontrou ${idsRelevantes.length} IDs relevantes, buscando dados no Supabase...`);
          
          // Buscar dados completos no Supabase
          const licitacoes = await supabaseLicitacaoRepository.getLicitacoesByIds(idsRelevantes);
          
          console.log(`✅ Busca híbrida retornou ${licitacoes.length} licitações`);
          return licitacoes;
        } else {
          console.log('⚠️ Busca semântica não encontrou resultados relevantes');
        }
      }
      
      // Estratégia 2: Busca estruturada no Supabase (filtros, texto simples)
      console.log('🗃️ Usando busca estruturada no Supabase...');
      
      const searchParams = {
        texto: query,
        ...filters
      };
      
      const licitacoes = await supabaseLicitacaoRepository.findWithFilters(searchParams);
      
      console.log(`✅ Busca estruturada retornou ${licitacoes.length} licitações`);
      return licitacoes;
      
    } catch (error) {
      console.error('❌ Erro na busca híbrida:', error);
      return [];
    }
  }
  
  /**
   * Obtém licitação por ID (sempre do Supabase - mais rápido)
   * @param numeroControlePNCP ID da licitação
   * @returns Licitação encontrada ou null
   */
  async getLicitacao(numeroControlePNCP: string): Promise<PNCPLicitacao | null> {
    try {
      console.log(`🔍 Buscando licitação ${numeroControlePNCP} no Supabase...`);
      
      // Priorizar Supabase (mais rápido para busca por ID)
      let licitacao = await supabaseLicitacaoRepository.getLicitacao(numeroControlePNCP);
      
      if (licitacao) {
        console.log(`✅ Licitação ${numeroControlePNCP} encontrada no Supabase`);
        return licitacao;
      }
      
      // Fallback para Pinecone se não encontrar no Supabase
      console.log(`⚠️ Licitação ${numeroControlePNCP} não encontrada no Supabase, tentando Pinecone...`);
      licitacao = await pineconeLicitacaoRepository.getLicitacao(numeroControlePNCP);
      
      if (licitacao) {
        console.log(`✅ Licitação ${numeroControlePNCP} encontrada no Pinecone (fallback)`);
        return licitacao;
      }
      
      console.log(`❌ Licitação ${numeroControlePNCP} não encontrada em nenhum banco`);
      return null;
      
    } catch (error) {
      console.error(`❌ Erro ao buscar licitação ${numeroControlePNCP}:`, error);
      return null;
    }
  }
  
  /**
   * Obtém todas as licitações (sempre do Supabase - mais eficiente)
   * @returns Array de todas as licitações
   */
  async getAllLicitacoes(): Promise<PNCPLicitacao[]> {
    try {
      console.log('📋 Buscando todas as licitações no Supabase...');
      
      // Priorizar Supabase (mais eficiente para listagem completa)
      const licitacoes = await supabaseLicitacaoRepository.getAllLicitacoes();
      
      if (licitacoes.length > 0) {
        console.log(`✅ Encontrou ${licitacoes.length} licitações no Supabase`);
        return licitacoes;
      }
      
      // Fallback para Pinecone se Supabase estiver vazio
      console.log('⚠️ Supabase vazio, tentando Pinecone como fallback...');
      const licitacoesPinecone = await pineconeLicitacaoRepository.getAllLicitacoes();
      
      console.log(`📊 Fallback Pinecone retornou ${licitacoesPinecone.length} licitações`);
      return licitacoesPinecone;
      
    } catch (error) {
      console.error('❌ Erro ao buscar todas as licitações:', error);
      return [];
    }
  }
  
  // REMOVIDOS: Métodos complexos de verificação de duplicatas
  // Agora usa apenas filterNewLicitacoes() que verifica só no Supabase
  
  /**
   * Obtém estatísticas dos bancos de dados
   * @returns Estatísticas detalhadas
   */
  async getStorageStats(): Promise<any> {
    try {
      console.log('📊 Coletando estatísticas dos bancos...');
      
      const [supabaseStats, pineconeStats] = await Promise.allSettled([
        this.getSupabaseStats(),
        this.getPineconeStats()
      ]);
      
      return {
        supabase: supabaseStats.status === 'fulfilled' ? supabaseStats.value : { error: supabaseStats.reason },
        pinecone: pineconeStats.status === 'fulfilled' ? pineconeStats.value : { error: pineconeStats.reason },
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Erro ao coletar estatísticas:', error);
      return { error: error };
    }
  }
  
  private async getSupabaseStats(): Promise<any> {
    // Implementar contagem de registros no Supabase
    const licitacoes = await supabaseLicitacaoRepository.getAllLicitacoes();
    return {
      totalLicitacoes: licitacoes.length,
      source: 'supabase'
    };
  }
  
  private async getPineconeStats(): Promise<any> {
    // Usar métodos existentes do Pinecone
    return await pineconeLicitacaoRepository.getIndexStats();
  }
}

// Export singleton
const licitacaoStorageService = new LicitacaoStorageService();

export default licitacaoStorageService;
export { LicitacaoStorageService, StorageResult, SearchParams };
