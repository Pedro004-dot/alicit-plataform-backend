import { Request, Response } from "express";
import { EditalAnalysisService } from "../../services/edital/analysisService";
import { supabase } from "../../config/supabase";

export class EditalAnalysisController {
  private analysisService: EditalAnalysisService;
  private initialized: boolean = false;

  constructor() {
    this.analysisService = new EditalAnalysisService();
  }

  /**
   * Busca dados detalhados da análise incluindo dados concretos e análises dos agentes
   */
  async buscarAnaliseDetalhada(req: Request, res: Response): Promise<void> {
    try {
      const { empresaCNPJ, numeroControlePNCP } = req.params;
      
      console.log(`🔍 Buscando análise detalhada: ${numeroControlePNCP} - ${empresaCNPJ}`);

      // Buscar relatório técnico com dados estruturados
      const { data: relatorio, error } = await supabase
        .from('relatorios_tecnicos')
        .select('*')
        .eq('numero_controle_pncp', numeroControlePNCP)
        .eq('empresa_cnpj', empresaCNPJ)
        .single();

      if (error || !relatorio) {
        console.log(`❌ Relatório não encontrado: ${numeroControlePNCP}`);
        res.status(404).json({
          error: "Análise não encontrada",
          message: "Não foi encontrada análise para esta licitação",
          code: "ANALYSIS_NOT_FOUND"
        });
        return;
      }

      // Extrair dados dos agentes do JSON estruturado
      const dadosFrontend = relatorio.dados_pdf?.dados_frontend || {};
      const relatorioCompleto = relatorio.dados_pdf?.relatorio_completo?.conteudo_original || '';

      // Processar análises dos agentes do conteúdo markdown
      const analisesAgentes = this.extrairAnalisesAgentes(relatorioCompleto);
      
      // Estruturar resposta com dados concretos + análises dos agentes
      const analiseDetalhada = {
        // Dados consolidados
        scoreGeral: dadosFrontend.recomendacao?.score || 0,
        decisaoFinal: this.extrairDecisaoFinal(relatorioCompleto),
        nivelRisco: this.extrairNivelRisco(relatorioCompleto),
        
        // Dados concretos da licitação
        dadosConcretos: this.extrairDadosConcretos(relatorioCompleto),
        
        // Análises dos agentes especializados
        agentes: analisesAgentes,
        
        // Dados estruturados existentes
        pontosCriticos: dadosFrontend.pontosCriticos || [],
        riscos: dadosFrontend.riscos || [],
        cronograma: dadosFrontend.cronograma || [],
        requisitos: dadosFrontend.requisitos || { atendidos: [], nao_atendidos: [] },
        viabilidade: dadosFrontend.viabilidade || {},
        
        // Metadados
        metadados: {
          dataAnalise: relatorio.created_at,
          qualidadeAnalise: dadosFrontend.metadados?.qualidade_analise || 0,
          documentosAnalisados: dadosFrontend.metadados?.documentos_analisados || 0
        }
      };

      console.log(`✅ Análise detalhada encontrada: ${numeroControlePNCP}`);
      res.json({
        success: true,
        data: analiseDetalhada
      });

    } catch (error: any) {
      console.error(`❌ Erro ao buscar análise detalhada:`, error);
      res.status(500).json({
        error: "Erro interno do servidor",
        message: error.message || "Erro desconhecido ao buscar análise",
        code: "INTERNAL_SERVER_ERROR"
      });
    }
  }

