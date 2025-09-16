"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sequentialAnalysisWorkflow = void 0;
const workflows_1 = require("@mastra/core/workflows");
const zod_1 = require("zod");
const sequential_1 = require("../agents/sequential");
// import { sequentialWorkflowMemory } from "../config/memoryConfig"; // Memory removido para compatibilidade Vercel serverless
const di_1 = require("@mastra/core/di");
const updateWorkingMemoryTool_1 = require("../tools/updateWorkingMemoryTool");
const sequentialInputSchema = zod_1.z.object({
    licitacaoId: zod_1.z.string().describe("ID da licitação para análise"),
    empresaId: zod_1.z.string().describe("ID da empresa cliente"),
    empresaContext: zod_1.z.object({
        nome: zod_1.z.string(),
        cnpj: zod_1.z.string(),
        porte: zod_1.z.enum(["Pequeno", "Médio", "Grande"]),
        segmento: zod_1.z.string(),
        produtos: zod_1.z.array(zod_1.z.string()),
        servicos: zod_1.z.array(zod_1.z.string()),
        localizacao: zod_1.z.string(),
        capacidadeOperacional: zod_1.z.string(),
        // Novos campos financeiros
        faturamento: zod_1.z.number().optional(),
        capitalSocial: zod_1.z.number().optional(),
        // Lista de certificações/documentos
        certificacoes: zod_1.z.array(zod_1.z.object({
            nome: zod_1.z.string(),
            descricao: zod_1.z.string().optional(),
            dataVencimento: zod_1.z.string().optional(),
            status: zod_1.z.string().optional(),
        })),
        documentosDisponiveis: zod_1.z.record(zod_1.z.any()).optional(),
    }).optional(),
});
const sequentialOutputSchema = zod_1.z.object({
    decision: zod_1.z.enum(["PARTICIPAR", "NAO_PARTICIPAR"]).describe("Decisão final"),
    consolidatedScore: zod_1.z.number().min(0).max(100).describe("Score consolidado final"),
    scores: zod_1.z.object({
        strategic: zod_1.z.number().min(0).max(100),
        operational: zod_1.z.number().min(0).max(100),
        legal: zod_1.z.number().min(0).max(100),
        financial: zod_1.z.number().min(0).max(100),
    }).describe("Scores individuais por análise"),
    executiveReport: zod_1.z.string().describe("Relatório executivo final"),
    stoppedAt: zod_1.z.enum(["strategic", "operational", "legal", "financial", "completed"]).describe("Etapa onde workflow parou"),
    executionMetadata: zod_1.z.object({
        totalTimeMs: zod_1.z.number(),
        agentsExecuted: zod_1.z.number(),
        stoppedReason: zod_1.z.string().optional(),
    }),
});
/**
 * STEP: Análise Sequencial Completa
 * Executa os 4 agentes em sequência com lógica de parada
 */
