import { EditalRAGService, EditalAnalysisRequest } from "./RAGService";
import { 
  generatePDFReport, 
  extractTechnicalSummary, 
  extractImpugnacaoAnalysis 
} from "./hooks";
import { mastra } from "../../mastra";
import empresaRepository from "../../repositories/empresaRepository";
import { RelatorioStorageService, TipoRelatorio } from "./relatorioStorageService";

export interface EditalAnalysisReport {
  licitacaoId: string;
  technicalSummary: string;
  impugnacaoAnalysis: string;
  finalReport: string;
  status: "processing" | "completed" | "error";
  processedAt: string;
  pdfPath?: string;
  validationScore: number;
}

export interface EmpresaContext {
  nome: string;
  cnpj: string;
  porte: "Pequeno" | "Médio" | "Grande";
  segmento: string;
  produtos: string[];
  servicos: string[];
  localizacao: string;
  capacidadeOperacional: string;
  documentosDisponiveis?: Record<string, any>;
}

export class EditalAnalysisService {
  private ragService: EditalRAGService;
  private relatoriosService: RelatorioStorageService;

  constructor() {
    this.ragService = new EditalRAGService();
    this.relatoriosService = new RelatorioStorageService();
  }

  async initialize(): Promise<void> {
    await this.ragService.initialize();
  }

  /**
   * Busca e formata contexto da empresa para enriquecer análise dos agentes
   */
  private async getEmpresaContext(empresaCNPJ?: string): Promise<EmpresaContext | null> {
    if (!empresaCNPJ) {
      console.log('⚠️ CNPJ não fornecido - continuando sem contexto específico');
      return null;
    }

    try {
      console.log(`🔍 Buscando contexto da empresa por CNPJ: ${empresaCNPJ}`);
      const empresa = await empresaRepository.getEmpresaByCnpj(empresaCNPJ);
      
      if (!empresa) {
        console.log(`❌ Empresa não encontrada: ${empresaCNPJ}`);
        return null;
      }
      
      const context: EmpresaContext = {
        nome: empresa.nome || 'Não informado',
        cnpj: empresa.cnpj || empresaCNPJ,
        porte: (empresa.porte as "Pequeno" | "Médio" | "Grande") || "Médio",
        segmento: empresa.segmento || 'Não informado',
        produtos: empresa.empresa_produtos?.map((p: any) => p.produto) || [],
        servicos: empresa.empresa_servicos?.map((s: any) => s.servico) || [],
        localizacao: empresa.cidade || 'Não informado',
        capacidadeOperacional: empresa.capacidade_operacional || 'Não informado',
        documentosDisponiveis: {}
      };

      console.log(`✅ Contexto da empresa obtido: ${context.nome} (${context.porte})`);
      console.log(`📦 Produtos: ${context.produtos.length} | Serviços: ${context.servicos.length}`);
      
      return context;
    } catch (error) {
      console.error(`❌ Erro ao buscar contexto da empresa ${empresaCNPJ}:`, error);
      return null;
    }
  }

  async analyzeEdital(request: EditalAnalysisRequest): Promise<EditalAnalysisReport> {
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
      } else {
        console.log('⚠️ EMPRESA CONTEXT É NULL - usando contexto padrão');
      }
      
      console.log('✅ Contexto obtido, iniciando workflow...');
      
      let workflowResult: any;
      let workflowError: string | null = null;
      
      try {
        console.log('🔄 Obtendo workflow sequentialAnalysisWorkflow...');
        const workflow = mastra.getWorkflow('sequentialAnalysisWorkflow'); 
        console.log('✅ Workflow obtido, criando run...');
        
        const run = await workflow.createRunAsync();
        console.log('✅ Run criado, iniciando execução...');
        
        const inputData = { 
          licitacaoId: request.licitacaoId, 
          empresaId: request.empresaCNPJ || 'default-empresa', 
          empresaContext: empresaContext || undefined
        };
        console.log('📥 InputData:', JSON.stringify({
          licitacaoId: inputData.licitacaoId,
          empresaId: inputData.empresaId,
          empresaContext: empresaContext ? `${empresaContext.nome} (${empresaContext.produtos.length} produtos, ${empresaContext.servicos.length} serviços)` : 'null',
        }));
        
        workflowResult = await run.start({ inputData });
        console.log('✅ Workflow do Mastra executado com sucesso!');
        
      } catch (workflowErr: any) {
        console.error('❌ ERRO NO WORKFLOW:', workflowErr);
        console.error('❌ ERRO STACK:', workflowErr.stack);
        workflowError = workflowErr.message || 'Erro desconhecido no workflow';
        
        // Criar workflowResult falso para continuar
        workflowResult = {
          status: 'error',
          result: null
        };
      }