  async analyzeEdital(req: Request, res: Response): Promise<void> {
    try {
      const { numeroControlePNCP, empresaCNPJ } = req.body;
      
      console.log(`🔍 Dados recebidos: numeroControlePNCP=${numeroControlePNCP}, empresaCNPJ=${empresaCNPJ}`);

      // ✅ VALIDAÇÃO 1: Verificar se já foi analisada (tem relatório)
      const relatorioExistente = await this.verificarRelatorioExistente(numeroControlePNCP, empresaCNPJ);
      if (relatorioExistente) {
        console.log(`⚠️ Análise já existe para ${numeroControlePNCP}`);
        res.status(409).json({
          error: "Análise já realizada",
          message: "Esta licitação já foi analisada anteriormente",
          code: "ANALYSIS_ALREADY_EXISTS",
          relatorioId: relatorioExistente.id
        });
        return;
      }
      
      // ✅ VALIDAÇÃO 2: Verificar se há análise em andamento (status = 'em_analise' SEM relatório)
      const analiseEmAndamento = await this.verificarAnaliseEmAndamento(empresaCNPJ);
      if (analiseEmAndamento) {
        console.log(`⚠️ Análise em andamento para empresa ${empresaCNPJ}: ${analiseEmAndamento.numero_controle_pncp}`);
        res.status(423).json({
          error: "Análise em andamento",
          message: "Já existe uma análise sendo processada",
          code: "ANALYSIS_IN_PROGRESS",
          licitacaoEmAndamento: analiseEmAndamento.numero_controle_pncp
        });
        return;
      }
      
      // ✅ VALIDAÇÃO 3: Atualizar status para 'em_analise' ANTES de processar
      await this.atualizarStatusLicitacao(numeroControlePNCP, empresaCNPJ, 'em_analise');
      console.log(`🔄 Status atualizado para 'em_analise': ${numeroControlePNCP}`);
      
      try {
        // Executar análise
        const result = await this.analysisService.analyzeEdital({
          licitacaoId: numeroControlePNCP,
          empresaCNPJ
        });
        
        // ✅ SUCESSO: Atualizar status para 'analisado' (análise concluída)
        await this.atualizarStatusLicitacao(numeroControlePNCP, empresaCNPJ, 'analisado');
        console.log(`✅ Status atualizado para 'analisado': ${numeroControlePNCP}`);
        
        res.json(result);
        
      } catch (analysisError) {
        // ✅ ERRO: Reverter status para 'nao_definido' em caso de erro
        await this.atualizarStatusLicitacao(numeroControlePNCP, empresaCNPJ, 'nao_definido');
        console.log(`❌ Status revertido para 'nao_definido' devido a erro: ${numeroControlePNCP}`);
        throw analysisError;
      }

    } catch (error: any) {
      console.error(`❌ Erro na análise do edital:`, error);
      
      // Diferentes tipos de erro
      if (error.message?.includes('não encontrada') && (error.message?.includes('Redis') || error.message?.includes('base de dados'))) {
        
        res.status(404).json({
          error: "Licitação não encontrada",
          message: `Licitação ${req.body.licitacaoId} não foi encontrada na base de dados`,
          code: "LICITACAO_NOT_FOUND"
        });
        return;
      }

      if (error.message?.includes('Nenhum documento encontrado')) {
        res.status(404).json({
          error: "Documentos não encontrados",
          message: "Nenhum documento foi encontrado para esta licitação no PNCP",
          code: "DOCUMENTS_NOT_FOUND"
        });
        return;
      }

      if (error.message?.includes('Falha no download')) {
        res.status(502).json({
          error: "Erro no download",
          message: "Falha ao baixar documentos do PNCP. Tente novamente mais tarde",
          code: "DOWNLOAD_FAILED"
        });
        return;
      }

      // Erro genérico
      res.status(500).json({
        error: "Erro interno do servidor",
        message: error.message || "Erro desconhecido durante o processamento",
        code: "INTERNAL_SERVER_ERROR"
      });
    }
  }

