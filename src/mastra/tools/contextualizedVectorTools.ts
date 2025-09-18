import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { strategicVectorTool, operationalVectorTool, legalVectorTool, financialVectorTool } from "./vectorQueryTools";
import { RuntimeContext } from "@mastra/core/runtime-context";

/**
 * Extrai informações chave de um documento baseado na query
 */
function extractKeyInfo(document: string, queryText: string): string {
  const query = queryText.toLowerCase();
  const doc = document.toLowerCase();
  
  // Palavras-chave para buscar informações relevantes
  const keywords = [
    'objeto', 'especificação', 'produto', 'serviço', 'medicamento', 'farmaco',
    'quantidade', 'valor', 'preço', 'prazo', 'entrega', 'requisito', 'técnico'
  ];
  
  const sentences = document.split(/[.!?]+/).filter(s => s.trim().length > 20);
  const relevantSentences = sentences.filter(sentence => {
    const lower = sentence.toLowerCase();
    return keywords.some(keyword => 
      lower.includes(keyword) || lower.includes(query.substring(0, 10))
    );
  }).slice(0, 5); // Máximo 5 sentenças relevantes
  
  return relevantSentences.join('. ').substring(0, 2000) + '...';
}

/**
 * Extrai informações chave específicas de dados de licitação
 */
function extractLicitacaoKeyInfo(jsonData: string): string {
  try {
    const data = JSON.parse(jsonData);
    
    // Extrair campos essenciais para análise estratégica
    const keyFields = {
      numeroControlePNCP: data.numeroControlePNCP,
      objetoCompra: data.objetoCompra,
      valorTotal: data.valorTotal,
      modalidadeNome: data.modalidadeNome,
      situacaoCompra: data.situacaoCompra,
      municipio: data.municipio,
      dataAbertura: data.dataAbertura,
      // Extrair itens se houver
      itens: data.itens ? data.itens.slice(0, 3).map((item: any) => ({
        descricao: item.descricao?.substring(0, 200),
        quantidade: item.quantidade,
        valorUnitario: item.valorUnitario
      })) : []
    };
    
    return JSON.stringify(keyFields);
  } catch {
    // Se não for JSON válido, extrair as primeiras 2000 chars
    return jsonData.substring(0, 2000) + '...';
  }
}

/**
 * Tool estratégica contextualizada com filtro por licitação
 * Automaticamente filtra por licitacaoId específico
 */
