import { Mastra } from "@mastra/core/mastra";
import { PostgresStore } from "@mastra/pg";

// Importar arquitetura sequencial limpa
import { sequentialAgents } from "./agents/sequential";
import { sequentialAnalysisWorkflow } from "./workflows/sequentialAnalysisWorkflowSimplified";
import { sequentialWorkflowMemory } from "./config/memoryConfig";

/**
 * Instância principal do Mastra com arquitetura sequencial
 * Sistema otimizado para análise progressiva de licitações
 * Com PostgreSQL storage oficial do Mastra
 */
export const mastra = new Mastra({
  agents: {
    ...sequentialAgents,
  },
  workflows: {
    sequentialAnalysisWorkflow,
  },
  // PostgreSQL storage oficial do Mastra
  ...(process.env.DATABASE_URL ? {
    storage: new PostgresStore({
      connectionString: process.env.DATABASE_URL,
    })
  } : {})
});

// Re-exportar componentes principais para facilitar uso
export { sequentialAgents } from "./agents/sequential";
export { sequentialAnalysisWorkflow } from "./workflows/sequentialAnalysisWorkflowSimplified";
export { sequentialWorkflowMemory } from "./config/memoryConfig";
export { mastraTools } from "./tools";