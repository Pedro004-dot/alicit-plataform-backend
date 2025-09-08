"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const licitacaoEmpresaEstagiosRepository_1 = __importDefault(require("../../repositories/licitacaoEmpresaEstagiosRepository"));
class LicitacaoEmpresaEstagiosService {
    async listarLicitacoesComEstagios(empresaCnpj) {
        const licitacoes = await licitacaoEmpresaEstagiosRepository_1.default.listarLicitacoesComEstagios(empresaCnpj);
        const licitacoesFormatadas = licitacoes.map(licitacao => {
            const estagioAtivo = licitacao.licitacao_estagios?.find(estagio => estagio.ativo);
            const licitacaoData = Array.isArray(licitacao.licitacoes) ? licitacao.licitacoes[0] : licitacao.licitacoes;
            return {
                id: licitacao.id,
                numeroControlePNCP: licitacao.numero_controle_pncp,
                statusAprovacao: licitacao.status,
                dataAprovacao: licitacao.data_aprovacao,
                objetoCompra: licitacaoData?.objeto_compra,
                valorTotalEstimado: licitacaoData?.valor_total_estimado,
                dataAberturaProposta: licitacaoData?.data_abertura_proposta,
                dataEncerramentoProposta: licitacaoData?.data_encerramento_proposta,
                modalidadeNome: licitacaoData?.modalidade_nome,
                situacaoCompraNome: licitacaoData?.situacao_compra_nome,
                estagioAtual: {
                    id: estagioAtivo?.id,
                    estagio: estagioAtivo?.estagio,
                    dataInicio: estagioAtivo?.data_inicio,
                    dataFim: estagioAtivo?.data_fim,
                    observacoes: estagioAtivo?.observacoes
                }
            };
        });
        return {
            success: true,
            data: licitacoesFormatadas,
            total: licitacoesFormatadas.length
        };
    }
}
exports.default = new LicitacaoEmpresaEstagiosService();
