"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sequentialAnalysisWorkflow = void 0;
const workflows_1 = require("@mastra/core/workflows");
const zod_1 = require("zod");
const sequential_1 = require("../agents/sequential");
// Schema de entrada do workflow
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
        documentosDisponiveis: zod_1.z.record(zod_1.z.any()).optional(),
    }).optional(),
});
// Schema de saída do workflow
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
        console.log(`🚀 Iniciando análise sequencial - Licitação: ${licitacaoId}`);
        console.log('📋 DADOS COMPLETOS RECEBIDOS PELO WORKFLOW:');
        console.log('  licitacaoId:', licitacaoId);
        console.log('  empresaId:', empresaId);
        console.log('  empresaContext:', typeof empresaContext === 'object' ? JSON.stringify(empresaContext, null, 2) : empresaContext);
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
            console.log(`🎯 Executando análise de aderência estratégica`);
            console.log('🤖 DADOS PASSADOS PARA O AGENTE ESTRATÉGICO:');
            console.log('  threadId:', threadId);
            console.log('  resourceId:', empresaId);
            console.log('  prompt: "Analise a aderência estratégica da licitação', licitacaoId, 'com nossa empresa."');
            const strategicResult = await sequential_1.sequentialAgents.strategicFitAgent.generate(`Analise a aderência estratégica da licitação ${licitacaoId} com nossa empresa.`, { threadId, resourceId: empresaId });
            console.log('📝 RESPOSTA COMPLETA DO AGENTE ESTRATÉGICO:');
            console.log('  texto completo:', strategicResult.text?.substring(0, 300) + '...');
            console.log('  tool calls:', strategicResult.toolCalls?.length || 0);
            scores.strategic = extractScoreFromAnalysis(strategicResult.text || "");
            agentsExecuted = 1;
            console.log(`📊 Score aderência: ${scores.strategic}/100`);
            if (scores.strategic < 60) {
                console.log(`❌ Workflow parado na aderência estratégica`);
                return createStoppedResult("strategic", scores, agentsExecuted, "Score estratégico insuficiente", startTime);
            }
            // ETAPA 2: Análise Operacional
            console.log(`⚙️ Executando análise operacional`);
            stoppedAt = "operational";
            const operationalResult = await sequential_1.sequentialAgents.operationalAgent.generate(`Analise a capacidade operacional para executar a licitação ${licitacaoId}.`, { threadId, resourceId: empresaId });
            scores.operational = extractScoreFromAnalysis(operationalResult.text || "");
            agentsExecuted = 2;
            console.log(`📊 Score operacional: ${scores.operational}/100`);
            if (scores.operational < 50) {
                console.log(`❌ Workflow parado na análise operacional`);
                return createStoppedResult("operational", scores, agentsExecuted, "Score operacional insuficiente", startTime);
            }
            // ETAPA 3: Análise Jurídico-Documental
            console.log(`⚖️ Executando análise jurídico-documental`);
            stoppedAt = "legal";
            const legalResult = await sequential_1.sequentialAgents.legalDocAgent.generate(`Analise os aspectos jurídico-documentais da licitação ${licitacaoId}.`, { threadId, resourceId: empresaId });
            scores.legal = extractScoreFromAnalysis(legalResult.text || "");
            agentsExecuted = 3;
            console.log(`📊 Score jurídico: ${scores.legal}/100`);
            if (scores.legal < 40) {
                console.log(`❌ Workflow parado na análise jurídica`);
                return createStoppedResult("legal", scores, agentsExecuted, "Score jurídico insuficiente", startTime);
            }
            // ETAPA 4: Análise Financeira
            console.log(`💰 Executando análise financeira`);
            stoppedAt = "financial";
            const financialResult = await sequential_1.sequentialAgents.financialAgent.generate(`Faça a análise financeira consolidada da licitação ${licitacaoId}.`, { threadId, resourceId: empresaId });
            scores.financial = extractScoreFromAnalysis(financialResult.text || "");
            agentsExecuted = 4;
            stoppedAt = "completed";
            console.log(`📊 Score financeiro: ${scores.financial}/100`);
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
            console.log(`🎉 Análise concluída - Decisão: ${decision} (Score: ${consolidatedScore}/100)`);
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
            console.error(`❌ Erro na análise sequencial: ${error}`);
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
function extractScoreFromAnalysis(analysis) {
    const scoreMatches = analysis.match(/(?:SCORE|Score)[\s:]+(\d+)(?:\/100)?/gi);
    if (scoreMatches && scoreMatches.length > 0) {
        const lastMatch = scoreMatches[scoreMatches.length - 1];
        const scoreNumber = lastMatch.match(/(\d+)/);
        if (scoreNumber) {
            return Math.min(100, Math.max(0, parseInt(scoreNumber[1])));
        }
    }
    return Math.max(0, Math.min(100, Math.round(analysis.length / 50)));
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
- **Sistema:** Workflow Sequencial Alicit v2.0
- **Tempo de Execução:** ${(executionTime / 1000).toFixed(1)}s
- **Agentes Executados:** ${agentsExecuted}/4

## DECISÃO FINAL
### ❌ RECOMENDAÇÃO: NÃO PARTICIPAR
**Motivo:** Análise interrompida na etapa de ${stageName}

## ANÁLISE DETALHADA

### Etapa Analisada: ${stageName}
- **Score Obtido:** ${scores[stoppedAt]}/100
- **Critério de Aprovação:** ${getStageThreshold(stoppedAt)}/100
- **Status:** ❌ REPROVADO
- **Motivo:** ${reason}

### Por que a Análise foi Interrompida?
${getStageExplanation(stoppedAt, scores[stoppedAt])}

### Etapas Não Analisadas:
${getUnanalyzedStages(stoppedAt)}

## SCORES ATUAIS
- **Aderência Estratégica:** ${scores.strategic || 0}/100 ${scores.strategic ? '✅' : '⏭️'}
- **Capacidade Operacional:** ${scores.operational || 0}/100 ${scores.operational ? '✅' : '⏭️'}
- **Situação Jurídico-Documental:** ${scores.legal || 0}/100 ${scores.legal ? '✅' : '⏭️'} 
- **Atratividade Financeira:** ${scores.financial || 0}/100 ${scores.financial ? '✅' : '⏭️'}

**Score Parcial:** ${partialScore}/100

## RECOMENDAÇÕES
${getRecommendations(stoppedAt, scores[stoppedAt])}

---
*Relatório gerado pelo Sistema de Agentes Especialistas da Alicit*
*Análise interrompida para otimizar tempo e recursos*
`;
}
/**
 * Retorna threshold mínimo para cada etapa
 */
function getStageThreshold(stage) {
    const thresholds = {
        strategic: 60,
        operational: 50,
        legal: 40,
        financial: 30
    };
    return thresholds[stage] || 0;
}
/**
 * Explica por que a análise foi interrompida em cada etapa
 */
function getStageExplanation(stage, score) {
    const explanations = {
        strategic: `O score de aderência estratégica (${score}/100) indica que a licitação não está alinhada com o core business da sua empresa. Continuar a análise seria pouco produtivo, pois mesmo com scores altos nas outras etapas, a falta de aderência estratégica torna a participação pouco vantajosa.`,
        operational: `O score de capacidade operacional (${score}/100) sugere que sua empresa não tem recursos suficientes para executar este contrato adequadamente. Prosseguir com a análise não é recomendado, pois limitações operacionais podem comprometer a execução e gerar riscos contratuais.`,
        legal: `O score jurídico-documental (${score}/100) indica problemas significativos na documentação ou requisitos legais. Participar desta licitação sem resolver essas questões pode resultar em desclassificação ou problemas contratuais posteriores.`,
        financial: `O score financeiro (${score}/100) mostra que as condições econômicas da licitação não são atrativas para sua empresa. O investimento de tempo e recursos para participar pode não compensar o retorno esperado.`
    };
    return explanations[stage] || "Score insuficiente para prosseguir com a análise.";
}
/**
 * Lista etapas que não foram analisadas
 */
function getUnanalyzedStages(stoppedAt) {
    const allStages = {
        strategic: "Aderência Estratégica",
        operational: "Capacidade Operacional",
        legal: "Situação Jurídico-Documental",
        financial: "Atratividade Financeira"
    };
    const stageOrder = ["strategic", "operational", "legal", "financial"];
    const stoppedIndex = stageOrder.indexOf(stoppedAt);
    if (stoppedIndex === -1 || stoppedIndex === stageOrder.length - 1) {
        return "- Nenhuma (todas as etapas foram analisadas)";
    }
    const unanalyzed = stageOrder.slice(stoppedIndex + 1);
    return unanalyzed.map(stage => `- ${allStages[stage]}`).join("\n");
}
/**
 * Gera recomendações específicas baseadas na etapa e score
 */
function getRecommendations(stage, score) {
    const recommendations = {
        strategic: `
### Para Futuras Licitações:
1. **Foque em licitações mais alinhadas** com seus produtos/serviços principais
2. **Diversifique gradualmente** seu portfólio se quiser expandir para novos segmentos  
3. **Analise o histórico** de licitações similares para identificar padrões de sucesso
4. **Considere parcerias** com empresas especialistas no segmento desta licitação`,
        operational: `
### Para Melhorar sua Capacidade:
1. **Invista em infraestrutura** e recursos necessários para contratos similares
2. **Desenvolva parcerias estratégicas** para complementar suas capacidades
3. **Considere terceirização** de atividades fora do seu core business
4. **Avalie o timing** - talvez esta licitação seja prematura para sua empresa atual`,
        legal: `
### Para Regularizar sua Situação:
1. **Atualize documentos vencidos** ou próximos do vencimento
2. **Contrate consultoria jurídica** especializada em licitações
3. **Implemente rotina de renovação** automática de certidões
4. **Revise contratos sociais** e documentos societários se necessário`,
        financial: `
### Para Melhorar sua Posição Financeira:
1. **Renegocie condições de pagamento** com fornecedores
2. **Busque linhas de crédito** específicas para contratos públicos
3. **Otimize custos operacionais** para melhorar margem de contribuição
4. **Considere licitações menores** que se adequem melhor ao seu porte`
    };
    return recommendations[stage] || "Consulte nossa equipe para recomendações personalizadas.";
}
