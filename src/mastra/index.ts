import { Mastra } from "@mastra/core/mastra";

// Importar arquitetura sequencial limpa
import { sequentialAgents } from "./agents/sequential";
import { workflow } from "./workflows/workflow";
import { pineconeVectorStore, initializePineconeIndex } from "./config/vectorStore";

/**
 * Instância principal do Mastra com arquitetura sequencial
 * Sistema otimizado para análise progressiva de licitações
 * Configuração otimizada para Vercel serverless (sem storage persistente)
 */
export const mastra = new Mastra({
  agents: {
    ...sequentialAgents,
  },
  workflows: {
    workflow,
  },
  vectors: {
    pinecone: pineconeVectorStore as any,
  },
});

// Inicializar Pinecone Index na primeira execução
initializePineconeIndex().then(success => {
  if (success) {
    console.log('✅ Vector search habilitado');
  } else {
    console.log('⚠️ Vector search desabilitado');
  }
}).catch(console.error);

// Re-exportar componentes principais para facilitar uso
export { sequentialAgents } from "./agents/sequential";
export { mastraTools } from "./tools";