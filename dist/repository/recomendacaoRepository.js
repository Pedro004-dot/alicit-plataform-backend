"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("../config/supabase");
class RecomendacaoRepository {
    async salvarRecomendacoes(recomendacoes) {
        const recomendacoesFormatadas = recomendacoes.map(rec => ({
            numero_controle_pncp: rec.numeroControlePNCP,
            empresa_cnpj: rec.empresaCnpj.replace(/[.\-\/]/g, ''), // Remove formatação do CNPJ
            status: 'recusada', // Recomendações usam 'recusada' + origem_recomendacao = true
            origem_recomendacao: true,
            match_score: rec.matchScore,
            data_matching: new Date().toISOString(),
            detalhes_matching: rec.detalhesMatching
        }));
        const { data, error } = await supabase_1.supabase
            .from('licitacoes_empresa')
            .upsert(recomendacoesFormatadas, {
            onConflict: 'numero_controle_pncp,empresa_cnpj',
            ignoreDuplicates: false
        })
            .select();
        if (error) {
            throw new Error(`Erro ao salvar recomendações: ${error.message}`);
        }
        return data || [];
    }
    async listarRecomendacoesPendentes(empresaCnpj) {
        const cnpjLimpo = empresaCnpj.replace(/[.\-\/]/g, ''); // Remove formatação
        const { data, error } = await supabase_1.supabase
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
          situacao_compra_nome,
          orgao_entidade,
          unidade_orgao_completo,
          amparo_legal,
          processo,
          informacao_complementar,
          link_sistema_origem,
          link_processo_eletronico,
          justificativa_presencial,
          valor_total_homologado,
          situacao_compra_id,
          unidade_sub_rogada,
          orgao_sub_rogado,
          fontes_orcamentarias,
          usuario_nome,
          licitacao_itens(*)
        )
      `)
            .eq('empresa_cnpj', cnpjLimpo)
            .eq('origem_recomendacao', true)
            .eq('status', 'recusada') // Recomendações usam 'recusada' temporariamente
            .order('match_score', { ascending: false })
            .order('data_matching', { ascending: false });
        if (error) {
            throw new Error(`Erro ao listar recomendações: ${error.message}`);
        }
        return data || [];
    }
    async removerRecomendacao(numeroControlePNCP, empresaCnpj) {
        const cnpjLimpo = empresaCnpj.replace(/[.\-\/]/g, ''); // Remove formatação
        const { error } = await supabase_1.supabase
            .from('licitacoes_empresa')
            .delete()
            .eq('numero_controle_pncp', numeroControlePNCP)
            .eq('empresa_cnpj', cnpjLimpo)
            .eq('origem_recomendacao', true);
        if (error) {
            throw new Error(`Erro ao remover recomendação: ${error.message}`);
        }
    }
    async limparRecomendacoesAntigas(diasParaExpirar) {
        const dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() - diasParaExpirar);
        const { data, error } = await supabase_1.supabase
            .from('licitacoes_empresa')
            .delete()
            .eq('origem_recomendacao', true)
            .eq('status', 'recusada') // Recomendações usam 'recusada' temporariamente
            .lt('data_matching', dataLimite.toISOString())
            .select('id');
        if (error) {
            throw new Error(`Erro ao limpar recomendações antigas: ${error.message}`);
        }
        return data?.length || 0;
    }
    async verificarRecomendacaoExistente(numeroControlePNCP, empresaCnpj) {
        const cnpjLimpo = empresaCnpj.replace(/[.\-\/]/g, ''); // Remove formatação
        const { data, error } = await supabase_1.supabase
            .from('licitacoes_empresa')
            .select('*')
            .eq('numero_controle_pncp', numeroControlePNCP)
            .eq('empresa_cnpj', cnpjLimpo)
            .eq('origem_recomendacao', true)
            .single();
        if (error && error.code !== 'PGRST116') {
            throw new Error(`Erro ao verificar recomendação: ${error.message}`);
        }
        return data;
    }
}
exports.default = new RecomendacaoRepository();
