"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.editalAnalysisWorkflow = void 0;
const workflows_1 = require("@mastra/core/workflows");
const zod_1 = require("zod");
// Importar agentes especialistas
const scopeAgent_1 = require("../agents/specialists/scopeAgent");
const timelineAgent_1 = require("../agents/specialists/timelineAgent");
const eligibilityAgent_1 = require("../agents/specialists/eligibilityAgent");
const riskAgent_1 = require("../agents/specialists/riskAgent");
const challengeAgent_1 = require("../agents/specialists/challengeAgent");
const qualityControlAgent_1 = require("../agents/qualityControlAgent");
// Schema de contexto da empresa
const empresaContextSchema = zod_1.z.object({
    nome: zod_1.z.string(),
    descricao: zod_1.z.string(),
    porte: zod_1.z.string(),
    produtos: zod_1.z.array(zod_1.z.string()),
    servicos: zod_1.z.array(zod_1.z.string()),
    cidade: zod_1.z.string(),
    responsavel_legal: zod_1.z.string()
}).optional();
// Schema de entrada para o workflow orquestrador
const editalAnalysisInputSchema = zod_1.z.object({
    licitacaoId: zod_1.z.string().describe("ID da licitação a ser analisada"),
    empresaId: zod_1.z.string().optional().describe("ID da empresa cliente (opcional)"),
    empresaContext: empresaContextSchema.describe("Contexto da empresa para personalização da análise"),
    refinementAttempts: zod_1.z.number().default(0).describe("Número de tentativas de refinamento"),
});
// Schema de saída do workflow orquestrador
const editalAnalysisOutputSchema = zod_1.z.object({
    relatorioCompleto: zod_1.z.string().describe("Relatório técnico completo em Markdown"),
    qualityScore: zod_1.z.number().min(0).max(100).describe("Score de qualidade da análise (0-100)"),
    status: zod_1.z.enum(["completed", "incomplete", "error"]).describe("Status final da análise"),
    isComplete: zod_1.z.boolean().describe("Se a análise está completa e aprovada"),
    recommendations: zod_1.z.array(zod_1.z.string()).describe("Recomendações de ação baseadas na análise"),
    executionMetadata: zod_1.z.object({
        totalAgentsExecuted: zod_1.z.number(),
        totalTimeMs: zod_1.z.number(),
        contextoProcessado: zod_1.z.number(),
        refinementAttempts: zod_1.z.number().describe("Número de tentativas de refinamento"),
    }).describe("Metadados de execução do workflow")
});
// Step 1: Execução dos agentes especialistas
const executeSpecialistAgentsStep = (0, workflows_1.createStep)({
    id: "execute-specialist-agents",
    description: "Executa todos os agentes especialistas em paralelo",
    inputSchema: editalAnalysisInputSchema,
    outputSchema: zod_1.z.object({
        scopeAnalysis: zod_1.z.string(),
        timelineAnalysis: zod_1.z.string(),
        eligibilityAnalysis: zod_1.z.string(),
        riskAnalysis: zod_1.z.string(),
        challengeAnalysis: zod_1.z.string(),
        executionTime: zod_1.z.number(),
        contextoTotal: zod_1.z.number(),
        refinementAttempts: zod_1.z.number(),
        empresaContext: empresaContextSchema,
    }),
    execute: async ({ inputData }) => {
        const startTime = Date.now();
        const { licitacaoId, empresaId = 'EMPRESA_GENERICA', empresaContext, refinementAttempts = 0 } = inputData;
        console.log(`🚀 Executando agentes especialistas - Tentativa ${refinementAttempts + 1}`);
        // Preparar contexto da empresa para os prompts
        const empresaInfo = empresaContext ? {
            nome: empresaContext.nome,
            descricao: empresaContext.descricao,
            porte: empresaContext.porte,
            produtos: empresaContext.produtos.join(', ') || 'Não especificados',
            servicos: empresaContext.servicos.join(', ') || 'Não especificados',
            cidade: empresaContext.cidade,
            responsavel: empresaContext.responsavel_legal
        } : null;
        console.log(`🏢 Contexto da empresa: ${empresaInfo ? `${empresaInfo.nome} (${empresaContext?.produtos.length} produtos, ${empresaContext?.servicos.length} serviços)` : 'Não disponível'}`);
        try {
            // Executar todos os agentes em paralelo com contexto enriquecido
            const [scopeResult, timelineResult, eligibilityResult, riskResult, challengeResult] = await Promise.all([
                // ScopeAgent - Análise de escopo contextualizada
                scopeAgent_1.scopeAgent.generate(empresaInfo ? `
CONTEXTO DA EMPRESA:
• Nome: ${empresaInfo.nome}
• Descrição: ${empresaInfo.descricao}
• Porte: ${empresaInfo.porte}
• Produtos: ${empresaInfo.produtos}
• Serviços: ${empresaInfo.servicos}
• Localização: ${empresaInfo.cidade}

TAREFA: Analise detalhadamente o objeto e escopo da licitação ${licitacaoId}.
Verifique ESPECIFICAMENTE o alinhamento com os produtos/serviços da empresa.
Identifique oportunidades e incompatibilidades com o perfil empresarial.
Seja preciso e completo na análise considerando as capacidades da empresa.
        ` : `Analise detalhadamente o objeto e escopo da licitação ${licitacaoId}. Seja preciso e completo na análise.`),
                // TimelineAgent - Timeline considerando porte da empresa
                timelineAgent_1.timelineAgent.generate(empresaInfo ? `
CONTEXTO DA EMPRESA:
• Nome: ${empresaInfo.nome}
• Porte: ${empresaInfo.porte}
• Responsável: ${empresaInfo.responsavel}

TAREFA: Extraia todos os prazos e eventos críticos da licitação ${licitacaoId}.
Construa uma timeline acionável considerando o porte ${empresaInfo.porte} da empresa.
Destaque prazos críticos que podem ser desafiadores para empresa de porte ${empresaInfo.porte}.
        ` : `Extraia todos os prazos e eventos críticos da licitação ${licitacaoId}. Construa uma timeline acionável.`),
                // EligibilityAgent - Requisitos vs perfil da empresa
                eligibilityAgent_1.eligibilityAgent.generate(empresaInfo ? `
CONTEXTO DA EMPRESA:
• Nome: ${empresaInfo.nome}
• Porte: ${empresaInfo.porte}
• Produtos: ${empresaInfo.produtos}
• Serviços: ${empresaInfo.servicos}
• Cidade: ${empresaInfo.cidade}

TAREFA: Analise todos os requisitos de elegibilidade da licitação ${licitacaoId}.
Crie checklist ESPECÍFICO considerando:
- Compatibilidade com porte ${empresaInfo.porte}
- Adequação aos produtos/serviços oferecidos
- Requisitos geográficos vs localização em ${empresaInfo.cidade}
Identifique possíveis obstáculos para esta empresa específica.
        ` : `Analise todos os requisitos de elegibilidade e qualificação da licitação ${licitacaoId}. Crie checklist completo.`),
                // RiskAgent - Riscos proporcionais ao porte
                riskAgent_1.riskAgent.generate(empresaInfo ? `
CONTEXTO DA EMPRESA:
• Nome: ${empresaInfo.nome}
• Porte: ${empresaInfo.porte}
• Descrição: ${empresaInfo.descricao}
• Produtos: ${empresaInfo.produtos}
• Serviços: ${empresaInfo.servicos}

TAREFA: Analise riscos contratuais da licitação ${licitacaoId} ESPECIFICAMENTE para esta empresa.
Quantifique impactos financeiros proporcionais ao porte ${empresaInfo.porte}.
Avalie riscos específicos considerando:
- Capacidade operacional do porte ${empresaInfo.porte}
- Compatibilidade com produtos/serviços oferecidos
- Riscos técnicos baseados na descrição da empresa
Seja específico nos valores e percentuais de risco.
        ` : `Analise riscos contratuais da licitação ${licitacaoId} para empresa ${empresaId}. Quantifique impactos financeiros.`),
                // ChallengeAgent - Impugnações baseadas no perfil
                challengeAgent_1.challengeAgent.generate(empresaInfo ? `
CONTEXTO DA EMPRESA:
• Nome: ${empresaInfo.nome}
• Porte: ${empresaInfo.porte}
• Produtos: ${empresaInfo.produtos}
• Serviços: ${empresaInfo.servicos}
• Descrição: ${empresaInfo.descricao}

TAREFA: Identifique pontos para impugnação da licitação ${licitacaoId} que beneficiem esta empresa específica.
Foque em aspectos que favoreçam:
- Empresas de porte ${empresaInfo.porte}
- Fornecedores dos produtos/serviços: ${empresaInfo.produtos} | ${empresaInfo.servicos}
Fundamente legalmente cada sugestão de impugnação.
        ` : `Identifique pontos para impugnação e esclarecimentos da licitação ${licitacaoId}. Fundamente legalmente.`)
            ]);
            const scopeAnalysis = scopeResult.text || "Análise de escopo não disponível";
            const timelineAnalysis = timelineResult.text || "Análise de prazos não disponível";
            const eligibilityAnalysis = eligibilityResult.text || "Análise de elegibilidade não disponível";
            const riskAnalysis = riskResult.text || "Análise de riscos não disponível";
            const challengeAnalysis = challengeResult.text || "Análise de impugnações não disponível";
            const executionTime = Date.now() - startTime;
            const contextoTotal = scopeAnalysis.length + timelineAnalysis.length + eligibilityAnalysis.length + riskAnalysis.length + challengeAnalysis.length;
            console.log(`✅ Todos os agentes executados em ${executionTime}ms - Contexto: ${contextoTotal} chars`);
            return {
                scopeAnalysis,
                timelineAnalysis,
                eligibilityAnalysis,
                riskAnalysis,
                challengeAnalysis,
                executionTime,
                contextoTotal,
                refinementAttempts: refinementAttempts + 1,
                empresaContext // Passar contexto para próximo step
            };
        }
        catch (error) {
            console.error('❌ Erro na execução dos agentes:', error);
            return {
                scopeAnalysis: "Erro na análise de escopo",
                timelineAnalysis: "Erro na análise de prazos",
                eligibilityAnalysis: "Erro na análise de elegibilidade",
                riskAnalysis: "Erro na análise de riscos",
                challengeAnalysis: "Erro na análise de impugnações",
                executionTime: Date.now() - startTime,
                contextoTotal: 0,
                refinementAttempts: refinementAttempts + 1,
                empresaContext // Passar contexto mesmo em caso de erro
            };
        }
    }
});
// Step 2: Controle de qualidade
const qualityControlStep = (0, workflows_1.createStep)({
    id: "quality-control",
    description: "Avalia qualidade das análises usando agente especializado",
    inputSchema: zod_1.z.object({
        scopeAnalysis: zod_1.z.string(),
        timelineAnalysis: zod_1.z.string(),
        eligibilityAnalysis: zod_1.z.string(),
        riskAnalysis: zod_1.z.string(),
        challengeAnalysis: zod_1.z.string(),
        executionTime: zod_1.z.number(),
        contextoTotal: zod_1.z.number(),
        refinementAttempts: zod_1.z.number(),
        empresaContext: empresaContextSchema,
    }),
    outputSchema: zod_1.z.object({
        qualityScore: zod_1.z.number().min(0).max(100),
        isApproved: zod_1.z.boolean(),
        shouldRetry: zod_1.z.boolean(),
        qualityFeedback: zod_1.z.string(),
        scopeAnalysis: zod_1.z.string(),
        timelineAnalysis: zod_1.z.string(),
        eligibilityAnalysis: zod_1.z.string(),
        riskAnalysis: zod_1.z.string(),
        challengeAnalysis: zod_1.z.string(),
        executionTime: zod_1.z.number(),
        contextoTotal: zod_1.z.number(),
        refinementAttempts: zod_1.z.number(),
        empresaContext: empresaContextSchema,
    }),
    execute: async ({ inputData }) => {
        const { scopeAnalysis, timelineAnalysis, eligibilityAnalysis, riskAnalysis, challengeAnalysis, executionTime, contextoTotal, refinementAttempts, empresaContext } = inputData;
        console.log(`🔍 Executando controle de qualidade - Tentativa ${refinementAttempts}`);
        try {
            // Preparar contexto enriquecido para análise de qualidade
            const empresaInfo = empresaContext ? `
CONTEXTO DA EMPRESA ANALISADA:
• Nome: ${empresaContext.nome}
• Descrição: ${empresaContext.descricao}
• Porte: ${empresaContext.porte}
• Produtos: ${empresaContext.produtos.join(', ') || 'Não especificados'}
• Serviços: ${empresaContext.servicos.join(', ') || 'Não especificados'}
• Localização: ${empresaContext.cidade}

` : 'CONTEXTO DA EMPRESA: Não disponível\n\n';
            const qualityContext = `${empresaInfo}ANÁLISES PARA AVALIAÇÃO DE QUALIDADE:

## ANÁLISE DE ESCOPO (ScopeAgent)
${scopeAnalysis}

## ANÁLISE DE PRAZOS (TimelineAgent) 
${timelineAnalysis}

## ANÁLISE DE ELEGIBILIDADE (EligibilityAgent)
${eligibilityAnalysis}

## ANÁLISE DE RISCOS (RiskAgent)
${riskAnalysis}

## ANÁLISE DE IMPUGNAÇÕES (ChallengeAgent)
${challengeAnalysis}

---

CRITÉRIOS DE AVALIAÇÃO ESPECÍFICOS:
1. **Contextualização**: As análises consideram adequadamente o perfil da empresa (porte, produtos/serviços)?
2. **Especificidade**: As recomendações são específicas para esta empresa ou genéricas?
3. **Completude**: Todas as seções estão completas e detalhadas?
4. **Precisão**: As análises são técnicas e fundamentadas?
5. **Acionabilidade**: As recomendações são práticas e implementáveis?

AVALIE a qualidade de cada análise segundo estes critérios especializados.
${empresaContext ? `Considere ESPECIALMENTE se as análises foram personalizadas para uma empresa de porte ${empresaContext.porte} que atua com ${empresaContext.produtos.join(', ')} e ${empresaContext.servicos.join(', ')}.` : ''}

Forneça um SCORE TOTAL de 0-100 e indique se está aprovada (score >= 75).
      `;
            // Executar agente de controle de qualidade
            const qualityResult = await qualityControlAgent_1.qualityControlAgent.generate(qualityContext);
            const qualityFeedback = qualityResult.text || "Avaliação de qualidade não disponível";
            // Parser para extrair score da análise
            let qualityScore = 50; // Score padrão conservador
            const scoreMatch = qualityFeedback.match(/SCORE TOTAL[:\s]*(\d+)\/100/i);
            if (scoreMatch) {
                qualityScore = parseInt(scoreMatch[1]);
            }
            else {
                // Fallback: análise simples de completude
                const analysisLengths = [
                    scopeAnalysis.length,
                    timelineAnalysis.length,
                    eligibilityAnalysis.length,
                    riskAnalysis.length,
                    challengeAnalysis.length
                ];
                const avgLength = analysisLengths.reduce((a, b) => a + b, 0) / analysisLengths.length;
                qualityScore = Math.min(100, Math.max(20, (avgLength / 100) * 2)); // Score baseado em tamanho
            }
            const isApproved = qualityScore >= 75;
            const shouldRetry = !isApproved && refinementAttempts < 2; // Máximo 2 tentativas
            console.log(`📊 Score de qualidade: ${qualityScore}/100`);
            console.log(`🎯 Status: ${isApproved ? '✅ Aprovado' : shouldRetry ? '🔄 Precisa refinamento' : '⚠️ Finalizando com limitações'}`);
            return {
                qualityScore,
                isApproved,
                shouldRetry,
                qualityFeedback,
                scopeAnalysis,
                timelineAnalysis,
                eligibilityAnalysis,
                riskAnalysis,
                challengeAnalysis,
                executionTime,
                contextoTotal,
                refinementAttempts,
                empresaContext
            };
        }
        catch (error) {
            console.error('❌ Erro no controle de qualidade:', error);
            return {
                qualityScore: 40,
                isApproved: false,
                shouldRetry: false,
                qualityFeedback: `Erro na avaliação de qualidade: ${error}`,
                scopeAnalysis,
                timelineAnalysis,
                eligibilityAnalysis,
                riskAnalysis,
                challengeAnalysis,
                executionTime,
                contextoTotal,
                refinementAttempts,
                empresaContext
            };
        }
    }
});
// Step 3: Compilação do relatório final
const compileFinalReportStep = (0, workflows_1.createStep)({
    id: "compile-final-report",
    description: "Compila relatório técnico final baseado nas análises validadas",
    inputSchema: zod_1.z.object({
        qualityScore: zod_1.z.number(),
        isApproved: zod_1.z.boolean(),
        shouldRetry: zod_1.z.boolean(),
        qualityFeedback: zod_1.z.string(),
        scopeAnalysis: zod_1.z.string(),
        timelineAnalysis: zod_1.z.string(),
        eligibilityAnalysis: zod_1.z.string(),
        riskAnalysis: zod_1.z.string(),
        challengeAnalysis: zod_1.z.string(),
        executionTime: zod_1.z.number(),
        contextoTotal: zod_1.z.number(),
        refinementAttempts: zod_1.z.number(),
        empresaContext: empresaContextSchema,
    }),
    outputSchema: editalAnalysisOutputSchema,
    execute: async ({ inputData }) => {
        const { qualityScore, isApproved, scopeAnalysis, timelineAnalysis, eligibilityAnalysis, riskAnalysis, challengeAnalysis, executionTime, contextoTotal, refinementAttempts } = inputData;
        console.log(`📝 Compilando relatório técnico final - Score: ${qualityScore}/100`);
        const relatorioCompleto = `
# RELATÓRIO TÉCNICO DE ANÁLISE DE EDITAL

**Data:** ${new Date().toLocaleString('pt-BR')}  
**Score de Qualidade:** ${qualityScore}/100  
**Status:** ${isApproved ? '✅ ANÁLISE APROVADA' : '⚠️ ANÁLISE COM LIMITAÇÕES'}  
**Tentativas de Refinamento:** ${refinementAttempts}  
**Tempo de Execução:** ${executionTime}ms  
**Contexto Processado:** ${contextoTotal.toLocaleString()} caracteres

---

## 🎯 RESUMO EXECUTIVO

${isApproved ?
            'A análise foi concluída com sucesso e aprovada pelo sistema de controle de qualidade. Todos os aspectos críticos do edital foram analisados pelos agentes especialistas.' :
            'A análise foi concluída mas apresenta limitações identificadas pelo controle de qualidade. Recomenda-se cautela na tomada de decisões.'}

---

## 📋 ANÁLISE DE OBJETO E ESCOPO

${scopeAnalysis}

---

## ⏰ PRAZOS E EVENTOS CRÍTICOS

${timelineAnalysis}

---

## ✅ ELEGIBILIDADE E QUALIFICAÇÃO

${eligibilityAnalysis}

---

## ⚠️ ANÁLISE DE RISCOS CONTRATUAIS

${riskAnalysis}

---

## 🎯 IMPUGNAÇÕES E ESCLARECIMENTOS

${challengeAnalysis}

---

## 📈 MÉTRICAS DE EXECUÇÃO

- **Agentes Especialistas Executados:** 5
- **Tentativas de Refinamento:** ${refinementAttempts}
- **Tempo Total de Processamento:** ${executionTime}ms
- **Volume de Contexto Analisado:** ${contextoTotal.toLocaleString()} caracteres
- **Score de Qualidade Final:** ${qualityScore}/100

---

## 🏁 RECOMENDAÇÕES FINAIS

${isApproved ?
            'Com base na análise completa e aprovada, recomenda-se prosseguir com a avaliação detalhada da participação nesta licitação, seguindo as orientações específicas de cada seção.' :
            'Devido às limitações identificadas na análise, recomenda-se revisão manual adicional e consulta especializada antes de decisões definitivas sobre a participação.'}

---

*Relatório gerado pelo Sistema Autônomo de Agentes Especialistas da Alicit*  
*Sistema de Controle de Qualidade Automatizado v2.0*  
*Primeira consultoria de licitações públicas automatizada por IA do mundo*
    `.trim();
        // Definir recomendações baseadas na qualidade
        const recommendations = [];
        if (isApproved) {
            recommendations.push("Participar do processo licitatório seguindo orientações específicas");
            recommendations.push("Revisar documentos de habilitação conforme checklist detalhado");
            recommendations.push("Implementar estratégias de mitigação de riscos identificados");
            recommendations.push("Considerar elaboração de esclarecimentos/impugnações sugeridas");
        }
        else {
            recommendations.push("Realizar revisão manual especializada complementar");
            recommendations.push("Coletar informações adicionais sobre pontos identificados como incompletos");
            recommendations.push("Considerar nova análise com documentação mais completa do edital");
            recommendations.push("Consultar especialistas jurídicos/técnicos antes da decisão final");
        }
        const status = isApproved ? "completed" : "incomplete";
        console.log(`🎉 Relatório compilado com sucesso - Status: ${status}`);
        return {
            relatorioCompleto,
            qualityScore,
            status,
            isComplete: isApproved,
            recommendations,
            executionMetadata: {
                totalAgentsExecuted: 5,
                totalTimeMs: executionTime,
                contextoProcessado: contextoTotal,
                refinementAttempts
            }
        };
    }
});
// Workflow Orquestrador Autônomo - Versão Simplificada
exports.editalAnalysisWorkflow = (0, workflows_1.createWorkflow)({
    id: "editalAnalysisWorkflow",
    description: "Workflow orquestrador autônomo com controle de qualidade integrado",
    inputSchema: editalAnalysisInputSchema,
    outputSchema: editalAnalysisOutputSchema,
})
    // Executa todos os agentes especialistas em paralelo
    .then(executeSpecialistAgentsStep)
    // Avalia qualidade usando agente especializado
    .then(qualityControlStep)
    // Decide se deve tentar refinamento ou compilar relatório final
    .branch([
    // Condição: qualidade insuficiente E ainda pode tentar refinamento
    [
        async ({ inputData }) => {
            return inputData.shouldRetry === true;
        },
        // Re-executa o workflow com tentativa incrementada
        (0, workflows_1.createStep)({
            id: "retry-analysis",
            description: "Re-executa análise com tentativa incrementada",
            inputSchema: zod_1.z.object({
                qualityScore: zod_1.z.number(),
                isApproved: zod_1.z.boolean(),
                shouldRetry: zod_1.z.boolean(),
                qualityFeedback: zod_1.z.string(),
                scopeAnalysis: zod_1.z.string(),
                timelineAnalysis: zod_1.z.string(),
                eligibilityAnalysis: zod_1.z.string(),
                riskAnalysis: zod_1.z.string(),
                challengeAnalysis: zod_1.z.string(),
                executionTime: zod_1.z.number(),
                contextoTotal: zod_1.z.number(),
                refinementAttempts: zod_1.z.number(),
                empresaContext: empresaContextSchema,
            }),
            outputSchema: editalAnalysisOutputSchema,
            execute: async ({ inputData, mastra }) => {
                console.log(`🔄 Iniciando refinamento - Tentativa ${inputData.refinementAttempts + 1}`);
                // Re-executar workflow com refinementAttempts incrementado
                const workflow = mastra?.getWorkflow('editalAnalysisWorkflow');
                if (workflow) {
                    const newRun = await workflow.createRunAsync();
                    const result = await newRun.start({
                        inputData: {
                            licitacaoId: 'retry', // TODO: Passar licitacaoId correto
                            empresaId: 'EMPRESA_GENERICA', // TODO: Passar empresaId correto
                            refinementAttempts: inputData.refinementAttempts
                        }
                    });
                    if (result.status === 'success' && result.result) {
                        return result.result;
                    }
                }
                // Fallback: compilar com dados atuais se não conseguir re-executar
                return {
                    relatorioCompleto: `Erro no refinamento - compilando com dados atuais\n\n${inputData.qualityFeedback}`,
                    qualityScore: inputData.qualityScore,
                    status: "incomplete",
                    isComplete: false,
                    recommendations: ["Revisão manual necessária devido a erro no refinamento"],
                    executionMetadata: {
                        totalAgentsExecuted: 5,
                        totalTimeMs: inputData.executionTime,
                        contextoProcessado: inputData.contextoTotal,
                        refinementAttempts: inputData.refinementAttempts + 1
                    }
                };
            }
        })
    ],
    // Condição padrão: compilar relatório final com dados atuais
    [
        async () => true,
        compileFinalReportStep
    ]
])
    .commit();