export const contextualStrategicTool = createTool({
  id: "strategic-licitacao-search",
  description: "Busca informações específicas sobre objeto da licitação, especificações técnicas, produtos e serviços demandados para análise de adequação estratégica",
  inputSchema: z.object({
    queryText: z.string().describe("Texto da query para busca vetorial"),
    licitacaoId: z.string().optional().describe("ID da licitação (opcional, pode vir do runtime context)"),
    topK: z.number().default(3).describe("Número de resultados a retornar (máximo 3 - otimizado para RAG)")
  }),
  execute: async ({ context, runtimeContext: originalRuntimeContext, mastra, tracingContext }) => {
    const { queryText, topK } = context;
    
    // Pegar licitacaoId do input ou do runtime context
    const licitacaoId = context.licitacaoId || originalRuntimeContext?.get('licitacaoId');
    
    if (!licitacaoId) {
      throw new Error('licitacaoId é obrigatório para busca contextualizada');
    }
    
    // Criar novo RuntimeContext com filtro específico
    const runtimeContext = new RuntimeContext();
    
    // Configurar filtro para buscar apenas documentos da licitação específica
    runtimeContext.set('filter', {
      numeroControlePNCP: licitacaoId
    });
    
    runtimeContext.set('topK', Math.min(topK, 3)); // ✅ OTIMIZADO: Máximo 3 resultados conforme Mastra docs
    runtimeContext.set('minScore', 0.75); // ✅ QUALIDADE: Filtrar resultados com baixa similaridade
    
    // Executar a tool original com o contexto filtrado
    const result = await strategicVectorTool.execute({
      context: { queryText, topK },
      runtimeContext,
      mastra,
      tracingContext
    });
    
    // Log do tamanho do resultado
    // const resultText = JSON.stringify(result);
    // console.log(`🔍 [STRATEGIC TOOL] Resultado tamanho:`, {
    //   caracteres: resultText.length,
    //   estimativaTokens: Math.ceil(resultText.length / 4),
    //   relevantContextLength: result.relevantContext?.length || 0,
    //   sourcesCount: result.sources?.length || 0
    // });
    
    // Log do conteúdo para debug
    if (result.sources && result.sources.length > 0) {
      const source = result.sources[0];
      // console.log(`🔍 [STRATEGIC TOOL] Source content preview:`, {
      //   metadataKeys: Object.keys(source.metadata || {}),
      //   documentLength: source.document?.length || 0,
      //   documentPreview: source.document?.substring(0, 200) + '...' || 'N/A'
      // });
    }
    
    // Log do relevantContext
    // console.log(`🔍 [STRATEGIC TOOL] RelevantContext:`, {
    //   type: typeof result.relevantContext,
    //   length: result.relevantContext?.length || 0,
    //   preview: typeof result.relevantContext === 'string' 
    //     ? result.relevantContext.substring(0, 200) + '...' 
    //     : JSON.stringify(result.relevantContext).substring(0, 200) + '...'
    // });
    
    // ✅ OTIMIZAÇÃO RAG: Summarização automática para grandes volumes
    if (result.sources && Array.isArray(result.sources)) {
      // Filtrar sources com scores muito baixos
      result.sources = result.sources.filter((source: any) => {
        const score = source.score || 0;
        return score > 0.7; // Filtrar apenas resultados com alta similaridade
      });
      
      // Limitar a máximo 3 sources por performance
      result.sources = result.sources.slice(0, 3);
      
      // ✅ SUMMARIZAR dados grandes para o agente processar
      result.sources = result.sources.map((source: any) => ({
        ...source,
        document: source.document?.length > 2000 
          ? extractKeyInfo(source.document, queryText)  // Extrair informações chave
          : source.document
      }));
    }
    
    // ✅ SUMMARIZAR relevantContext se for muito grande
    if (Array.isArray(result.relevantContext) && result.relevantContext.length > 0) {
      result.relevantContext = result.relevantContext.map((item: any) => {
        if (item.data && typeof item.data === 'string' && item.data.length > 3000) {
          return {
            ...item,
            data: extractLicitacaoKeyInfo(item.data) // Extrair info chave da licitação
          };
        }
        return item;
      });
    }
    
    // ✅ LOG do tamanho final após otimizações
    const finalResultText = JSON.stringify(result);
    // console.log(`🎯 [STRATEGIC TOOL] Tamanho final otimizado:`, {
    //   caracteresAntes: resultText.length,
    //   caracteresDepois: finalResultText.length,
    //   reducaoPercentual: Math.round(((resultText.length - finalResultText.length) / resultText.length) * 100),
    //   tokensEstimados: Math.ceil(finalResultText.length / 4)
    // });
    
    return result;
  }
});

/**
 * Tool operacional contextualizada com filtro por licitação
 */
export const contextualOperationalTool = createTool({
  id: "operational-licitacao-search", 
  description: "Busca informações sobre prazos de entrega, cronograma de execução, capacidade técnica exigida, recursos necessários e localização de prestação",
  inputSchema: z.object({
    queryText: z.string().describe("Texto da query para busca vetorial"),
    licitacaoId: z.string().optional().describe("ID da licitação (opcional, pode vir do runtime context)"),
    topK: z.number().default(3).describe("Número de resultados a retornar (máximo 3 - otimizado para RAG)")
  }),
  execute: async ({ context, runtimeContext: originalRuntimeContext, mastra, tracingContext }) => {
    const { queryText, topK } = context;
    
    // Pegar licitacaoId do input ou do runtime context
    const licitacaoId = context.licitacaoId || originalRuntimeContext?.get('licitacaoId');
    
    if (!licitacaoId) {
      throw new Error('licitacaoId é obrigatório para busca contextualizada');
    }
    
    const runtimeContext = new RuntimeContext();
    runtimeContext.set('filter', {
      numeroControlePNCP: licitacaoId
    });
    runtimeContext.set('topK', Math.min(topK, 3)); // ✅ OTIMIZADO: Máximo 3 resultados conforme Mastra docs
    runtimeContext.set('minScore', 0.75); // ✅ QUALIDADE: Filtrar resultados com baixa similaridade
    
    const result = await operationalVectorTool.execute({
      context: { queryText, topK },
      runtimeContext,
      mastra,
      tracingContext
    });
  
    
    return result;
  }
});

