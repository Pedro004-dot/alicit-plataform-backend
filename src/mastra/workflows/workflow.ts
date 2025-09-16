import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { strategicFitAgent } from "../agents/sequential/strategicFitAgent";
import { operationalAgent } from "../agents/sequential/operationalAgent";
import { legalDocAgent } from "../agents/sequential/legalDocAgent";
import { RuntimeContext } from "@mastra/core/di";

// Schema de entrada do workflow
const workflowInputSchema = z.object({
  licitacaoId: z.string(),
  empresaId: z.string(),
  empresaContext: z.object({
    nome: z.string(),
    cnpj: z.string(),
    porte: z.enum(["Pequeno", "Médio", "Grande"]),
    segmento: z.string(),
    produtos: z.array(z.string()),
    servicos: z.array(z.string()),
    localizacao: z.string(),
    capacidadeOperacional: z.string(),
    faturamento: z.number().optional(),
    capitalSocial: z.number().optional(),
    certificacoes: z.array(z.object({
      nome: z.string(),
      descricao: z.string().optional(),
      dataVencimento: z.string().optional(),
      status: z.string().optional(),
    })),
    documentosDisponiveis: z.record(z.any()).optional(),
  }).optional(),
});

// Schema de saída do workflow - Estrutura compatível com analysisService (3 AGENTES)
const workflowOutputSchema = z.object({
  strategicDecision: z.enum(["PROSSEGUIR", "NAO_PROSSEGUIR"]),
  strategicScore: z.number().min(0).max(100),
  operationalDecision: z.enum(["PROSSEGUIR", "NAO_PROSSEGUIR"]).optional(),
  operationalScore: z.number().min(0).max(100).optional(),
  legalDecision: z.enum(["PROSSEGUIR", "NAO_PROSSEGUIR"]).optional(), // ✅ LEGAL FIELDS
  legalScore: z.number().min(0).max(100).optional(), // ✅ LEGAL FIELDS
  finalDecision: z.enum(["PROSSEGUIR", "NAO_PROSSEGUIR"]),
  consolidatedScore: z.number().min(0).max(100),
  analysis: z.object({
    strategic: z.string(),
    operational: z.string().optional(),
    legal: z.string().optional(), // ✅ LEGAL ANALYSIS
    executive: z.string(),
  }),
});

// ✅ AGENTS STEPS - Usando agents direto como steps com RuntimeContext para RAG
const strategicStep = createStep(strategicFitAgent);

// ✅ STEP PARA FINALIZAR QUANDO STRATEGIC NAO_PROSSEGUIR
const strategicStopStep = createStep({
  id: "strategic-stop",
  inputSchema: z.object({
    strategicDecision: z.enum(["PROSSEGUIR", "NAO_PROSSEGUIR"]),
    strategicScore: z.number(),
    shouldContinue: z.boolean(),
    licitacaoId: z.string(),
    empresaId: z.string(),
    empresaContext: z.any()
  }),
  outputSchema: workflowOutputSchema,
  execute: async ({ inputData }) => {
    console.log('🛑 [WORKFLOW] Strategic decidiu NAO_PROSSEGUIR - finalizando workflow');
    
    const { strategicDecision, strategicScore } = inputData;
    
    return {
      strategicDecision: strategicDecision as "PROSSEGUIR" | "NAO_PROSSEGUIR",
      strategicScore,
      finalDecision: "NAO_PROSSEGUIR" as "PROSSEGUIR" | "NAO_PROSSEGUIR",
      consolidatedScore: strategicScore,
      analysis: {
        strategic: `Análise estratégica: ${strategicDecision} (Score: ${strategicScore}/100)`,
        executive: `Análise interrompida na fase estratégica. Score: ${strategicScore}/100. Decisão: NAO_PROSSEGUIR. Motivo: Baixa aderência estratégica identificada.`
      }
    };
  }
});

// Schema intermediário simplificado - apenas dados essenciais
const intermediateDataSchema = z.object({
  strategicDecision: z.enum(["PROSSEGUIR", "NAO_PROSSEGUIR"]),
  strategicScore: z.number(),
  operationalDecision: z.enum(["PROSSEGUIR", "NAO_PROSSEGUIR"]).optional(),
  operationalScore: z.number().optional(),
  shouldContinue: z.boolean(),
  licitacaoId: z.string(),
  empresaId: z.string(),
  empresaContext: z.any()
});

