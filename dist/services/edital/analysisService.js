"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditalAnalysisService = void 0;
const RAGService_1 = require("./RAGService");
const hooks_1 = require("./hooks");
const mastra_1 = require("../../mastra");
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
    async analyzeEdital(request) {
        try {
            await this.ragService.initialize();
            //processa a licitacao
            const ragResult = await this.ragService.processEdital(request);
            //busca o contexto da empresa
            const empresaContext = await this.getEmpresaContext(request.empresaCNPJ);
            let workflowResult;
            let workflowError = null;
            try {
                //executa o workflow
                const workflow = mastra_1.mastra.getWorkflow('workflow');
                const run = await workflow.createRunAsync();
                const inputData = {
                    licitacaoId: request.licitacaoId,
                    empresaId: request.empresaCNPJ || 'default-empresa',
                    empresaContext: empresaContext || undefined
                };
                // TIMEOUT global para todo o workflow (120 segundos)
                const WORKFLOW_TIMEOUT = 120000;
                let workflowStartTime = Date.now();
                workflowResult = await Promise.race([
                    (async () => {
                        const result = await run.start({ inputData });
                        console.log(`📊 [ANALYSIS SERVICE] Resultado do workflow:`, {
                            decision: result?.decision,
                            consolidatedScore: result?.consolidatedScore,
                            stoppedAt: result?.stoppedAt,
                            hasExecutiveReport: !!result?.executiveReport,
                            executionMetadata: result?.executionMetadata,
                            // ✅ DEBUG: Mostrar resultado completo
                            fullResult: result
                        });
                        return result;
                    })(),
                    new Promise((_, reject) => setTimeout(() => {
                        reject(new Error(`Workflow timeout após ${WORKFLOW_TIMEOUT / 1000} segundos`));
                    }, WORKFLOW_TIMEOUT))
                ]);
                console.log('✅ Workflow do Mastra executado com sucesso!');
                console.log('✅ Resultado do workflow:', {
                    decision: workflowResult?.decision,
                    consolidatedScore: workflowResult?.consolidatedScore,
                    stoppedAt: workflowResult?.stoppedAt
                });
            }
            catch (workflowErr) {
                console.error('❌ ERRO NO WORKFLOW:', workflowErr);
                console.error('❌ ERRO STACK:', workflowErr.stack);
                workflowError = workflowErr.message || 'Erro desconhecido no workflow';
            }
            let finalReport;
            let validationScore = 0;
            // Verificar se o workflow foi bem sucedido
            if (workflowResult && !workflowError) {
                // ✅ CORREÇÃO: Mastra retorna resultado aninhado por step ID
                let actualResult = null;
                // Tentar acessar resultado baseado no step final executado
                if (workflowResult.result) {
                    // Prioridade: legal-complete > operational-complete > operational-stop > strategic-stop
                    if (workflowResult.result['legal-complete']) {
                        actualResult = workflowResult.result['legal-complete'];
                        console.log('✅ [ANALYSIS SERVICE] Resultado encontrado em legal-complete');
                    }
                    else if (workflowResult.result['operational-complete']) {
                        actualResult = workflowResult.result['operational-complete'];
                        console.log('✅ [ANALYSIS SERVICE] Resultado encontrado em operational-complete');
                    }
                    else if (workflowResult.result['operational-stop']) {
                        actualResult = workflowResult.result['operational-stop'];
                        console.log('✅ [ANALYSIS SERVICE] Resultado encontrado em operational-stop');
                    }
                    else if (workflowResult.result['strategic-stop']) {
                        actualResult = workflowResult.result['strategic-stop'];
                        console.log('✅ [ANALYSIS SERVICE] Resultado encontrado em strategic-stop');
                    }
                    // Fallback: tentar acessar diretamente
                    else {
                        actualResult = workflowResult.result;
                        console.log('⚠️ [ANALYSIS SERVICE] Usando resultado direto como fallback');
                    }
                }
                else {
                    actualResult = workflowResult;
                    console.log('⚠️ [ANALYSIS SERVICE] Usando workflowResult direto como fallback');
                }
                console.log('✅ [RESULTADO] Resultado workflow 3-AGENTES CORRETO:', {
                    strategicDecision: actualResult?.strategicDecision,
                    strategicScore: actualResult?.strategicScore,
                    operationalDecision: actualResult?.operationalDecision,
                    operationalScore: actualResult?.operationalScore,
                    legalDecision: actualResult?.legalDecision,
                    legalScore: actualResult?.legalScore,
                    finalDecision: actualResult?.finalDecision,
                    consolidatedScore: actualResult?.consolidatedScore,
                    executiveAnalysisLength: actualResult?.analysis?.executive?.length || 0
                });
                // Relatório com análises estratégica e operacional
                if (actualResult) {
                    finalReport = `RELATÓRIO DE ANÁLISE COMPLETA

Licitação: ${request.licitacaoId}
Empresa: ${request.empresaCNPJ}
Documentos processados: ${ragResult.documentsCount}

=== RESULTADO CONSOLIDADO ===
DECISÃO FINAL: ${actualResult.finalDecision || 'N/A'}
SCORE CONSOLIDADO: ${actualResult.consolidatedScore || 0}/100

=== ANÁLISES DETALHADAS ===

📊 ANÁLISE ESTRATÉGICA (Score: ${actualResult.strategicScore || 0}/100 - ${actualResult.strategicDecision || 'N/A'})
${actualResult.analysis?.strategic || 'N/A'}

${actualResult.operationalDecision ? `
⚙️ ANÁLISE OPERACIONAL (Score: ${actualResult.operationalScore || 0}/100 - ${actualResult.operationalDecision})
${actualResult.analysis?.operational || 'N/A'}
` : '🛑 ANÁLISE OPERACIONAL: Não executada (strategic foi NAO_PROSSEGUIR)'}

${actualResult.legalDecision ? `
⚖️ ANÁLISE JURÍDICO-DOCUMENTAL (Score: ${actualResult.legalScore || 0}/100 - ${actualResult.legalDecision})
${actualResult.analysis?.legal || 'N/A'}
` : '🛑 ANÁLISE LEGAL: Não executada (análise anterior foi NAO_PROSSEGUIR)'}

📋 SUMÁRIO EXECUTIVO
${actualResult.analysis?.executive || 'N/A'}`;
                    validationScore = actualResult.consolidatedScore || 0;
                }
                else {
                    console.log('❌ [ANALYSIS SERVICE] actualResult é null - usando relatório de erro');
                    finalReport = `RELATÓRIO DE ANÁLISE TÉCNICA - ERRO NA EXTRAÇÃO DO RESULTADO

Licitação: ${request.licitacaoId}
Empresa: ${request.empresaCNPJ}

Status: Erro na extração do resultado do workflow
Documentos processados: ${ragResult.documentsCount}

O workflow executou, mas não foi possível extrair o resultado corretamente. Estrutura retornada: ${JSON.stringify(workflowResult, null, 2)}`;
                    validationScore = 0;
                }
            }
            else {
                console.log('❌ [ANALYSIS SERVICE] Workflow falhou, usando relatório de erro');
                finalReport = `RELATÓRIO DE ANÁLISE TÉCNICA - ERRO NO WORKFLOW\n\nLicitação: ${request.licitacaoId}\nEmpresa: ${request.empresaCNPJ}\n\nStatus: Erro na execução do workflow\nErro: ${workflowError}\nDocumentos processados: ${ragResult.documentsCount}\n\nO sistema RAG processou os documentos com sucesso, mas o workflow de análise falhou. Verifique a configuração do Mastra.`;
            }
            const technicalSummary = (0, hooks_1.extractTechnicalSummary)(finalReport);
            const impugnacaoAnalysis = (0, hooks_1.extractImpugnacaoAnalysis)(finalReport);
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
            //gera o pdf
            const { pdfPath, dadosPdf } = await (0, hooks_1.generatePDFReport)(pdfData);
            // salva o pdf no supabase storage
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
                status: "completed",
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
    //busca o contexto da empresa
    async getEmpresaContext(empresaCNPJ) {
        if (!empresaCNPJ) {
            console.log('⚠️ CNPJ não fornecido - continuando sem contexto específico');
            return null;
        }
        try {
            const empresa = await empresaRepository_1.default.getEmpresaByCnpj(empresaCNPJ);
            if (!empresa) {
                console.log(`❌ Empresa não encontrada: ${empresaCNPJ}`);
                return null;
            }
            // Processar certificações/documentos
            const certificacoes = empresa.empresa_documentos?.map((doc) => ({
                nome: doc.nome_documento,
                descricao: doc.descricao || '',
                dataVencimento: doc.data_vencimento ? new Date(doc.data_vencimento).toLocaleDateString('pt-BR') : undefined,
                status: doc.status_documento || 'pendente'
            })) || [];
            const context = {
                nome: empresa.nome || 'Não informado',
                cnpj: empresa.cnpj || empresaCNPJ,
                porte: empresa.porte || "Médio",
                segmento: empresa.segmento || 'Não informado',
                produtos: empresa.empresa_produtos?.map((p) => p.produto) || [],
                servicos: empresa.empresa_servicos?.map((s) => s.servico) || [],
                localizacao: empresa.cidade || 'Não informado',
                capacidadeOperacional: empresa.capacidade_operacional || 'Não informado',
                // Novos campos financeiros
                faturamento: empresa.faturamento || undefined,
                capitalSocial: empresa.capitalSocial || undefined,
                // Certificações/documentos
                certificacoes,
                documentosDisponiveis: {}
            };
            return context;
        }
        catch (error) {
            console.error(`❌ Erro ao buscar contexto da empresa ${empresaCNPJ}:`, error);
            return null;
        }
    }
}
exports.EditalAnalysisService = EditalAnalysisService;
