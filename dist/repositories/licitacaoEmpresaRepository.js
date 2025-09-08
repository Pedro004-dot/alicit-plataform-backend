import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const criar = async (data) => {
    const { data: result, error } = await supabase
        .from('licitacoes_empresa')
        .insert({
        empresa_cnpj: data.cnpjEmpresa,
        numero_controle_pncp: data.numeroControlePNCP,
        status: data.status,
        data_aprovacao: new Date().toISOString()
    })
        .select()
        .single();
    if (error) {
        throw new Error(`Erro ao criar licitacao_empresa: ${error.message}`);
    }
    return result;
};
const atualizarStatus = async (id, status) => {
    const { data, error } = await supabase
        .from('licitacoes_empresa')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
    if (error) {
        throw new Error(`Erro ao atualizar status: ${error.message}`);
    }
    return data;
};
const listarPorEmpresa = async (cnpj) => {
    // Decodificar CNPJ da URL (pode vir com %2F etc)
    const cnpjDecodificado = decodeURIComponent(cnpj);
    const { data, error } = await supabase
        .from('licitacoes_empresa')
        .select(`
      id,
      status,
      data_aprovacao,
      numero_controle_pncp,
      licitacoes (
        numero_controle_pncp,
        objeto_compra,
        valor_total_estimado,
        data_abertura_proposta,
        data_encerramento_proposta,
        modalidade_nome,
        orgao_entidade,
        situacao_compra_nome
      )
    `)
        .eq('empresa_cnpj', cnpjDecodificado)
        .order('data_aprovacao', { ascending: false });
    if (error) {
        throw new Error(`Erro ao listar licitacoes: ${error.message}`);
    }
    // Mapear dados para formato esperado pelo frontend
    const licitacoesMapeadas = (data || []).map((item) => ({
        id: item.id,
        cnpjEmpresa: cnpjDecodificado,
        numeroControlePNCP: item.numero_controle_pncp,
        status: item.status,
        dataAtualizacao: item.data_aprovacao,
        licitacao: item.licitacoes ? {
            numeroControlePNCP: item.licitacoes.numero_controle_pncp,
            objetoCompra: item.licitacoes.objeto_compra,
            valorTotalEstimado: item.licitacoes.valor_total_estimado || 0,
            dataAberturaProposta: item.licitacoes.data_abertura_proposta,
            dataEncerramentoProposta: item.licitacoes.data_encerramento_proposta,
            modalidadeNome: item.licitacoes.modalidade_nome,
            orgaoEntidade: {
                razaoSocial: item.licitacoes.orgao_entidade?.razaoSocial || 'Órgão não identificado'
            },
            situacaoCompraNome: item.licitacoes.situacao_compra_nome
        } : null
    }));
    return licitacoesMapeadas;
};
const buscarPorId = async (id) => {
    const { data, error } = await supabase
        .from('licitacoes_empresa')
        .select(`
      id,
      status,
      data_aprovacao,
      empresa_cnpj,
      licitacoes (
        numero_controle_pncp,
        objeto_compra,
        valor_total_estimado,
        data_abertura_proposta,
        modalidade_nome,
        situacao_compra_nome
      )
    `)
        .eq('id', id)
        .single();
    if (error && error.code !== 'PGRST116') {
        throw new Error(`Erro ao buscar licitacao: ${error.message}`);
    }
    return data;
};
const buscarPorChaves = async (numeroControlePNCP, empresaCnpj) => {
    const { data, error } = await supabase
        .from('licitacoes_empresa')
        .select('*')
        .eq('numero_controle_pncp', numeroControlePNCP)
        .eq('empresa_cnpj', empresaCnpj)
        .single();
    if (error && error.code !== 'PGRST116') {
        throw new Error(`Erro ao buscar licitacao: ${error.message}`);
    }
    return data;
};
const deletar = async (id) => {
    const { error } = await supabase
        .from('licitacoes_empresa')
        .delete()
        .eq('id', id);
    if (error) {
        throw new Error(`Erro ao deletar licitacao: ${error.message}`);
    }
};
export default {
    criar,
    atualizarStatus,
    listarPorEmpresa,
    buscarPorId,
    buscarPorChaves,
    deletar
};
