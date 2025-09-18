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

// Interface para dados de entrada do workflow
export interface WorkflowInputData {
  licitacaoId: string;
  empresaId: string;
  empresaContext?: EmpresaContext;
}

export interface EmpresaContext {
  // Dados Básicos
  nome: string;
  cnpj: string;
  razaoSocial?: string;
  porte: "Pequeno" | "Médio" | "Grande";
  descricao?: string;
  
  // Core Business
  produtos: string[];
  servicos: string[];
  palavrasChave?: string;
  produtoServico?: string;
  
  // Localização
  localizacao: string;
  endereco?: string;
  raioDistancia?: number;
  
  // ✅ DADOS FINANCEIROS ESTRUTURADOS
  financeiro?: {
    faturamento?: number;
    faturamentoMensal?: number;
    capitalSocial?: number;
    capitalGiroDisponivel?: number;
    margemLucroMedia?: number;
    capacidadeSeguroGarantia?: number;
    experienciaLicitacoesAnos?: number;
    numeroLicitacoesVencidas?: number;
    numeroLicitacoesParticipadas?: number;
  };
  
  // ✅ CAPACIDADES OPERACIONAIS/TÉCNICAS
  capacidades?: {
    capacidadeProducaoMensal?: number;
    numeroFuncionarios?: number;
    certificacoes?: any[];
    alcanceGeografico?: string[];
    setoresExperiencia?: string[];
    tempoMercadoAnos?: number;
    prazoMinimoExecucao?: number;
    prazoMaximoExecucao?: number;
    capacidadeContratoSimultaneos?: number;
  };
  
  // ✅ SITUAÇÃO JURÍDICA
  juridico?: {
    situacaoReceitaFederal?: string;
    certidoesStatus?: any;
    impedimentoLicitar?: boolean;
    atestadosCapacidadeTecnica?: any[];
  };
  
  // ✅ PERFIL COMERCIAL
  comercial?: {
    modalidadesPreferenciais?: string[];
    margemCompetitiva?: number;
    valorMinimoContrato?: number;
    valorMaximoContrato?: number;
    taxaSucessoLicitacoes?: number;
    orgaosParceiros?: string[];
  };
  
  // Campos legados (compatibilidade)
  segmento: string;
  capacidadeOperacional: string;
  faturamento?: number;
  capitalSocial?: number;
  certificacoes: Array<{
    nome: string;
    descricao?: string;
    dataVencimento?: string;
    status?: string;
  }>;
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

