import { PineconeRepository } from '../../repositories/pineconeRepository';
import OpenAI from 'openai';
// Use flexible type that works with both simplified and full licitacao data
type FlexiblePNCPLicitacao = any; // Will accept both formats

export interface LicitacaoVector {
  id: string;
  values: number[];
  metadata: {
    numeroControlePNCP: string;
    objetoCompra: string;
    valorTotal: number;
    modalidade: string;
    orgao: string;
    municipio: string;
    uf: string;
    dataAbertura: string;
    situacao: string;
    descricaoCompleta: string;
    categoria: string;
  };
}

export class LicitacaoPineconeService {
  private pineconeRepo: PineconeRepository;
  private openaiClient: OpenAI;
  private indexName: string = 'alicit-editais'; // Usar o mesmo índice para consistência

  constructor() {
    this.pineconeRepo = new PineconeRepository();
    this.openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
  }

  async initialize(): Promise<void> {
    await this.pineconeRepo.initialize();
  }

  /**
   * Indexa uma licitação no Pinecone
   */
  async indexLicitacao(licitacao: FlexiblePNCPLicitacao): Promise<void> {
    try {
      // Criar texto descritivo da licitação para embedding
      const descricaoCompleta = this.criarDescricaoCompleta(licitacao);
      
      // Gerar embedding
      const embedding = await this.gerarEmbedding(descricaoCompleta);
      
      // Preparar metadados
      const metadata = {
        numeroControlePNCP: licitacao.numeroControlePNCP,
        objetoCompra: licitacao.objetoCompra?.substring(0, 1000) || '',
        valorTotal: licitacao.valorTotalEstimado || 0,
        modalidade: licitacao.modalidadeNome || '',
        orgao: licitacao.orgaoEntidade?.razaoSocial?.substring(0, 500) || '',
        municipio: licitacao.unidadeOrgao?.municipioNome || '',
        uf: licitacao.unidadeOrgao?.ufSigla || '',
        dataAbertura: licitacao.dataAberturaProposta || '',
        situacao: licitacao.situacaoCompraNome || '',
        descricaoCompleta: descricaoCompleta.substring(0, 2000),
        categoria: this.determinarCategoria(licitacao)
      };

      // Salvar no Pinecone usando o repositório existente
      const chunkMock = [{
        id: `licitacao-${licitacao.numeroControlePNCP}`,
        text: descricaoCompleta,
        embedding,
        metadata: {
          licitacaoId: licitacao.numeroControlePNCP,
          documentIndex: 0,
          documentType: 'licitacao',
          text: descricaoCompleta.substring(0, 2000), // Requerido pelo EditalChunk
          hierarchyPath: 'licitacao',
          depth: 0,
          criticality: 0.8,
          sectionType: 'main'
        }
      }];

      await this.pineconeRepo.saveChunks(chunkMock, `licitacao-${licitacao.numeroControlePNCP}`);
      
      console.log(`✅ Licitação ${licitacao.numeroControlePNCP} indexada no Pinecone`);
    } catch (error) {
      console.error(`❌ Erro ao indexar licitação ${licitacao.numeroControlePNCP}:`, error);
    }
  }

  /**
   * Busca licitações por similaridade semântica
   */
  async buscarLicitacoesSimilares(
    consulta: string, 
    topK: number = 20,
    filtros?: { 
      valorMinimo?: number,
      valorMaximo?: number,
      modalidades?: string[],
      ufs?: string[],
      situacoes?: string[]
    }
  ): Promise<any[]> {
    try {
      // Gerar embedding da consulta
      const queryEmbedding = await this.gerarEmbedding(consulta);
      
      // Construir filtros para Pinecone
      const pineconeFilter: any = {};
      
      if (filtros) {
        if (filtros.valorMinimo !== undefined) {
          pineconeFilter.valorTotal = { $gte: filtros.valorMinimo };
        }
        if (filtros.valorMaximo !== undefined) {
          pineconeFilter.valorTotal = { ...pineconeFilter.valorTotal, $lte: filtros.valorMaximo };
        }
        if (filtros.modalidades && filtros.modalidades.length > 0) {
          pineconeFilter.modalidade = { $in: filtros.modalidades };
        }
        if (filtros.ufs && filtros.ufs.length > 0) {
          pineconeFilter.uf = { $in: filtros.ufs };
        }
        if (filtros.situacoes && filtros.situacoes.length > 0) {
          pineconeFilter.situacao = { $in: filtros.situacoes };
        }
      }

      // Buscar similares no Pinecone
      const resultados = await this.pineconeRepo.searchSimilar(
        queryEmbedding, 
        undefined, // sem filtro de licitacaoId específica
        topK
      );

      return resultados.map(result => ({
        numeroControlePNCP: result.metadata.numeroControlePNCP,
        similarityScore: result.score,
        objetoCompra: result.metadata.objetoCompra,
        valorTotal: result.metadata.valorTotal,
        modalidade: result.metadata.modalidade,
        orgao: result.metadata.orgao,
        municipio: result.metadata.municipio,
        uf: result.metadata.uf,
        dataAbertura: result.metadata.dataAbertura,
        situacao: result.metadata.situacao,
        categoria: result.metadata.categoria
      }));

    } catch (error) {
      console.error('❌ Erro na busca por similaridade:', error);
      return [];
    }
  }

