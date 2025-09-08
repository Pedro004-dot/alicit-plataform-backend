"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("@supabase/supabase-js");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
class LicitacaoEmpresaEstagiosRepository {
    async listarLicitacoesComEstagios(empresaCnpj) {
        const { data, error } = await supabase
            .from('licitacoes_empresa')
            .select(`
        id,
        numero_controle_pncp,
        status,
        data_aprovacao,
        licitacao_estagios (
          id,
          estagio,
          data_inicio,
          data_fim,
          ativo,
          observacoes
        ),
        licitacoes (
          objeto_compra,
          valor_total_estimado,
          data_abertura_proposta,
          data_encerramento_proposta,
          modalidade_nome,
          situacao_compra_nome
        )
      `)
            .eq('empresa_cnpj', empresaCnpj)
            .eq('status', 'aprovado')
            .order('data_aprovacao', { ascending: false });
        if (error) {
            throw new Error(`Erro ao buscar licitações: ${error.message}`);
        }
        return data || [];
    }
    async contarLicitacoesPorEstagio(empresaCnpj) {
        const { data, error } = await supabase
            .from('licitacoes_empresa')
            .select(`
        id,
        licitacao_estagios!inner (
          estagio,
          ativo
        )
      `)
            .eq('empresa_cnpj', empresaCnpj)
            .eq('status', 'aprovado')
            .eq('licitacao_estagios.ativo', true);
        if (error) {
            throw new Error(`Erro ao contar licitações por estágio: ${error.message}`);
        }
        const contadores = {
            analise: 0,
            aguardando_confirmacao: 0,
            impugnacao: 0,
            enviada: 0,
            vencida: 0,
            perdida: 0,
            total: 0
        };
        data?.forEach(licitacao => {
            const estagio = licitacao.licitacao_estagios?.[0]?.estagio;
            if (estagio && contadores.hasOwnProperty(estagio)) {
                contadores[estagio]++;
                contadores.total++;
            }
        });
        return contadores;
    }
}
exports.default = new LicitacaoEmpresaEstagiosRepository();
