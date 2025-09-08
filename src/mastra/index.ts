import { Mastra } from "@mastra/core/mastra";

// Importar arquitetura sequencial limpa
import { sequentialAgents } from "./agents/sequential";
import { sequentialAnalysisWorkflow } from "./workflows/sequentialAnalysisWorkflowSimplified";

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
    sequentialAnalysisWorkflow,
  },
  // SEM STORAGE para compatibilidade com Vercel serverless
});

// Re-exportar componentes principais para facilitar uso
export { sequentialAgents } from "./agents/sequential";
export { sequentialAnalysisWorkflow } from "./workflows/sequentialAnalysisWorkflowSimplified";
export { sequentialWorkflowMemory } from "./config/memoryConfig";
export { mastraTools } from "./tools";