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

  getNomeFonte(): string {
    return 'pncp';
  }

  async buscarLicitacoes(params: SearchParams): Promise<LicitacaoStandard[]> {
    console.log(`🔍 PNCP: Iniciando busca completa - dataInicio: ${params.dataInicio}, dataFim: ${params.dataFim}`);
    
    const [publicacao, proposta] = await Promise.all([
      this.buscarTodas('publicacao', params),
      this.buscarTodas('proposta', params)
    ]);
    
    console.log(`📊 PNCP: Publicação=${publicacao.length}, Proposta=${proposta.length}`);
    
    const combinadas = this.combinarDados(publicacao, proposta);
    console.log(`✅ PNCP: ${combinadas.length} licitações encontradas após combinação`);
    
    return combinadas.map(this.converterParaPadrao);
  }

  private async buscarTodas(tipo: keyof typeof ENDPOINTS, params: SearchParams): Promise<PNCPLicitacao[]> {
    console.log(`🔄 PNCP: Iniciando busca ${tipo} - processando ${MODALIDADES.length} modalidades (2 paralelas)`);
    const todas: PNCPLicitacao[] = [];
    
    // Processar modalidades em batches de 2 (paralelização controlada)
    const BATCH_SIZE = 2;
    for (let i = 0; i < MODALIDADES.length; i += BATCH_SIZE) {
      const batch = MODALIDADES.slice(i, i + BATCH_SIZE);
      console.log(`🔄 PNCP: Processando batch ${Math.floor(i/BATCH_SIZE) + 1}: modalidades [${batch.join(', ')}] (${tipo})`);
      
      // Processar modalidades do batch em paralelo
      const promisesModalidades = batch.map(async (modalidade) => {
        console.log(`📋 PNCP: Iniciando modalidade ${modalidade} (${tipo})`);
        const licitacoes = await this.buscarModalidade(tipo, modalidade, params);
        console.log(`✅ PNCP: Modalidade ${modalidade} retornou ${licitacoes.length} licitações`);
        return { modalidade, licitacoes };
      });
      
      const resultados = await Promise.all(promisesModalidades);
      
      // Adicionar resultados na ordem
      for (const resultado of resultados) {
        todas.push(...resultado.licitacoes);
      }
      
      // Pausa menor entre batches (500ms em vez de 10s)
      if (i + BATCH_SIZE < MODALIDADES.length) {
        console.log('⏱️ PNCP: Aguardando 500ms antes do próximo batch...');
        await new Promise(resolve => setTimeout(resolve, 500));
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
    const hoje = new Date().toISOString().split('T')[0].replace(/-/g, '');
    
    return {
      dataInicial: params.dataInicio?.replace(/-/g, '') || hoje,
      dataFinal: params.dataFim?.replace(/-/g, '') || hoje,
      modalidadeId: modalidade
    };
  }

  private async buscarPaginado(url: string, params: PNCPSearchParams): Promise<PNCPLicitacao[]> {
    const todas: PNCPLicitacao[] = [];
    let pagina = 1;
    let totalPaginas = 1;
    
    try {
      do {
        console.log(`📄 PNCP: Modalidade ${params.modalidadeId} - página ${pagina}/${totalPaginas}`);
        const response = await this.buscarPagina(url, { ...params, pagina });
        
        if (!response?.data) {
          console.log(`❌ PNCP: Sem dados na página ${pagina} - modalidade ${params.modalidadeId}`);
          break;
        }
        
        if (pagina === 1) {
          totalPaginas = response.totalPaginas;
          console.log(`📊 PNCP: Modalidade ${params.modalidadeId} - ${response.totalRegistros} registros em ${totalPaginas} páginas`);
        }
        
        const licitacoesComItens = await this.adicionarItens(response.data);
        todas.push(...licitacoesComItens);
        pagina++;
        
      } while (pagina <= totalPaginas);
      
    } catch (error) {
      console.warn(`⚠️ PNCP: Erro modalidade ${params.modalidadeId}:`, error);
    }
    
    return todas;
  }

  private combinarDados(publicacao: PNCPLicitacao[], proposta: PNCPLicitacao[]): PNCPLicitacao[] {
    const mapa = new Map<string, PNCPLicitacao>();
    
    [...publicacao, ...proposta].forEach(licitacao => {
      mapa.set(licitacao.numeroControlePNCP, licitacao);
    });
    
    return Array.from(mapa.values());
  }

  private async buscarPagina(url: string, params: PNCPSearchParams): Promise<PNCPResponse | null> {
    const timeout = 10000; // 10 segundos
    const maxRetries = 3;
    
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
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
          const response = await fetch(fullUrl, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Alicit-Bot/1.0',
              'Accept': 'application/json'
            }
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            console.warn(`⚠️ PNCP: HTTP ${response.status} - modalidade ${params.modalidadeId}, página ${params.pagina}, tentativa ${tentativa}`);
            
            if (response.status >= 500 && tentativa < maxRetries) {
              console.log(`🔄 PNCP: Erro do servidor, tentando novamente em 2s...`);
              await new Promise(resolve => setTimeout(resolve, 2000));
              continue;
            }
            
            return null;
          }
          
          return await response.json();
          
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          
          if (fetchError.name === 'AbortError') {
            console.warn(`⏱️ PNCP: Timeout (${timeout}ms) - modalidade ${params.modalidadeId}, página ${params.pagina}, tentativa ${tentativa}`);
          } else {
            throw fetchError;
          }
        }
        
      } catch (error: any) {
        console.error(`❌ PNCP: Erro na tentativa ${tentativa} - modalidade ${params.modalidadeId}:`, error.message);
        
        if (tentativa < maxRetries) {
          const delay = Math.pow(2, tentativa) * 1000; // Backoff exponencial
          console.log(`🔄 PNCP: Reagendando para ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    console.error(`💥 PNCP: Falha após ${maxRetries} tentativas - modalidade ${params.modalidadeId}, página ${params.pagina}`);
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
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos para itens
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Alicit-Bot/1.0',
          'Accept': 'application/json'
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

  private converterParaPadrao(licitacao: PNCPLicitacao): LicitacaoStandard {
    return licitacao as LicitacaoStandard;
  }

  async downloadDocumentos(cnpj: string, ano: number, sequencial: number): Promise<string[]> {
    try {
      const url = `https://pncp.gov.br/api/pncp/v1/orgaos/${cnpj}/compras/${ano}/${sequencial}/arquivos`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 segundos para documentos
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Alicit-Bot/1.0',
          'Accept': 'application/json'
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