// ✅ STEP PARA OPERATIONAL COMPLETO (USANDO RUNTIME CONTEXT GLOBAL - PADRÃO MASTRA)
const operationalCompleteStep = createStep({
  id: "operational-complete",
  inputSchema: z.object({
    strategicDecision: z.enum(["PROSSEGUIR", "NAO_PROSSEGUIR"]),
    strategicScore: z.number(),
    shouldContinue: z.boolean(),
    licitacaoId: z.string(),
    empresaId: z.string(),
    empresaContext: z.any()
  }),
  outputSchema: intermediateDataSchema,
  execute: async ({ inputData, runtimeContext }) => {
    
    
    // ✅ BUSCAR DADOS DIRETAMENTE DO INPUT DATA (PADRÃO MASTRA OFICIAL)
    const { licitacaoId, empresaId, empresaContext, strategicDecision, strategicScore } = inputData;
    
    // Prompt para análise operacional - simplificado
    const operationalPrompt = `Analise a viabilidade operacional da licitação ${licitacaoId} para a empresa ${empresaContext?.nome || 'N/A'}.
    
    CONTEXTO: Análise estratégica aprovada (Score: ${strategicScore}/100).
    
    Dados da empresa:
    - Nome: ${empresaContext?.nome || 'N/A'}  
    - CNPJ: ${empresaContext?.cnpj || 'N/A'}
    - Porte: ${empresaContext?.porte || 'N/A'}

    IMPORTANTE: Use a tool RAG para consultar informações específicas sobre prazos, cronograma e requisitos operacionais desta licitação (${licitacaoId}).`;
    
    // ✅ CRIAR RUNTIME CONTEXT PARA RAG TOOL (PADRÃO MASTRA OFICIAL)
    const agentRuntimeContext = new RuntimeContext();
    agentRuntimeContext.set('licitacaoId', licitacaoId);
    
  
    const operationalResult = await operationalAgent.generate([
      { role: 'user', content: operationalPrompt }
    ], { runtimeContext: agentRuntimeContext });
    
    console.log('🎯 [OPERATIONAL] Resposta recebida:', operationalResult.text);
    
    // Extrair dados do operational agent
    const text = operationalResult.text || JSON.stringify(operationalResult);
    
    // Regex para extrair score operacional
    const scoreMatch = text.match(/\*\*SCORE OPERACIONAL:\*\*\s*(\d+)/i) || 
                      text.match(/score[:\s]*(\d+)/i) ||
                      text.match(/(\d+)\/100/);
    const operationalScore = scoreMatch ? parseInt(scoreMatch[1]) : 75;
    
    // Regex para extrair decisão operacional
    const decisionMatch = text.match(/\*\*DECISÃO:\*\*\s*(NAO_PROSSEGUIR|PROSSEGUIR)/i) ||
                         text.match(/decisão[:\s]*(não prosseguir|nao prosseguir|prosseguir)/i);
    
    let operationalDecision: "PROSSEGUIR" | "NAO_PROSSEGUIR" = "NAO_PROSSEGUIR";
    if (decisionMatch) {
      const captured = decisionMatch[1].toLowerCase();
      if (captured.includes('nao') || captured.includes('não')) {
        operationalDecision = "NAO_PROSSEGUIR";
      } else if (captured.includes('prosseguir')) {
        operationalDecision = "PROSSEGUIR";
      }
    }
    
    
    
    // ✅ RESULTADO SIMPLIFICADO - SEM ANÁLISES DETALHADAS
    return {
      strategicDecision: strategicDecision as "PROSSEGUIR" | "NAO_PROSSEGUIR",
      strategicScore,
      operationalDecision: operationalDecision as "PROSSEGUIR" | "NAO_PROSSEGUIR",
      operationalScore, 
      shouldContinue: operationalDecision === "PROSSEGUIR",
      // ✅ DADOS ORIGINAIS PARA PRÓXIMO STEP
      licitacaoId,
      empresaId,
      empresaContext
    };
  }
});

