import { ILicitacaoAdapter, SearchParams, LicitacaoStandard } from './interfaces/ILicitacaoAdapter';

interface PNCPSearchParams {
  dataInicial?: string;
  dataFinal?: string;
  modalidadeId: number;
  pagina?: number;
}

const MODALIDADES = [1, 2, 3, 4, 5] as const; // Lei 14.133/2021: Pregão, Concorrência, Diálogo Competitivo, Concurso, Leilão
const ENDPOINTS = {
  publicacao: 'https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao',
  proposta: 'https://pncp.gov.br/api/consulta/v1/contratacoes/proposta'
} as const;

interface PNCPItem {
  numeroItem: number;
  descricao: string;
  materialOuServico: string;
  materialOuServicoNome: string;
  valorUnitarioEstimado: number;
  valorTotal: number;
  quantidade: number;
  unidadeMedida: string;
  orcamentoSigiloso: boolean;
  itemCategoriaId: number;
  itemCategoriaNome: string;
  patrimonio: any;
  codigoRegistroImobiliario: any;
  criterioJulgamentoId: number;
  criterioJulgamentoNome: string;
  situacaoCompraItem: number;
  situacaoCompraItemNome: string;
  tipoBeneficio: number;
  tipoBeneficioNome: string;
  incentivoProdutivoBasico: boolean;
  dataInclusao: string;
  dataAtualizacao: string;
  temResultado: boolean;
  imagem: number;
  aplicabilidadeMargemPreferenciaNormal: boolean;
  aplicabilidadeMargemPreferenciaAdicional: boolean;
  percentualMargemPreferenciaNormal: any;
  percentualMargemPreferenciaAdicional: any;
  ncmNbsCodigo: any;
  ncmNbsDescricao: any;
  catalogo: any;
  categoriaItemCatalogo: any;
  catalogoCodigoItem: any;
  informacaoComplementar: any;
  tipoMargemPreferencia: any;
  exigenciaConteudoNacional: boolean;
}

interface PNCPLicitacao {
  numeroControlePNCP: string;
  dataAtualizacaoGlobal: string;
  modalidadeId: number;
  srp: boolean;
  orgaoEntidade: {
    cnpj: string;
    razaoSocial: string;
    poderId: string;
    esferaId: string;
  };
  anoCompra: number;
  sequencialCompra: number;
  dataInclusao: string;
  dataPublicacaoPncp: string;
  dataAtualizacao: string;
  numeroCompra: string;
  unidadeOrgao: {
    ufNome: string;
    codigoIbge: string;
    codigoUnidade: string;
    nomeUnidade: string;
    ufSigla: string;
    municipioNome: string;
  };
  amparoLegal: {
    descricao: string;
    nome: string;
    codigo: number;
  };
  dataAberturaProposta: string;
  dataEncerramentoProposta: string;
  informacaoComplementar: string;
  processo: string;
  objetoCompra: string;
  linkSistemaOrigem: string;
  justificativaPresencial: string | null;
  unidadeSubRogada: any;
  orgaoSubRogado: any;
  valorTotalHomologado: number | null;
  modoDisputaId: number;
  linkProcessoEletronico: string | null;
  valorTotalEstimado: number;
  modalidadeNome: string;
  modoDisputaNome: string;
  tipoInstrumentoConvocatorioCodigo: number;
  tipoInstrumentoConvocatorioNome: string;
  fontesOrcamentarias: any[];
  situacaoCompraId: number;
  situacaoCompraNome: string;
  usuarioNome: string;
  itens: PNCPItem[];
}

interface PNCPResponse {
  data: PNCPLicitacao[];
  totalRegistros: number;
  totalPaginas: number;
  numeroPagina: number;
  paginasRestantes: number;
  empty: boolean;
}

class PNCPLicitacaoAdapter implements ILicitacaoAdapter {
  private readonly batchSize = 3;
  private readonly REQUEST_DELAY = 1000; // 1s entre requests (respeitoso com API pública)
  private readonly REQUEST_TIMEOUT = 60000; // 60s timeout (alinhado com migration)

  getNomeFonte(): string {
    return 'pncp';
  }

  async buscarLicitacoes(params: SearchParams): Promise<LicitacaoStandard[]> {
    console.log(`🔍 PNCP: Iniciando busca completa - dataInicio: ${params.dataInicio}, dataFim: ${params.dataFim}`);
    
    // 🎯 USAR APENAS ENDPOINT PUBLICACAO (como migration script)
    console.log(`🔄 PNCP: Processando APENAS endpoint 'publicacao' (como migration)`);
    
    const publicacao = await this.buscarTodas('publicacao', params);
    console.log(`✅ PNCP: Publicação finalizada: ${publicacao.length} licitações`);
    
    // 📊 NÃO BUSCAR PROPOSTA (migration só usa publicacao)
    console.log(`📊 PNCP: Total encontrado: ${publicacao.length} licitações (apenas publicacao)`);
    
    return publicacao.map(this.converterParaPadrao);
  }

