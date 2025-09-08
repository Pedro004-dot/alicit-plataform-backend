"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const licitacaoEmpresaEstagiosRepository_1 = __importDefault(require("../../repositories/licitacaoEmpresaEstagiosRepository"));
class LicitacaoDashboardService {
    async obterDashboard(empresaCnpj) {
        const contadores = await licitacaoEmpresaEstagiosRepository_1.default.contarLicitacoesPorEstagio(empresaCnpj);
        return {
            success: true,
            data: contadores,
            message: 'Dashboard de licitações obtido com sucesso'
        };
    }
}
exports.default = new LicitacaoDashboardService();
