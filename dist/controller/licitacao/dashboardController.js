"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dashboardService_1 = __importDefault(require("../../services/licitacao/dashboardService"));
const getDashboardData = async (req, res) => {
    try {
        const { cnpj } = req.params;
        const data = await dashboardService_1.default.getDashboardData(cnpj);
        res.status(200).json({
            success: true,
            data,
            message: "Dados do dashboard obtidos com sucesso"
        });
    }
    catch (error) {
        console.error("Erro ao buscar dados do dashboard:", error);
        res.status(500).json({ error: "Erro ao buscar dados do dashboard" });
    }
};
const getLicitacoesComEstagios = async (req, res) => {
    try {
        const { cnpj } = req.params;
        const data = await dashboardService_1.default.getLicitacoesComEstagios(cnpj);
        res.status(200).json({
            success: true,
            data,
            total: data.length
        });
    }
    catch (error) {
        console.error("Erro ao buscar licitações com estágios:", error);
        res.status(500).json({ error: "Erro ao buscar licitações com estágios" });
    }
};
exports.default = { getDashboardData, getLicitacoesComEstagios };
