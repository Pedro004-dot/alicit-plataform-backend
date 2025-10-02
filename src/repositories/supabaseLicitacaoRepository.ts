import { supabase } from '../config/supabase';

// Interfaces iguais ao Pinecone (mantém compatibilidade total)
interface Municipio {
  codigo_ibge: string;
  nome: string;
  latitude: number;
  longitude: number;
  capital: number;
  codigo_uf: string;
  siafi_id: string;
  ddd: string;
  fuso_horario: string;
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

/**
 * Repositório Supabase para dados concretos das licitações
 * Substitui métodos do Pinecone que lidam com dados estruturais
 */
class SupabaseLicitacaoRepository {
  
  /**
   * Salva licitações no Supabase (dados estruturais)
   * Substitui saveLicitacoes do Pinecone para dados concretos
   */
  async saveLicitacoes(licitacoes: PNCPLicitacao[]): Promise<number> {
    let savedCount = 0;
    
    console.log(`🔄 Salvando ${licitacoes.length} licitações no Supabase...`);
    
    for (const licitacao of licitacoes) {
      try {
        // Verificar se já existe
        const { data: existingData } = await supabase
          .from('licitacoes')
          .select('numero_controle_pncp')
          .eq('numero_controle_pncp', licitacao.numeroControlePNCP)
          .single();
        
        // Preparar dados da licitação principal
        const licitacaoData = {
          numero_controle_pncp: licitacao.numeroControlePNCP,
          ano_compra: licitacao.anoCompra,
          sequencial_compra: licitacao.sequencialCompra,
          numero_compra: licitacao.numeroCompra,
          data_atualizacao_global: licitacao.dataAtualizacaoGlobal || null,
          data_inclusao: licitacao.dataInclusao || null,
          data_publicacao_pncp: licitacao.dataPublicacaoPncp || null,
          data_atualizacao: licitacao.dataAtualizacao || null,
          data_abertura_proposta: licitacao.dataAberturaProposta || null,
          data_encerramento_proposta: licitacao.dataEncerramentoProposta || null,
          modalidade_id: licitacao.modalidadeId,
          modalidade_nome: licitacao.modalidadeNome,
          modo_disputa_id: licitacao.modoDisputaId,
          modo_disputa_nome: licitacao.modoDisputaNome,
          tipo_instrumento_convocatorio_codigo: licitacao.tipoInstrumentoConvocatorioCodigo,
          tipo_instrumento_convocatorio_nome: licitacao.tipoInstrumentoConvocatorioNome,
          srp: licitacao.srp,
          orgao_entidade: licitacao.orgaoEntidade,
          uf_nome: licitacao.unidadeOrgao?.ufNome,
          uf_sigla: licitacao.unidadeOrgao?.ufSigla,
          municipio_nome: licitacao.unidadeOrgao?.municipioNome,
          codigo_ibge: licitacao.unidadeOrgao?.codigoIbge,
          codigo_unidade: licitacao.unidadeOrgao?.codigoUnidade,
          nome_unidade: licitacao.unidadeOrgao?.nomeUnidade,
          unidade_orgao_completo: licitacao.unidadeOrgao,
          amparo_legal: licitacao.amparoLegal,
          processo: licitacao.processo,
          objeto_compra: licitacao.objetoCompra,
          informacao_complementar: licitacao.informacaoComplementar,
          link_sistema_origem: licitacao.linkSistemaOrigem,
          link_processo_eletronico: licitacao.linkProcessoEletronico,
          justificativa_presencial: licitacao.justificativaPresencial,
          valor_total_estimado: licitacao.valorTotalEstimado,
          valor_total_homologado: licitacao.valorTotalHomologado,
          situacao_compra_id: licitacao.situacaoCompraId,
          situacao_compra_nome: licitacao.situacaoCompraNome,
          unidade_sub_rogada: licitacao.unidadeSubRogada,
          orgao_sub_rogado: licitacao.orgaoSubRogado,
          fontes_orcamentarias: licitacao.fontesOrcamentarias,
          usuario_nome: licitacao.usuarioNome,
          updated_at: new Date().toISOString()
        };
        
        // Inserir ou atualizar licitação principal
        let licitacaoResult;
        if (existingData) {
          // Atualizar
          licitacaoResult = await supabase
            .from('licitacoes')
            .update(licitacaoData)
            .eq('numero_controle_pncp', licitacao.numeroControlePNCP);
        } else {
          // Inserir
          licitacaoResult = await supabase
            .from('licitacoes')
            .insert(licitacaoData);
        }
        
        if (licitacaoResult.error) {
          console.error('❌ Erro ao salvar licitação principal:', licitacaoResult.error);
          continue;
        }
        
        // Remover itens existentes para recriar
        await supabase
          .from('licitacao_itens')
          .delete()
          .eq('numero_controle_pncp', licitacao.numeroControlePNCP);
        
        // Inserir itens
        if (licitacao.itens && licitacao.itens.length > 0) {
          const itensData = licitacao.itens.map(item => ({
            numero_controle_pncp: licitacao.numeroControlePNCP,
            numero_item: item.numeroItem,
            descricao: item.descricao,
            material_ou_servico: item.materialOuServico,
            material_ou_servico_nome: item.materialOuServicoNome,
            item_categoria_id: item.itemCategoriaId,
            item_categoria_nome: item.itemCategoriaNome,
            valor_unitario_estimado: item.valorUnitarioEstimado,
            valor_total: item.valorTotal,
            quantidade: item.quantidade,
            unidade_medida: item.unidadeMedida,
            orcamento_sigiloso: item.orcamentoSigiloso,
            incentivo_produtivo_basico: item.incentivoProdutivoBasico,
            exigencia_conteudo_nacional: item.exigenciaConteudoNacional,
            criterio_julgamento_id: item.criterioJulgamentoId,
            criterio_julgamento_nome: item.criterioJulgamentoNome,
            situacao_compra_item: item.situacaoCompraItem,
            situacao_compra_item_nome: item.situacaoCompraItemNome,
            tipo_beneficio: item.tipoBeneficio,
            tipo_beneficio_nome: item.tipoBeneficioNome,
            ncm_nbs_codigo: item.ncmNbsCodigo,
            ncm_nbs_descricao: item.ncmNbsDescricao,
            dados_completos: item, // Salvar item completo como JSONB
            data_inclusao: item.dataInclusao,
            data_atualizacao: item.dataAtualizacao,
            tem_resultado: item.temResultado
          }));
          
          const itensResult = await supabase
            .from('licitacao_itens')
            .insert(itensData);
          
          if (itensResult.error) {
            console.error('❌ Erro ao salvar itens da licitação:', itensResult.error);
            continue;
          }
        }
        
        savedCount++;
        
      } catch (error) {
        console.error('❌ Erro ao salvar licitação no Supabase:', error);
        continue;
      }
    }
    
    console.log(`✅ Salvou ${savedCount}/${licitacoes.length} licitações no Supabase`);
    return savedCount;
  }
  
