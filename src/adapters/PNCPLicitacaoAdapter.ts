import { ILicitacaoAdapter, SearchParams, LicitacaoStandard } from './interfaces/ILicitacaoAdapter';

interface PNCPSearchParams {
  dataFinal?: string;
  pagina?: number;
}

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
  private readonly baseUrl = 'https://pncp.gov.br/api/consulta/v1/contratacoes/proposta';
  private readonly maxPaginas = 30000;
  private readonly batchSize = 10;

  getNomeFonte(): string {
    return 'pncp';
  }

  async buscarLicitacoes(params: SearchParams): Promise<LicitacaoStandard[]> {
    console.log(`🔍 Iniciando busca PNCP com parâmetros:`, params);
    
    const pncpParams = this.converterParametros(params);
    const licitacoes = await this.executarBusca(pncpParams);
    
    console.log(`✅ PNCP: ${licitacoes.length} licitações encontradas`);
    return licitacoes.map(this.converterParaPadrao);
  }

  private converterParametros(params: SearchParams): PNCPSearchParams {
    return {
      dataFinal: params.dataFim?.replace(/-/g, '') || new Date().toISOString().split('T')[0].replace(/-/g, ''),
      pagina: params.pagina || 1
    };
  }

  private async executarBusca(params: PNCPSearchParams): Promise<PNCPLicitacao[]> {
    const todasLicitacoes: PNCPLicitacao[] = [];
    let paginaAtual = params.pagina || 1;
    let totalPaginas = this.maxPaginas;
    let paginasProcessadas = 0;

    const startTime = Date.now();
    console.log(`🚀 PNCP: Iniciando busca paralela - data=${params.dataFinal}, maxPaginas=${this.maxPaginas}`);

    try {
      while (todasLicitacoes.length < 30000 && paginasProcessadas < this.maxPaginas) {
        const paginasParaBuscar = this.calcularPaginasLote(paginaAtual, totalPaginas, paginasProcessadas);
        
        if (paginasParaBuscar.length === 0) break;

        console.log(`📦 PNCP: Processando páginas ${paginasParaBuscar[0]}-${paginasParaBuscar[paginasParaBuscar.length - 1]}`);

        const results = await this.buscarLoteParalelo(params.dataFinal!, paginasParaBuscar);
        const { licitacoesDoLote, totalPaginasAPI } = await this.processarResultados(results);

        if (totalPaginasAPI > 0) {
          totalPaginas = Math.min(totalPaginasAPI, this.maxPaginas);
        }

        todasLicitacoes.push(...licitacoesDoLote);
        paginaAtual += paginasParaBuscar.length;
        paginasProcessadas += paginasParaBuscar.length;

        if (licitacoesDoLote.length === 0) {
          console.log(`🏁 PNCP: Sem mais dados disponíveis na página ${paginaAtual}`);
          break;
        }

        // Pausa entre lotes
        if (paginasProcessadas < this.maxPaginas) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      const duration = (Date.now() - startTime) / 1000;
      console.log(`⏱️ PNCP: Busca finalizada em ${duration}s - ${todasLicitacoes.length} licitações`);
      
      return todasLicitacoes;

    } catch (error) {
      console.error('❌ PNCP: Erro na busca:', error);
      return todasLicitacoes;
    }
  }

  private calcularPaginasLote(paginaAtual: number, totalPaginas: number, paginasProcessadas: number): number[] {
    const paginasParaBuscar = [];
    for (let i = 0; i < this.batchSize && paginaAtual + i <= totalPaginas; i++) {
      if (paginasProcessadas + i < this.maxPaginas) {
        paginasParaBuscar.push(paginaAtual + i);
      }
    }
    return paginasParaBuscar;
  }

  private async buscarLoteParalelo(dataFinal: string, paginas: number[]) {
    const promises = paginas.map(pagina => this.buscarPaginaUnica(dataFinal, pagina));
    return await Promise.allSettled(promises);
  }

  private async buscarPaginaUnica(dataFinal: string, pagina: number): Promise<{pagina: number, data: PNCPResponse | null, error?: string}> {
    try {
      const url = `${this.baseUrl}?dataFinal=${dataFinal}&pagina=${pagina}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        return {
          pagina,
          data: null,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }
      
      const data: PNCPResponse = await response.json();
      return { pagina, data };
      
    } catch (error) {
      return {
        pagina,
        data: null,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  private async processarResultados(results: PromiseSettledResult<any>[]): Promise<{licitacoesDoLote: PNCPLicitacao[], totalPaginasAPI: number}> {
    const licitacoesDoLote: PNCPLicitacao[] = [];
    let totalPaginasAPI = 0;

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { data, error } = result.value;
        
        if (error) {
          console.warn(`⚠️ PNCP: ${error}`);
          continue;
        }
        
        if (data) {
          if (totalPaginasAPI === 0 && data.totalPaginas > 0) {
            totalPaginasAPI = data.totalPaginas;
          }
          
          if (data.data && data.data.length > 0) {
            const licitacoesComItens = await this.adicionarItens(data.data);
            licitacoesDoLote.push(...licitacoesComItens);
          }
        }
      }
    }

    return { licitacoesDoLote, totalPaginasAPI };
  }

  private async adicionarItens(licitacoes: PNCPLicitacao[]): Promise<PNCPLicitacao[]> {
    const licitacoesComItens = await Promise.allSettled(
      licitacoes.map(async (licitacao) => {
        const itens = await this.buscarItensLicitacao(
          licitacao.orgaoEntidade.cnpj,
          licitacao.anoCompra,
          licitacao.sequencialCompra
        );
        return { ...licitacao, itens };
      })
    );
    
    return licitacoesComItens
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<PNCPLicitacao>).value);
  }

  private async buscarItensLicitacao(cnpj: string, ano: number, sequencial: number): Promise<PNCPItem[]> {
    try {
      const url = `https://pncp.gov.br/api/pncp/v1/orgaos/${cnpj}/compras/${ano}/${sequencial}/itens`;
      const response = await fetch(url);
      
      if (!response.ok) {
        return [];
      }
      
      const itens: PNCPItem[] = await response.json();
      return itens || [];
    } catch (error) {
      return [];
    }
  }

  private converterParaPadrao(licitacao: PNCPLicitacao): LicitacaoStandard {
    // Como o formato já é padrão, apenas retorna
    return licitacao as LicitacaoStandard;
  }

  // Método para download de documentos (compatibilidade)
  async downloadDocumentos(cnpj: string, ano: number, sequencial: number): Promise<string[]> {
    try {
      const url = `https://pncp.gov.br/api/pncp/v1/orgaos/${cnpj}/compras/${ano}/${sequencial}/arquivos`;
      const response = await fetch(url);
      const data = await response.json();
      
      return data.map((doc: any) => doc.url);
    } catch (error) {
      console.error(`Erro ao buscar documentos ${cnpj}/${ano}/${sequencial}:`, error);
      return [];
    }
  }
}

export default PNCPLicitacaoAdapter;