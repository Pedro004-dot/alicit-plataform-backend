"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sequentialAnalysisWorkflow = void 0;
const workflows_1 = require("@mastra/core/workflows");
const zod_1 = require("zod");
const sequential_1 = require("../agents/sequential");
const memoryConfig_1 = require("../config/memoryConfig");
// Schema do contexto empresarial
const empresaContextSchema = zod_1.z.object({
    nome: zod_1.z.string(),
    cnpj: zod_1.z.string(),
    porte: zod_1.z.enum(["Pequeno", "Médio", "Grande"]),
    segmento: zod_1.z.string(),
    produtos: zod_1.z.array(zod_1.z.string()),
    servicos: zod_1.z.array(zod_1.z.string()),
    localizacao: zod_1.z.string(),
    capacidadeOperacional: zod_1.z.string(),
    documentosDisponiveis: zod_1.z.record(zod_1.z.any()).optional(),
}).optional();
// Schema de entrada do workflow
const sequentialInputSchema = zod_1.z.object({
    licitacaoId: zod_1.z.string().describe("ID da licitação para análise"),
    empresaId: zod_1.z.string().describe("ID da empresa cliente"),
    empresaContext: empresaContextSchema.describe("Contexto completo da empresa"),
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
    stoppedAt: zod_1.z.enum(["strategic", "operational", "legal", "financial", "completed"]).describe("Etapa onde workflow parou ou completed"),
    executionMetadata: zod_1.z.object({
        totalTimeMs: zod_1.z.number(),
        agentsExecuted: zod_1.z.number(),
        stoppedReason: zod_1.z.string().optional(),
    }),
});
/**
 * STEP 1: Inicializar Working Memory
 * Prepara contexto empresarial para todos os agentes
 */
const initializeWorkingMemoryStep = (0, workflows_1.createStep)({
    id: "initialize-working-memory",
    description: "Inicializa working memory com contexto empresarial",
    inputSchema: sequentialInputSchema,
    outputSchema: zod_1.z.object({
        licitacaoId: zod_1.z.string(),
        empresaId: zod_1.z.string(),
        empresaContext: empresaContextSchema,
        threadId: zod_1.z.string(),
        initialized: zod_1.z.boolean(),
    }),
    execute: async ({ inputData }) => {
        const { licitacaoId, empresaId, empresaContext } = inputData;
        const threadId = `licitacao_${licitacaoId}`;
        console.log(`🚀 Iniciando análise sequencial - Licitação: ${licitacaoId}`);
        if (empresaContext) {
            // Atualiza working memory com dados da empresa
            const workingMemoryContent = buildInitialWorkingMemory(empresaContext, licitacaoId);
            await memoryConfig_1.sequentialWorkflowMemory.updateWorkingMemory({
                threadId,
                resourceId: empresaId,
                workingMemory: workingMemoryContent
            });
            console.log(`📝 Working memory inicializada para empresa: ${empresaContext.nome}`);
        }
        return {
            licitacaoId,
            empresaId,
            empresaContext,
            threadId,
            initialized: true,
        };
    }
});
/**
 * STEP 2: Análise de Aderência Estratégica
 * Primeiro filtro - se score < 60, workflow para
 */