// ✅ STEP PARA PARAR NO OPERATIONAL (FINALIZAR COM 2 AGENTES)
const operationalStopStep = createStep({
  id: "operational-stop",
  inputSchema: intermediateDataSchema,
  outputSchema: workflowOutputSchema,
  execute: async ({ inputData }) => {
  
    
    // ✅ Acessar dados essenciais apenas
    const strategicDecision = inputData.strategicDecision;
    const strategicScore = inputData.strategicScore;
    
    // ✅ Dados operacionais
    const operationalDecision = inputData.operationalDecision;
    const operationalScore = inputData.operationalScore;
    
    // ✅ Garantir que os dados operacionais existem
    const safeOperationalDecision = operationalDecision || "NAO_PROSSEGUIR";
    const safeOperationalScore = operationalScore || 0;
    const consolidatedScore = Math.round((strategicScore + safeOperationalScore) / 2);
    
    const executiveSummary = `ANÁLISE INTERROMPIDA NA FASE OPERACIONAL

Strategic Score: ${strategicScore}/100 - ${strategicDecision}
Operational Score: ${safeOperationalScore}/100 - ${safeOperationalDecision}
Score Consolidado: ${consolidatedScore}/100
Decisão Final: NAO_PROSSEGUIR

🛑 RECOMENDAÇÃO: Empresa NÃO deve prosseguir. Inviabilidade operacional identificada antes da análise jurídica.`;
    
    return {
      strategicDecision: strategicDecision as "PROSSEGUIR" | "NAO_PROSSEGUIR",
      strategicScore,
      operationalDecision: safeOperationalDecision as "PROSSEGUIR" | "NAO_PROSSEGUIR",
      operationalScore: safeOperationalScore,
      finalDecision: "NAO_PROSSEGUIR" as "PROSSEGUIR" | "NAO_PROSSEGUIR",
      consolidatedScore,
      analysis: {
        strategic: `Análise estratégica: ${strategicDecision} (Score: ${strategicScore}/100)`,
        operational: `Análise operacional: ${safeOperationalDecision} (Score: ${safeOperationalScore}/100)`,
        executive: executiveSummary
      }
    };
  }
});

