"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const licitacaoDashboardService_1 = __importDefault(require("../../services/licitacao/licitacaoDashboardService"));
const obterDashboard = async (req, res) => {
    try {
        const { cnpj } = req.params;
        if (!cnpj) {
            return res.status(400).json({
                error: 'CNPJ é obrigatório'
            });
        }
        const resultado = await licitacaoDashboardService_1.default.obterDashboard(cnpj);
        return res.json(resultado);
    }
    catch (error) {
        return res.status(500).json({
            error: error.message || 'Erro interno do servidor'
        });
    }
};
exports.default = { obterDashboard };
