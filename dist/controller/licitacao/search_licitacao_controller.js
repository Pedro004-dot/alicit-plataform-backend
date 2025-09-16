"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const searchLicitacaoService_1 = __importDefault(require("../../services/licitacao/searchLicitacaoService"));
const searchLicitacao = async (req, res) => {
    try {
        const search = await searchLicitacaoService_1.default.searchLicitacao({ dataFim: req.body.dataFim });
        res.status(201).json(search);
        return search;
    }
    catch (error) {
        console.error("Erro ao buscar licitação:", error);
        res.status(500).json({ error: "Erro ao buscar licitação" });
    }
};
exports.default = { searchLicitacao };