const strategicAnalysisStep = (0, workflows_1.createStep)({
    id: "strategic-analysis",
    description: "Análise de aderência estratégica (filtro inicial)",
    inputSchema: zod_1.z.object({
        licitacaoId: zod_1.z.string(),
        empresaId: zod_1.z.string(),
        threadId: zod_1.z.string(),
        empresaContext: empresaContextSchema,
        initialized: zod_1.z.boolean(),
    }),
    outputSchema: zod_1.z.object({
        strategicScore: zod_1.z.number().min(0).max(100),
        shouldContinue: zod_1.z.boolean(),
        analysis: zod_1.z.string(),
        licitacaoId: zod_1.z.string(),
        empresaId: zod_1.z.string(),
        threadId: zod_1.z.string(),
    }),
    execute: async ({ inputData }) => {
        const { licitacaoId, empresaId, threadId } = inputData;
        const startTime = Date.now();
        console.log(`🎯 Executando análise de aderência estratégica`);
        try {
            const result = await sequential_1.sequentialAgents.strategicFitAgent.generate(`Analise a aderência estratégica da licitação ${licitacaoId} com nossa empresa.`, { threadId, resourceId: empresaId });
            const analysis = result.text || "Análise não disponível";
            const strategicScore = extractScoreFromAnalysis(analysis);
            const shouldContinue = strategicScore >= 60;
            console.log(`📊 Score aderência: ${strategicScore}/100 - ${shouldContinue ? '✅ Continua' : '❌ Para'}`);
            return {
                strategicScore,
                shouldContinue,
                analysis,
                licitacaoId,
                empresaId,
                threadId,
            };
        }
        catch (error) {
            console.error(`❌ Erro na análise estratégica: ${error}`);
            return {
                strategicScore: 0,
                shouldContinue: false,
                analysis: `Erro na análise estratégica: ${error}`,
                licitacaoId,
                empresaId,
                threadId,
            };
        }
    }
});
/**
 * STEP 3: Análise Operacional
 * Segundo filtro - se score < 50, workflow para
 */
const operationalAnalysisStep = (0, workflows_1.createStep)({
    id: "operational-analysis",
    description: "Análise de capacidade operacional",
    inputSchema: zod_1.z.object({
        strategicScore: zod_1.z.number(),
        shouldContinue: zod_1.z.boolean(),
        analysis: zod_1.z.string(),
        licitacaoId: zod_1.z.string(),
        empresaId: zod_1.z.string(),
        threadId: zod_1.z.string(),
    }),
    outputSchema: zod_1.z.object({
        strategicScore: zod_1.z.number(),
        operationalScore: zod_1.z.number(),
        shouldContinue: zod_1.z.boolean(),
        analysis: zod_1.z.string(),
        licitacaoId: zod_1.z.string(),
        empresaId: zod_1.z.string(),
        threadId: zod_1.z.string(),
    }),
    execute: async ({ inputData }) => {
        const { licitacaoId, empresaId, threadId, strategicScore } = inputData;
        console.log(`⚙️ Executando análise operacional`);
        try {
            const result = await sequential_1.sequentialAgents.operationalAgent.generate(`Analise a capacidade operacional para executar a licitação ${licitacaoId}, considerando o contexto da análise anterior.`, { threadId, resourceId: empresaId });
            const analysis = result.text || "Análise operacional não disponível";
            const operationalScore = extractScoreFromAnalysis(analysis);
            const shouldContinue = operationalScore >= 50;
            console.log(`📊 Score operacional: ${operationalScore}/100 - ${shouldContinue ? '✅ Continua' : '❌ Para'}`);
            return {
                strategicScore,
                operationalScore,
                shouldContinue,
                analysis,
                licitacaoId,
                empresaId,
                threadId,
            };
        }
        catch (error) {
            console.error(`❌ Erro na análise operacional: ${error}`);
            return {
                strategicScore,
                operationalScore: 0,
                shouldContinue: false,
                analysis: `Erro na análise operacional: ${error}`,
                licitacaoId,
                empresaId,
                threadId,
            };
        }
    }
});
/**
 * STEP 4: Análise Jurídico-Documental
 * Terceiro filtro - se score < 40, workflow para
 */
