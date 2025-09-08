import { Mastra } from "@mastra/core/mastra";
// Removido temporariamente LibSQLStore devido a problemas no Render
// import { LibSQLStore } from "@mastra/libsql";

// Importar arquitetura sequencial limpa
import { sequentialAgents } from "./agents/sequential";
import { sequentialAnalysisWorkflow } from "./workflows/sequentialAnalysisWorkflowSimplified";
import { sequentialWorkflowMemory } from "./config/memoryConfig";

/**
 * Instância principal do Mastra com arquitetura sequencial
 * Sistema otimizado para análise progressiva de licitações
 * NOTA: Storage temporariamente removido para compatibilidade com Render
 */
export const mastra = new Mastra({
  agents: {
    ...sequentialAgents,
  },
  workflows: {
    sequentialAnalysisWorkflow,
  },
  // storage: new LibSQLStore({
  //   url: process.env.STORAGE_DATABASE_URL || "file:./alicit_storage.db",
  // }),
});

// Re-exportar componentes principais para facilitar uso
export { sequentialAgents } from "./agents/sequential";
export { sequentialAnalysisWorkflow } from "./workflows/sequentialAnalysisWorkflowSimplified";
export { sequentialWorkflowMemory } from "./config/memoryConfig";
export { mastraTools } from "./tools";