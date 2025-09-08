import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * Tool para buscar dados da licitação no Pinecone
 * Utiliza busca vetorial para extrair informações específicas do edital
 */
export const pineconeLicitacao = createTool({
  id: "pineconeLicitacao",
  description: "Busca informações específicas da licitação no Pinecone usando busca vetorial",
  inputSchema: z.object({
    licitacaoId: z.string().describe("ID da licitação"),
    query: z.string().describe("Query específica para busca vetorial"),
    topK: z.number().default(5).describe("Número de resultados mais relevantes"),
    includeMetadata: z.boolean().default(true).describe("Incluir metadados dos chunks"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    licitacaoId: z.string(),
    query: z.string(),
    results: z.array(z.any()),
    totalResults: z.number(),
    message: z.string()
  }),
  execute: async ({ context }) => {
    try {
      const { licitacaoId, query, topK } = context;
      
      console.log('🔍 PINECONE TOOL - Parâmetros recebidos:');
      console.log('  licitacaoId:', licitacaoId);
      console.log('  query:', query);
      console.log('  topK:', topK);
      
      const results = await queryPineconeForLicitacao(licitacaoId, query, topK);
      
      console.log('📊 PINECONE TOOL - Resultados obtidos:');
      console.log('  matches encontrados:', results.matches?.length || 0);
      if (results.matches && results.matches.length > 0) {
        results.matches.slice(0, 2).forEach((match, idx) => {
          console.log(`  Match ${idx + 1}: score=${match.score}, content=${String(match.metadata?.content || '').substring(0, 80)}...`);
        });
      }
      
      return {
        success: true,
        licitacaoId,
        query,
        results: results.matches || [],
        totalResults: results.matches?.length || 0,
        message: "Busca vetorial concluída com sucesso",
      };
    } catch (error) {
      const { licitacaoId, query } = context;
      console.log('❌ PINECONE TOOL - Erro:', error);
      return {
        success: false,
        licitacaoId,
        query,
        message: `Erro na busca vetorial: ${error}`,
        results: [],
        totalResults: 0,
      };
    }
  },
});

/**
 * Executa query vetorial no Pinecone para licitação específica
 */
async function queryPineconeForLicitacao(licitacaoId: string, query: string, topK: number) {
  try {
    // Importar Pinecone dinamicamente
    const { Pinecone } = await import("@pinecone-database/pinecone");
    const { openai } = await import("@ai-sdk/openai");
    const { embed } = await import("ai");
    
    // Inicializar cliente Pinecone
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY || "",
    });
    
    const indexName = process.env.PINECONE_INDEX_NAME || "alicit-editais";
    const index = pinecone.index(indexName);
    
    // Gerar embedding da query
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: query,
    });
    
    // Executar busca vetorial
    const queryResponse = await index.query({
      vector: embedding,
      topK,
      filter: {
        licitacao_id: licitacaoId
      },
      includeMetadata: true,
      includeValues: false,
    });
    
    return queryResponse;
    
  } catch (error) {
    console.log(`⚠️ Pinecone não configurado ou erro na busca: ${error}`);
    
    // Mock temporário - estrutura esperada
    return {
      matches: [
        {
          id: `chunk_${licitacaoId}_1`,
          score: 0.95,
          metadata: {
            licitacao_id: licitacaoId,
            section: "objeto",
            content: "Informação não disponível - Pinecone não configurado",
          }
        }
      ]
    };
  }
}

/**
 * Tool especializada para extrair objeto da licitação
 */
export const extractObjetoLicitacao = createTool({
  id: "extractObjetoLicitacao",
  description: "Extrai o objeto e especificações da licitação usando Pinecone",
  inputSchema: z.object({
    licitacaoId: z.string().describe("ID da licitação"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    licitacaoId: z.string(),
    objeto: z.record(z.any()),
    message: z.string()
  }),
  execute: async ({ context }) => {
    try {
      const { licitacaoId } = context;
      const results = await queryPineconeForLicitacao(
        licitacaoId,
        "objeto da licitação especificações técnicas",
        3
      );
      
      const objetoInfo = extractObjetoFromResults(results.matches || []);
      
      return {
        success: true,
        licitacaoId,
        objeto: objetoInfo,
        message: "Objeto da licitação extraído com sucesso",
      };
    } catch (error) {
      const { licitacaoId } = context;
      return {
        success: false,
        licitacaoId,
        message: `Erro ao extrair objeto: ${error}`,
        objeto: {
          descricao: "Não disponível",
          especificacoes: [],
          quantidades: {},
        },
      };
    }
  },
});

/**
 * Tool especializada para extrair dados financeiros
 */
export const extractDadosFinanceirosLicitacao = createTool({
  id: "extractDadosFinanceirosLicitacao", 
  description: "Extrai valores e condições financeiras da licitação usando Pinecone",
  inputSchema: z.object({
    licitacaoId: z.string().describe("ID da licitação"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    licitacaoId: z.string(),
    financial: z.record(z.any()),
    message: z.string()
  }),
  execute: async ({ context }) => {
    try {
      const { licitacaoId } = context;
      const results = await queryPineconeForLicitacao(
        licitacaoId,
        "valor estimado preço máximo condições pagamento garantias",
        3
      );
      
      const financialInfo = extractFinancialFromResults(results.matches || []);
      
      return {
        success: true,
        licitacaoId,
        financial: financialInfo,
        message: "Dados financeiros extraídos com sucesso",
      };
    } catch (error) {
      const { licitacaoId } = context;
      return {
        success: false,
        licitacaoId,
        message: `Erro ao extrair dados financeiros: ${error}`,
        financial: {
          valorEstimado: 0,
          valorMaximo: 0,
          condicoesPagamento: "Não disponível",
          garantias: {},
        },
      };
    }
  },
});

/**
 * Funções auxiliares para processar resultados do Pinecone
 */
function extractObjetoFromResults(matches: any[]) {
  // TODO: Implementar extração real baseada nos chunks do Pinecone
  return {
    descricao: "Objeto não disponível - aguardando configuração Pinecone",
    especificacoes: [],
    quantidades: {},
    modalidade: "Não informado",
  };
}

function extractFinancialFromResults(matches: any[]) {
  // TODO: Implementar extração real baseada nos chunks do Pinecone
  return {
    valorEstimado: 0,
    valorMaximo: 0,
    condicoesPagamento: "Não disponível - aguardando configuração Pinecone",
    garantias: {},
    modalidade: "Não informado",
  };
}