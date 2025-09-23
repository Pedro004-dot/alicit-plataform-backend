import { createWorkflow, createStep } from "@mastra/core/workflows";
import { AGENT_PIPELINE } from "./config";
import { workflowInputSchema, workflowResultSchema, AgentResult } from "./types";
import { executeAgent, generateExecutiveSummary, executeReportAggregator, calculateRiskLevel, extractKeyAlerts } from "./utils";

const agentStep = createStep({
  id: "agent-executor",
  inputSchema: workflowInputSchema,
  outputSchema: workflowResultSchema,
  execute: async ({ inputData }) => {
    const { licitacaoId, empresaId, empresaContext } = inputData;
    const agentResults: Record<string, AgentResult> = {};
    
    console.log(`🚀 [WORKFLOW] Iniciando análise para licitação ${licitacaoId}`);

    for (let i = 0; i < AGENT_PIPELINE.length; i++) {
      const agentConfig = AGENT_PIPELINE[i];
      
      console.log(`🎯 [${agentConfig.name.toUpperCase()}] Executando análise...`);
      
      try {
        const result = await executeAgent(agentConfig, {
          licitacaoId,
          empresaId,
          empresaContext
        });

        agentResults[agentConfig.name] = result;
        
        console.log(`✅ [${agentConfig.name.toUpperCase()}] Decisão: ${result.decision} (Score: ${result.score}/100) ${result.analysis}`);

        if (result.decision === "NAO_PROSSEGUIR" && agentConfig.stopOnFailure) {
          console.log(`🛑 [${agentConfig.name.toUpperCase()}] Parando workflow - decisão negativa`);
          break;
        }

      } catch (error) {
        console.error(`❌ [${agentConfig.name.toUpperCase()}] Erro:`, error);
        
        if (agentConfig.required) {
          throw new Error(`Agente obrigatório ${agentConfig.name} falhou: ${error}`);
        }
        
        agentResults[agentConfig.name] = {
          decision: "NAO_PROSSEGUIR",
          score: 0,
          analysis: `Erro na execução: ${error}`
        };
      }
    }

    const executedAgents = Object.values(agentResults);
    const allScores = executedAgents.map(r => r.score);
    const consolidatedScore = Math.round(
      allScores.reduce((sum, score) => sum + score, 0) / allScores.length
    );

    const hasNegativeDecision = executedAgents.some(r => r.decision === "NAO_PROSSEGUIR");
    const finalDecision: "PROSSEGUIR" | "NAO_PROSSEGUIR" = hasNegativeDecision ? "NAO_PROSSEGUIR" : "PROSSEGUIR";

    const executiveSummary = generateExecutiveSummary(
      agentResults,
      finalDecision,
      consolidatedScore
    );

    console.log(`📊 [WORKFLOW] Finalizado - Decisão: ${finalDecision} (Score: ${consolidatedScore}/100)`);

    return {
      finalDecision,
      consolidatedScore,
      agents: agentResults,
      executiveSummary
    };
  }
});

const reportAggregatorStep = createStep({
  id: "report-aggregator",
  inputSchema: workflowResultSchema,
  outputSchema: workflowResultSchema,
  execute: async ({ inputData, runtimeContext }) => {
    const { finalDecision, consolidatedScore, agents, executiveSummary } = inputData;
    
    console.log(`📊 [REPORT AGGREGATOR] Gerando relatório executivo consolidado...`);
    
    try {
      // Buscar dados do contexto de runtime
      const licitacaoId = (runtimeContext?.get('licitacaoId') as string) || 'N/A';
      const empresaContext = runtimeContext?.get('empresaContext') as any;
      
      console.log(`📊 [REPORT AGGREGATOR] Processando licitação: ${licitacaoId} da empresa: ${empresaContext?.nome || 'N/A'}`);
      
      // Gerar relatório executivo detalhado
      const executiveReport = await executeReportAggregator(
        licitacaoId,
        agents,
        empresaContext
      );

      console.log(`🚨 [REPORT AGGREGATOR] Resultado: ${executiveReport}`);
      // Calcular nível de risco
      const riskLevel = calculateRiskLevel(agents, consolidatedScore);
      
      // Extrair alertas chave
      const keyAlerts = extractKeyAlerts(agents, licitacaoId);

      
      
      return {
        finalDecision,
        consolidatedScore,
        agents,
        executiveSummary,
        executiveReport,
        riskLevel,
        keyAlerts
      };
      
    } catch (error) {
      console.error(`❌ [REPORT AGGREGATOR] Erro na geração do relatório:`, error);
      
      return {
        finalDecision,
        consolidatedScore,
        agents,
        executiveSummary,
        executiveReport: `Erro na geração do relatório executivo: ${error}`,
        riskLevel: "ALTO" as const,
        keyAlerts: ["🚨 ERRO: Falha na geração do relatório executivo"]
      };
    }
  }
});

export const workflow = createWorkflow({
  id: "licitacao-analysis-workflow",
  description: "Análise automatizada de licitações com múltiplos agentes especializados e relatório executivo",
  inputSchema: workflowInputSchema,
  outputSchema: workflowResultSchema,
})
  .then(agentStep)
  .then(reportAggregatorStep)
  .commit(); 