  /**
   * Busca licitação por ID (substitui getLicitacao do Pinecone)
   */
  async getLicitacao(numeroControlePNCP: string): Promise<PNCPLicitacao | null> {
    try {
      // Buscar licitação principal
      const { data: licitacaoData, error: licitacaoError } = await supabase
        .from('licitacoes')
        .select('*')
        .eq('numero_controle_pncp', numeroControlePNCP)
        .single();
      
      if (licitacaoError || !licitacaoData) {
        console.log(`⚠️ Licitação ${numeroControlePNCP} não encontrada no Supabase`);
        return null;
      }
      
      // Buscar itens relacionados
      const { data: itensData, error: itensError } = await supabase
        .from('licitacao_itens')
        .select('*')
        .eq('numero_controle_pncp', numeroControlePNCP)
        .order('numero_item');
      
      if (itensError) {
        console.error('❌ Erro ao buscar itens da licitação:', itensError);
        return null;
      }
      
      // Converter para formato PNCPLicitacao
      return this.mapToLicitacaoPNCP(licitacaoData, itensData || []);
      
    } catch (error) {
      console.error('❌ Erro ao buscar licitação no Supabase:', error);
      return null;
    }
  }
  
  /**
   * Busca todas as licitações (substitui getAllLicitacoes do Pinecone)
   */
  async getAllLicitacoes(): Promise<PNCPLicitacao[]> {
    try {
      console.log('🔄 Buscando todas as licitações no Supabase...');
      
      // Buscar licitações principais (limitado para performance)
      const { data: licitacoesData, error: licitacoesError } = await supabase
        .from('licitacoes')
        .select('*')
        .order('data_abertura_proposta', { ascending: false })
        .limit(1000);
      
      if (licitacoesError || !licitacoesData) {
        console.error('❌ Erro ao buscar licitações:', licitacoesError);
        return [];
      }
      
      console.log(`📊 Encontrou ${licitacoesData.length} licitações no Supabase`);
      
      // Buscar itens para cada licitação (otimizado)
      const numerosPNCP = licitacoesData.map(l => l.numero_controle_pncp);
      const { data: todosItens, error: itensError } = await supabase
        .from('licitacao_itens')
        .select('*')
        .in('numero_controle_pncp', numerosPNCP)
        .order('numero_controle_pncp, numero_item');
      
      if (itensError) {
        console.error('❌ Erro ao buscar itens das licitações:', itensError);
        return [];
      }
      
      // Agrupar itens por licitação
      const itensMap = new Map<string, any[]>();
      todosItens?.forEach(item => {
        if (!itensMap.has(item.numero_controle_pncp)) {
          itensMap.set(item.numero_controle_pncp, []);
        }
        itensMap.get(item.numero_controle_pncp)!.push(item);
      });
      
      // Converter para formato PNCPLicitacao
      const licitacoes: PNCPLicitacao[] = [];
      for (const licitacaoData of licitacoesData) {
        const itens = itensMap.get(licitacaoData.numero_controle_pncp) || [];
        const licitacao = this.mapToLicitacaoPNCP(licitacaoData, itens);
        if (licitacao && licitacao.itens?.length > 0) {
          licitacoes.push(licitacao);
        }
      }
      
      console.log(`✅ Retornando ${licitacoes.length} licitações completas`);
      return licitacoes;
      
    } catch (error) {
      console.error('❌ Erro ao buscar todas as licitações no Supabase:', error);
      return [];
    }
  }
  
