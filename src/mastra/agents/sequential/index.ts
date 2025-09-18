/**
 * Agentes Especialistas para Workflow Sequencial
 * Arquitetura otimizada para análise progressiva de licitações
 */

// Agentes do workflow sequencial
export { strategicFitAgent } from "./strategicFitAgent";
export { operationalAgent } from "./operationalAgent";
export { legalDocAgent } from "./legalDocAgent";
export { financialAgent } from "./financialAgent";
export { reportAggregatorAgent } from "./reportAggregatorAgent";

// Re-exportar em objeto para facilitar uso
import { strategicFitAgent } from "./strategicFitAgent";
import { operationalAgent } from "./operationalAgent";
import { legalDocAgent } from "./legalDocAgent";
import { financialAgent } from "./financialAgent";
import { reportAggregatorAgent } from "./reportAggregatorAgent";
// ✅ AGENTS SIMPLIFICADOS PARA DEBUG
import { simpleStrategicAgent } from "../simpleStrategicAgent";
import { ultraSimpleAgent } from "../ultraSimpleAgent";

export const sequentialAgents = {
  strategicFitAgent,
  simpleStrategicAgent, // ✅ ADICIONADO para debug
  ultraSimpleAgent, // ✅ ULTRA SIMPLES para debug
  operationalAgent,
  legalDocAgent,
  financialAgent,
  reportAggregatorAgent,
} as const;

export type SequentialAgentsType = typeof sequentialAgents;