const sequentialAnalysisStep = (0, workflows_1.createStep)({
    id: "sequential-analysis-complete",
    description: "Executa análise sequencial com filtros progressivos",
    inputSchema: sequentialInputSchema,
    outputSchema: sequentialOutputSchema,
    execute: async ({ inputData }) => {
        const { licitacaoId, empresaId, empresaContext } = inputData;
        const startTime = Date.now();
        // Reset scores capturados no início
        (0, updateWorkingMemoryTool_1.resetCapturedScores)();
        console.log(`🔄 [WORKFLOW] Scores resetados para nova análise`);
        const threadId = `licitacao_${licitacaoId}`;
        let agentsExecuted = 0;
        let stoppedAt = "strategic";
        const scores = {
            strategic: 0,
            operational: 0,
            legal: 0,
            financial: 0,
        };
        try {
            // ETAPA 1: Aderência Estratégica
            // Criar RuntimeContext com dados da empresa e licitação
            const runtimeContext = new di_1.RuntimeContext();
            if (empresaContext) {
                runtimeContext.set('empresaContext', empresaContext);
            }
            runtimeContext.set('licitacaoId', licitacaoId);
            const strategicResult = await sequential_1.sequentialAgents.strategicFitAgent.generate(`Analise a aderência estratégica da licitação ${licitacaoId} com nossa empresa.`, {
                threadId,
                resourceId: empresaId,
                runtimeContext
            });
            console.log(`📝 [STRATEGIC] Resposta do agente: ${(strategicResult.text || "").substring(0, 200)}...`);
            scores.strategic = await extractScoreWithWorkingMemoryFallback(strategicResult.text || "", threadId, empresaId, 'strategic');
            agentsExecuted = 1;
            console.log(`📊 [STRATEGIC] Score extraído: ${scores.strategic}/100`);
            console.log(`📊 Score aderência: ${scores.strategic}/100`);
            if (scores.strategic < 60) {
                console.log(`❌ Workflow parado na aderência estratégica`);
                return createStoppedResult("strategic", scores, agentsExecuted, "Score estratégico insuficiente", startTime);
            }
            // ETAPA 2: Análise Operacional
            stoppedAt = "operational";
            const operationalResult = await sequential_1.sequentialAgents.operationalAgent.generate(`Analise a capacidade operacional para executar a licitação ${licitacaoId}.`, {
                threadId,
                resourceId: empresaId,
                runtimeContext
            });
            scores.operational = extractScoreFromAnalysis(operationalResult.text || "");
            agentsExecuted = 2;
            if (scores.operational < 50) {
                console.log(`❌ Workflow parado na análise operacional`);
                return createStoppedResult("operational", scores, agentsExecuted, "Score operacional insuficiente", startTime);
            }
            // ETAPA 3: Análise Jurídico-Documental
            stoppedAt = "legal";
            const legalResult = await sequential_1.sequentialAgents.legalDocAgent.generate(`Analise os aspectos jurídico-documentais da licitação ${licitacaoId}.`, {
                threadId,
                resourceId: empresaId,
                runtimeContext
            });
            scores.legal = extractScoreFromAnalysis(legalResult.text || "");
            agentsExecuted = 3;
            if (scores.legal < 40) {
                console.log(`❌ Workflow parado na análise jurídica`);
                return createStoppedResult("legal", scores, agentsExecuted, "Score jurídico insuficiente", startTime);
            }
            // ETAPA 4: Análise Financeira
            stoppedAt = "financial";
            const financialResult = await sequential_1.sequentialAgents.financialAgent.generate(`Faça a análise financeira consolidada da licitação ${licitacaoId}.`, {
                threadId,
                resourceId: empresaId,
                runtimeContext
            });
            scores.financial = extractScoreFromAnalysis(financialResult.text || "");
            agentsExecuted = 4;
            stoppedAt = "completed";
            // SÍNTESE FINAL
            const consolidatedScore = calculateConsolidatedScore(scores);
            const decision = consolidatedScore >= 70 ? "PARTICIPAR" : "NAO_PARTICIPAR";
            const executiveReport = generateExecutiveReport({
                licitacaoId,
                decision,
                consolidatedScore,
                scores,
            });
            const totalTime = Date.now() - startTime;
            return {
                decision: decision,
                consolidatedScore,
                scores,
                executiveReport,
                stoppedAt,
                executionMetadata: {
                    totalTimeMs: totalTime,
                    agentsExecuted,
                }
            };
        }
        catch (error) {
            // Rate limit será tratado pelos agentes com fallback de modelo
            // Aqui só tratamos erros irrecuperáveis
            return createStoppedResult(stoppedAt === "completed" ? "financial" : stoppedAt, scores, agentsExecuted, `Erro na execução: ${error}`, startTime);
        }
    }
});
/**
 * WORKFLOW PRINCIPAL SEQUENCIAL SIMPLIFICADO
 */
exports.sequentialAnalysisWorkflow = (0, workflows_1.createWorkflow)({
    id: "sequentialAnalysisWorkflow",
    description: "Workflow sequencial inteligente com filtros progressivos",
    inputSchema: sequentialInputSchema,
    outputSchema: sequentialOutputSchema,
})
    .then(sequentialAnalysisStep)
    .commit();
/**
 * Funções auxiliares
 */
