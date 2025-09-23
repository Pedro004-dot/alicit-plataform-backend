import { RuntimeContext } from "@mastra/core/di";
import { AgentResult, IWorkflowAgent, WorkflowInput } from "./types";
import { reportAggregatorAgent } from "../agents/sequential/reportAggregatorAgent";

/**
 * Extrai dados concretos do texto de resposta do agente
 * Busca por padrões específicos nos dados estruturados
 */
export const extractConcreteData = (text: string): any => {
  const data: any = {};
  
  // Dados gerais da licitação
  const valorMatch = text.match(/\*\*VALOR ESTIMADO:\*\*\s*R?\$?\s*([0-9.,]+)/i);
  if (valorMatch) {
    const valor = valorMatch[1].replace(/[.,]/g, '');
    data.valorEstimado = parseInt(valor);
  }
  
  const modalidadeMatch = text.match(/\*\*MODALIDADE:\*\*\s*([^\n]+)/i);
  if (modalidadeMatch) {
    data.modalidade = modalidadeMatch[1].trim();
  }
  
  const prazoMatch = text.match(/\*\*PRAZO EXECUÇÃO:\*\*\s*(\d+)\s*dias?/i);
  if (prazoMatch) {
    data.prazoExecucao = parseInt(prazoMatch[1]);
  }
  
  const criterioMatch = text.match(/\*\*CRITÉRIO JULGAMENTO:\*\*\s*([^\n]+)/i);
  if (criterioMatch) {
    data.criterioJulgamento = criterioMatch[1].trim();
  }
  
  const orgaoMatch = text.match(/\*\*ORGÃO:\*\*\s*([^\n]+)/i);
  if (orgaoMatch) {
    data.orgaoLicitante = orgaoMatch[1].trim();
  }
  
  const objetoMatch = text.match(/\*\*OBJETO:\*\*\s*([^\n]+)/i);
  if (objetoMatch) {
    data.objeto = objetoMatch[1].trim();
  }
  
  const localMatch = text.match(/\*\*LOCAL ENTREGA:\*\*\s*([^\n]+)/i);
  if (localMatch) {
    data.localEntrega = localMatch[1].trim();
  }
  
  // Dados específicos - armazenar em specificData
  const specificData: any = {};
  
  // ========== DADOS LEGAIS/FINANCEIROS ==========
  // Documentos de habilitação (Legal)
  const docHabilitacaoMatch = text.match(/\*\*DOCUMENTOS HABILITAÇÃO:\*\*\s*([^\n*]+)/i);
  if (docHabilitacaoMatch) {
    specificData.documentosHabilitacao = docHabilitacaoMatch[1].trim();
  }
  
  // Capital social mínimo (Legal)
  const capitalMatch = text.match(/\*\*CAPITAL SOCIAL MÍNIMO:\*\*\s*R?\$?\s*([0-9.,]+)/i);
  if (capitalMatch) {
    specificData.capitalSocialMinimo = parseInt(capitalMatch[1].replace(/[.,]/g, ''));
  }
  
  // Faturamento mínimo (Legal)
  const faturamentoMatch = text.match(/\*\*FATURAMENTO MÍNIMO:\*\*\s*R?\$?\s*([0-9.,]+)/i);
  if (faturamentoMatch) {
    specificData.faturamentoMinimo = parseInt(faturamentoMatch[1].replace(/[.,]/g, ''));
  }
  
  // Garantias (Legal)
  const garantiaPropostaMatch = text.match(/\*\*GARANTIA PROPOSTA:\*\*\s*(\d+(?:,\d+)?)\s*%/i);
  if (garantiaPropostaMatch) {
    specificData.garantiaProposta = parseFloat(garantiaPropostaMatch[1].replace(',', '.'));
  }
  
  const garantiaExecucaoMatch = text.match(/\*\*GARANTIA EXECUÇÃO:\*\*\s*(\d+(?:,\d+)?)\s*%/i);
  if (garantiaExecucaoMatch) {
    specificData.garantiaExecucao = parseFloat(garantiaExecucaoMatch[1].replace(',', '.'));
  }
  
  // Multas e penalidades (Legal)
  const multaAtrasoMatch = text.match(/\*\*MULTA ATRASO:\*\*\s*(\d+(?:,\d+)?)\s*%/i);
  if (multaAtrasoMatch) {
    specificData.multaAtraso = parseFloat(multaAtrasoMatch[1].replace(',', '.'));
  }
  
  // ========== DADOS OPERACIONAIS ==========
  // Cronograma de entregas (Operacional)
  const cronogramaMatch = text.match(/\*\*CRONOGRAMA:\*\*\s*([^\n*]+)/i);
  if (cronogramaMatch) {
    specificData.cronograma = cronogramaMatch[1].trim();
  }
  
  // Certificações exigidas (Operacional)
  const certMatch = text.match(/\*\*CERTIFICAÇÕES EXIGIDAS:\*\*\s*([^\n*]+)/i);
  if (certMatch) {
    specificData.certificacoesExigidas = certMatch[1].trim();
  }
  
  // Quantidades totais (Operacional)
  const quantidadesMatch = text.match(/\*\*QUANTIDADES TOTAIS:\*\*\s*([^\n*]+)/i);
  if (quantidadesMatch) {
    specificData.quantidadesTotais = quantidadesMatch[1].trim();
  }
  
  // ========== DADOS ESTRATÉGICOS ==========
  // Data de abertura (Estratégico)
  const dataAberturaMatch = text.match(/\*\*DATA ABERTURA:\*\*\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (dataAberturaMatch) {
    specificData.dataAbertura = dataAberturaMatch[1].trim();
  }
  
  // Critério de desempate (Estratégico) - REMOVIDO conforme solicitação
  // Não armazenar dados N/A desnecessários
  
  if (Object.keys(specificData).length > 0) {
    data.specificData = specificData;
  }
  
  return Object.keys(data).length > 0 ? data : undefined;
};

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

  // ✅ NOVO: Extrair dados concretos
  const concreteData = extractConcreteData(text);

  return {
    decision,
    score,
    analysis: text,
    concreteData
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

/**
 * Consolida dados concretos de todos os agentes
 * Prioriza dados mais recentes e completos
 */
export const consolidateConcreteData = (agents: Record<string, AgentResult>): any => {
  const consolidated: any = {};
  
  // Consolidar dados gerais (prioridade: strategic > operational > legal)
  const agentPriority = ['strategic', 'operational', 'legal'];
  
  for (const agentName of agentPriority) {
    const agent = agents[agentName];
    if (agent?.concreteData) {
      // Mesclar dados, mantendo existentes se novos estão vazios
      Object.entries(agent.concreteData).forEach(([key, value]) => {
        if (value && value !== 'N/A' && !consolidated[key]) {
          consolidated[key] = value;
        }
      });
    }
  }
  
  return consolidated;
};

export const executeReportAggregator = async (
  licitacaoId: string,
  agents: Record<string, AgentResult>,
  empresaContext?: any
): Promise<string> => {
  // ✅ NOVO: Consolidar dados concretos de todos os agentes
  const concreteData = consolidateConcreteData(agents);
  
  // Preparar dados resumidos dos agentes (só as análises, sem repetir dados concretos)
  const agentAnalysesSummary = Object.entries(agents).map(([name, result]) => {
    // Extrair apenas a parte de análise, removendo dados concretos para evitar duplicação
    const analysisOnly = result.analysis.split('**DADOS CONCRETOS EXTRAÍDOS:**')[0] || result.analysis;
    return `**${name.toUpperCase()} (${result.score}/100 - ${result.decision}):**\n${analysisOnly}`;
  }).join('\n\n');

  const prompt = `
LICITAÇÃO: ${licitacaoId}
EMPRESA: ${empresaContext?.nome || 'N/A'}

=== DADOS CONCRETOS DA LICITAÇÃO (CONSOLIDADOS) ===
- Valor Estimado: ${concreteData.valorEstimado ? 'R$ ' + concreteData.valorEstimado.toLocaleString() : 'N/A'}
- Modalidade: ${concreteData.modalidade || 'N/A'}
- Prazo Execução: ${concreteData.prazoExecucao ? concreteData.prazoExecucao + ' dias' : 'N/A'}
- Critério Julgamento: ${concreteData.criterioJulgamento || 'N/A'}
- Órgão Licitante: ${concreteData.orgaoLicitante || 'N/A'}
- Objeto: ${concreteData.objeto || 'N/A'}
- Local Entrega: ${concreteData.localEntrega || 'N/A'}

=== DADOS ESPECÍFICOS EXTRAÍDOS ===
${concreteData.specificData ? JSON.stringify(concreteData.specificData, null, 2) : 'N/A'}

=== ANÁLISES DOS AGENTES ESPECIALIZADOS ===
${agentAnalysesSummary}

=== CONTEXTO DA EMPRESA ===
- Nome: ${empresaContext?.nome || 'N/A'}
- CNPJ: ${empresaContext?.cnpj || 'N/A'}
- Porte: ${empresaContext?.porte || 'N/A'}
- Faturamento Mensal: ${empresaContext?.financeiro?.faturamentoMensal ? 'R$ ' + empresaContext.financeiro.faturamentoMensal.toLocaleString() : 'N/A'}

Use OBRIGATORIAMENTE os dados concretos consolidados acima para preencher o relatório executivo com informações específicas e precisas.
`;

  const runtimeContext = new RuntimeContext();
  runtimeContext.set('licitacaoId', licitacaoId);
  runtimeContext.set('empresaContext', empresaContext);

  const result = await reportAggregatorAgent.generate([
    { role: 'user', content: prompt }
  ], { runtimeContext });

  return result.text || "Erro na geração do relatório executivo";
};