/**
 * Tool legal contextualizada com filtro por licitação
 */
export const contextualLegalTool = createTool({
  id: "legal-licitacao-search",
  description: "Busca informações sobre documentos de habilitação, certidões exigidas, atestados técnicos, qualificação técnica e regularidade fiscal e jurídica",
  inputSchema: z.object({
    queryText: z.string().describe("Texto da query para busca vetorial"),
    licitacaoId: z.string().optional().describe("ID da licitação (opcional, pode vir do runtime context)"), 
    topK: z.number().default(3).describe("Número de resultados a retornar (máximo 3 - otimizado para RAG)")
  }),
  execute: async ({ context, runtimeContext: originalRuntimeContext, mastra, tracingContext }) => {
    const { queryText, topK } = context;
    
    // Pegar licitacaoId do input ou do runtime context
    const licitacaoId = context.licitacaoId || originalRuntimeContext?.get('licitacaoId');
    
    if (!licitacaoId) {
      throw new Error('licitacaoId é obrigatório para busca contextualizada');
    }
    
    const runtimeContext = new RuntimeContext();
    runtimeContext.set('filter', {
      numeroControlePNCP: licitacaoId
    });
    runtimeContext.set('topK', Math.min(topK, 3)); // ✅ OTIMIZADO: Máximo 3 resultados conforme Mastra docs
    runtimeContext.set('minScore', 0.75); // ✅ QUALIDADE: Filtrar resultados com baixa similaridade
    
    const result = await legalVectorTool.execute({
      context: { queryText, topK },
      runtimeContext,
      mastra,
      tracingContext
    });
    
    // Log do tamanho do resultado
    const resultText = JSON.stringify(result);

    
    return result;
  }
});

/**
 * Tool financeira contextualizada com filtro por licitação
 */
export const contextualFinancialTool = createTool({
  id: "financial-licitacao-search",
  description: "Busca informações sobre valor estimado, preço de referência, condições de pagamento, garantias contratuais, planilha de custos e forma de pagamento",
  inputSchema: z.object({
    queryText: z.string().describe("Texto da query para busca vetorial"),
    licitacaoId: z.string().describe("ID da licitação a ser analisada"),
    topK: z.number().default(3).describe("Número de resultados a retornar (máximo 3 - otimizado para RAG)") 
  }),
  execute: async ({ context, runtimeContext: originalRuntimeContext, mastra, tracingContext }) => {
    const { queryText, topK } = context;
    
    // Pegar licitacaoId do input ou do runtime context
    const licitacaoId = context.licitacaoId || originalRuntimeContext?.get('licitacaoId');
    
    if (!licitacaoId) {
      throw new Error('licitacaoId é obrigatório para busca contextualizada');
    }
    
    const runtimeContext = new RuntimeContext();
    runtimeContext.set('filter', {
      numeroControlePNCP: licitacaoId
    });
    runtimeContext.set('topK', Math.min(topK, 3)); // ✅ OTIMIZADO: Máximo 3 resultados conforme Mastra docs
    runtimeContext.set('minScore', 0.75); // ✅ QUALIDADE: Filtrar resultados com baixa similaridade
    
    const result = await financialVectorTool.execute({
      context: { queryText, topK },
      runtimeContext,
      mastra,
      tracingContext
    });
    
    // Log do tamanho do resultado
    // const resultText = JSON.stringify(result);
    // console.log(`🔍 [FINANCIAL TOOL] Resultado tamanho:`, {
    //   caracteres: resultText.length,
    //   estimativaTokens: Math.ceil(resultText.length / 4),
    //   relevantContextLength: result.relevantContext?.length || 0,
    //   sourcesCount: result.sources?.length || 0
    // });
    
    return result;
  }
});