const legalAnalysisStep = (0, workflows_1.createStep)({
    id: "legal-analysis",
    description: "Análise jurídico-documental",
    inputSchema: zod_1.z.object({
        strategicScore: zod_1.z.number(),
        operationalScore: zod_1.z.number(),
        shouldContinue: zod_1.z.boolean(),
        analysis: zod_1.z.string(),
        licitacaoId: zod_1.z.string(),
        empresaId: zod_1.z.string(),
        threadId: zod_1.z.string(),
    }),
    outputSchema: zod_1.z.object({
        strategicScore: zod_1.z.number(),
        operationalScore: zod_1.z.number(),
        legalScore: zod_1.z.number(),
        shouldContinue: zod_1.z.boolean(),
        analysis: zod_1.z.string(),
        licitacaoId: zod_1.z.string(),
        empresaId: zod_1.z.string(),
        threadId: zod_1.z.string(),
    }),
    execute: async ({ inputData }) => {
        const { licitacaoId, empresaId, threadId, strategicScore, operationalScore } = inputData;
        console.log(`⚖️ Executando análise jurídico-documental`);
        try {
            const result = await sequential_1.sequentialAgents.legalDocAgent.generate(`Analise os aspectos jurídico-documentais da licitação ${licitacaoId}, considerando todas as análises anteriores.`, { threadId, resourceId: empresaId });
            const analysis = result.text || "Análise jurídica não disponível";
            const legalScore = extractScoreFromAnalysis(analysis);
            const shouldContinue = legalScore >= 40;
            console.log(`📊 Score jurídico: ${legalScore}/100 - ${shouldContinue ? '✅ Continua' : '❌ Para'}`);
            return {
                strategicScore,
                operationalScore,
                legalScore,
                shouldContinue,
                analysis,
                licitacaoId,
                empresaId,
                threadId,
            };
        }
        catch (error) {
            console.error(`❌ Erro na análise jurídica: ${error}`);
            return {
                strategicScore,
                operationalScore,
                legalScore: 0,
                shouldContinue: false,
                analysis: `Erro na análise jurídica: ${error}`,
                licitacaoId,
                empresaId,
                threadId,
            };
        }
    }
});
/**
 * STEP 5: Análise Financeira
 * Última análise especializada
 */
const financialAnalysisStep = (0, workflows_1.createStep)({
    id: "financial-analysis",
    description: "Análise financeira final",
    inputSchema: zod_1.z.object({
        strategicScore: zod_1.z.number(),
        operationalScore: zod_1.z.number(),
        legalScore: zod_1.z.number(),
        shouldContinue: zod_1.z.boolean(),
        analysis: zod_1.z.string(),
        licitacaoId: zod_1.z.string(),
        empresaId: zod_1.z.string(),
        threadId: zod_1.z.string(),
    }),
    outputSchema: zod_1.z.object({
        strategicScore: zod_1.z.number(),
        operationalScore: zod_1.z.number(),
        legalScore: zod_1.z.number(),
        financialScore: zod_1.z.number(),
        analysis: zod_1.z.string(),
        licitacaoId: zod_1.z.string(),
        empresaId: zod_1.z.string(),
        threadId: zod_1.z.string(),
    }),
    execute: async ({ inputData }) => {
        const { licitacaoId, empresaId, threadId, strategicScore, operationalScore, legalScore } = inputData;
        console.log(`💰 Executando análise financeira final`);
        try {
            const result = await sequential_1.sequentialAgents.financialAgent.generate(`Faça a análise financeira consolidada da licitação ${licitacaoId}, considerando todo o contexto das análises anteriores.`, { threadId, resourceId: empresaId });
            const analysis = result.text || "Análise financeira não disponível";
            const financialScore = extractScoreFromAnalysis(analysis);
            console.log(`📊 Score financeiro: ${financialScore}/100`);
            return {
                strategicScore,
                operationalScore,
                legalScore,
                financialScore,
                analysis,
                licitacaoId,
                empresaId,
                threadId,
            };
        }
        catch (error) {
            console.error(`❌ Erro na análise financeira: ${error}`);
            return {
                strategicScore,
                operationalScore,
                legalScore,
                financialScore: 0,
                analysis: `Erro na análise financeira: ${error}`,
                licitacaoId,
                empresaId,
                threadId,
            };
        }
    }
});
/**
 * STEP 6: Síntese Final do Orquestrador
 * Consolida todas as análises e toma decisão final
 */