// ✅ STEP PARA LEGAL COMPLETO (ANÁLISE JURÍDICO-DOCUMENTAL)
const legalCompleteStep = createStep({
  id: "legal-complete",
  inputSchema: intermediateDataSchema,
  outputSchema: workflowOutputSchema,
  execute: async ({ inputData }) => {
    
    
    // ✅ BUSCAR DADOS ESSENCIAIS APENAS (SEM ANÁLISES DETALHADAS)
    const { 
      licitacaoId, empresaId, empresaContext, 
      strategicDecision, strategicScore,
      operationalDecision, operationalScore
    } = inputData;
    
    // ✅ Garantir que os dados operacionais existem
    const safeOperationalDecision = operationalDecision || "NAO_PROSSEGUIR";
    const safeOperationalScore = operationalScore || 0;
    

    // Prompt para análise jurídico-documental - simplificado
    const legalPrompt = `Analise os requisitos de habilitação e riscos jurídicos da licitação ${licitacaoId} para a empresa ${empresaContext?.nome || 'N/A'}.
    
    CONTEXTO:
    - Análise estratégica: ${strategicDecision} (Score: ${strategicScore}/100)
    - Análise operacional: ${safeOperationalDecision} (Score: ${safeOperationalScore}/100)
    
    Dados da empresa:
    - Nome: ${empresaContext?.nome || 'N/A'}  
    IMPORTANTE: Use a tool RAG para consultar informações específicas sobre documentos de habilitação desta licitação (${licitacaoId}).`;
    
    // ✅ CRIAR RUNTIME CONTEXT PARA RAG TOOL (PADRÃO MASTRA OFICIAL)
    const agentRuntimeContext = new RuntimeContext();
    agentRuntimeContext.set('licitacaoId', licitacaoId);
    agentRuntimeContext.set('empresaContext', empresaContext);
    
    const legalResult = await legalDocAgent.generate([
      { role: 'user', content: legalPrompt }
    ], { runtimeContext: agentRuntimeContext });
    
    console.log('⚖️ [LEGAL] Resposta recebida:', legalResult.text);
    
    // Extrair dados do legal agent
    const text = legalResult.text || JSON.stringify(legalResult);
    
    // Regex para extrair score jurídico
    const scoreMatch = text.match(/\*\*SCORE JURÍDICO:\*\*\s*(\d+)/i) || 
                      text.match(/score[:\s]*(\d+)/i) ||
                      text.match(/(\d+)\/100/);
    const legalScore = scoreMatch ? parseInt(scoreMatch[1]) : 60;
    
    // Regex para extrair decisão legal
    const decisionMatch = text.match(/\*\*DECISÃO:\*\*\s*(NAO_PROSSEGUIR|PROSSEGUIR)/i) ||
                         text.match(/decisão[:\s]*(não prosseguir|nao prosseguir|prosseguir)/i);
    
    let legalDecision: "PROSSEGUIR" | "NAO_PROSSEGUIR" = "NAO_PROSSEGUIR";
    if (decisionMatch) {
      const captured = decisionMatch[1].toLowerCase();
      if (captured.includes('nao') || captured.includes('não')) {
        legalDecision = "NAO_PROSSEGUIR";
      } else if (captured.includes('prosseguir')) {
        legalDecision = "PROSSEGUIR";
      }
    }
    
   
    
    // ✅ RESULTADO FINAL CONSOLIDADO (3 AGENTES: STRATEGIC + OPERATIONAL + LEGAL)
    const consolidatedScore = Math.round((strategicScore + safeOperationalScore + legalScore) / 3);
    const finalDecision = legalDecision; // Legal tem palavra final sobre compliance
    
    const executiveSummary = `ANÁLISE JURÍDICO-DOCUMENTAL EXECUTADA

Strategic Score: ${strategicScore}/100 - ${strategicDecision}
Operational Score: ${safeOperationalScore}/100 - ${safeOperationalDecision}
Legal Score: ${legalScore}/100 - ${legalDecision}
Score Consolidado: ${consolidatedScore}/100
Decisão Final: ${finalDecision}

${finalDecision === "PROSSEGUIR" ? "✅ RECOMENDAÇÃO: Empresa deve prosseguir com a licitação. Todos os requisitos legais atendidos." : "🛑 RECOMENDAÇÃO: Empresa NÃO deve prosseguir. Riscos jurídicos ou documentação insuficiente identificados."}`;
    
    return {
      strategicDecision: strategicDecision as "PROSSEGUIR" | "NAO_PROSSEGUIR",
      strategicScore,
      operationalDecision: safeOperationalDecision as "PROSSEGUIR" | "NAO_PROSSEGUIR",
      operationalScore: safeOperationalScore,
      legalDecision: legalDecision as "PROSSEGUIR" | "NAO_PROSSEGUIR",
      legalScore,
      finalDecision: finalDecision as "PROSSEGUIR" | "NAO_PROSSEGUIR",
      consolidatedScore,
      analysis: {
        strategic: `Análise estratégica: ${strategicDecision} (Score: ${strategicScore}/100)`,
        operational: `Análise operacional: ${safeOperationalDecision} (Score: ${safeOperationalScore}/100)`,
        legal: text,
        executive: executiveSummary
      }
    };
  }
});

// const legalStopStep = createStep({
//   id: "legal-stop",
//   inputSchema: intermediateDataSchema,
//   outputSchema: workflowOutputSchema,
//   execute: async ({ inputData }) => {
//     const strategicDecision = inputData.strategicDecision;
//     const strategicScore = inputData.strategicScore;
    
//     // ✅ Dados operacionais
//     const operationalDecision = inputData.operationalDecision;
//     const operationalScore = inputData.operationalScore;
    
//     // const legalDecision = inputData.legalDecision;
//     // const legalScore = inputData.legalScore;

// //     const safeLegalDecision = legalDecision || "NAO_PROSSEGUIR";
// //     const safeLegalScore = legalScore || 0;
// //     const consolidatedScore = Math.round((strategicScore + operationalScore+ safeLegalScore) / 3);
    
// //     const executiveSummary = `ANÁLISE INTERROMPIDA NA FASE OPERACIONAL

// // Strategic Score: ${strategicScore}/100 - ${strategicDecision}
// // Operational Score: ${safeOperationalScore}/100 - ${safeOperationalDecision}
// // Score Consolidado: ${consolidatedScore}/100
// // Decisão Final: NAO_PROSSEGUIR

// // 🛑 RECOMENDAÇÃO: Empresa NÃO deve prosseguir. Inviabilidade operacional identificada antes da análise jurídica.`;
    