  /**
   * Busca licitações com filtros (substitui buscarPorTexto do Pinecone para dados estruturais)
   */
  async findWithFilters(params: any): Promise<PNCPLicitacao[]> {
    try {
      console.log('🔍 Buscando licitações com filtros no Supabase:', params);
      
      let query = supabase.from('licitacoes').select('*');
      
      // Filtro de texto (busca full-text em português)
      if (params.texto && params.texto.trim()) {
        const textoLimpo = params.texto.trim().replace(/[^\w\s]/g, ' ');
        query = query.textSearch('objeto_compra', textoLimpo, {
          type: 'websearch',
          config: 'portuguese'
        });
      }
      
      // Filtros estruturais
      if (params.modalidade) {
        query = query.eq('modalidade_nome', params.modalidade);
      }
      
      if (params.uf) {
        query = query.eq('uf_sigla', params.uf);
      }
      
      if (params.municipio) {
        query = query.ilike('municipio_nome', `%${params.municipio}%`);
      }
      
      if (params.valorMin) {
        query = query.gte('valor_total_estimado', params.valorMin);
      }
      
      if (params.valorMax) {
        query = query.lte('valor_total_estimado', params.valorMax);
      }
      
      if (params.dataInicio) {
        query = query.gte('data_abertura_proposta', params.dataInicio);
      }
      
      if (params.dataFim) {
        query = query.lte('data_abertura_proposta', params.dataFim);
      }
      
      if (params.situacao) {
        query = query.eq('situacao_compra_nome', params.situacao);
      }
      
      // Ordenação e paginação
      query = query.order('data_abertura_proposta', { ascending: false })
                   .limit(params.limit || 100);
      
      const { data: licitacoesData, error } = await query;
      
      if (error || !licitacoesData) {
        console.error('❌ Erro na busca com filtros:', error);
        return [];
      }
      
      console.log(`📊 Encontrou ${licitacoesData.length} licitações com filtros`);
      
      // Buscar itens para cada licitação
      const numerosPNCP = licitacoesData.map(l => l.numero_controle_pncp);
      const { data: todosItens } = await supabase
        .from('licitacao_itens')
        .select('*')
        .in('numero_controle_pncp', numerosPNCP)
        .order('numero_controle_pncp, numero_item');
      
      // Agrupar itens por licitação
      const itensMap = new Map<string, any[]>();
      todosItens?.forEach(item => {
        if (!itensMap.has(item.numero_controle_pncp)) {
          itensMap.set(item.numero_controle_pncp, []);
        }
        itensMap.get(item.numero_controle_pncp)!.push(item);
      });
      
      // Converter para formato PNCPLicitacao
      const licitacoes: PNCPLicitacao[] = [];
      for (const licitacaoData of licitacoesData) {
        const itens = itensMap.get(licitacaoData.numero_controle_pncp) || [];
        const licitacao = this.mapToLicitacaoPNCP(licitacaoData, itens);
        if (licitacao) {
          licitacoes.push(licitacao);
        }
      }
      
      console.log(`✅ Retornando ${licitacoes.length} licitações filtradas`);
      return licitacoes;
      
    } catch (error) {
      console.error('❌ Erro na busca com filtros no Supabase:', error);
      return [];
    }
  }
  