  private async buscarTodas(tipo: keyof typeof ENDPOINTS, params: SearchParams): Promise<PNCPLicitacao[]> {
    // 📋 DETERMINAR MODALIDADES A PROCESSAR
    const modalidadesParaBuscar = params.modalidades || MODALIDADES;
    
    console.log(`🔄 PNCP: Iniciando busca ${tipo} - processando ${modalidadesParaBuscar.length} modalidades (sequencial)`);
    console.log(`📋 Modalidades: [${modalidadesParaBuscar.join(', ')}]`);
    
    const todas: PNCPLicitacao[] = [];
    
    // 🔄 PROCESSAMENTO SEQUENCIAL (alinhado com migration script)
    for (let i = 0; i < modalidadesParaBuscar.length; i++) {
      const modalidade = modalidadesParaBuscar[i];
      console.log(`📋 PNCP: Processando modalidade ${modalidade} (${i + 1}/${modalidadesParaBuscar.length}) - ${tipo}`);
      
      try {
        const licitacoes = await this.buscarModalidade(tipo, modalidade, params);
        console.log(`✅ PNCP: Modalidade ${modalidade} retornou ${licitacoes.length} licitações`);
        todas.push(...licitacoes);
      } catch (error) {
        console.error(`❌ PNCP: Erro na modalidade ${modalidade}:`, error);
      }
      
      // Pausa respeitosa entre modalidades (alinhado com migration)
      if (i < modalidadesParaBuscar.length - 1) {
        console.log(`⏱️ PNCP: Aguardando ${this.REQUEST_DELAY}ms antes da próxima modalidade...`);
        await new Promise(resolve => setTimeout(resolve, this.REQUEST_DELAY));
      }
    }
    
    console.log(`🏁 PNCP: ${tipo} finalizado - total: ${todas.length} licitações`);
    return todas;
  }
  
  private async buscarModalidade(tipo: keyof typeof ENDPOINTS, modalidade: number, params: SearchParams): Promise<PNCPLicitacao[]> {
    const pncpParams = this.converterParametros(params, modalidade);
    return this.buscarPaginado(ENDPOINTS[tipo], pncpParams);
  }
  
  private converterParametros(params: SearchParams, modalidade: number): PNCPSearchParams {
    // 📅 USAR PARÂMETROS PASSADOS (como migration) ou hoje como fallback
    const hoje = new Date().toISOString().split('T')[0].replace(/-/g, '');
    
    // Converter formato YYYY-MM-DD para YYYYMMDD se necessário
    const dataInicial = params.dataInicio?.replace(/-/g, '') || hoje;
    const dataFinal = params.dataFim?.replace(/-/g, '') || hoje;
    
    console.log(`📅 [DEBUG] Datas convertidas: ${params.dataInicio} -> ${dataInicial}, ${params.dataFim} -> ${dataFinal}`);
    
    return {
      dataInicial, // ✅ Usar parâmetro ou hoje
      dataFinal,   // ✅ Usar parâmetro ou hoje
      modalidadeId: modalidade
    };
  }

  private async buscarPaginado(url: string, params: PNCPSearchParams): Promise<PNCPLicitacao[]> {
    console.log(`🔍 [DEBUG] Iniciando buscarPaginado - modalidade ${params.modalidadeId}`);
    const todasLicitacoes: PNCPLicitacao[] = [];
    let pagina = 1;
    let totalPaginas = 1;
    
    try {
      // 🎯 FASE 1: COLETAR TODAS AS PÁGINAS (como migration - SEM itens)
      do {
        console.log(`📄 PNCP: Modalidade ${params.modalidadeId} - página ${pagina}/${totalPaginas}`);
        
        const response = await this.fetchPageLikeMigration(url, params, pagina);
        
        if (!response?.data) {
          console.log(`❌ PNCP: Sem dados na página ${pagina} - modalidade ${params.modalidadeId}. Pulando para a próxima página...`);
          pagina++;
          continue;
        }
        
        if (pagina === 1) {
          totalPaginas = response.totalPaginas;
          console.log(`📊 PNCP: Modalidade ${params.modalidadeId} - ${response.totalRegistros} registros em ${totalPaginas} páginas`);
        }
        
        // ✅ ADICIONAR APENAS AS LICITAÇÕES (sem itens ainda)
        todasLicitacoes.push(...response.data);
        pagina++;
        
      } while (pagina <= totalPaginas);
      
      console.log(`🔄 PNCP: Coletadas ${todasLicitacoes.length} licitações de ${totalPaginas} páginas`);
      
      // 🎯 FASE 2: ADICIONAR ITENS (como migration - depois de coletar tudo)
      if (todasLicitacoes.length > 0) {
        console.log(`🔍 [DEBUG] Adicionando itens para ${todasLicitacoes.length} licitações...`);
        const licitacoesComItens = await this.adicionarItens(todasLicitacoes);
        console.log(`🔍 [DEBUG] Itens adicionados para ${licitacoesComItens.length} licitações`);
        return licitacoesComItens;
      }
      
    } catch (error) {
      console.warn(`⚠️ PNCP: Erro modalidade ${params.modalidadeId}:`, error);
      console.error(`💥 [DEBUG] Stack trace:`, error);
    }
    
    console.log(`🔍 [DEBUG] Finalizando buscarPaginado - modalidade ${params.modalidadeId}, total: ${todasLicitacoes.length}`);
    return todasLicitacoes;
  }