// //     return {
// //       strategicDecision: strategicDecision as "PROSSEGUIR" | "NAO_PROSSEGUIR",
// //       strategicScore,
// //       operationalDecision: safeOperationalDecision as "PROSSEGUIR" | "NAO_PROSSEGUIR",
// //       operationalScore: safeOperationalScore,
// //       finalDecision: "NAO_PROSSEGUIR" as "PROSSEGUIR" | "NAO_PROSSEGUIR",
// //       consolidatedScore,
// //       analysis: {
// //         strategic: `Análise estratégica: ${strategicDecision} (Score: ${strategicScore}/100)`,
// //         operational: `Análise operacional: ${safeOperationalDecision} (Score: ${safeOperationalScore}/100)`,
// //         executive: executiveSummary
// //       }
// //     };
// return inputData;
//   }
// });

// const financeCompleteStep = createStep({
//   id: "finance-complete",
//   inputSchema: intermediateDataSchema,
//   outputSchema: workflowOutputSchema,
//   execute: async ({ inputData }) => {
//     return inputData;
//   }
// });

export const workflow = createWorkflow({
  id: "triple-agent-workflow", 
  description: "Análise estratégica, operacional e jurídico-documental completa de licitações com RAG",
  inputSchema: workflowInputSchema,
  outputSchema: workflowOutputSchema,
})
  .map(async ({ inputData }) => {

    
    const { licitacaoId, empresaId, empresaContext } = inputData;
    
    // ✅ CRIAR RUNTIME CONTEXT GLOBAL COM TODOS OS DADOS (PADRÃO MASTRA)
    const runtimeContext = new RuntimeContext();
    runtimeContext.set('licitacaoId', licitacaoId);
    runtimeContext.set('empresaId', empresaId);
    runtimeContext.set('empresaContext', empresaContext);
    
 
    // Prompt para análise estratégica
    const strategicPrompt = `Analise a aderência estratégica entre a empresa ${empresaContext?.nome || 'N/A'} e a licitação ${licitacaoId}.

        Dados da empresa:
        - Nome: ${empresaContext?.nome || 'N/A'}  
        - CNPJ: ${empresaContext?.cnpj || 'N/A'}
        - Porte: ${empresaContext?.porte || 'N/A'}
        - Segmento: ${empresaContext?.segmento || 'N/A'}
        - Produtos: ${empresaContext?.produtos?.slice(0, 5).join(', ') || 'N/A'}
        - Serviços: ${empresaContext?.servicos?.slice(0, 3).join(', ') || 'N/A'}
        - Localização: ${empresaContext?.localizacao || 'N/A'}

        IMPORTANTE: Use a tool RAG para consultar informações específicas sobre esta licitação (${licitacaoId}) antes de fazer sua análise.`;


    return {
      prompt: strategicPrompt,
      runtimeContext: runtimeContext
    };
  })
  .then(strategicStep)
  .map(async ({ inputData, getInitData }:any) => {

    
    // ✅ BUSCAR DADOS ORIGINAIS DO WORKFLOW (PADRÃO MASTRA OFICIAL)
    const originalData = getInitData();

    // Extrair score, decisão e análise da resposta do agent
    const text = typeof inputData === 'string' ? inputData : (inputData as any)?.text || JSON.stringify(inputData);
    
    // Regex para extrair score
    const scoreMatch = text.match(/\*\*SCORE DE ADEQUAÇÃO:\*\*\s*(\d+)/i) || 
                      text.match(/score[:\s]*(\d+)/i) ||
                      text.match(/(\d+)\/100/);
    const strategicScore = scoreMatch ? parseInt(scoreMatch[1]) : 75; // Default score
    
    // Regex para extrair decisão - CORRIGIDA para capturar NAO_PROSSEGUIR corretamente
    const decisionMatch = text.match(/\*\*DECISÃO:\*\*\s*(NAO_PROSSEGUIR|PROSSEGUIR)/i) ||
                         text.match(/decisão[:\s]*(não prosseguir|nao prosseguir|prosseguir)/i);
    
    let strategicDecision: "PROSSEGUIR" | "NAO_PROSSEGUIR" = "NAO_PROSSEGUIR"; // Default seguro
    if (decisionMatch) {
      const captured = decisionMatch[1].toLowerCase();
      // Se contém "nao" ou "não", é NAO_PROSSEGUIR
      if (captured.includes('nao') || captured.includes('não')) {
        strategicDecision = "NAO_PROSSEGUIR";
      } else if (captured.includes('prosseguir')) {
        strategicDecision = "PROSSEGUIR";
      }
    }
  
    // ✅ RETORNAR APENAS DADOS ESSENCIAIS (SEM ANÁLISE DETALHADA)
    return {
      strategicDecision,
      strategicScore,
      shouldContinue: strategicDecision === "PROSSEGUIR",
      // ✅ DADOS ORIGINAIS PARA OS PRÓXIMOS STEPS
      licitacaoId: originalData.licitacaoId,
      empresaId: originalData.empresaId,
      empresaContext: originalData.empresaContext
    };
  })
  // ✅ PRIMEIRO BRANCH: Strategic → Operational ou Para
  .branch([
    // ✅ Caso 1: Strategic = NAO_PROSSEGUIR - Para workflow imediatamente
    [
      async ({ inputData: { shouldContinue } }) => !shouldContinue,
      strategicStopStep
    ],
    // ✅ Caso 2: Strategic = PROSSEGUIR - Continua para operational
    [
      async ({ inputData: { shouldContinue } }) => shouldContinue,
      operationalCompleteStep
    ]
  ])
  // ✅ MAP: Transformar dados para compatibilidade com próximo branch
  .map(async ({ inputData }: any) => {
    console.log('🔄 [MAP] Transformando dados para segundo branch...');
    console.log('🔍 [MAP DEBUG] InputData recebido:', JSON.stringify(inputData, null, 2));
    
    // Se é resultado do strategicStopStep (tem finalDecision), passar direto
    if ('finalDecision' in inputData) {
      console.log('📤 [MAP DEBUG] Strategic stop - passando resultado final');
      return inputData;
    }
    
    // ✅ CORREÇÃO: Operational retorna dados aninhados por step ID
    let shouldContinueValue = false;
    
    // Se é resultado do operationalCompleteStep, dados podem estar aninhados
    if (inputData['operational-complete']) {
      console.log('📤 [MAP DEBUG] Acessando operational-complete nested data');
      const operationalData = inputData['operational-complete'];
      shouldContinueValue = operationalData.shouldContinue || false;
      console.log('🔍 [MAP DEBUG] shouldContinue from nested:', shouldContinueValue);
      
      // Achatar dados para compatibilidade com branch
      const result = {
        ...operationalData, // Dados do operational-complete
        shouldContinue: shouldContinueValue
      };
      
      console.log('📤 [MAP DEBUG] Resultado achatado:', {
        shouldContinue: result.shouldContinue,
        operationalDecision: result.operationalDecision,
        hasStrategicData: !!result.strategicDecision
      });
      
      return result;
    }
    
    // Fallback: dados já estão no formato correto
    console.log('📤 [MAP DEBUG] Dados já no formato correto');
    shouldContinueValue = (inputData as any).shouldContinue || false;
    console.log('🔍 [MAP DEBUG] shouldContinue fallback:', shouldContinueValue);
    
    const result = {
      ...inputData,
      shouldContinue: shouldContinueValue
    };
    
    console.log('📤 [MAP DEBUG] Resultado final:', JSON.stringify(result, null, 2));
    return result;
  })
  // ✅ SEGUNDO BRANCH: Se operational NAO_PROSSEGUIR → Para, se PROSSEGUIR → Legal  
  .branch([
    // ✅ Caso 2: Operational = NAO_PROSSEGUIR - Para workflow (CORREÇÃO: inverted logic)
    [
      async ({ inputData }: any) => {
        const hasShould = 'shouldContinue' in inputData;
        const shouldCont = (inputData as any).shouldContinue;
        console.log('🔍 [BRANCH DEBUG] operationalStop condition:', { hasShould, shouldCont, result: hasShould && !shouldCont });
        return hasShould && !shouldCont; // NAO_PROSSEGUIR = shouldContinue: false
      },
      operationalStopStep
    ],
    // ✅ Caso 3: Operational = PROSSEGUIR - Continua para legal (CORREÇÃO: inverted logic)
    [
      async ({ inputData }: any) => {
        const hasShould = 'shouldContinue' in inputData;
        const shouldCont = (inputData as any).shouldContinue;
        console.log('🔍 [BRANCH DEBUG] legalComplete condition:', { hasShould, shouldCont, result: hasShould && shouldCont });
        return hasShould && shouldCont; // PROSSEGUIR = shouldContinue: true
      },
      legalCompleteStep
    ]
  ])
 

  .commit();