  async analyzeEdital(request: EditalAnalysisRequest): Promise<EditalAnalysisReport> {
    try {
      
      await this.ragService.initialize();
      
     //processa a licitacao
      const ragResult = await this.ragService.processEdital(request);
    //busca o contexto da empresa
      const empresaContext = await this.getEmpresaContext(request.empresaCNPJ);
  
     
      
      let workflowResult: any;
      let workflowError: string | null = null;
      
      try {
        //executa o workflow
        const workflow = mastra.getWorkflow('workflow'); 

        const run = await workflow.createRunAsync();
      
        
        const inputData: WorkflowInputData = { 
          licitacaoId: request.licitacaoId, 
          empresaId: request.empresaCNPJ || 'default-empresa', 
          empresaContext: empresaContext || undefined
        };

        
        // TIMEOUT global para todo o workflow (120 segundos)
        const WORKFLOW_TIMEOUT = 320000;
        
      
        
      
        
        workflowResult = await Promise.race([
          (async () => {
            
            const result = await run.start({ inputData });
  
            return result;
          })(),
          new Promise((_, reject) => 
            setTimeout(() => {
              
              reject(new Error(`Workflow timeout após ${WORKFLOW_TIMEOUT/1000} segundos`));
            }, WORKFLOW_TIMEOUT)
          )
        ]);

      } catch (workflowErr: any) {
        console.error('❌ ERRO NO WORKFLOW:', workflowErr);
        console.error('❌ ERRO STACK:', workflowErr.stack);
        workflowError = workflowErr.message || 'Erro desconhecido no workflow';
      }

      let finalReport: string;
      let validationScore: number = 0;
      
      // ✅ CORREÇÃO: Declarar actualResult no escopo mais amplo
      let actualResult = null;
      
      // Verificar se o workflow foi bem sucedido
      if (workflowResult && !workflowError && workflowResult.status === 'success') {
        
        // O resultado está sempre em workflowResult.result
        if (workflowResult.result) {
          actualResult = workflowResult.result;
          console.log('✅ [ANALYSIS SERVICE] Resultado extraído do workflow');
        } else {
          actualResult = null;
          console.log('⚠️ [ANALYSIS SERVICE] workflowResult.result é null');
        }
        
        // Extrair dados individuais dos agentes
        const agentsData = actualResult?.agents || {};
        const strategicAgent = agentsData.strategic;
        const operationalAgent = agentsData.operational;
        const legalAgent = agentsData.legal;
        
        console.log('✅ [RESULTADO] Resultado workflow estruturado:', {
          finalDecision: actualResult?.finalDecision,
          consolidatedScore: actualResult?.consolidatedScore,
          strategicDecision: strategicAgent?.decision,
          strategicScore: strategicAgent?.score,
          operationalDecision: operationalAgent?.decision,
          operationalScore: operationalAgent?.score,
          legalDecision: legalAgent?.decision,
          legalScore: legalAgent?.score,
          executiveSummaryLength: actualResult?.executiveSummary?.length || 0
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

📊 ANÁLISE ESTRATÉGICA (Score: ${strategicAgent?.score || 0}/100 - ${strategicAgent?.decision || 'N/A'})
${strategicAgent?.analysis || 'N/A'}

${operationalAgent ? `
⚙️ ANÁLISE OPERACIONAL (Score: ${operationalAgent.score || 0}/100 - ${operationalAgent.decision})
${operationalAgent.analysis || 'N/A'}
` : '🛑 ANÁLISE OPERACIONAL: Não executada (strategic foi NAO_PROSSEGUIR)'}

${legalAgent ? `
⚖️ ANÁLISE JURÍDICO-DOCUMENTAL (Score: ${legalAgent.score || 0}/100 - ${legalAgent.decision})
${legalAgent.analysis || 'N/A'}
` : '🛑 ANÁLISE LEGAL: Não executada (análise anterior foi NAO_PROSSEGUIR)'}

📋 SUMÁRIO EXECUTIVO
${actualResult.executiveSummary || 'N/A'}`;
          
          validationScore = actualResult.consolidatedScore || 0;
        } else {
          console.log('❌ [ANALYSIS SERVICE] actualResult é null - usando relatório de erro');
          finalReport = `RELATÓRIO DE ANÁLISE TÉCNICA - ERRO NA EXTRAÇÃO DO RESULTADO

Licitação: ${request.licitacaoId}
Empresa: ${request.empresaCNPJ}

Status: Erro na extração do resultado do workflow
Documentos processados: ${ragResult.documentsCount}

O workflow executou, mas não foi possível extrair o resultado corretamente. Estrutura retornada: ${JSON.stringify(workflowResult, null, 2)}`;
          validationScore = 0;
        }
      } else {
        console.log('❌ [ANALYSIS SERVICE] Workflow falhou, usando relatório de erro');
        finalReport = `RELATÓRIO DE ANÁLISE TÉCNICA - ERRO NO WORKFLOW\n\nLicitação: ${request.licitacaoId}\nEmpresa: ${request.empresaCNPJ}\n\nStatus: Erro na execução do workflow\nErro: ${workflowError}\nDocumentos processados: ${ragResult.documentsCount}\n\nO sistema RAG processou os documentos com sucesso, mas o workflow de análise falhou. Verifique a configuração do Mastra.`;
      }
      
      const technicalSummary = extractTechnicalSummary(finalReport);
      const impugnacaoAnalysis = extractImpugnacaoAnalysis(finalReport);
      
     
      
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
      const { pdfPath, dadosPdf } = await generatePDFReport(pdfData);

      // salva o pdf no supabase storage
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

      // ✅ EXTRAÇÃO FINAL: Usar actualResult que pode ser null se houve erro
      const agentsData = actualResult?.agents || {};
      const strategicAgent = agentsData.strategic;
      const operationalAgent = agentsData.operational;
      const legalAgent = agentsData.legal;

      const finalResult = {
        status: "completed" as "completed" | "error",
        licitacaoId: request.licitacaoId,
        processedAt: new Date().toISOString(),
        pdfPath,
        technicalSummary: extractTechnicalSummary(finalReport),
        impugnacaoAnalysis: extractImpugnacaoAnalysis(finalReport),
        finalReport,
        validationScore,
        // ✅ ADICIONANDO: Dados individuais dos agentes
        finalDecision: actualResult?.finalDecision,
        consolidatedScore: actualResult?.consolidatedScore,
        strategicDecision: strategicAgent?.decision,
        strategicScore: strategicAgent?.score,
        operationalDecision: operationalAgent?.decision,
        operationalScore: operationalAgent?.score,
        legalDecision: legalAgent?.decision,
        legalScore: legalAgent?.score,
        executiveAnalysisLength: actualResult?.executiveSummary?.length || 0,
        // ✅ NOVOS CAMPOS DO AGENTE AGREGADOR
        executiveReport: actualResult?.executiveReport,
        riskLevel: actualResult?.riskLevel,
        keyAlerts: actualResult?.keyAlerts || []
      };

      return finalResult;

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

  //busca o contexto da empresa
  private async getEmpresaContext(empresaCNPJ?: string): Promise<EmpresaContext | null> {
    if (!empresaCNPJ) {
      console.log('⚠️ CNPJ não fornecido - continuando sem contexto específico');
      return null;
    }

    try {
      // ✅ USAR NOVA FUNÇÃO: Buscar contexto completo da empresa
      console.log(`🔍 [ANALYSIS SERVICE] Buscando contexto completo para empresa: ${empresaCNPJ}`);
      const empresa = await empresaRepository.getEmpresaContextoCompleto(empresaCNPJ);
     
      if (!empresa) {
        console.log(`❌ Empresa não encontrada: ${empresaCNPJ}`);
        return null;
      }
      
      console.log(`✅ [ANALYSIS SERVICE] Empresa encontrada: ${empresa.nome} - Dados carregados:`, {
        produtos: empresa.produtos?.length || 0,
        servicos: empresa.servicos?.length || 0,
        temDadosFinanceiros: !!(empresa.financeiro?.faturamentoMensal),
        temCapacidades: !!(empresa.capacidades?.numeroFuncionarios),
        situacaoJuridica: empresa.juridico?.situacaoReceitaFederal
      });

      const context: EmpresaContext = {
        // Dados Básicos
        nome: empresa.nome || 'Não informado',
        cnpj: empresa.cnpj || empresaCNPJ,
        razaoSocial: empresa.razaoSocial || empresa.nome,
        porte: (Array.isArray(empresa.porte) ? empresa.porte[0] : empresa.porte) as "Pequeno" | "Médio" | "Grande" || "Médio",
        descricao: empresa.descricao || 'Não informado',
        
        // Core Business - Dados estruturados
        produtos: empresa.produtos || [],
        servicos: empresa.servicos || [],
        palavrasChave: empresa.palavrasChave || '',
        produtoServico: empresa.produtoServico || '',
        
        // Localização
        localizacao: empresa.localizacao?.cidade || 'Não informado',
        endereco: empresa.localizacao?.endereco || 'Não informado',
        raioDistancia: empresa.localizacao?.raioDistancia || 0,
        
        // ✅ DADOS FINANCEIROS COMPLETOS
        financeiro: {
          faturamento: empresa.financeiro?.faturamento,
          faturamentoMensal: empresa.financeiro?.faturamentoMensal,
          capitalSocial: empresa.financeiro?.capitalSocial,
          capitalGiroDisponivel: empresa.financeiro?.capitalGiroDisponivel,
          margemLucroMedia: empresa.financeiro?.margemLucroMedia,
          capacidadeSeguroGarantia: empresa.financeiro?.capacidadeSeguroGarantia,
          experienciaLicitacoesAnos: empresa.financeiro?.experienciaLicitacoesAnos,
          numeroLicitacoesVencidas: empresa.financeiro?.numeroLicitacoesVencidas,
          numeroLicitacoesParticipadas: empresa.financeiro?.numeroLicitacoesParticipadas
        },
        
        // ✅ CAPACIDADES OPERACIONAIS/TÉCNICAS
        capacidades: {
          capacidadeProducaoMensal: empresa.capacidades?.capacidadeProducaoMensal,
          numeroFuncionarios: empresa.capacidades?.numeroFuncionarios,
          certificacoes: empresa.capacidades?.certificacoes || [],
          alcanceGeografico: empresa.capacidades?.alcanceGeografico || [],
          setoresExperiencia: empresa.capacidades?.setoresExperiencia || [],
          tempoMercadoAnos: empresa.capacidades?.tempoMercadoAnos,
          prazoMinimoExecucao: empresa.capacidades?.prazoMinimoExecucao,
          prazoMaximoExecucao: empresa.capacidades?.prazoMaximoExecucao,
          capacidadeContratoSimultaneos: empresa.capacidades?.capacidadeContratoSimultaneos
        },
        
        // ✅ SITUAÇÃO JURÍDICA
        juridico: {
          situacaoReceitaFederal: empresa.juridico?.situacaoReceitaFederal || 'ATIVA',
          certidoesStatus: empresa.juridico?.certidoesStatus || {},
          impedimentoLicitar: empresa.juridico?.impedimentoLicitar || false,
          atestadosCapacidadeTecnica: empresa.juridico?.atestadosCapacidadeTecnica || []
        },
        
        // ✅ PERFIL COMERCIAL
        comercial: {
          modalidadesPreferenciais: empresa.comercial?.modalidadesPreferenciais || [],
          margemCompetitiva: empresa.comercial?.margemCompetitiva,
          valorMinimoContrato: empresa.comercial?.valorMinimoContrato,
          valorMaximoContrato: empresa.comercial?.valorMaximoContrato,
          taxaSucessoLicitacoes: empresa.comercial?.taxaSucessoLicitacoes,
          orgaosParceiros: empresa.comercial?.orgaosParceiros || []
        },
        
        // Campos legados (manter compatibilidade)
        segmento: 'Não informado', // Pode ser derivado de setoresExperiencia
        capacidadeOperacional: empresa.capacidades?.numeroFuncionarios ? 
          `${empresa.capacidades.numeroFuncionarios} funcionários` : 'Não informado',
        faturamento: empresa.financeiro?.faturamento,
        capitalSocial: empresa.financeiro?.capitalSocial,
        certificacoes: empresa.capacidades?.certificacoes || [],
        documentosDisponiveis: {}
      };  
      return context;
    } catch (error) {
      console.error(`❌ Erro ao buscar contexto da empresa ${empresaCNPJ}:`, error);
      return null;
    }
  }

}