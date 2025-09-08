"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const licitacaoDecisaoRepository_1 = __importDefault(require("../../repository/licitacaoDecisaoRepository"));
class LicitacaoAtualizarEstagioService {
    async atualizarEstagio(dados) {
        const estagiosValidos = ['analise', 'impugnacao', 'proposta', 'aguardando confirmacao'];
        if (!estagiosValidos.includes(dados.novoEstagio)) {
            throw new Error(`Estágio inválido. Estágios válidos: ${estagiosValidos.join(', ')}`);
        }
        const novoEstagio = await licitacaoDecisaoRepository_1.default
            .atualizarEstagio(dados.licitacaoEmpresaId, dados.novoEstagio, dados.observacoes);
        return {
            success: true,
            data: novoEstagio,
            message: `Estágio atualizado para '${dados.novoEstagio}'`
        };
    }
}
exports.default = new LicitacaoAtualizarEstagioService();