const orchestratorSynthesisStep = (0, workflows_1.createStep)({
    id: "orchestrator-synthesis",
    description: "Síntese final e decisão do orquestrador",
    inputSchema: zod_1.z.object({
        strategicScore: zod_1.z.number(),
        operationalScore: zod_1.z.number(),
        legalScore: zod_1.z.number(),
        financialScore: zod_1.z.number(),
        analysis: zod_1.z.string(),
        licitacaoId: zod_1.z.string(),
        empresaId: zod_1.z.string(),
        threadId: zod_1.z.string(),
    }),
    outputSchema: sequentialOutputSchema,
    execute: async ({ inputData }) => {
        const startTime = Date.now();
        const { strategicScore, operationalScore, legalScore, financialScore, threadId, empresaId, licitacaoId } = inputData;
        console.log(`🧠 Orquestrador iniciando síntese final`);
        // Calcula score consolidado com pesos
        const consolidatedScore = calculateConsolidatedScore({
            strategic: strategicScore,
            operational: operationalScore,
            legal: legalScore,
            financial: financialScore,
        });
        // Decisão final baseada no score consolidado
        const decision = consolidatedScore >= 70 ? "PARTICIPAR" : "NAO_PARTICIPAR";
        // Recupera working memory completa para gerar relatório
        // TODO: Implementar método getWorkingMemory no Mastra Memory
        const workingMemory = "Working memory não disponível nesta versão";
        // Gera relatório executivo
        const executiveReport = generateExecutiveReport({
            licitacaoId,
            decision,
            consolidatedScore,
            scores: { strategic: strategicScore, operational: operationalScore, legal: legalScore, financial: financialScore },
            workingMemory: workingMemory || "Não disponível"
        });
        const totalTime = Date.now() - startTime;
        console.log(`🎉 Análise concluída - Decisão: ${decision} (Score: ${consolidatedScore}/100)`);
        return {
            decision: decision,
            consolidatedScore,
            scores: {
                strategic: strategicScore,
                operational: operationalScore,
                legal: legalScore,
                financial: financialScore,
            },
            executiveReport,
            stoppedAt: "completed",
            executionMetadata: {
                totalTimeMs: totalTime,
                agentsExecuted: 4,
            }
        };
    }
});
/**
 * WORKFLOW PRINCIPAL SEQUENCIAL
 * Executa os 4 agentes em sequência com filtros inteligentes
 */
exports.sequentialAnalysisWorkflow = (0, workflows_1.createWorkflow)({
    id: "sequentialAnalysisWorkflow",
    description: "Workflow sequencial inteligente com filtros progressivos",
    inputSchema: sequentialInputSchema,
    outputSchema: sequentialOutputSchema,
})
    // 1. Inicializa working memory
    .then(initializeWorkingMemoryStep)
    // 2. Análise de aderência (filtro 60+)
    .then(strategicAnalysisStep)
    .branch([
    [
        // Se não passou no filtro estratégico, para aqui
        async ({ inputData }) => !inputData.shouldContinue,
        (0, workflows_1.createStep)({
            id: "stop-at-strategic",
            inputSchema: zod_1.z.any(),
            outputSchema: sequentialOutputSchema,
            execute: async ({ inputData }) => ({
                decision: "NAO_PARTICIPAR",
                consolidatedScore: inputData.strategicScore,
                scores: {
                    strategic: inputData.strategicScore,
                    operational: 0,
                    legal: 0,
                    financial: 0,
                },
                executiveReport: `Análise interrompida na etapa estratégica. Score insuficiente: ${inputData.strategicScore}/100`,
                stoppedAt: "strategic",
                executionMetadata: {
                    totalTimeMs: 0,
                    agentsExecuted: 1,
                    stoppedReason: "Score estratégico insuficiente"
                }
            })
        })
    ],
    [
        // Se passou, continua para análise operacional
        async ({ inputData }) => inputData.shouldContinue,
        operationalAnalysisStep
            .branch([
            [
                // Para na análise operacional
                async ({ inputData }) => !inputData.shouldContinue,
                (0, workflows_1.createStep)({
                    id: "stop-at-operational",
                    inputSchema: zod_1.z.any(),
                    outputSchema: sequentialOutputSchema,
                    execute: async ({ inputData }) => ({
                        decision: "NAO_PARTICIPAR",
                        consolidatedScore: Math.round((inputData.strategicScore + inputData.operationalScore) / 2),
                        scores: {
                            strategic: inputData.strategicScore,
                            operational: inputData.operationalScore,
                            legal: 0,
                            financial: 0,
                        },
                        executiveReport: `Análise interrompida na etapa operacional. Score insuficiente: ${inputData.operationalScore}/100`,
                        stoppedAt: "operational",
                        executionMetadata: {
                            totalTimeMs: 0,
                            agentsExecuted: 2,
                            stoppedReason: "Score operacional insuficiente"
                        }
                    })
                })
            ],
            [
                // Continua para análise jurídica
                async ({ inputData }) => inputData.shouldContinue,
                legalAnalysisStep
                    .branch([
                    [
                        // Para na análise jurídica
                        async ({ inputData }) => !inputData.shouldContinue,
                        (0, workflows_1.createStep)({
                            id: "stop-at-legal",
                            inputSchema: zod_1.z.any(),
                            outputSchema: sequentialOutputSchema,
                            execute: async ({ inputData }) => ({
                                decision: "NAO_PARTICIPAR",
                                consolidatedScore: Math.round((inputData.strategicScore + inputData.operationalScore + inputData.legalScore) / 3),
                                scores: {
                                    strategic: inputData.strategicScore,
                                    operational: inputData.operationalScore,
                                    legal: inputData.legalScore,
                                    financial: 0,
                                },
                                executiveReport: `Análise interrompida na etapa jurídica. Score insuficiente: ${inputData.legalScore}/100`,
                                stoppedAt: "legal",
                                executionMetadata: {
                                    totalTimeMs: 0,
                                    agentsExecuted: 3,
                                    stoppedReason: "Score jurídico insuficiente"
                                }
                            })
                        })
                    ],
                    [
                        // Continua para análise financeira e síntese
                        async ({ inputData }) => inputData.shouldContinue,
                        financialAnalysisStep.then(orchestratorSynthesisStep)
                    ]
                ])
            ]
        ])
    ]
])
    .commit();
