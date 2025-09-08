import { Pinecone } from '@pinecone-database/pinecone';

// Interfaces iguais ao Redis (mantém compatibilidade total)
interface Municipio {
  codigo_ibge: string;
  nome: string;
  latitude: number;
  longitude: number;
  capital: number;
  codigo_uf: string;
  siafi_id: string;
  ddd: string;
  fuso_horario: string;
}

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
}

/**
 * Drop-in replacement do Redis usando Pinecone
 * Mantém exatamente a mesma interface para compatibilidade total
 */
class PineconeLicitacaoRepository {
  private pinecone: Pinecone;
  private indexName: string = 'alicit-editais'; // Padronizado com outros repositórios
  
  // Cache Service - Mantém compatibilidade com código existente
  private textCache = new Map<string, string[]>();
  private scoreCache = new Map<string, number>();

  constructor() {
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
  }

  private async initialize(): Promise<void> {
    try {
      const indexes = await this.pinecone.listIndexes();
      const indexExists = indexes.indexes?.some(index => index.name === this.indexName);
      
      if (!indexExists) {
        console.log(`🔧 Criando índice Pinecone: ${this.indexName}...`);
        await this.pinecone.createIndex({
          name: this.indexName,
          dimension: 1536, // Para embeddings se necessário
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-east-1'
            }
          }
        });
        
        // Aguardar criação
        await this.waitForIndex();
      }
    } catch (error) {
      console.error('❌ Erro ao inicializar Pinecone:', error);
      throw error;
    }
  }

  private async waitForIndex(): Promise<void> {
    let ready = false;
    let attempts = 0;
    const maxAttempts = 30;
    
    while (!ready && attempts < maxAttempts) {
      try {
        const indexStats = await this.pinecone.describeIndex(this.indexName);
        ready = indexStats.status?.ready === true;
        
        if (!ready) {
          console.log(`⏳ Aguardando índice... (${attempts + 1}/${maxAttempts})`);
          await new Promise(resolve => setTimeout(resolve, 10000));
          attempts++;
        }
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        attempts++;
      }
    }
    
    if (!ready) {
      throw new Error('Timeout aguardando criação do índice Pinecone');
    }
  }

  /**
   * Substitui Redis saveLicitacoes - Interface idêntica
   */
  async saveLicitacoes(licitacoes: PNCPLicitacao[]): Promise<number> {
    try {
      await this.initialize();
      const index = this.pinecone.index(this.indexName);
      
      console.log(`💾 Processando ${licitacoes.length} licitações para Pinecone...`);
      
      // MELHORIA 1: Filtrar duplicatas antes de processar
      const novasLicitacoes = await this.filterExistingLicitacoes(licitacoes);
      console.log(`🔄 ${novasLicitacoes.length} licitações novas (${licitacoes.length - novasLicitacoes.length} já existem)`);
      
      if (novasLicitacoes.length === 0) {
        console.log(`✅ Nenhuma licitação nova para salvar`);
        return 0;
      }
      
      const vectors = [];
      let processedCount = 0;
      
      for (const licitacao of novasLicitacoes) {
        try {
          console.log(`🔄 Processando licitação ${processedCount + 1}/${novasLicitacoes.length}: ${licitacao.numeroControlePNCP}`);
          // MELHORIA 2: Gerar embedding real do texto
          const embedding = await this.generateEmbedding(licitacao);
          console.log(`✅ Embedding gerado para ${licitacao.numeroControlePNCP}: ${embedding.length} dimensões`);
          
          const vector = {
            id: `licitacao:${licitacao.numeroControlePNCP}`,
            values: embedding,
            metadata: {
              // Licitação completa como JSON
              data: JSON.stringify(licitacao),
              numeroControlePNCP: licitacao.numeroControlePNCP,
              modalidadeNome: licitacao.modalidadeNome || '',
              valorTotal: licitacao.valorTotalEstimado || 0,
              municipio: licitacao.unidadeOrgao?.municipioNome || '',
              uf: licitacao.unidadeOrgao?.ufSigla || '',
              // MELHORIA 3: Manter texto completo para busca textual
              objetoCompraCompleto: licitacao.objetoCompra || '',
              objetoCompra: (licitacao.objetoCompra || '').substring(0, 1000),
              situacaoCompra: licitacao.situacaoCompraNome || '',
              dataAbertura: licitacao.dataAberturaProposta || '',
              orgaoRazaoSocial: licitacao.orgaoEntidade?.razaoSocial || '',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          };
          
          vectors.push(vector);
          processedCount++;
        } catch (embeddingError) {
          console.warn(`⚠️ Erro ao gerar embedding para ${licitacao.numeroControlePNCP}:`, embeddingError);
          // Continua com próxima licitação
        }
      }
      
      // MELHORIA 4: Upsert com retry em caso de falha
      const BATCH_SIZE = 50; // Reduzido para maior estabilidade
      let savedCount = 0;
      
      for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
        const batch = vectors.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(vectors.length / BATCH_SIZE);
        
        try {
          await this.upsertWithRetry(index, batch);
          savedCount += batch.length;
          console.log(`📦 Batch ${batchNum}/${totalBatches}: ${batch.length} licitações salvas (Total: ${savedCount}/${vectors.length})`);
        } catch (batchError) {
          console.error(`❌ Erro no batch ${batchNum}:`, batchError);
          // Continua com próximo batch
        }
        
        // MELHORIA 5: Pequena pausa entre batches para não sobrecarregar
        if (i + BATCH_SIZE < vectors.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      console.log(`✅ ${savedCount} licitações salvas no Pinecone (${vectors.length - savedCount} falharam)`);
      return savedCount;
    } catch (error) {
      console.error('❌ Erro ao salvar licitações no Pinecone:', error);
      return 0;
    }
  }

  // Filtrar licitações já existentes para evitar duplicatas
  private async filterExistingLicitacoes(licitacoes: PNCPLicitacao[]): Promise<PNCPLicitacao[]> {
    const index = this.pinecone.index(this.indexName);
    const existingIds: string[] = [];
    const BATCH_SIZE = 100;
    
    // Verificar em batches quais já existem
    for (let i = 0; i < licitacoes.length; i += BATCH_SIZE) {
      const batch = licitacoes.slice(i, i + BATCH_SIZE);
      const ids = batch.map(l => `licitacao:${l.numeroControlePNCP}`);
      
      try {
        const fetchResponse = await index.fetch(ids);
        const existingInBatch = Object.keys(fetchResponse.records || {});
        existingIds.push(...existingInBatch);
      } catch (error) {
        console.warn('⚠️ Erro ao verificar duplicatas, continuando...', error);
      }
    }
    
    // Filtrar apenas as não existentes
    return licitacoes.filter(l => !existingIds.includes(`licitacao:${l.numeroControlePNCP}`));
  }

  // Gerar embedding real usando OpenAI
  private async generateEmbedding(licitacao: PNCPLicitacao): Promise<number[]> {
    try {
      // TEXTO ENRIQUECIDO PARA EMBEDDING - Máxima qualidade de matching
      const textoCompleto = [
        // 1. OBJETO PRINCIPAL
        licitacao.objetoCompra || '',
        
        // 2. INFORMAÇÕES COMPLEMENTARES
        licitacao.informacaoComplementar || '',
        licitacao.processo || '',
        licitacao.justificativaPresencial || '',
        
        // 3. CONTEXTO ORGANIZACIONAL
        licitacao.orgaoEntidade?.razaoSocial || '',
        licitacao.unidadeOrgao?.nomeUnidade || '',
        licitacao.modalidadeNome || '',
        licitacao.modoDisputaNome || '',
        licitacao.tipoInstrumentoConvocatorioNome || '',
        
        // 4. CONTEXTO LEGAL
        licitacao.amparoLegal?.descricao || '',
        licitacao.amparoLegal?.nome || '',
        
        // 5. ITENS DETALHADOS (Top 10 mais valiosos)
        licitacao.itens
          ?.sort((a, b) => (b.valorTotal || 0) - (a.valorTotal || 0)) // Ordenar por valor
          ?.slice(0, 10) // Top 10 itens
          ?.map(item => [
            item.descricao || '',
            item.materialOuServicoNome || '',
            item.itemCategoriaNome || '',
            item.criterioJulgamentoNome || '',
            item.ncmNbsDescricao || '',
            item.informacaoComplementar || '',
            // Contexto quantitativo
            `Quantidade: ${item.quantidade} ${item.unidadeMedida}`,
            `Valor: R$ ${item.valorTotal?.toLocaleString('pt-BR')}`
          ].filter(Boolean).join(' ')
          ).join('. ') || '',
          
        // 6. CONTEXTO GEOGRÁFICO E TEMPORAL
        `Local: ${licitacao.unidadeOrgao?.municipioNome} - ${licitacao.unidadeOrgao?.ufSigla}`,
        `Abertura: ${licitacao.dataAberturaProposta}`,
        `Situação: ${licitacao.situacaoCompraNome}`
      ].filter(Boolean).join('. ').substring(0, 8000); // Limite de tokens OpenAI
      
      if (!textoCompleto.trim()) {
        // Fallback para vector neutro se não há texto
        return new Array(1536).fill(0.1);
      }

      // Se OpenAI configurado, usar embedding real
      if (process.env.OPENAI_API_KEY) {
        console.log(`🤖 Gerando embedding OpenAI para: "${textoCompleto.substring(0, 100)}..."`);
        const { OpenAI } = await import('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        
        const response = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: textoCompleto,
          encoding_format: 'float',
        });
        
        console.log(`✅ Embedding OpenAI recebido: ${response.data[0].embedding.length} dimensões`);
        return response.data[0].embedding;
      } else {
        // Fallback para hash-based vector se OpenAI não configurado
        return this.generateHashBasedVector(textoCompleto);
      }
      
    } catch (error) {
      console.error('❌ ERRO ao gerar embedding:', error);
      console.log('🔄 Fallback para vector hash-based...');
      return this.generateHashBasedVector(licitacao.objetoCompra || 'default');
    }
  }

  // Gerar vector único baseado no hash do conteúdo
  private generateHashBasedVector(text: string): number[] {
    const vector = new Array(1536);
    let hash = 0;
    
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Usar hash para gerar vector único
    for (let i = 0; i < 1536; i++) {
      vector[i] = Math.sin(hash + i) * 0.5;
    }
    
    return vector;
  }

  // Upsert com retry para maior confiabilidade
  private async upsertWithRetry(index: any, batch: any[], maxRetries: number = 3): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await index.upsert(batch);
        return; // Sucesso
      } catch (error) {
        if (attempt === maxRetries) {
          throw error; // Última tentativa, propagar erro
        }
        console.warn(`⚠️ Tentativa ${attempt} falhou, tentando novamente...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Backoff exponencial
      }
    }
  }

  /**
   * Substitui Redis getLicitacao - Interface idêntica
   */
  async getLicitacao(numeroControlePNCP: string): Promise<PNCPLicitacao | null> {
    try {
      await this.initialize();
      const index = this.pinecone.index(this.indexName);
      
      // Tentar buscar diretamente primeiro
      const fetchResponse = await index.fetch([`licitacao:${numeroControlePNCP}`]);
      const vector = fetchResponse.records?.[`licitacao:${numeroControlePNCP}`];
      
      if (vector && vector.metadata?.data) {
        const licitacao = JSON.parse(vector.metadata.data as string) as PNCPLicitacao;
        console.log(`✅ Licitação encontrada: ${numeroControlePNCP} com ${licitacao.itens?.length || 0} itens`);
        
        console.log('📋 DADOS DA LICITAÇÃO COMPLETOS:');
        console.log('  numeroControlePNCP:', licitacao.numeroControlePNCP);
        console.log('  objetoCompra:', licitacao.objetoCompra?.substring(0, 100) + '...');
        console.log('  modalidadeNome:', licitacao.modalidadeNome);
        console.log('  valorTotalEstimado:', licitacao.valorTotalEstimado?.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}));
        console.log('  situacaoCompraNome:', licitacao.situacaoCompraNome);
        console.log('  dataAberturaProposta:', licitacao.dataAberturaProposta);
        console.log('  orgaoEntidade.razaoSocial:', licitacao.orgaoEntidade?.razaoSocial);
        console.log('  orgaoEntidade.cnpj:', licitacao.orgaoEntidade?.cnpj);
        console.log('  unidadeOrgao.municipioNome:', licitacao.unidadeOrgao?.municipioNome);
        console.log('  unidadeOrgao.ufSigla:', licitacao.unidadeOrgao?.ufSigla);
        console.log('  itens:', licitacao.itens?.length || 0, 'itens encontrados');
        if (licitacao.itens && licitacao.itens.length > 0) {
          console.log('  principais itens:');
          licitacao.itens.slice(0, 3).forEach((item, idx) => {
            console.log(`    ${idx + 1}. ${item.descricao?.substring(0, 80)}... (Valor: ${item.valorTotal?.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})})`);
          });
        }
        
        return licitacao;
      }
      
      // Se não encontrar, tentar buscar por query com filtro
      console.log(`🔍 Busca direta falhou, tentando query com filtro para: ${numeroControlePNCP}`);
      
      const queryResponse = await index.query({
        vector: new Array(1536).fill(0.1),
        topK: 1,
        includeValues: false,
        includeMetadata: true,
        filter: { numeroControlePNCP: { $eq: numeroControlePNCP } }
      });
      
      if (queryResponse.matches && queryResponse.matches.length > 0) {
        const match = queryResponse.matches[0];
        if (match.metadata?.data) {
          const licitacao = JSON.parse(match.metadata.data as string) as PNCPLicitacao;
          console.log(`✅ Licitação encontrada via query: ${numeroControlePNCP} com ${licitacao.itens?.length || 0} itens`);
          return licitacao;
        }
      }
      
     
      
      console.log(`❌ Licitação não encontrada: ${numeroControlePNCP}`);
      return null;
    } catch (error) {
      console.error('❌ Erro ao buscar licitação no Pinecone:', error);
      
    
      
      return null;
    }
  }



  /**
   * Busca todas as licitações - Interface compatível com Redis
   */
  async getAllLicitacoes(): Promise<PNCPLicitacao[]> {
    try {
      await this.initialize();
      const index = this.pinecone.index(this.indexName);
      
      // Query para buscar todas as licitações
      const queryResponse = await index.query({
        vector: new Array(1536).fill(0.1),
        topK: 10000, // Limite alto para pegar todas
        includeValues: false,
        includeMetadata: true,
        filter: { numeroControlePNCP: { $exists: true } }
      });
      
      const licitacoes: PNCPLicitacao[] = [];
      
      for (const match of queryResponse.matches || []) {
        if (match.metadata?.data) {
          try {
            const licitacao = JSON.parse(match.metadata.data as string) as PNCPLicitacao;
            if (licitacao.itens?.length > 0) {
              licitacoes.push(licitacao);
            }
          } catch (error) {
            console.warn('Erro ao parsear licitação do Pinecone:', error);
          }
        }
      }
      
      console.log(`✅ Carregadas ${licitacoes.length} licitações do Pinecone`);
      return licitacoes;
    } catch (error) {
      console.error('❌ Erro ao buscar todas licitações no Pinecone:', error);
      return [];
    }
  }

  // Cache Service - Mantém compatibilidade total com Redis
  getCachedText(key: string): string[] | undefined {
    return this.textCache.get(key);
  }

  setCachedText(key: string, value: string[]): void {
    this.textCache.set(key, value);
  }

  getCachedScore(key: string): number | undefined {
    return this.scoreCache.get(key);
  }

  setCachedScore(key: string, value: number): void {
    this.scoreCache.set(key, value);
  }

  clearTextCache(): void {
    this.textCache.clear();
  }

  clearScoreCache(): void {
    this.scoreCache.clear();
  }

  clearAllCaches(): void {
    this.textCache.clear();
    this.scoreCache.clear();
  }

  // Métodos de municípios - Implementação básica (pode ser expandida)
  async loadMunicipiosToRedis(): Promise<number> {
    console.log('⚠️ Método loadMunicipiosToRedis não implementado no Pinecone');
    return 0;
  }

  async getMunicipioByIbge(codigoIbge: string): Promise<Municipio | null> {
    console.log('⚠️ Método getMunicipioByIbge não implementado no Pinecone');
    return null;
  }

  async getMunicipioByNome(nome: string): Promise<Municipio | null> {
    console.log('⚠️ Método getMunicipioByNome não implementado no Pinecone');
    return null;
  }

  async checkMunicipiosLoaded(): Promise<boolean> {
    return false;
  }
}

// Export com mesma interface do Redis
const pineconeLicitacaoRepository = new PineconeLicitacaoRepository();

export default {
  saveLicitacoes: (licitacoes: PNCPLicitacao[]) => pineconeLicitacaoRepository.saveLicitacoes(licitacoes),
  getLicitacao: (numeroControlePNCP: string) => pineconeLicitacaoRepository.getLicitacao(numeroControlePNCP),
  getAllLicitacoes: () => pineconeLicitacaoRepository.getAllLicitacoes(),
  getCachedText: (key: string) => pineconeLicitacaoRepository.getCachedText(key),
  setCachedText: (key: string, value: string[]) => pineconeLicitacaoRepository.setCachedText(key, value),
  getCachedScore: (key: string) => pineconeLicitacaoRepository.getCachedScore(key),
  setCachedScore: (key: string, value: number) => pineconeLicitacaoRepository.setCachedScore(key, value),
  clearTextCache: () => pineconeLicitacaoRepository.clearTextCache(),
  clearScoreCache: () => pineconeLicitacaoRepository.clearScoreCache(),
  clearAllCaches: () => pineconeLicitacaoRepository.clearAllCaches(),
  loadMunicipiosToRedis: () => pineconeLicitacaoRepository.loadMunicipiosToRedis(),
  getMunicipioByIbge: (codigoIbge: string) => pineconeLicitacaoRepository.getMunicipioByIbge(codigoIbge),
  getMunicipioByNome: (nome: string) => pineconeLicitacaoRepository.getMunicipioByNome(nome),
  checkMunicipiosLoaded: () => pineconeLicitacaoRepository.checkMunicipiosLoaded()
};