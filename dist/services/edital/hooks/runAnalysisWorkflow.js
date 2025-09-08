"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAnalysisWorkflow = runAnalysisWorkflow;
const extractReportSections_1 = require("./extractReportSections");
const RAGService_1 = require("../RAGService");
// Build a focused context using RAG queries and apply a hard cap
async function buildRagContext(rag, licitacaoId, queries, topK, maxChars) {
    const pieces = [];
    for (const q of queries) {
        try {
            const chunks = await rag.queryEdital(licitacaoId, q, topK);
            for (const chunk of chunks) {
                if (chunk && pieces.length < topK)
                    pieces.push(chunk);
            }
        }
        catch {
            // ignore individual query failures
        }
    }
    // Deduplicate and join
    const joined = Array.from(new Set(pieces))
        .join('\n\n---\n\n');
    // Hard cap
    if (joined.length > maxChars) {
        return joined.substring(0, maxChars) + '\n\n[... CONTEXTO TRUNCADO ...]';
    }
    return joined;
}
async function collectAISDKText(stream) {
    let text = '';
    for await (const part of stream.fullStream) {
        if (part?.type === 'text-delta' && typeof part.text === 'string') {
            text += part.text;
        }
    }
    return text;
}
async function runAnalysisWorkflow(documentsText, licitacaoId) {
    console.log(`🔧 Executando análise com contexto reduzido via RAG para ${licitacaoId}`);
    const rag = new RAGService_1.EditalRAGService();
    // Queries específicas por agente
    const technicalQueries = [
        'identificação do edital órgão licitante modalidade número data publicação objeto',
        'prazos críticos data abertura horário questionamentos visitas impugnações recursos início execução',
        'habilitação técnica atestados quantitativos mínimos unidades critérios anexo seção',
        'habilitação econômico-financeira índices capital social patrimônio líquido fórmulas',
        'habilitação jurídica fiscal consórcio ME EPP',
        'condições de execução prazos visita técnica equipe SESMT frota equipamentos',
        'análise econômica valor estimado pagamento cronograma documentos medição reajuste',
        'garantias proposta contratual percentual modalidades',
        'regras de disputa modo lances empate ME EPP',
        'penalidades multas rescisão'
    ];
    const impugnacaoQueries = [
        'exigências desproporcionais habilitação técnica quantitativos excessivos',
        'marca ou modelo específico sem justificativa técnica',
        'certificações desnecessárias ou excessivas',
        'prazos insuficientes para proposta',
        'critérios de julgamento discriminatórios',
        'direcionamento fornecedor específico',
        'base legal Lei 8.666/93 Lei 14.133/21 TCU AGU'
    ];
    // Montar contextos reduzidos
    const MAX_CHARS = 12000;
    const TOP_K = 8;
    const technicalContext = await buildRagContext(rag, licitacaoId, technicalQueries, TOP_K, MAX_CHARS);
    const impugnacaoContext = await buildRagContext(rag, licitacaoId, impugnacaoQueries, TOP_K, MAX_CHARS);
    // Fallback: se não houver contexto, usa trecho pequeno do texto original
    const fallback = () => {
        const joined = documentsText.join('\n\n---DOCUMENTO---\n\n');
        return joined.substring(0, Math.min(joined.length, MAX_CHARS));
    };
    const finalTechnicalContext = technicalContext || fallback();
    const finalImpugnacaoContext = impugnacaoContext || fallback();
    try {
        // TEMPORÁRIO: Agentes antigos desabilitados para permitir teste do novo workflow
        // const editalAnalysisAgent = mastra.getAgent('editalAnalysisAgent');
        // const impugnacaoAgent = mastra.getAgent('impugnacaoAgent');
        throw new Error('Hook legado desabilitado - usando novo workflow multi-agente');
        /* CÓDIGO LEGADO COMENTADO
        console.log('🔍 Executando agente de análise técnica (streamVNext + aisdk) com RAG...');
        const technicalStream = await editalAnalysisAgent.streamVNext(
          `Analise o edital abaixo e gere um resumo técnico ESTRUTURADO, transcrevendo fielmente os trechos e citando item/seção/anexo de origem.\n\n${finalTechnicalContext}`,
          { format: 'aisdk' as const }
        );
        const technicalText = await collectAISDKText(technicalStream);
    
        console.log('⚖️ Executando agente de impugnação (streamVNext + aisdk) com RAG...');
        const impugnacaoStream = await impugnacaoAgent.streamVNext(
          `Identifique possíveis vícios para impugnação com base na Lei 8.666/93 e Lei 14.133/21, TCU e AGU. Para cada ponto: base legal, jurisprudência, prazo, chance de sucesso e fundamentação.\n\n${finalImpugnacaoContext}`,
          { format: 'aisdk' as const }
        );
        const impugnacaoText = await collectAISDKText(impugnacaoStream);
        */
        // Return mock data para não quebrar a interface
        const technicalText = 'Hook legado desabilitado';
        const impugnacaoText = 'Hook legado desabilitado';
        const finalReport = `
# Relatório de Análise de Edital

## Resumo Técnico
${technicalText || 'Não foi possível gerar o resumo técnico.'}

## Análise de Impugnação
${impugnacaoText || 'Não foi possível gerar a análise de impugnação.'}
`;
        return {
            finalReport,
            technicalSummary: (0, extractReportSections_1.extractTechnicalSummary)(finalReport),
            impugnacaoAnalysis: (0, extractReportSections_1.extractImpugnacaoAnalysis)(finalReport),
        };
    }
    catch (error) {
        console.error('❌ Erro na execução direta dos agentes:', error);
        return {
            finalReport: `# ERRO NA ANÁLISE\n\nOcorreu um erro ao analisar o edital: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
            technicalSummary: 'Erro na análise.',
            impugnacaoAnalysis: 'Erro na análise.',
        };
    }
}
