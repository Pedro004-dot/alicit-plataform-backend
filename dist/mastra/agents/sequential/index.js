/**
 * Agentes Especialistas para Workflow Sequencial
 * Arquitetura otimizada para análise progressiva de licitações
 */
// Agentes do workflow sequencial
export { strategicFitAgent } from "./strategicFitAgent";
export { operationalAgent } from "./operationalAgent";
export { legalDocAgent } from "./legalDocAgent";
export { financialAgent } from "./financialAgent";
// Re-exportar em objeto para facilitar uso
import { strategicFitAgent } from "./strategicFitAgent";
import { operationalAgent } from "./operationalAgent";
import { legalDocAgent } from "./legalDocAgent";
import { financialAgent } from "./financialAgent";
export const sequentialAgents = {
    strategicFitAgent,
    operationalAgent,
    legalDocAgent,
    financialAgent,
};