  /**
   * Busca licitações por array de IDs (para busca híbrida com Pinecone)
   */
  async getLicitacoesByIds(ids: string[]): Promise<PNCPLicitacao[]> {
    try {
      if (!ids || ids.length === 0) return [];
      
      console.log(`🔍 Buscando ${ids.length} licitações por IDs no Supabase`);
      
      // Buscar licitações principais
      const { data: licitacoesData, error: licitacoesError } = await supabase
        .from('licitacoes')
        .select('*')
        .in('numero_controle_pncp', ids);
      
      if (licitacoesError || !licitacoesData) {
        console.error('❌ Erro ao buscar licitações por IDs:', licitacoesError);
        return [];
      }
      
      // Buscar itens para essas licitações
      const { data: todosItens } = await supabase
        .from('licitacao_itens')
        .select('*')
        .in('numero_controle_pncp', ids)
        .order('numero_controle_pncp, numero_item');
      
      // Agrupar itens por licitação
      const itensMap = new Map<string, any[]>();
      todosItens?.forEach(item => {
        if (!itensMap.has(item.numero_controle_pncp)) {
          itensMap.set(item.numero_controle_pncp, []);
        }
        itensMap.get(item.numero_controle_pncp)!.push(item);
      });
      
      // Converter para formato PNCPLicitacao
      const licitacoes: PNCPLicitacao[] = [];
      for (const licitacaoData of licitacoesData) {
        const itens = itensMap.get(licitacaoData.numero_controle_pncp) || [];
        const licitacao = this.mapToLicitacaoPNCP(licitacaoData, itens);
        if (licitacao) {
          licitacoes.push(licitacao);
        }
      }
      
      console.log(`✅ Retornando ${licitacoes.length} licitações por IDs`);
      return licitacoes;
      
    } catch (error) {
      console.error('❌ Erro ao buscar licitações por IDs no Supabase:', error);
      return [];
    }
  }
  