  /**
   * Verifica se já existe relatório para a licitação (análise já foi feita)
   */
  private async verificarRelatorioExistente(numeroControlePNCP: string, empresaCNPJ: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('relatorios_tecnicos')
        .select('id, status_relatorio')
        .eq('numero_controle_pncp', numeroControlePNCP)
        .eq('empresa_cnpj', empresaCNPJ)
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Erro ao verificar relatório existente:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Erro ao verificar relatório existente:', error);
      return null;
    }
  }

  /**
   * Verifica se há análise em andamento para a empresa (status 'em_analise' sem relatório)
   */
  private async verificarAnaliseEmAndamento(empresaCNPJ: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('licitacoes_empresa')
        .select('numero_controle_pncp')
        .eq('empresa_cnpj', empresaCNPJ)
        .eq('status', 'em_analise')
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao verificar análise em andamento:', error);
        return null;
      }
      
      // Se encontrou licitação com status 'em_analise', verificar se tem relatório
      if (data) {
        const relatorio = await this.verificarRelatorioExistente(data.numero_controle_pncp, empresaCNPJ);
        // Se não tem relatório, significa que está em andamento
        return relatorio ? null : data;
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao verificar análise em andamento:', error);
      return null;
    }
  }

  /**
   * Atualiza o status da licitação na tabela licitacoes_empresa
   */
  private async atualizarStatusLicitacao(numeroControlePNCP: string, empresaCNPJ: string, novoStatus: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('licitacoes_empresa')
        .update({ status: novoStatus })
        .eq('numero_controle_pncp', numeroControlePNCP)
        .eq('empresa_cnpj', empresaCNPJ);
      
      if (error) {
        console.error('Erro ao atualizar status da licitação:', error);
        throw new Error(`Erro ao atualizar status: ${error.message}`);
      }
      
      console.log(`✅ Status atualizado para '${novoStatus}': ${numeroControlePNCP}`);
    } catch (error) {
      console.error('Erro ao atualizar status da licitação:', error);
      throw error;
    }
  }

  // ================== MÉTODOS DE EXTRAÇÃO DE DADOS ==================

  private extrairAnalisesAgentes(relatorioCompleto: string) {
    return {
      estrategico: this.extrairAnaliseEstrategica(relatorioCompleto),
      operacional: this.extrairAnaliseOperacional(relatorioCompleto),
      juridico: this.extrairAnaliseJuridica(relatorioCompleto)
    };
  }

  private extrairAnaliseEstrategica(texto: string) {
    const secaoMatch = texto.match(/📊 ANÁLISE ESTRATÉGICA.*?(?=⚙️|⚖️|📋|$)/s);
    if (!secaoMatch) return null;
    
    const secao = secaoMatch[0];
    return {
      score: this.extrairScore(secao, 'ESTRATÉGICO'),
      decisao: this.extrairDecisao(secao),
      analise: this.extrairTextoAnalise(secao),
      dadosExtraidos: this.extrairDadosConcretos(secao)
    };
  }

  private extrairAnaliseOperacional(texto: string) {
    const secaoMatch = texto.match(/⚙️ ANÁLISE OPERACIONAL.*?(?=⚖️|📋|$)/s);
    if (!secaoMatch) return null;
    
    const secao = secaoMatch[0];
    return {
      score: this.extrairScore(secao, 'OPERACIONAL'),
      decisao: this.extrairDecisao(secao),
      analise: this.extrairTextoAnalise(secao),
      dadosExtraidos: this.extrairDadosOperacionais(secao)
    };
  }

  private extrairAnaliseJuridica(texto: string) {
    const secaoMatch = texto.match(/⚖️ ANÁLISE JURÍDICO-DOCUMENTAL.*?(?=📋|$)/s);
    if (!secaoMatch) return null;
    
    const secao = secaoMatch[0];
    return {
      score: this.extrairScore(secao, 'JURÍDICO'),
      decisao: this.extrairDecisao(secao),
      analise: this.extrairTextoAnalise(secao),
      documentos: this.extrairDocumentosNecessarios(secao)
    };
  }

  private extrairDadosConcretos(texto: string) {
    const dados: any = {};
    
    // Extrair valor estimado
    const valorMatch = texto.match(/VALOR ESTIMADO:\*\*\s*R\$\s*([\d.,]+)/i);
    if (valorMatch) {
      dados.valorEstimado = valorMatch[1];
    }
    
    // Extrair modalidade
    const modalidadeMatch = texto.match(/MODALIDADE:\*\*\s*([^\n]+)/i);
    if (modalidadeMatch) {
      dados.modalidade = modalidadeMatch[1].trim();
    }
    
    // Extrair objeto
    const objetoMatch = texto.match(/OBJETO:\*\*\s*(.*?)(?=\n\*\*|$)/is);
    if (objetoMatch) {
      dados.objeto = objetoMatch[1].trim();
    }
    
    // Extrair órgão
    const orgaoMatch = texto.match(/ÓRGÃO:\*\*\s*([^\n]+)/i);
    if (orgaoMatch) {
      dados.orgao = orgaoMatch[1].trim();
    }
    
    // Extrair data de abertura
    const dataMatch = texto.match(/DATA ABERTURA:\*\*\s*([^\n]+)/i);
    if (dataMatch) {
      dados.dataAbertura = dataMatch[1].trim();
    }

    return dados;
  }

  private extrairDadosOperacionais(texto: string) {
    const dados: any = {};
    
    // Extrair prazo de execução
    const prazoMatch = texto.match(/PRAZO EXECUÇÃO:\*\*\s*([^\n]+)/i);
    if (prazoMatch) {
      dados.prazoExecucao = prazoMatch[1].trim();
    }
    
    // Extrair local de entrega
    const localMatch = texto.match(/LOCAL ENTREGA:\*\*\s*(.*?)(?=\n\*\*|$)/is);
    if (localMatch) {
      dados.localEntrega = localMatch[1].trim();
    }
    
    // Extrair cronograma
    const cronogramaMatch = texto.match(/CRONOGRAMA:\*\*\s*([^\n]+)/i);
    if (cronogramaMatch) {
      dados.cronograma = cronogramaMatch[1].trim();
    }

    return dados;
  }

  private extrairDocumentosNecessarios(texto: string): string[] {
    const documentos: string[] = [];
    
    // Buscar seção de documentos
    const docSecaoMatch = texto.match(/DOCUMENTOS HABILITAÇÃO:(.*?)(?=\n\*\*|$)/is);
    if (docSecaoMatch) {
      const linhas = docSecaoMatch[1].split('\n');
      linhas.forEach(linha => {
        const linhaTrimmed = linha.trim();
        if (linhaTrimmed.startsWith('-') || linhaTrimmed.startsWith('•')) {
          const doc = linhaTrimmed.replace(/^[-•]\s*/, '').trim();
          if (doc) documentos.push(doc);
        }
      });
    }
    
    return documentos;
  }

  private extrairScore(texto: string, tipo: string): number {
    const patterns = [
      new RegExp(`${tipo}.*?Score[:\\s]*(\\d+)`, 'i'),
      new RegExp(`SCORE ${tipo}[:\\s]*(\\d+)`, 'i'),
      new RegExp(`\\(Score[:\\s]*(\\d+)\\/100`, 'i')
    ];
    
    for (const pattern of patterns) {
      const match = texto.match(pattern);
      if (match) {
        return parseInt(match[1]);
      }
    }
    
    return 0;
  }

  private extrairDecisao(texto: string): string {
    const decisaoMatch = texto.match(/DECISÃO:\*\*\s*([^\n]+)/i);
    return decisaoMatch ? decisaoMatch[1].trim() : 'NÃO DEFINIDA';
  }

  private extrairTextoAnalise(texto: string): string {
    // Extrair texto após "ANÁLISE:" até a próxima seção
    const analiseMatch = texto.match(/ANÁLISE:\*\*\s*(.*?)(?=\n#{1,3}|\*\*SCORE|$)/is);
    return analiseMatch ? analiseMatch[1].trim() : '';
  }

  private extrairDecisaoFinal(texto: string): string {
    const decisaoMatch = texto.match(/DECISÃO FINAL:\s*([^\n]+)/i);
    return decisaoMatch ? decisaoMatch[1].trim() : 'NÃO DEFINIDA';
  }

  private extrairNivelRisco(texto: string): string {
    const riscoMatch = texto.match(/NÍVEL DE RISCO:\s*([^\n]+)/i);
    return riscoMatch ? riscoMatch[1].trim() : 'NÃO DEFINIDO';
  }
}