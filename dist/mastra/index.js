import { Mastra } from "@mastra/core/mastra";
import { VercelDeployer } from "@mastra/deployer-vercel";
// Importar arquitetura sequencial limpa
import { sequentialAgents } from "./agents/sequential";
import { sequentialAnalysisWorkflow } from "./workflows/sequentialAnalysisWorkflowSimplified";
/**
 * Instância principal do Mastra com arquitetura sequencial
 * Sistema otimizado para análise progressiva de licitações
 * Com Vercel Deployer oficial
 */
export const mastra = new Mastra({
    agents: {
        ...sequentialAgents,
    },
    workflows: {
        sequentialAnalysisWorkflow,
    },
    // Vercel Deployer oficial (opcional)
    ...(process.env.VERCEL_TOKEN ? {
        deployer: new VercelDeployer()
    } : {}),
});
// Re-exportar componentes principais para facilitar uso
export { sequentialAgents } from "./agents/sequential";
export { sequentialAnalysisWorkflow } from "./workflows/sequentialAnalysisWorkflowSimplified";
export { sequentialWorkflowMemory } from "./config/memoryConfig";
export { mastraTools } from "./tools";
