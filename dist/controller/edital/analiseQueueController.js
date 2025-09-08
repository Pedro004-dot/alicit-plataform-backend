"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const analiseQueueService_1 = __importDefault(require("../../services/edital/analiseQueueService"));
const iniciarAnalise = async (req, res) => {
    try {
        const { numeroControlePNCP, empresaCnpj } = req.body;
        if (!numeroControlePNCP || !empresaCnpj) {
            return res.status(400).json({
                error: "numeroControlePNCP e empresaCnpj são obrigatórios"
            });
        }
        await analiseQueueService_1.default.adicionarAnalise(numeroControlePNCP, empresaCnpj);
        res.status(201).json({
            message: "Análise adicionada à fila com sucesso",
            numeroControlePNCP
        });
    }
    catch (error) {
        console.error("❌ Erro ao iniciar análise:", error);
        res.status(500).json({ error: "Erro ao iniciar análise" });
    }
};
const buscarStatusAnalise = async (req, res) => {
    try {
        const { numeroControlePNCP } = req.params;
        if (!numeroControlePNCP) {
            return res.status(400).json({
                error: "numeroControlePNCP é obrigatório"
            });
        }
        // Decodificar o número de controle da URL
        const numeroDecodificado = decodeURIComponent(numeroControlePNCP);
        const status = await analiseQueueService_1.default.buscarStatusAnalise(numeroDecodificado);
        res.status(200).json(status);
    }
    catch (error) {
        console.error("❌ Erro ao buscar status da análise:", error);
        res.status(500).json({ error: "Erro ao buscar status da análise" });
    }
};
exports.default = {
    iniciarAnalise,
    buscarStatusAnalise
};
