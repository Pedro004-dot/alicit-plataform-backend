import { openai } from "@ai-sdk/openai";
import { createVectorQueryTool } from "@mastra/rag";
import { PINECONE_CONFIG } from "../config/vectorStore";

/**
 * Vector Query Tool para Análise Estratégica
 * Busca informações sobre objeto, especificações e adequação de produtos/serviços
 */
export const strategicVectorTool = createVectorQueryTool({
  id: "strategic-licitacao-search",
  description: "Busca informações específicas sobre objeto da licitação, especificações técnicas, produtos e serviços demandados para análise de adequação estratégica",
  vectorStoreName: "pinecone",
  indexName: PINECONE_CONFIG.indexName,
  model: openai.embedding("text-embedding-3-small"),
  enableFilter: true,
  databaseConfig: {
    pinecone: {
      namespace: PINECONE_CONFIG.namespace
    }
  },
  // reranker: {
  //   model: openai("gpt-4o-mini"),
  //   options: {
  //     topK: 1,
  //     weights: {
  //       semantic: 0.6, // Maior peso semântico para adequação de produtos
  //       vector: 0.3,
  //       position: 0.1
  //     }
  //   }
  // }
});

/**
 * Vector Query Tool para Análise Operacional  
 * Busca informações sobre prazos, cronograma e requisitos de execução
 */
export const operationalVectorTool = createVectorQueryTool({
  id: "operational-licitacao-search", 
  description: "Busca informações sobre prazos de entrega, cronograma de execução, capacidade técnica exigida, recursos necessários e localização de prestação",
  vectorStoreName: "pinecone",
  indexName: PINECONE_CONFIG.indexName,
  model: openai.embedding("text-embedding-3-small"),
  enableFilter: true,
  databaseConfig: {
    pinecone: {
      namespace: PINECONE_CONFIG.namespace
    }
  },
  // reranker: {
  //   model: openai("gpt-4o-mini"),
  //   options: {
  //     topK: 1,
  //     weights: {
  //       semantic: 0.5,
  //       vector: 0.4, // Maior peso vetorial para dados específicos de prazo
  //       position: 0.1
  //     }
  //   }
  // }
});

/**
 * Vector Query Tool para Análise Legal/Documental
 * Busca informações sobre documentos de habilitação e requisitos legais
 */
export const legalVectorTool = createVectorQueryTool({
  id: "legal-licitacao-search",
  description: "Busca informações sobre documentos de habilitação, certidões exigidas, atestados técnicos, qualificação técnica e regularidade fiscal e jurídica",
  vectorStoreName: "pinecone", 
  indexName: PINECONE_CONFIG.indexName,
  model: openai.embedding("text-embedding-3-small"),
  enableFilter: true,
  databaseConfig: {
    pinecone: {
      namespace: PINECONE_CONFIG.namespace
    }
  },
  // reranker: {
  //   model: openai("gpt-4o-mini"),
  //   options: {
  //     topK: 1,
  //     weights: {
  //       semantic: 0.7, // Alto peso semântico para documentos específicos
  //       vector: 0.2,
  //       position: 0.1
  //     }
  //   }
  // }
});

/**
 * Vector Query Tool para Análise Financeira
 * Busca informações sobre valores, condições de pagamento e garantias
 */
export const financialVectorTool = createVectorQueryTool({
  id: "financial-licitacao-search",
  description: "Busca informações sobre valor estimado, preço de referência, condições de pagamento, garantias contratuais, planilha de custos e forma de pagamento",
  vectorStoreName: "pinecone",
  indexName: PINECONE_CONFIG.indexName, 
  model: openai.embedding("text-embedding-3-small"),
  enableFilter: true,
  databaseConfig: {
    pinecone: {
      namespace: PINECONE_CONFIG.namespace
    }
  },
  // reranker: {
  //   model: openai("gpt-4o-mini"),
  //   options: {
  //     topK: 1,
  //     weights: {
  //       semantic: 0.4,
  //       vector: 0.5, // Alto peso vetorial para dados numéricos e financeiros
  //       position: 0.1
  //     }
  //   }
  // }
});

/**
 * Função utilitária para construir queries contextualizadas por agente
 */
export function buildAgentSpecificQuery(
  baseQuery: string, 
  agentType: 'strategic' | 'operational' | 'legal' | 'financial',
  empresaContext?: any
): string {
  const queryEnhancers = {
    strategic: [
      'objeto da licitação',
      'especificações técnicas', 
      'produtos solicitados',
      'serviços demandados',
      'requisitos funcionais',
      // Adicionar contexto da empresa se disponível
      ...(empresaContext?.servicos || []),
      ...(empresaContext?.produtos || [])
    ],
    
    operational: [
      'prazo de entrega',
      'cronograma de execução',
      'capacidade técnica exigida', 
      'recursos necessários',
      'infraestrutura requerida',
      'equipe técnica',
      'equipamentos necessários',
      'localização da prestação'
    ],
    
    legal: [
      'documentos de habilitação',
      'certidões exigidas',
      'atestados técnicos',
      'qualificação técnica',
      'regularidade fiscal',
      'comprovações jurídicas',
      'documentação societária',
      'licenças necessárias'
    ],
    
    financial: [
      'valor estimado',
      'preço de referência', 
      'condições de pagamento',
      'garantias contratuais',
      'proposta comercial',
      'planilha de custos',
      'margem de lucro',
      'forma de pagamento'
    ]
  };
  
  const enhancers = queryEnhancers[agentType];
  return `${baseQuery} ${enhancers.join(' ')}`.trim();
}