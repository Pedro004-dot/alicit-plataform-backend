import { supabase } from '../config/supabase';

interface LicitacaoDecisaoData {
  numeroControlePNCP: string;
  empresaCnpj: string;
  statusAprovacao: 'aprovada' | 'recusada';
}

interface PNCPLicitacao {
  numeroControlePNCP: string;
  anoCompra: number;
  sequencialCompra: number;
  numeroCompra: string;
  dataAtualizacaoGlobal: string;
  dataInclusao: string;
  dataPublicacaoPncp: string;
  dataAtualizacao: string;
  dataAberturaProposta: string;
  dataEncerramentoProposta: string;
  modalidadeId: number;
  modalidadeNome: string;
  modoDisputaId: number;
  modoDisputaNome: string;
  tipoInstrumentoConvocatorioCodigo: number;
  tipoInstrumentoConvocatorioNome: string;
  srp: boolean;
  orgaoEntidade: any;
  unidadeOrgao: {
    ufNome: string;
    codigoIbge: string;
    codigoUnidade: string;
    nomeUnidade: string;
    ufSigla: string;
    municipioNome: string;
  };
  amparoLegal: any;
  processo: string;
  objetoCompra: string;
  informacaoComplementar: string;
  linkSistemaOrigem: string;
  linkProcessoEletronico: string | null;
  justificativaPresencial: string | null;
  valorTotalEstimado: number;
  valorTotalHomologado: number | null;
  situacaoCompraId: number;
  situacaoCompraNome: string;
  unidadeSubRogada: any;
  orgaoSubRogado: any;
  fontesOrcamentarias: any[];
  usuarioNome: string;
  itens: any[];
}

interface EstagioData {
  licitacaoEmpresaId: string;
  estagio: string;
}

class LicitacaoDecisaoRepository {
  async salvarLicitacaoCompleta(licitacao: PNCPLicitacao) {
    // Salvar licitação principal usando UPSERT para evitar duplicatas
    const { data: licitacaoData, error: licitacaoError } = await supabase
      .from('licitacoes')
      .upsert({
        numero_controle_pncp: licitacao.numeroControlePNCP,
        ano_compra: licitacao.anoCompra,
        sequencial_compra: licitacao.sequencialCompra,
        numero_compra: licitacao.numeroCompra,
        data_atualizacao_global: licitacao.dataAtualizacaoGlobal,
        data_inclusao: licitacao.dataInclusao,
        data_publicacao_pncp: licitacao.dataPublicacaoPncp,
        data_atualizacao: licitacao.dataAtualizacao,
        data_abertura_proposta: licitacao.dataAberturaProposta,
        data_encerramento_proposta: licitacao.dataEncerramentoProposta,
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
      })
      .select()
      .single();

    if (licitacaoError) {
      throw new Error(`Erro ao salvar licitação: ${licitacaoError.message}`);
    }

    // Salvar itens da licitação (limpar itens existentes e inserir novos)
    if (licitacao.itens && licitacao.itens.length > 0) {
      // Deletar itens existentes
      await supabase
        .from('licitacao_itens')
        .delete()
        .eq('numero_controle_pncp', licitacao.numeroControlePNCP);

      // Inserir novos itens
      const itensFormatados = licitacao.itens.map(item => ({
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
        dados_completos: item,
        data_inclusao: item.dataInclusao,
        data_atualizacao: item.dataAtualizacao,
        tem_resultado: item.temResultado
      }));

      const { error: itensError } = await supabase
        .from('licitacao_itens')
        .insert(itensFormatados);

      if (itensError) {
        throw new Error(`Erro ao salvar itens da licitação: ${itensError.message}`);
      }
    }

    return licitacaoData;
  }

  async salvarDecisao(dados: LicitacaoDecisaoData) {
    const { data, error } = await supabase
      .from('licitacoes_empresa')
      .insert({
        numero_controle_pncp: dados.numeroControlePNCP,
        empresa_cnpj: dados.empresaCnpj,
        status: dados.statusAprovacao,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao salvar decisão: ${error.message}`);
    }

    return data;
  }

  async verificarDecisaoExistente(numeroControlePNCP: string, empresaCnpj: string) {
    const { data, error } = await supabase
      .from('licitacoes_empresa')
      .select('*')
      .eq('numero_controle_pncp', numeroControlePNCP)
      .eq('empresa_cnpj', empresaCnpj)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao verificar decisão: ${error.message}`);
    }

    return data;
  }

  async getLicitacao(numeroControlePNCP: string) {
    const { data, error } = await supabase
      .from('licitacoes')
      .select('*')
      .eq('numero_controle_pncp', numeroControlePNCP)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao buscar licitação: ${error.message}`);
    }

    return data;
  }

  async criarOuAtualizarDecisao(dados: LicitacaoDecisaoData) {
    const decisaoExistente = await this.verificarDecisaoExistente(dados.numeroControlePNCP, dados.empresaCnpj);

    if (decisaoExistente) {
      const { data, error } = await supabase
        .from('licitacoes_empresa')
        .update({
          status: dados.statusAprovacao
        })
        .eq('numero_controle_pncp', dados.numeroControlePNCP)
        .eq('empresa_cnpj', dados.empresaCnpj)
        .select()
        .single();

      if (error) throw new Error(`Erro ao atualizar decisão: ${error.message}`);
      return data;
    }

    return await this.salvarDecisao(dados);
  }

  async criarEstagio(dados: EstagioData) {
    const { data, error } = await supabase
      .from('licitacao_estagios')
      .insert({
        licitacao_empresa_id: dados.licitacaoEmpresaId,
        estagio: dados.estagio,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar estágio: ${error.message}`);
    }

    return data;
  }

  async listarLicitacoesAprovadas(empresaCnpj: string) {
    const { data, error } = await supabase
      .from('licitacoes_empresa')
      .select(`
        *,
        licitacoes!inner(
          numero_controle_pncp,
          objeto_compra,
          modalidade_nome,
          valor_total_estimado,
          data_abertura_proposta,
          data_encerramento_proposta,
          uf_sigla,
          municipio_nome,
          situacao_compra_nome
        ),
        licitacao_estagios!inner(
          id,
          estagio,
          data_inicio,
          data_fim,
          ativo,
          observacoes
        )
      `)
      .eq('empresa_cnpj', empresaCnpj)
      .eq('status', 'aprovada')
      .eq('licitacao_estagios.ativo', true);

    if (error) {
      throw new Error(`Erro ao listar licitações aprovadas: ${error.message}`);
    }

    return data;
  }

  async atualizarEstagio(licitacaoEmpresaId: string, novoEstagio: string, observacoes?: string) {
    // Finalizar estágio atual
    await supabase
      .from('licitacao_estagios')
      .update({
        ativo: false,
        data_fim: new Date().toISOString(),
      })
      .eq('licitacao_empresa_id', licitacaoEmpresaId)
      .eq('ativo', true);

    // Criar novo estágio
    const { data, error } = await supabase
      .from('licitacao_estagios')
      .insert({
        licitacao_empresa_id: licitacaoEmpresaId,
        estagio: novoEstagio,
        observacoes,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar estágio: ${error.message}`);
    }

    return data;
  }
}

export default new LicitacaoDecisaoRepository();