  /**
   * Indexa licitações em lote
   */
  async indexarLicitacoesEmLote(licitacoes: FlexiblePNCPLicitacao[]): Promise<void> {
    console.log(`🔄 Indexando ${licitacoes.length} licitações no Pinecone...`);
    
    const BATCH_SIZE = 10;
    let processadas = 0;
    
    for (let i = 0; i < licitacoes.length; i += BATCH_SIZE) {
      const batch = licitacoes.slice(i, i + BATCH_SIZE);
      
      const promises = batch.map(licitacao => this.indexLicitacao(licitacao));
      await Promise.all(promises);
      
      processadas += batch.length;
      console.log(`📊 Progresso: ${processadas}/${licitacoes.length} licitações indexadas`);
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`✅ ${processadas} licitações indexadas com sucesso!`);
  }

  /**
   * Cria descrição completa da licitação para embedding
   */
  private criarDescricaoCompleta(licitacao: FlexiblePNCPLicitacao): string {
    const partes = [
      `Objeto: ${licitacao.objetoCompra || ''}`,
      `Modalidade: ${licitacao.modalidadeNome || ''}`,
      `Órgão: ${licitacao.orgaoEntidade?.razaoSocial || ''}`,
      `Município: ${licitacao.unidadeOrgao?.municipioNome || ''}`,
      `UF: ${licitacao.unidadeOrgao?.ufSigla || ''}`,
      `Valor estimado: R$ ${licitacao.valorTotalEstimado?.toLocaleString('pt-BR') || '0'}`,
      `Situação: ${licitacao.situacaoCompraNome || ''}`
    ];

    // Adicionar descrição dos itens principais
    if (licitacao.itens && licitacao.itens.length > 0) {
      const itensPrincipais = licitacao.itens
        .slice(0, 5) // Primeiros 5 itens
        .map((item: any) => `${item.descricao} (${item.materialOuServicoNome})`)
        .join('; ');
      
      partes.push(`Itens: ${itensPrincipais}`);
    }

    return partes.filter(p => p.trim().length > 0).join('. ');
  }

  /**
   * Determina categoria da licitação
   */
  private determinarCategoria(licitacao: FlexiblePNCPLicitacao): string {
    const objeto = (licitacao.objetoCompra || '').toLowerCase();
    
    if (objeto.includes('obras') || objeto.includes('construção') || objeto.includes('reforma')) {
      return 'Obras';
    }
    if (objeto.includes('serviço') || objeto.includes('manutenção') || objeto.includes('consultoria')) {
      return 'Serviços';
    }
    if (objeto.includes('equipamento') || objeto.includes('material') || objeto.includes('fornecimento')) {
      return 'Materiais';
    }
    if (objeto.includes('software') || objeto.includes('sistema') || objeto.includes('tecnologia')) {
      return 'Tecnologia';
    }
    
    return 'Outros';
  }

