"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const recomendacaoService_1 = __importDefault(require("../../services/licitacao/recomendacaoService"));
const listarRecomendacoes = async (req, res) => {
    try {
        const { cnpj } = req.params;
        if (!cnpj) {
            return res.status(400).json({
                error: "CNPJ da empresa é obrigatório"
            });
        }
        // Decodificar CNPJ da URL
        const decodedCnpj = decodeURIComponent(cnpj);
        console.log(`📋 Listando recomendações para empresa ${decodedCnpj}`);
        const resultado = await recomendacaoService_1.default.listarRecomendacoesPendentes(decodedCnpj);
        res.status(200).json(resultado);
    }
    catch (error) {
        console.error("Erro ao listar recomendações:", error);
        res.status(500).json({ error: "Erro ao listar recomendações" });
    }
};
const removerRecomendacao = async (req, res) => {
    try {
        const { numeroControlePNCP, empresaCnpj } = req.body;
        if (!numeroControlePNCP || !empresaCnpj) {
            return res.status(400).json({
                error: "Número de controle PNCP e CNPJ da empresa são obrigatórios"
            });
        }
        console.log(`🗑️ Removendo recomendação ${numeroControlePNCP} da empresa ${empresaCnpj}`);
        const resultado = await recomendacaoService_1.default.removerRecomendacao(numeroControlePNCP, empresaCnpj);
        res.status(200).json(resultado);
    }
    catch (error) {
        console.error("Erro ao remover recomendação:", error);
        res.status(500).json({ error: "Erro ao remover recomendação" });
    }
};
const limparRecomendacoesAntigas = async (req, res) => {
    try {
        const { dias = 30 } = req.body;
        console.log(`🧹 Limpando recomendações antigas (>${dias} dias)`);
        const resultado = await recomendacaoService_1.default.limparRecomendacoesAntigas(dias);
        res.status(200).json(resultado);
    }
    catch (error) {
        console.error("Erro ao limpar recomendações antigas:", error);
        res.status(500).json({ error: "Erro ao limpar recomendações antigas" });
    }
};
exports.default = {
    listarRecomendacoes,
    removerRecomendacao,
    limparRecomendacoesAntigas
};
