import { RuntimeContext } from "@mastra/core/di";
import { AgentResult, IWorkflowAgent, WorkflowInput } from "./types";
import { reportAggregatorAgent } from "../agents/sequential/reportAggregatorAgent";

export const parseAgentResponse = (text: string): AgentResult => {
  const scoreMatch = text.match(/\*\*SCORE.*?:\*\*\s*(\d+)/i) || 
                    text.match(/score[:\s]*(\d+)/i) ||
                    text.match(/(\d+)\/100/);
  const score = scoreMatch ? parseInt(scoreMatch[1]) : 50;

  const decisionMatch = text.match(/\*\*DECISÃO:\*\*\s*(NAO_PROSSEGUIR|PROSSEGUIR)/i) ||
                       text.match(/decisão[:\s]*(não prosseguir|nao prosseguir|prosseguir)/i);
  
  let decision: "PROSSEGUIR" | "NAO_PROSSEGUIR" = "NAO_PROSSEGUIR";
  if (decisionMatch) {
    const captured = decisionMatch[1].toLowerCase();
    if (captured.includes('nao') || captured.includes('não')) {
      decision = "NAO_PROSSEGUIR";
    } else if (captured.includes('prosseguir')) {
      decision = "PROSSEGUIR";
    }
  }

  return {
    decision,
    score,
    analysis: text
  };
};

export const executeAgent = async (
  agentConfig: IWorkflowAgent, 
  data: WorkflowInput
): Promise<AgentResult> => {
  const prompt = agentConfig.promptTemplate(data);
  const runtimeContext = new RuntimeContext();
  runtimeContext.set('licitacaoId', data.licitacaoId);
  runtimeContext.set('empresaContext', data.empresaContext);

  const result = await agentConfig.agent.generate([
    { role: 'user', content: prompt }
  ], { runtimeContext });

  const text = result.text || JSON.stringify(result);
  return parseAgentResponse(text);
};

export const generateExecutiveSummary = (
  agents: Record<string, AgentResult>,
  finalDecision: "PROSSEGUIR" | "NAO_PROSSEGUIR",
  consolidatedScore: number
): string => {
  const agentSummaries = Object.entries(agents)
    .map(([name, result]) => `${name.toUpperCase()}: ${result.score}/100 - ${result.decision}`)
    .join('\n');

  const recommendation = finalDecision === "PROSSEGUIR" 
    ? "✅ RECOMENDAÇÃO: Empresa deve prosseguir com a licitação."
    : "🛑 RECOMENDAÇÃO: Empresa NÃO deve prosseguir com a licitação.";

  return `ANÁLISE COMPLETA DE LICITAÇÃO

${agentSummaries}
Score Consolidado: ${consolidatedScore}/100
Decisão Final: ${finalDecision}

${recommendation}`;
};

export const calculateRiskLevel = (
  agents: Record<string, AgentResult>,
  consolidatedScore: number
): "BAIXO" | "MEDIO" | "ALTO" => {
  const hasNegativeDecision = Object.values(agents).some(agent => agent.decision === "NAO_PROSSEGUIR");
  
  if (hasNegativeDecision || consolidatedScore < 40) {
    return "ALTO";
  } else if (consolidatedScore < 70) {
    return "MEDIO";
  } else {
    return "BAIXO";
  }
};

export const extractKeyAlerts = (
  agents: Record<string, AgentResult>,
  licitacaoId: string
): string[] => {
  const alerts: string[] = [];
  
  Object.entries(agents).forEach(([agentName, result]) => {
    if (result.decision === "NAO_PROSSEGUIR") {
      alerts.push(`🚨 ${agentName.toUpperCase()}: Avaliação negativa (Score: ${result.score})`);
    } else if (result.score < 60) {
      alerts.push(`⚠️ ${agentName.toUpperCase()}: Score baixo requer atenção (${result.score}/100)`);
    }
  });
  
  return alerts;
};

export const executeReportAggregator = async (
  licitacaoId: string,
  agents: Record<string, AgentResult>,
  empresaContext?: any
): Promise<string> => {
  // Preparar dados resumidos dos agentes (só as análises)
  const agentAnalysesSummary = Object.entries(agents).map(([name, result]) => 
    `**${name.toUpperCase()} (${result.score}/100 - ${result.decision}):**\n${result.analysis}`
  ).join('\n\n');

  const prompt = `
LICITAÇÃO: ${licitacaoId}
EMPRESA: ${empresaContext?.nome || 'N/A'}

=== ANÁLISES DOS AGENTES ESPECIALIZADOS ===
${agentAnalysesSummary}

=== CONTEXTO DA EMPRESA ===
- Nome: ${empresaContext?.nome || 'N/A'}
- CNPJ: ${empresaContext?.cnpj || 'N/A'}
- Porte: ${empresaContext?.porte || 'N/A'}
- Faturamento Mensal: ${empresaContext?.financeiro?.faturamentoMensal ? 'R$ ' + empresaContext.financeiro.faturamentoMensal.toLocaleString() : 'N/A'}

Gere um relatório executivo completo consolidando essas análises especializadas.
`;

  const runtimeContext = new RuntimeContext();
  runtimeContext.set('licitacaoId', licitacaoId);
  runtimeContext.set('empresaContext', empresaContext);

  const result = await reportAggregatorAgent.generate([
    { role: 'user', content: prompt }
  ], { runtimeContext });

  return result.text || "Erro na geração do relatório executivo";
};