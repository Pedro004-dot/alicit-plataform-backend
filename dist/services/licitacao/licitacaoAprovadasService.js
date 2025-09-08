"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const licitacaoDecisaoRepository_1 = __importDefault(require("../../repositories/licitacaoDecisaoRepository"));
class LicitacaoAprovadasService {
    async listarLicitacoesAprovadas(empresaCnpj) {
        const licitacoes = await licitacaoDecisaoRepository_1.default
            .listarLicitacoesAprovadas(empresaCnpj);
        return {
            success: true,
            data: licitacoes,
            total: licitacoes.length
        };
    }
}
exports.default = new LicitacaoAprovadasService();