  private combinarDados(publicacao: PNCPLicitacao[], proposta: PNCPLicitacao[]): PNCPLicitacao[] {
    const mapa = new Map<string, PNCPLicitacao>();
    
    [...publicacao, ...proposta].forEach(licitacao => {
      mapa.set(licitacao.numeroControlePNCP, licitacao);
    });
    
    return Array.from(mapa.values());
  }

  private async buscarPagina(url: string, params: PNCPSearchParams): Promise<PNCPResponse | null> {
    const maxRetries = 3;
    
    console.log(`🔍 [DEBUG] Iniciando buscarPagina - modalidade ${params.modalidadeId}, página ${params.pagina}`);
    
    // 🔄 DELAY RESPEITOSO (alinhado com migration script)
    await new Promise(resolve => setTimeout(resolve, this.REQUEST_DELAY));
    
    for (let tentativa = 1; tentativa <= maxRetries; tentativa++) {
      try {
        const queryParams = new URLSearchParams({
          dataInicial: params.dataInicial!,
          dataFinal: params.dataFinal!,
          codigoModalidadeContratacao: params.modalidadeId.toString(),
          pagina: (params.pagina || 1).toString()
        });
        
        const fullUrl = `${url}?${queryParams}`;
        console.log(`🌐 PNCP: Tentativa ${tentativa}/${maxRetries} - ${fullUrl}`);
        
        // 🎯 USAR MESMA IMPLEMENTAÇÃO DO MIGRATION (Promise.race)
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Timeout de ${this.REQUEST_TIMEOUT}ms na página ${params.pagina}`)), this.REQUEST_TIMEOUT);
        });
        
        const fetchPromise = fetch(fullUrl, {
          headers: {
            'User-Agent': 'Alicit-Integration/2.0 (Sistema de Análise de Licitações)',
            'Accept': 'application/json',
            'Accept-Language': 'pt-BR',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache'
          }
        });
        
        const response = await Promise.race([fetchPromise, timeoutPromise]);
        
        if (!response.ok) {
          console.warn(`⚠️ PNCP: HTTP ${response.status} - modalidade ${params.modalidadeId}, página ${params.pagina}, tentativa ${tentativa}`);
          
          if (response.status >= 500 && tentativa < maxRetries) {
            console.log(`🔄 PNCP: Erro do servidor, tentando novamente em 2s...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
          
          return null;
        }
        
        // 🎯 USAR MESMA IMPLEMENTAÇÃO DO MIGRATION (text -> parse)
        const text = await response.text();
        
        if (!text.trim()) {
          console.warn(`⚠️ Resposta vazia - modalidade ${params.modalidadeId}, página ${params.pagina}`);
          return null;
        }
        
        const parsed = JSON.parse(text);
        console.log(`✅ [DEBUG] JSON recebido - modalidade ${params.modalidadeId}, página ${params.pagina}, registros: ${parsed?.data?.length || 0}`);
        return parsed;
        
      } catch (error: any) {
        if (error.message?.includes('Timeout')) {
          console.warn(`⏱️ PNCP: Timeout (${this.REQUEST_TIMEOUT}ms) - modalidade ${params.modalidadeId}, página ${params.pagina}, tentativa ${tentativa}`);
        } else {
          console.error(`❌ PNCP: Erro na tentativa ${tentativa} - modalidade ${params.modalidadeId}:`, error.message);
        }
        
        if (tentativa < maxRetries) {
          const delay = Math.pow(2, tentativa) * 1000; // Backoff exponencial
          console.log(`🔄 PNCP: Reagendando para ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    console.error(`💥 PNCP: Falha após ${maxRetries} tentativas - modalidade ${params.modalidadeId}, página ${params.pagina}`);
    console.log(`🔍 [DEBUG] Retornando null para modalidade ${params.modalidadeId}`);
    return null;
  }



  private async adicionarItens(licitacoes: PNCPLicitacao[]): Promise<PNCPLicitacao[]> {
    const promises = licitacoes.map(async (licitacao) => {
      const itens = await this.buscarItensLicitacao(
        licitacao.orgaoEntidade.cnpj,
        licitacao.anoCompra,
        licitacao.sequencialCompra
      );
      return { ...licitacao, itens };
    });
    
    const results = await Promise.allSettled(promises);
    return results
      .filter((result): result is PromiseFulfilledResult<PNCPLicitacao> => result.status === 'fulfilled')
      .map(result => result.value);
  }

  private async buscarItensLicitacao(cnpj: string, ano: number, sequencial: number): Promise<PNCPItem[]> {
    try {
      const url = `https://pncp.gov.br/api/pncp/v1/orgaos/${cnpj}/compras/${ano}/${sequencial}/itens`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT); // Timeout padronizado
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Alicit-Integration/2.0 (Sistema de Análise de Licitações)',
          'Accept': 'application/json',
          'Accept-Language': 'pt-BR',
          'Connection': 'keep-alive',
          'Cache-Control': 'no-cache'
        }
      });
      
      clearTimeout(timeoutId);
      return response.ok ? await response.json() || [] : [];
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn(`⏱️ PNCP: Timeout ao buscar itens - ${cnpj}/${ano}/${sequencial}`);
      }
      return [];
    }
  }

  // 🎯 MÉTODO ALINHADO COM DOCUMENTAÇÃO OFICIAL PNCP
  private async fetchPageLikeMigration(baseUrl: string, params: PNCPSearchParams, pagina: number) {
    const queryParams = new URLSearchParams({
      dataInicial: params.dataInicial!,
      dataFinal: params.dataFinal!,
      codigoModalidadeContratacao: params.modalidadeId.toString(),
      pagina: pagina.toString()
    });
    
    const fullUrl = `${baseUrl}?${queryParams}`;
    
    // 🕰️ DELAY AUMENTADO conforme instabilidade observada da API PNCP
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2s entre requests
    
    try {
      // ⏱️ TIMEOUT 60s (igual ao migration)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout de 60s na página ${pagina}`)), 60000);
      });
      
      const fetchPromise = fetch(fullUrl, {
        headers: {
          'User-Agent': 'Alicit-Integration/2.0 (Sistema de Análise de Licitações)',
          'Accept': 'application/json',
          'Accept-Language': 'pt-BR',
          'Connection': 'keep-alive',
          'Cache-Control': 'no-cache'
        }
      });
      
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      
      // 📊 TRATAR CÓDIGOS DE RETORNO OFICIAIS PNCP
      if (response.status === 204) {
        console.log(`📄 PNCP: Sem conteúdo (204) - página ${pagina}`);
        return null;
      }
      
      if (response.status === 400) {
        console.warn(`⚠️ PNCP: Bad Request (400) - página ${pagina}`);
        return null;
      }
      
      if (response.status === 422) {
        console.warn(`⚠️ PNCP: Unprocessable Entity (422) - página ${pagina}`);
        return null;
      }
      
      if (response.status === 500) {
        console.warn(`⚠️ PNCP: Internal Server Error (500) - página ${pagina}`);
        return null;
      }
      
      if (!response.ok) {
        console.warn(`⚠️ PNCP: HTTP ${response.status} - página ${pagina}`);
        return null;
      }

      const text = await response.text();
      
      if (!text.trim()) {
        console.warn(`⚠️ PNCP: Resposta vazia - página ${pagina}`);
        return null;
      }

      const parsed = JSON.parse(text);
      
      // 📊 VALIDAR ESTRUTURA CONFORME DOCUMENTAÇÃO
      if (!parsed.data && parsed.totalRegistros === undefined) {
        console.warn(`⚠️ PNCP: Estrutura inválida - página ${pagina}`);
        return null;
      }
      
      return parsed;
    } catch (error) {
      console.error(`❌ PNCP: Erro página ${pagina}:`, error);
      return null;
    }
  }

  private converterParaPadrao(licitacao: PNCPLicitacao): LicitacaoStandard {
    return licitacao as LicitacaoStandard;
  }

  async downloadDocumentos(cnpj: string, ano: number, sequencial: number): Promise<string[]> {
    try {
      const url = `https://pncp.gov.br/api/pncp/v1/orgaos/${cnpj}/compras/${ano}/${sequencial}/arquivos`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT); // Timeout padronizado
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Alicit-Integration/2.0 (Sistema de Análise de Licitações)',
          'Accept': 'application/json',
          'Accept-Language': 'pt-BR',
          'Connection': 'keep-alive',
          'Cache-Control': 'no-cache'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) return [];
      
      const data = await response.json();
      return data.map((doc: any) => doc.url);
      
      } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn(`⏱️ PNCP: Timeout ao buscar documentos - ${cnpj}/${ano}/${sequencial}`);
      }
      return [];
    }
  }
}

export default PNCPLicitacaoAdapter;