/**
 * Funções auxiliares
 */
function buildInitialWorkingMemory(empresaContext, licitacaoId) {
    if (!empresaContext)
        return "";
    return `# CONTEXTO EMPRESARIAL

## Dados da Empresa
- **Nome**: ${empresaContext.nome}
- **CNPJ**: ${empresaContext.cnpj}
- **Porte**: ${empresaContext.porte}
- **Segmento**: ${empresaContext.segmento}
- **Produtos**: ${empresaContext.produtos.join(', ')}
- **Serviços**: ${empresaContext.servicos.join(', ')}
- **Localização**: ${empresaContext.localizacao}
- **Capacidade Operacional**: ${empresaContext.capacidadeOperacional}

## ANÁLISE PROGRESSIVA ATUAL
### Licitação: ${licitacaoId}
- **Agente Aderência**: Pendente
- **Agente Operacional**: Pendente
- **Agente Jurídico**: Pendente
- **Agente Financeiro**: Pendente
- **Decisão Orquestrador**: Pendente
`;
}
function extractScoreFromAnalysis(analysis) {
    // Regex para encontrar scores no formato "Score: XX/100" ou "SCORE: XX"
    const scoreMatches = analysis.match(/(?:SCORE|Score)[\s:]+(\d+)(?:\/100)?/gi);
    if (scoreMatches && scoreMatches.length > 0) {
        const lastMatch = scoreMatches[scoreMatches.length - 1];
        const scoreNumber = lastMatch.match(/(\d+)/);
        if (scoreNumber) {
            return Math.min(100, Math.max(0, parseInt(scoreNumber[1])));
        }
    }
    // Fallback: análise heurística simples
    return Math.max(0, Math.min(100, Math.round(analysis.length / 50)));
}
function calculateConsolidatedScore(scores) {
    // Pesos: Aderência 30%, Operacional 25%, Jurídico 20%, Financeiro 25%
    return Math.round((scores.strategic * 0.30) +
        (scores.operational * 0.25) +
        (scores.legal * 0.20) +
        (scores.financial * 0.25));
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

## JUSTIFICATIVA DA DECISÃO
${decision === "PARTICIPAR"
        ? `A licitação apresenta score consolidado de ${consolidatedScore}/100, indicando viabilidade de participação. Todos os aspectos críticos foram avaliados favoravelmente pelos agentes especialistas.`
        : `A licitação apresenta score consolidado de ${consolidatedScore}/100, indicando baixa viabilidade. Recomenda-se não participar devido aos riscos e limitações identificados.`}

---
*Relatório gerado pelo Sistema de Agentes Especialistas da Alicit*  
*Primeira consultoria de licitações públicas automatizada por IA do mundo*
`;
}