  /**
   * Mapeia dados do Supabase para formato PNCPLicitacao
   */
  private mapToLicitacaoPNCP(licitacaoData: any, itensData: any[]): PNCPLicitacao {
    // Mapear itens
    const itens: PNCPItem[] = itensData.map(item => ({
      numeroItem: item.numero_item,
      descricao: item.descricao,
      materialOuServico: item.material_ou_servico,
      materialOuServicoNome: item.material_ou_servico_nome,
      valorUnitarioEstimado: item.valor_unitario_estimado,
      valorTotal: item.valor_total,
      quantidade: item.quantidade,
      unidadeMedida: item.unidade_medida,
      orcamentoSigiloso: item.orcamento_sigiloso,
      itemCategoriaId: item.item_categoria_id,
      itemCategoriaNome: item.item_categoria_nome,
      patrimonio: null,
      codigoRegistroImobiliario: null,
      criterioJulgamentoId: item.criterio_julgamento_id,
      criterioJulgamentoNome: item.criterio_julgamento_nome,
      situacaoCompraItem: item.situacao_compra_item,
      situacaoCompraItemNome: item.situacao_compra_item_nome,
      tipoBeneficio: item.tipo_beneficio,
      tipoBeneficioNome: item.tipo_beneficio_nome,
      incentivoProdutivoBasico: item.incentivo_produtivo_basico,
      dataInclusao: item.data_inclusao,
      dataAtualizacao: item.data_atualizacao,
      temResultado: item.tem_resultado,
      imagem: 0,
      aplicabilidadeMargemPreferenciaNormal: false,
      aplicabilidadeMargemPreferenciaAdicional: false,
      percentualMargemPreferenciaNormal: null,
      percentualMargemPreferenciaAdicional: null,
      ncmNbsCodigo: item.ncm_nbs_codigo,
      ncmNbsDescricao: item.ncm_nbs_descricao,
      catalogo: null,
      categoriaItemCatalogo: null,
      catalogoCodigoItem: null,
      informacaoComplementar: null,
      tipoMargemPreferencia: null,
      exigenciaConteudoNacional: item.exigencia_conteudo_nacional
    }));
    
    // Mapear licitação principal
    const licitacao: PNCPLicitacao = {
      numeroControlePNCP: licitacaoData.numero_controle_pncp,
      dataAtualizacaoGlobal: licitacaoData.data_atualizacao_global,
      modalidadeId: licitacaoData.modalidade_id,
      srp: licitacaoData.srp,
      orgaoEntidade: licitacaoData.orgao_entidade || {
        cnpj: '',
        razaoSocial: '',
        poderId: '',
        esferaId: ''
      },
      anoCompra: licitacaoData.ano_compra,
      sequencialCompra: licitacaoData.sequencial_compra,
      dataInclusao: licitacaoData.data_inclusao,
      dataPublicacaoPncp: licitacaoData.data_publicacao_pncp,
      dataAtualizacao: licitacaoData.data_atualizacao,
      numeroCompra: licitacaoData.numero_compra,
      unidadeOrgao: licitacaoData.unidade_orgao_completo || {
        ufNome: licitacaoData.uf_nome,
        codigoIbge: licitacaoData.codigo_ibge,
        codigoUnidade: licitacaoData.codigo_unidade,
        nomeUnidade: licitacaoData.nome_unidade,
        ufSigla: licitacaoData.uf_sigla,
        municipioNome: licitacaoData.municipio_nome
      },
      amparoLegal: licitacaoData.amparo_legal || {
        descricao: '',
        nome: '',
        codigo: 0
      },
      dataAberturaProposta: licitacaoData.data_abertura_proposta,
      dataEncerramentoProposta: licitacaoData.data_encerramento_proposta,
      informacaoComplementar: licitacaoData.informacao_complementar,
      processo: licitacaoData.processo,
      objetoCompra: licitacaoData.objeto_compra,
      linkSistemaOrigem: licitacaoData.link_sistema_origem,
      justificativaPresencial: licitacaoData.justificativa_presencial,
      unidadeSubRogada: licitacaoData.unidade_sub_rogada,
      orgaoSubRogado: licitacaoData.orgao_sub_rogado,
      valorTotalHomologado: licitacaoData.valor_total_homologado,
      modoDisputaId: licitacaoData.modo_disputa_id,
      linkProcessoEletronico: licitacaoData.link_processo_eletronico,
      valorTotalEstimado: licitacaoData.valor_total_estimado,
      modalidadeNome: licitacaoData.modalidade_nome,
      modoDisputaNome: licitacaoData.modo_disputa_nome,
      tipoInstrumentoConvocatorioCodigo: licitacaoData.tipo_instrumento_convocatorio_codigo,
      tipoInstrumentoConvocatorioNome: licitacaoData.tipo_instrumento_convocatorio_nome,
      fontesOrcamentarias: licitacaoData.fontes_orcamentarias || [],
      situacaoCompraId: licitacaoData.situacao_compra_id,
      situacaoCompraNome: licitacaoData.situacao_compra_nome,
      usuarioNome: licitacaoData.usuario_nome,
      itens: itens
    };
    
    return licitacao;
  }
  
  // Métodos de municípios - Implementação básica (pode ser expandida)
  async loadMunicipiosToRedis(): Promise<number> {
    return 0;
  }

  async getMunicipioByIbge(codigoIbge: string): Promise<Municipio | null> {
    return null;
  }

  async getMunicipioByNome(nome: string): Promise<Municipio | null> {
    return null;
  }

  async checkMunicipiosLoaded(): Promise<boolean> {
    return false;
  }
  