function createStoppedResult(stoppedAt, scores, agentsExecuted, reason, startTime) {
    const executiveReport = generateDetailedStoppedReport({
        stoppedAt,
        scores,
        reason,
        agentsExecuted,
        executionTime: Date.now() - startTime
    });
    return {
        decision: "NAO_PARTICIPAR",
        consolidatedScore: calculatePartialScore(scores, stoppedAt),
        scores,
        executiveReport,
        stoppedAt,
        executionMetadata: {
            totalTimeMs: Date.now() - startTime,
            agentsExecuted,
            stoppedReason: reason
        }
    };
}
// Score extraction com fallback para working memory
async function extractScoreWithWorkingMemoryFallback(analysis, threadId, resourceId, agentType) {
    console.log(`🔍 [EXTRACT SCORE] Tentando extrair score de ${analysis.length} caracteres para agente ${agentType}`);
    // Primeiro tenta extrair do texto da resposta
    const textScore = extractScoreFromAnalysis(analysis);
    if (textScore > 0) {
        console.log(`✅ [EXTRACT SCORE] Score extraído do texto: ${textScore}/100`);
        return textScore;
    }
    console.log(`⚠️ [EXTRACT SCORE] Score não encontrado no texto (length: ${analysis.length})`);
    // Fallback: usar score capturado da working memory
    const capturedScore = updateWorkingMemoryTool_1.capturedScores[agentType];
    if (capturedScore > 0) {
        console.log(`✅ [WORKING MEMORY FALLBACK] Score ${agentType} encontrado: ${capturedScore}/100`);
        return capturedScore;
    }
    console.log(`❌ [EXTRACT SCORE] Nenhum score encontrado para ${agentType} - usando fallback conservador`);
    return 0;
}
function extractScoreFromAnalysis(analysis) {
    console.log(`🔍 [EXTRACT SCORE] Analisando texto de ${analysis.length} caracteres`);
    console.log(`🔍 [EXTRACT SCORE] Primeiros 300 chars: ${analysis.substring(0, 300)}...`);
    // PADRÃO 1: Buscar score final específico (mais rigoroso)
    const finalScorePatterns = [
        /SCORE DE ADEQUAÇÃO:\s*(\d+)\/100/gi,
        /Score de adequação:\s*(\d+)\/100/gi,
        /#### SCORE DE ADEQUAÇÃO:\s*(\d+)\/100/gi,
        /Score final:\s*(\d+)\/100/gi,
        /Pontuação final:\s*(\d+)\/100/gi
    ];
    for (const pattern of finalScorePatterns) {
        const matches = analysis.match(pattern);
        if (matches && matches.length > 0) {
            const lastMatch = matches[matches.length - 1];
            const scoreNumber = lastMatch.match(/(\d+)/);
            if (scoreNumber) {
                const score = Math.min(100, Math.max(0, parseInt(scoreNumber[1])));
                console.log(`✅ [EXTRACT SCORE] Score FINAL encontrado: ${score}/100 via padrão específico`);
                return score;
            }
        }
    }
    // PADRÃO 2: Buscar qualquer "X/100" mas pegar o ÚLTIMO (não o primeiro)
    const allScoreMatches = analysis.match(/(\d+)\/100/gi);
    if (allScoreMatches && allScoreMatches.length > 0) {
        // Pegar o ÚLTIMO match (score final, não intermediário)
        const lastMatch = allScoreMatches[allScoreMatches.length - 1];
        const scoreNumber = lastMatch.match(/(\d+)/);
        if (scoreNumber) {
            const score = Math.min(100, Math.max(0, parseInt(scoreNumber[1])));
            console.log(`✅ [EXTRACT SCORE] Score encontrado (último): ${score}/100 de ${allScoreMatches.length} matches`);
            console.log(`📝 [EXTRACT SCORE] Todos os matches: ${allScoreMatches.join(', ')}`);
            return score;
        }
    }
    // PADRÃO 3: Buscar working memory
    if (analysis.includes("score:")) {
        const workingMemoryScore = analysis.match(/score:\s*(\d+)/i);
        if (workingMemoryScore) {
            const score = parseInt(workingMemoryScore[1]);
            console.log(`✅ [EXTRACT SCORE] Score encontrado no working memory: ${score}/100`);
            return Math.min(100, Math.max(0, score));
        }
    }
    console.log(`❌ [EXTRACT SCORE] Nenhum score encontrado, usando fallback`);
    console.log(`🔍 [EXTRACT SCORE] Últimos 300 chars: ...${analysis.substring(analysis.length - 300)}`);
    return Math.max(20, Math.min(100, Math.round(analysis.length / 50))); // Fallback mais generoso
}
function calculateConsolidatedScore(scores) {
    return Math.round((scores.strategic * 0.30) +
        (scores.operational * 0.25) +
        (scores.legal * 0.20) +
        (scores.financial * 0.25));
}
function calculatePartialScore(scores, stoppedAt) {
    switch (stoppedAt) {
        case "strategic": return scores.strategic;
        case "operational": return Math.round((scores.strategic + scores.operational) / 2);
        case "legal": return Math.round((scores.strategic + scores.operational + scores.legal) / 3);
        default: return 0;
    }
}
function generateExecutiveReport(data) {
    const { licitacaoId, decision, consolidatedScore, scores } = data;
    return `# RELATÓRIO EXECUTIVO - ANÁLISE SEQUENCIAL

## INFORMAÇÕES GERAIS
- **Licitação:** ${licitacaoId}
- **Data da Análise:** ${new Date().toLocaleString('pt-BR')}
- **Sistema:** Workflow Sequencial Alicit v2.0

## DECISÃO FINAL
### ${decision === "PARTICIPAR" ? "✅ RECOMENDAÇÃO: PARTICIPAR" : "❌ RECOMENDAÇÃO: NÃO PARTICIPAR"}
**Score Consolidado:** ${consolidatedScore}/100

## SCORES DETALHADOS
- **Aderência Estratégica:** ${scores.strategic}/100 (Peso: 30%)
- **Capacidade Operacional:** ${scores.operational}/100 (Peso: 25%)
- **Situação Jurídico-Documental:** ${scores.legal}/100 (Peso: 20%)
- **Atratividade Financeira:** ${scores.financial}/100 (Peso: 25%)

---
*Relatório gerado pelo Sistema de Agentes Especialistas da Alicit*
`;
}
/**
 * Gera relatório detalhado quando análise é interrompida
 */
