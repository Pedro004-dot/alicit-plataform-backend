"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const licitacaoDecisaoRepository_1 = __importDefault(require("../../repository/licitacaoDecisaoRepository"));
const pineconeLicitacaoRepository_1 = __importDefault(require("../../repositories/pineconeLicitacaoRepository"));
class LicitacaoProcessarDecisaoService {
    async processarDecisao(dados) {
        const decisaoExistente = await licitacaoDecisaoRepository_1.default
            .verificarDecisaoExistente(dados.numeroControlePNCP, dados.empresaCnpj);
        if (decisaoExistente) {
            return decisaoExistente;
        }
        const licitacaoCompleta = await pineconeLicitacaoRepository_1.default
            .getLicitacao(dados.numeroControlePNCP);
        if (!licitacaoCompleta) {
            throw new Error('Licitação não encontrada no banco de dados');
        }
        await licitacaoDecisaoRepository_1.default.salvarLicitacaoCompleta(licitacaoCompleta);
        const licitacaoEmpresa = await licitacaoDecisaoRepository_1.default.salvarDecisao(dados);
        if (dados.statusAprovacao === 'aprovada') {
            await licitacaoDecisaoRepository_1.default.criarEstagio({
                licitacaoEmpresaId: licitacaoEmpresa.id,
                estagio: 'analise'
            });
        }
        return {
            success: true,
            data: {
                licitacaoEmpresa,
                licitacao: licitacaoCompleta
            },
            message: `Licitação ${dados.statusAprovacao} com sucesso`
        };
    }
}
exports.default = new LicitacaoProcessarDecisaoService();