      let finalReport: string;
      let status: string;
      let validationScore: number = 0;
      
      // DEBUG: Analisar estrutura do workflowResult
      console.log('🔍 DEBUG workflowResult STATUS:', workflowResult.status);
      console.log('🔍 DEBUG workflowResult.steps keys:', Object.keys(workflowResult.steps || {}));
      console.log('🔍 DEBUG workflowResult.result:', workflowResult.status? 'EXISTS' : 'NOT EXISTS');
      
      if (workflowError) {
        console.log('🔍 DEBUG workflow teve erro:', workflowError);
        finalReport = `RELATÓRIO DE ANÁLISE TÉCNICA - ERRO NO WORKFLOW\n\nLicitação: ${request.licitacaoId}\nEmpresa: ${request.empresaId}\n\nStatus: Erro na execução do workflow\nErro: ${workflowError}\nDocumentos processados: ${ragResult.documentsCount}\n\nO sistema RAG processou os documentos com sucesso, mas o workflow de análise falhou. Verifique a configuração do Mastra.`;
        status = 'error';
      } else if (workflowResult.status === 'success') {
        // O resultado do workflow está em workflowResult.result['compile-final-report']
        const workflowOutput = (workflowResult.result as any)?.['compile-final-report'] || workflowResult.result;
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
        
      } else {
        console.log('🔍 DEBUG workflow failed with status:', workflowResult.status);
        console.log('🔍 DEBUG workflow error details:', JSON.stringify(workflowResult, null, 2));
        finalReport = `RELATÓRIO DE ANÁLISE TÉCNICA - FALHA\n\nLicitação: ${request.licitacaoId}\nEmpresa: ${request.empresaId}\n\nStatus: Workflow retornou status de falha\nDetalhes: ${workflowResult.status}\nDocumentos processados: ${ragResult.documentsCount}\n\nEm caso de dúvidas, entre em contato com o suporte técnico.`;
        status = 'error';
      }

      console.log('📄 Preparando dados para PDF...');
      console.log('📄 finalReport length:', finalReport?.length || 0);
      console.log('📄 finalReport type:', typeof finalReport);
      
      const technicalSummary = extractTechnicalSummary(finalReport);
      const impugnacaoAnalysis = extractImpugnacaoAnalysis(finalReport);
      
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
      
      const { pdfPath, dadosPdf } = await generatePDFReport(pdfData);

      // Salvar relatório no Supabase Storage se empresaCNPJ fornecido
      if (request.empresaCNPJ) {
        try {
          await this.relatoriosService.salvarRelatorio(
            request.empresaCNPJ,
            request.licitacaoId,
            pdfPath,
            TipoRelatorio.ANALISE_COMPLETA,
            {
              qualityScore: validationScore,
              processedAt: new Date().toISOString(),
              documentsAnalyzed: ragResult.documentsCount,
              totalCharacters: finalReport?.length || 0
            },
            dadosPdf
          );
          console.log('✅ Relatório salvo no Supabase Storage com dados estruturados');
        } catch (storageError) {
          console.error('⚠️ Erro ao salvar relatório no storage:', storageError);
        }
      }

      return {
        status: status as "completed" | "error",
        licitacaoId: request.licitacaoId,
        processedAt: new Date().toISOString(),
        pdfPath,
        technicalSummary: extractTechnicalSummary(finalReport),
        impugnacaoAnalysis: extractImpugnacaoAnalysis(finalReport),
        finalReport,
        validationScore,
      };

    } catch (error: any) {
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

  async queryEdital(licitacaoId: string, query: string, topK: number = 10): Promise<string[]> {
    return await this.ragService.queryEdital(licitacaoId, query, topK);
  }

  async isEditalProcessed(licitacaoId: string): Promise<boolean> {
    return await this.ragService.isEditalProcessed(licitacaoId);
  }
}