function generateDetailedStoppedReport(data) {
    const { stoppedAt, scores, reason, agentsExecuted, executionTime } = data;
    const stageNames = {
        strategic: "Aderência Estratégica",
        operational: "Capacidade Operacional",
        legal: "Situação Jurídico-Documental",
        financial: "Atratividade Financeira"
    };
    const stageName = stageNames[stoppedAt];
    const partialScore = calculatePartialScore(scores, stoppedAt);
    return `# RELATÓRIO EXECUTIVO - ANÁLISE INTERROMPIDA

## INFORMAÇÕES GERAIS
- **Data da Análise:** ${new Date().toLocaleString('pt-BR')}

## DECISÃO FINAL
### ❌ RECOMENDAÇÃO: NÃO PARTICIPAR
**Motivo:** Análise interrompida na etapa de ${stageName}


### Por que a Análise foi Interrompida?
${getStageExplanation(stoppedAt, scores[stoppedAt])}


## SCORES ATUAIS
- **Aderência Estratégica:** ${scores.strategic || 0}/100 ${scores.strategic ? '✅' : '⏭️'}
- **Capacidade Operacional:** ${scores.operational || 0}/100 ${scores.operational ? '✅' : '⏭️'}
- **Situação Jurídico-Documental:** ${scores.legal || 0}/100 ${scores.legal ? '✅' : '⏭️'} 
- **Atratividade Financeira:** ${scores.financial || 0}/100 ${scores.financial ? '✅' : '⏭️'}

**Score Parcial:** ${partialScore}/100

---
*Relatório gerado pelo Sistema de Agentes Especialistas da Alicit*
`;
}
/**


/**
 * Sistema de fallback de modelos agora previne rate limits
 * Esta função foi removida pois rate limits são tratados pelos agentes
 */
/**
 * Explica por que a análise foi interrompida em cada etapa
 */
function getStageExplanation(stage, score) {
    const explanations = {
        strategic: `O score de aderência estratégica (${score}/100) indica que a licitação não está alinhada com o core business da sua empresa.`,
        operational: `O score de capacidade operacional (${score}/100) sugere que sua empresa não tem recursos suficientes para executar este contrato adequadamente.`,
        legal: `O score jurídico-documental (${score}/100) indica problemas significativos na documentação ou requisitos legais.`,
        financial: `O score financeiro (${score}/100) mostra que as condições econômicas da licitação não são atrativas para sua empresa.`
    };
    return explanations[stage] || "Score insuficiente para prosseguir com a análise.";
}