  /**
   * Obtém estatísticas completas do índice Pinecone incluindo por estado
   */
  async obterEstatisticasPinecone(): Promise<{
    totalVetores: number;
    totalLicitacoes: number;
    totalEditais: number;
    dimensao: number;
    indexName: string;
    estatisticasPorEstado: any[];
    amostras?: any[];
  }> {
    try {
      // Usar Pinecone diretamente para obter estatísticas do índice
      const pinecone = new (await import('@pinecone-database/pinecone')).Pinecone({
        apiKey: process.env.PINECONE_API_KEY!
      });
      
      const index = pinecone.index(this.indexName);
      
      // Fazer query para estimar quantidade - buscar todos os vetores possíveis
      const statsQuery = await index.query({
        vector: new Array(1536).fill(0.1),
        topK: 10000, // Máximo permitido
        includeValues: false,
        includeMetadata: true
      });
      
      console.log(`🔍 Analisando ${statsQuery.matches?.length || 0} vetores para estatísticas...`);
      
      // Separar licitações e editais
      const licitacoes = statsQuery.matches?.filter(match => 
        match.id?.startsWith('licitacao:') && match.metadata?.numeroControlePNCP
      ) || [];
      
      const editais = statsQuery.matches?.filter(match => 
        !match.id?.startsWith('licitacao:')
      ) || [];
      
      console.log(`📊 Encontradas: ${licitacoes.length} licitações, ${editais.length} editais`);
      
      // Contar por estado (apenas licitações)
      const estadosCount: Record<string, number> = {};
      const estadosValores: Record<string, number> = {};
      const estadosModalidades: Record<string, Record<string, number>> = {};
      
      for (const match of licitacoes) {
        const uf = String(match.metadata?.uf || 'N/A');
        const valorTotal = Number(match.metadata?.valorTotal) || 0;
        const modalidade = String(match.metadata?.modalidadeNome || 'N/A');
        
        // Contagem por estado
        estadosCount[uf] = (estadosCount[uf] || 0) + 1;
        
        // Soma valores por estado
        if (valorTotal > 0) {
          estadosValores[uf] = (estadosValores[uf] || 0) + valorTotal;
        }
        
        // Modalidades por estado
        if (!estadosModalidades[uf]) {
          estadosModalidades[uf] = {};
        }
        estadosModalidades[uf][modalidade] = (estadosModalidades[uf][modalidade] || 0) + 1;
      }
      
      // Formatar estatísticas por estado
      const estatisticasPorEstado = Object.entries(estadosCount)
        .map(([uf, count]) => {
          const modalidadesTop = Object.entries(estadosModalidades[uf] || {})
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([modalidade, qtd]) => ({ modalidade, quantidade: qtd }));
          
          return {
            uf,
            totalLicitacoes: count,
            valorTotalEstimado: estadosValores[uf] || 0,
            valorMedio: estadosValores[uf] ? Math.round(estadosValores[uf] / count) : 0,
            modalidadesTop
          };
        })
        .sort((a, b) => b.totalLicitacoes - a.totalLicitacoes);
      
      console.log(`🗺️ Estados com licitações: ${Object.keys(estadosCount).length}`);
      
      // Buscar algumas amostras para mostrar dados
      const amostras = await this.pineconeRepo.searchSimilar(
        new Array(1536).fill(0.1), // Vector neutro para buscar qualquer coisa
        undefined,
        10
      );

      return {
        totalVetores: statsQuery.matches?.length || 0,
        totalLicitacoes: licitacoes.length,
        totalEditais: editais.length,
        dimensao: 1536,
        indexName: this.indexName,
        estatisticasPorEstado,
        amostras: amostras.map(amostra => {
          // Distinguir entre licitações (pineconeLicitacaoRepository) e editais (pineconeRepository)
          if (amostra.id.startsWith('licitacao:')) {
            // Dados de licitação do pineconeLicitacaoRepository
            const licitacaoData = amostra.metadata.data ? JSON.parse(amostra.metadata.data) : {};
            return {
              id: amostra.id,
              score: amostra.score,
              tipo: 'licitacao',
              numeroControlePNCP: amostra.metadata.numeroControlePNCP,
              objetoCompra: amostra.metadata.objetoCompra?.substring(0, 100) + '...',
              valorTotal: amostra.metadata.valorTotal,
              modalidade: amostra.metadata.modalidadeNome,
              orgao: amostra.metadata.orgaoRazaoSocial?.substring(0, 50) + '...',
              municipio: amostra.metadata.municipio,
              uf: amostra.metadata.uf,
              createdAt: amostra.metadata.createdAt
            };
          } else {
            // Dados de edital do pineconeRepository
            return {
              id: amostra.id,
              score: amostra.score,
              tipo: 'edital',
              licitacaoId: amostra.metadata.licitacaoId,
              documentType: amostra.metadata.documentType,
              text: amostra.metadata.text?.substring(0, 100) + '...',
              hierarchyPath: amostra.metadata.hierarchyPath,
              createdAt: amostra.metadata.createdAt
            };
          }
        })
      };
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas do Pinecone:', error);
      return {
        totalVetores: 0,
        totalLicitacoes: 0,
        totalEditais: 0,
        dimensao: 1536,
        indexName: this.indexName,
        estatisticasPorEstado: [],
        amostras: []
      };
    }
  }

  /**
   * Busca todas as licitações de um estado específico
   */
  async buscarLicitacoesPorEstado(uf: string): Promise<any[]> {
    try {
      console.log(`🔍 Buscando licitações do estado: ${uf}`);
      
      const pinecone = new (await import('@pinecone-database/pinecone')).Pinecone({
        apiKey: process.env.PINECONE_API_KEY!
      });
      
      const index = pinecone.index(this.indexName);
      
      // DEBUG: Testar diferentes filtros
      console.log(`🧪 TESTE 1 - Filtro original para ${uf}`);
      const resultado1 = await index.query({
        vector: new Array(1536).fill(0.1),
        topK: 10000,
        includeValues: false,
        includeMetadata: true,
        filter: {
          numeroControlePNCP: { $exists: true },
          uf: { $eq: uf }
        }
      });
      console.log(`📊 TESTE 1 - Resultado: ${resultado1.matches?.length || 0} licitações`);
      
      // DEBUG: Testar apenas com licitacao: prefix
      console.log(`🧪 TESTE 2 - Apenas prefixo licitacao para ${uf}`);
      const allLicitacoes = await index.query({
        vector: new Array(1536).fill(0.1),
        topK: 10000,
        includeValues: false,
        includeMetadata: true,
        filter: {
          numeroControlePNCP: { $exists: true }
        }
      });
      
      const licitacoesDoEstado = allLicitacoes.matches?.filter(match => 
        String(match.metadata?.uf) === uf
      ) || [];
      
      console.log(`📊 TESTE 2 - Total licitações: ${allLicitacoes.matches?.length || 0}`);
      console.log(`📊 TESTE 2 - Licitações ${uf}: ${licitacoesDoEstado.length}`);
      
      // Usar o resultado com mais licitações
      const resultado = licitacoesDoEstado.length > (resultado1.matches?.length || 0) 
        ? { matches: licitacoesDoEstado }
        : resultado1;

      const licitacoes = resultado.matches?.map(match => {
        const licitacaoData = match.metadata?.data ? JSON.parse(String(match.metadata.data)) : {};
        
        return {
          id: match.id,
          numeroControlePNCP: String(match.metadata?.numeroControlePNCP || ''),
          objetoCompra: String(match.metadata?.objetoCompra || ''),
          modalidadeNome: String(match.metadata?.modalidadeNome || ''),
          valorTotalEstimado: Number(match.metadata?.valorTotal) || 0,
          orgaoRazaoSocial: String(match.metadata?.orgaoRazaoSocial || ''),
          municipioNome: String(match.metadata?.municipio || ''),
          ufSigla: String(match.metadata?.uf || ''),
          situacaoCompraNome: licitacaoData.situacaoCompraNome,
          dataAberturaProposta: licitacaoData.dataAberturaProposta,
          dataEncerramentoProposta: licitacaoData.dataEncerramentoProposta,
          score: match.score,
          createdAt: String(match.metadata?.createdAt || '')
        };
      }) || [];

      console.log(`📊 Encontradas ${licitacoes.length} licitações em ${uf}`);
      
      // Ordenar por valor decrescente
      return licitacoes.sort((a, b) => (b.valorTotalEstimado - a.valorTotalEstimado));
      
    } catch (error) {
      console.error(`❌ Erro ao buscar licitações do estado ${uf}:`, error);
      throw error;
    }
  }

  /**
   * Gera embedding usando OpenAI
   */
  private async gerarEmbedding(texto: string): Promise<number[]> {
    const response = await this.openaiClient.embeddings.create({
      model: 'text-embedding-3-small',
      input: texto.substring(0, 8000), // Limite do modelo
      encoding_format: 'float',
    });

    return response.data[0].embedding;
  }
}

export default LicitacaoPineconeService;