  /**
   * NOVO: Método otimizado para verificar quais IDs já existem (em lote)
   * Usado para filtrar duplicatas de forma eficiente
   */
  async getExistingIds(ids: string[]): Promise<Set<string>> {
    try {
      if (!ids || ids.length === 0) return new Set();
      
      console.log(`🔍 Verificando existência de ${ids.length} IDs no Supabase...`);
      
      const { data, error } = await supabase
        .from('licitacoes')
        .select('numero_controle_pncp')
        .in('numero_controle_pncp', ids);
      
      if (error) {
        console.error('❌ Erro ao verificar IDs existentes:', error);
        return new Set();
      }
      
      const existingIds = new Set(data?.map(row => row.numero_controle_pncp) || []);
      console.log(`✅ Encontrou ${existingIds.size}/${ids.length} IDs existentes no Supabase`);
      
      return existingIds;
    } catch (error) {
      console.error('❌ Erro crítico ao verificar IDs:', error);
      return new Set();
    }
  }

  /**
   * Método de teste para verificar conectividade com Supabase
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testando conexão com Supabase...');
      
      // Fazer uma query simples para testar
      const { data, error } = await supabase
        .from('licitacoes')
        .select('numero_controle_pncp')
        .limit(1);
      
      if (error) {
        console.error('❌ Erro na conexão Supabase:', error);
        return false;
      }
      
      console.log('✅ Conexão Supabase OK');
      return true;
    } catch (error) {
      console.error('❌ Erro crítico na conexão Supabase:', error);
      return false;
    }
  }

  // NOVO: Busca full-text avançada (objeto_compra + itens.descricao)
  async findWithFullTextSearch(params: any): Promise<PNCPLicitacao[]> {
    try {
      console.log('🔍 Executando busca full-text no Supabase:', params);
      console.log('🔍 Buscando por:', params.texto);
      
      let query = supabase
        .from('licitacoes')
        .select(`
          *,
          licitacao_itens (
            id,
            numero_item,
            descricao,
            material_ou_servico_nome,
            item_categoria_nome,
            valor_unitario_estimado,
            valor_total,
            quantidade,
            unidade_medida,
            criterio_julgamento_nome,
            situacao_compra_item_nome,
            ncm_nbs_codigo,
            ncm_nbs_descricao
          )
        `);

      // 1. BUSCA POR ID PNCP (exata)
      if (params.texto && this.isPNCPId(params.texto)) {
        query = query.eq('numero_controle_pncp', params.texto);
      } 
      // 2. BUSCA TEXTO COMPLETO (objeto_compra)
      else if (params.texto) {
        console.log('🔍 Buscando texto completo:', params.texto);
        
        // Busca ILIKE pelo texto completo no objeto_compra
        query = query.ilike('objeto_compra', `%${params.texto}%`);
      }

      // 3. FILTROS ADICIONAIS
      if (params.valorMin) {
        query = query.gte('valor_total_estimado', params.valorMin);
      }
      
      if (params.valorMax) {
        query = query.lte('valor_total_estimado', params.valorMax);
      }
      
      if (params.modalidade) {
        query = query.ilike('modalidade_nome', `%${params.modalidade}%`);
      }
      
      if (params.dataInicio) {
        query = query.gte('data_abertura_proposta', params.dataInicio);
      }
      
      if (params.dataFim) {
        query = query.lte('data_encerramento_proposta', params.dataFim);
      }

      // 4. ORDENAÇÃO E LIMITE
      query = query
        .order('data_publicacao_pncp', { ascending: false })
        .limit(params.limit || 100);

      const { data, error } = await query;

      if (error) {
        console.error('❌ Erro na busca full-text:', error);
        throw new Error(`Erro na busca: ${error.message}`);
      }

      console.log(`📊 Full-text search retornou ${data?.length || 0} resultados`);
      
      // Converter dados do Supabase para formato esperado pelo frontend
      const licitacoesFormatadas = (data || []).map(this.adaptSupabaseToFrontend);
      
      return licitacoesFormatadas as PNCPLicitacao[];

    } catch (error) {
      console.error('❌ Erro na busca full-text:', error);
      throw error;
    }
  }

  // Helper para detectar ID PNCP
  private isPNCPId(texto: string): boolean {
    // Formato: 99999999999999-9-999999/9999
    const pncpPattern = /^\d{14}-\d-\d{6}\/\d{4}$/;
    return pncpPattern.test(texto);
  }

  // Adaptador: Converte dados do Supabase para formato esperado pelo frontend
  private adaptSupabaseToFrontend(supabaseData: any): any {
    return {
      // ✅ CAMPOS PRINCIPAIS
      numeroControlePNCP: supabaseData.numero_controle_pncp,
      objetoCompra: supabaseData.objeto_compra,
      valorTotalEstimado: supabaseData.valor_total_estimado,
      valorTotalHomologado: supabaseData.valor_total_homologado,
      
      // ✅ DATAS
      dataAberturaProposta: supabaseData.data_abertura_proposta,
      dataEncerramentoProposta: supabaseData.data_encerramento_proposta,
      dataPublicacaoPncp: supabaseData.data_publicacao_pncp,
      dataAtualizacaoGlobal: supabaseData.data_atualizacao_global,
      dataInclusao: supabaseData.data_inclusao,
      dataAtualizacao: supabaseData.data_atualizacao,
      
      // ✅ MODALIDADE E SITUAÇÃO
      modalidadeId: supabaseData.modalidade_id,
      modalidadeNome: supabaseData.modalidade_nome,
      situacaoCompraId: supabaseData.situacao_compra_id,
      situacaoCompraNome: supabaseData.situacao_compra_nome,
      
      // ✅ MODO DE DISPUTA
      modoDisputaId: supabaseData.modo_disputa_id,
      modoDisputaNome: supabaseData.modo_disputa_nome,
      
      // ✅ TIPO INSTRUMENTO
      tipoInstrumentoConvocatorioCodigo: supabaseData.tipo_instrumento_convocatorio_codigo,
      tipoInstrumentoConvocatorioNome: supabaseData.tipo_instrumento_convocatorio_nome,
      
      // ✅ COMPRA INFO
      anoCompra: supabaseData.ano_compra,
      sequencialCompra: supabaseData.sequencial_compra,
      numeroCompra: supabaseData.numero_compra,
      srp: supabaseData.srp || false,
      
      // ✅ ÓRGÃO ENTIDADE (JSONB → Objeto)
      orgaoEntidade: {
        cnpj: supabaseData.orgao_entidade?.cnpj || '',
        razaoSocial: supabaseData.orgao_entidade?.razaoSocial || 'Não informado',
        poderId: supabaseData.orgao_entidade?.poderId || '',
        esferaId: supabaseData.orgao_entidade?.esferaId || ''
      },
      
      // ✅ UNIDADE ÓRGÃO
      unidadeOrgao: {
        ufNome: supabaseData.uf_nome || '',
        codigoIbge: supabaseData.codigo_ibge || '',
        codigoUnidade: supabaseData.codigo_unidade || '',
        nomeUnidade: supabaseData.nome_unidade || '',
        ufSigla: supabaseData.uf_sigla || '',
        municipioNome: supabaseData.municipio_nome || 'Não informado'
      },
      
      // ✅ AMPARO LEGAL (JSONB → Objeto)
      amparoLegal: {
        descricao: supabaseData.amparo_legal?.descricao || '',
        nome: supabaseData.amparo_legal?.nome || '',
        codigo: supabaseData.amparo_legal?.codigo || 0
      },
      
      // ✅ INFORMAÇÕES COMPLEMENTARES
      informacaoComplementar: supabaseData.informacao_complementar || '',
      processo: supabaseData.processo || '',
      linkSistemaOrigem: supabaseData.link_sistema_origem || '',
      linkProcessoEletronico: supabaseData.link_processo_eletronico || null,
      justificativaPresencial: supabaseData.justificativa_presencial || null,
      
      // ✅ DADOS ADICIONAIS (JSONB)
      unidadeSubRogada: supabaseData.unidade_sub_rogada || null,
      orgaoSubRogado: supabaseData.orgao_sub_rogado || null,
      fontesOrcamentarias: supabaseData.fontes_orcamentarias || [],
      
      // ✅ USUÁRIO
      usuarioNome: supabaseData.usuario_nome || '',
      
      // ✅ ITENS DA LICITAÇÃO (adaptados)
      itens: (supabaseData.licitacao_itens || []).map((item: any) => ({
        numeroItem: item.numero_item,
        descricao: item.descricao,
        materialOuServico: item.material_ou_servico,
        materialOuServicoNome: item.material_ou_servico_nome,
        valorUnitarioEstimado: item.valor_unitario_estimado,
        valorTotal: item.valor_total,
        quantidade: item.quantidade,
        unidadeMedida: item.unidade_medida,
        orcamentoSigiloso: item.orcamento_sigiloso || false,
        itemCategoriaId: item.item_categoria_id,
        itemCategoriaNome: item.item_categoria_nome,
        criterioJulgamentoId: item.criterio_julgamento_id,
        criterioJulgamentoNome: item.criterio_julgamento_nome,
        situacaoCompraItem: item.situacao_compra_item,
        situacaoCompraItemNome: item.situacao_compra_item_nome,
        tipoBeneficio: item.tipo_beneficio,
        tipoBeneficioNome: item.tipo_beneficio_nome,
        incentivoProdutivoBasico: item.incentivo_produtivo_basico || false,
        dataInclusao: item.data_inclusao,
        dataAtualizacao: item.data_atualizacao,
        temResultado: item.tem_resultado || false,
        ncmNbsCodigo: item.ncm_nbs_codigo,
        ncmNbsDescricao: item.ncm_nbs_descricao,
        exigenciaConteudoNacional: item.exigencia_conteudo_nacional || false,
        // Campos que podem não existir no Supabase mas o frontend espera
        imagem: 0,
        aplicabilidadeMargemPreferenciaNormal: false,
        aplicabilidadeMargemPreferenciaAdicional: false,
        informacaoComplementar: null
      })),
      
      // ✅ CAMPOS PARA COMPATIBILIDADE COM FRONTEND
      matchScore: 0, // Default, será calculado se necessário
      status: 'nova' as const // Default status
    };
  }

  // NOVO: Métodos para rollback (deletar dados)
  async deleteItemsByLicitacaoIds(licitacaoIds: string[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('licitacao_itens')
        .delete()
        .in('numero_controle_pncp', licitacaoIds);

      if (error) {
        throw new Error(`Erro ao deletar itens: ${error.message}`);
      }

      console.log(`🗑️ Deletados itens de ${licitacaoIds.length} licitações`);
    } catch (error) {
      console.error('❌ Erro ao deletar itens:', error);
      throw error;
    }
  }

  async deleteLicitacoesByIds(licitacaoIds: string[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('licitacoes')
        .delete()
        .in('numero_controle_pncp', licitacaoIds);

      if (error) {
        throw new Error(`Erro ao deletar licitações: ${error.message}`);
      }

      console.log(`🗑️ Deletadas ${licitacaoIds.length} licitações`);
    } catch (error) {
      console.error('❌ Erro ao deletar licitações:', error);
      throw error;
    }
  }
}

// Export com mesma interface do Pinecone para compatibilidade
const supabaseLicitacaoRepository = new SupabaseLicitacaoRepository();

export default {
  saveLicitacoes: (licitacoes: PNCPLicitacao[]) => supabaseLicitacaoRepository.saveLicitacoes(licitacoes),
  getLicitacao: (numeroControlePNCP: string) => supabaseLicitacaoRepository.getLicitacao(numeroControlePNCP),
  getAllLicitacoes: () => supabaseLicitacaoRepository.getAllLicitacoes(),
  findWithFilters: (params: any) => supabaseLicitacaoRepository.findWithFilters(params),
  findWithFullTextSearch: (params: any) => supabaseLicitacaoRepository.findWithFullTextSearch(params), // NOVO: Full-text search
  getLicitacoesByIds: (ids: string[]) => supabaseLicitacaoRepository.getLicitacoesByIds(ids),
  getExistingIds: (ids: string[]) => supabaseLicitacaoRepository.getExistingIds(ids), // NOVO método simples
  loadMunicipiosToRedis: () => supabaseLicitacaoRepository.loadMunicipiosToRedis(),
  getMunicipioByIbge: (codigoIbge: string) => supabaseLicitacaoRepository.getMunicipioByIbge(codigoIbge),
  getMunicipioByNome: (nome: string) => supabaseLicitacaoRepository.getMunicipioByNome(nome),
  checkMunicipiosLoaded: () => supabaseLicitacaoRepository.checkMunicipiosLoaded(),
  testConnection: () => supabaseLicitacaoRepository.testConnection(),
  // NOVO: Métodos para rollback
  deleteItemsByLicitacaoIds: (ids: string[]) => supabaseLicitacaoRepository.deleteItemsByLicitacaoIds(ids),
  deleteLicitacoesByIds: (ids: string[]) => supabaseLicitacaoRepository.deleteLicitacoesByIds(ids)
};
