"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditalAnalysisService = void 0;
const RAGService_1 = require("./RAGService");
const hooks_1 = require("./hooks");
// import { mastra } from "../../mastra"; // Temporariamente removido para compatibilidade Vercel serverless
const sequential_1 = require("../../mastra/agents/sequential");
const empresaRepository_1 = __importDefault(require("../../repositories/empresaRepository"));
const relatorioStorageService_1 = require("./relatorioStorageService");
class EditalAnalysisService {
    constructor() {
        this.ragService = new RAGService_1.EditalRAGService();
        this.relatoriosService = new relatorioStorageService_1.RelatorioStorageService();
    }
    async initialize() {
        await this.ragService.initialize();
    }
    /**
     * Busca e formata contexto da empresa para enriquecer análise dos agentes
     */
    async getEmpresaContext(empresaCNPJ) {
        if (!empresaCNPJ) {
            console.log('⚠️ CNPJ não fornecido - continuando sem contexto específico');
            return null;
        }
        try {
            console.log(`🔍 Buscando contexto da empresa por CNPJ: ${empresaCNPJ}`);
            const empresa = await empresaRepository_1.default.getEmpresaByCnpj(empresaCNPJ);
            if (!empresa) {
                console.log(`❌ Empresa não encontrada: ${empresaCNPJ}`);
                return null;
            }
            const context = {
                nome: empresa.nome || 'Não informado',
                cnpj: empresa.cnpj || empresaCNPJ,
                porte: empresa.porte || "Médio",
                segmento: empresa.segmento || 'Não informado',
                produtos: empresa.empresa_produtos?.map((p) => p.produto) || [],
                servicos: empresa.empresa_servicos?.map((s) => s.servico) || [],
                localizacao: empresa.cidade || 'Não informado',
                capacidadeOperacional: empresa.capacidade_operacional || 'Não informado',
                documentosDisponiveis: {}
            };
            console.log(`✅ Contexto da empresa obtido: ${context.nome} (${context.porte})`);
            console.log(`📦 Produtos: ${context.produtos.length} | Serviços: ${context.servicos.length}`);
            return context;
        }
        catch (error) {
            console.error(`❌ Erro ao buscar contexto da empresa ${empresaCNPJ}:`, error);
            return null;
        }
    }
    async analyzeEdital(request) {
        try {
            console.log('🚀 INÍCIO - analyzeEdital');
            console.log('🚀 Request:', JSON.stringify(request));
            // Garantir que RAGService está inicializado com Pinecone
            await this.ragService.initialize();
            console.log('🔄 Processando RAG...');
            const ragResult = await this.ragService.processEdital(request);
            console.log('✅ RAG processado com sucesso!');
            console.log('✅ RAG resultado:', JSON.stringify({
                licitacaoId: ragResult.licitacaoId,
                processed: ragResult.processed,
                documentsCount: ragResult.documentsCount,
                chunksCount: ragResult.chunksCount
            }));
            console.log('✅ RAG processado, buscando contexto da empresa...');
            // Buscar contexto da empresa para enriquecer análise dos agentes
            const empresaContext = await this.getEmpresaContext(request.empresaCNPJ);
            if (empresaContext) {
                console.log('📊 DADOS DA EMPRESA COMPLETOS:');
                console.log('  Nome:', empresaContext.nome || 'N/A');
                console.log('  CNPJ:', empresaContext.cnpj || 'N/A');
                console.log('  Porte:', empresaContext.porte || 'N/A');
                console.log('  Segmento:', empresaContext.segmento || 'N/A');
                console.log('  Produtos:', empresaContext.produtos?.length || 0, 'items:', empresaContext.produtos || []);
                console.log('  Serviços:', empresaContext.servicos?.length || 0, 'items:', empresaContext.servicos || []);
                console.log('  Localização:', empresaContext.localizacao || 'N/A');
                console.log('  Capacidade Operacional:', empresaContext.capacidadeOperacional || 'N/A');
                console.log('  Documentos Disponíveis:', empresaContext.documentosDisponiveis ? Object.keys(empresaContext.documentosDisponiveis).length + ' tipos' : 'Nenhum');
            }
            else {
                console.log('⚠️ EMPRESA CONTEXT É NULL - usando contexto padrão');
            }
            console.log('✅ Contexto obtido, iniciando workflow...');
            let workflowResult;
            let workflowError = null;
            try {
                console.log('🔄 Executando análise sequencial com agentes individuais...');
                const threadId = `licitacao_${request.licitacaoId}`;
                const resourceId = request.empresaCNPJ || 'default-empresa';
                // Executar agente estratégico
                console.log('🎯 Executando análise de aderência estratégica...');
                const strategicResult = await sequential_1.sequentialAgents.strategicFitAgent.generate(`Analise a aderência estratégica da licitação ${request.licitacaoId} com nossa empresa.`, { threadId, resourceId });
                const strategicScore = extractScoreFromText(strategicResult.text || "");
                console.log(`📊 Score estratégico: ${strategicScore}/100`);
                let finalReport = `# ANÁLISE DE LICITAÇÃO - ${request.licitacaoId}

## RESUMO EXECUTIVO
- **Licitação ID:** ${request.licitacaoId}
- **Data da Análise:** ${new Date().toLocaleString('pt-BR')}
- **Empresa:** ${empresaContext?.nome || 'Empresa não identificada'}

## 1. ANÁLISE DE ADERÊNCIA ESTRATÉGICA
${strategicResult.text || 'Análise não disponível'}

**Score Aderência:** ${strategicScore}/100
`;
                if (strategicScore >= 60) {
                    // Executar agente operacional
                    console.log('⚙️ Executando análise operacional...');
                    const operationalResult = await sequential_1.sequentialAgents.operationalAgent.generate(`Analise a capacidade operacional para executar a licitação ${request.licitacaoId}.`, { threadId, resourceId });
                    const operationalScore = extractScoreFromText(operationalResult.text || "");
                    console.log(`📊 Score operacional: ${operationalScore}/100`);
                    finalReport += `

## 2. ANÁLISE OPERACIONAL
${operationalResult.text || 'Análise não disponível'}

**Score Operacional:** ${operationalScore}/100
`;
                    if (operationalScore >= 50) {
                        // Executar agente jurídico
                        console.log('⚖️ Executando análise jurídico-documental...');
                        const legalResult = await sequential_1.sequentialAgents.legalDocAgent.generate(`Analise os aspectos jurídico-documentais da licitação ${request.licitacaoId}.`, { threadId, resourceId });
                        const legalScore = extractScoreFromText(legalResult.text || "");
                        console.log(`📊 Score jurídico: ${legalScore}/100`);
                        finalReport += `

## 3. ANÁLISE JURÍDICO-DOCUMENTAL
${legalResult.text || 'Análise não disponível'}

**Score Jurídico:** ${legalScore}/100
`;
                        if (legalScore >= 40) {
                            // Executar agente financeiro
                            console.log('💰 Executando análise financeira...');
                            const financialResult = await sequential_1.sequentialAgents.financialAgent.generate(`Faça a análise financeira consolidada da licitação ${request.licitacaoId}.`, { threadId, resourceId });
                            const financialScore = extractScoreFromText(financialResult.text || "");
                            console.log(`📊 Score financeiro: ${financialScore}/100`);
                            finalReport += `

## 4. ANÁLISE FINANCEIRA
${financialResult.text || 'Análise não disponível'}

**Score Financeiro:** ${financialScore}/100

## SÍNTESE FINAL
**Scores Obtidos:**
- Aderência Estratégica: ${strategicScore}/100 (30%)
- Capacidade Operacional: ${operationalScore}/100 (25%)
- Situação Jurídica: ${legalScore}/100 (20%)
- Atratividade Financeira: ${financialScore}/100 (25%)

**Score Consolidado:** ${Math.round(strategicScore * 0.3 + operationalScore * 0.25 + legalScore * 0.2 + financialScore * 0.25)}/100

**RECOMENDAÇÃO:** ${Math.round(strategicScore * 0.3 + operationalScore * 0.25 + legalScore * 0.2 + financialScore * 0.25) >= 70 ? '✅ PARTICIPAR' : '❌ NÃO PARTICIPAR'}
`;
                        }
                        else {
                            finalReport += `

**WORKFLOW PARADO:** Análise jurídica insuficiente (Score: ${legalScore}/100)
**RECOMENDAÇÃO:** ❌ NÃO PARTICIPAR - Problemas documentais críticos
`;
                        }
                    }
                    else {
                        finalReport += `

**WORKFLOW PARADO:** Capacidade operacional insuficiente (Score: ${operationalScore}/100)
**RECOMENDAÇÃO:** ❌ NÃO PARTICIPAR - Falta de capacidade operacional
`;
                    }
                }
                else {
                    finalReport += `

**WORKFLOW PARADO:** Aderência estratégica insuficiente (Score: ${strategicScore}/100)
**RECOMENDAÇÃO:** ❌ NÃO PARTICIPAR - Não alinhado com core business
`;
                }
                workflowResult = {
                    status: 'success',
                    result: {
                        finalReport,
                        status: 'completed',
                        validationScore: strategicScore
                    }
                };
                console.log('✅ Análise sequencial executada com sucesso!');
            }
            catch (workflowErr) {
                console.error('❌ ERRO NO WORKFLOW:', workflowErr);
                console.error('❌ ERRO STACK:', workflowErr.stack);
                workflowError = workflowErr.message || 'Erro desconhecido no workflow';
                // Criar workflowResult falso para continuar
                workflowResult = {
                    status: 'error',
                    result: null
                };
            }
            let finalReport;
            let status;
            let validationScore = 0;
            // DEBUG: Analisar estrutura do workflowResult
            console.log('🔍 DEBUG workflowResult STATUS:', workflowResult.status);
            console.log('🔍 DEBUG workflowResult.steps keys:', Object.keys(workflowResult.steps || {}));
            console.log('🔍 DEBUG workflowResult.result:', workflowResult.status ? 'EXISTS' : 'NOT EXISTS');
            if (workflowError) {
                console.log('🔍 DEBUG workflow teve erro:', workflowError);
                finalReport = `RELATÓRIO DE ANÁLISE TÉCNICA - ERRO NO WORKFLOW\n\nLicitação: ${request.licitacaoId}\nEmpresa: ${request.empresaId}\n\nStatus: Erro na execução do workflow\nErro: ${workflowError}\nDocumentos processados: ${ragResult.documentsCount}\n\nO sistema RAG processou os documentos com sucesso, mas o workflow de análise falhou. Verifique a configuração do Mastra.`;
                status = 'error';
            }
            else if (workflowResult.status === 'success') {
                // O resultado do workflow está em workflowResult.result['compile-final-report']
                const workflowOutput = workflowResult.result?.['compile-final-report'] || workflowResult.result;
                console.log('🔍 DEBUG workflowOutput keys:', workflowOutput ? Object.keys(workflowOutput) : 'workflowOutput is null/undefined');
                console.log('🔍 DEBUG workflowOutput full:', JSON.stringify(workflowOutput, null, 2));
                finalReport = workflowOutput?.relatorioCompleto || workflowOutput?.finalReport || 'Relatório não gerado pelo workflow';
                status = workflowOutput?.status || 'completed';
                validationScore = workflowOutput?.qualityScore || workflowOutput?.validationScore || 0;
                // VALIDAÇÃO CRÍTICA - garantir que finalReport não é undefined/null/empty
                if (!finalReport || finalReport.trim().length === 0) {
                    finalReport = `RELATÓRIO DE ANÁLISE TÉCNICA\n\nLicitação: ${request.licitacaoId}\nEmpresa: ${request.empresaId}\n\nStatus: Análise processada com sucesso\nDocumentos processados: ${ragResult.documentsCount}\n\nObservação: O workflow foi executado mas não retornou conteúdo detalhado. Verifique a configuração dos agentes.`;
                    console.warn('⚠️ Workflow não retornou finalReport, usando fallback');
                }
                console.log('🔍 DEBUG FINAL extracted values:');
                console.log('  - finalReport length:', finalReport.length);
                console.log('  - finalReport preview:', finalReport.substring(0, 200) + '...');
                console.log('  - status:', status);
                console.log('  - validationScore:', validationScore);
            }
            else {
                console.log('🔍 DEBUG workflow failed with status:', workflowResult.status);
                console.log('🔍 DEBUG workflow error details:', JSON.stringify(workflowResult, null, 2));
                finalReport = `RELATÓRIO DE ANÁLISE TÉCNICA - FALHA\n\nLicitação: ${request.licitacaoId}\nEmpresa: ${request.empresaId}\n\nStatus: Workflow retornou status de falha\nDetalhes: ${workflowResult.status}\nDocumentos processados: ${ragResult.documentsCount}\n\nEm caso de dúvidas, entre em contato com o suporte técnico.`;
                status = 'error';
            }
            console.log('📄 Preparando dados para PDF...');
            console.log('📄 finalReport length:', finalReport?.length || 0);
            console.log('📄 finalReport type:', typeof finalReport);
            const technicalSummary = (0, hooks_1.extractTechnicalSummary)(finalReport);
            const impugnacaoAnalysis = (0, hooks_1.extractImpugnacaoAnalysis)(finalReport);
            console.log('📄 technicalSummary length:', technicalSummary?.length || 0);
            console.log('📄 impugnacaoAnalysis length:', impugnacaoAnalysis?.length || 0);
            const pdfData = {
                licitacaoId: request.licitacaoId,
                empresa: request.empresaCNPJ,
                dataAnalise: new Date().toLocaleString('pt-BR'),
                finalReport,
                technicalSummary,
                impugnacaoAnalysis,
                documentsAnalyzed: ragResult.documentsCount,
                totalCharacters: 0
            };
            console.log('📄 Gerando PDF com dados:', JSON.stringify({
                licitacaoId: pdfData.licitacaoId,
                empresa: pdfData.empresa,
                finalReportLength: pdfData.finalReport?.length || 0,
                technicalSummaryLength: pdfData.technicalSummary?.length || 0,
                impugnacaoAnalysisLength: pdfData.impugnacaoAnalysis?.length || 0
            }));
            const { pdfPath, dadosPdf } = await (0, hooks_1.generatePDFReport)(pdfData);
            // Salvar relatório no Supabase Storage se empresaCNPJ fornecido
            if (request.empresaCNPJ) {
                try {
                    await this.relatoriosService.salvarRelatorio(request.empresaCNPJ, request.licitacaoId, pdfPath, relatorioStorageService_1.TipoRelatorio.ANALISE_COMPLETA, {
                        qualityScore: validationScore,
                        processedAt: new Date().toISOString(),
                        documentsAnalyzed: ragResult.documentsCount,
                        totalCharacters: finalReport?.length || 0
                    }, dadosPdf);
                    console.log('✅ Relatório salvo no Supabase Storage com dados estruturados');
                }
                catch (storageError) {
                    console.error('⚠️ Erro ao salvar relatório no storage:', storageError);
                }
            }
            return {
                status: status,
                licitacaoId: request.licitacaoId,
                processedAt: new Date().toISOString(),
                pdfPath,
                technicalSummary: (0, hooks_1.extractTechnicalSummary)(finalReport),
                impugnacaoAnalysis: (0, hooks_1.extractImpugnacaoAnalysis)(finalReport),
                finalReport,
                validationScore,
            };
        }
        catch (error) {
            console.error('❌ ERRO CRÍTICO em analyzeEdital:', error);
            console.error('❌ ERRO STACK:', error.stack);
            console.error('❌ ERRO TYPE:', typeof error);
            console.error('❌ ERRO MESSAGE:', error.message);
            console.error('❌ ERRO DETAILS:', JSON.stringify(error, null, 2));
            return {
                licitacaoId: request.licitacaoId,
                technicalSummary: "",
                impugnacaoAnalysis: "",
                finalReport: `Erro no processamento: ${error}`,
                status: "error",
                processedAt: new Date().toISOString(),
                validationScore: 0,
            };
        }
    }
    async queryEdital(licitacaoId, query, topK = 10) {
        return await this.ragService.queryEdital(licitacaoId, query, topK);
    }
    async isEditalProcessed(licitacaoId) {
        return await this.ragService.isEditalProcessed(licitacaoId);
    }
}
exports.EditalAnalysisService = EditalAnalysisService;
/**
 * Helper function to extract score from agent response text
 */
function extractScoreFromText(text) {
    const scoreMatches = text.match(/(?:SCORE|Score)[\s:]+(\d+)(?:\/100)?/gi);
    if (scoreMatches && scoreMatches.length > 0) {
        const lastMatch = scoreMatches[scoreMatches.length - 1];
        const scoreNumber = lastMatch.match(/(\d+)/);
        if (scoreNumber) {
            return Math.min(100, Math.max(0, parseInt(scoreNumber[1])));
        }
    }
    // Fallback: estimate score based on text length and content
    return Math.max(0, Math.min(100, Math.round(text.length / 50)));
}
