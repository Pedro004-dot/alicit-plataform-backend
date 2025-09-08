"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const findLicitacaoService_1 = __importDefault(require("../../services/licitacao/findLicitacaoService"));
const findLicitacao = async (req, res) => {
    try {
        const findRequest = req.body;
        // Validação obrigatória
        if (!findRequest.cnpj || !findRequest.palavraChave) {
            return res.status(400).json({
                error: "CNPJ e palavraChave são obrigatórios"
            });
        }
        // Validação dos valores
        if (findRequest.valorMinimo && findRequest.valorMinimo <= 0) {
            return res.status(400).json({
                error: "ValorMinimo deve ser maior que zero"
            });
        }
        if (findRequest.valorMaximo && findRequest.valorMaximo <= 0) {
            return res.status(400).json({
                error: "ValorMaximo deve ser maior que zero"
            });
        }
        if (findRequest.valorMinimo && findRequest.valorMaximo &&
            findRequest.valorMinimo > findRequest.valorMaximo) {
            return res.status(400).json({
                error: "ValorMinimo não pode ser maior que ValorMaximo"
            });
        }
        console.log('📊 Recebendo busca manual:', findRequest);
        const licitacoes = await findLicitacaoService_1.default.findWithKeywordAndFilters(findRequest);
        res.status(200).json(licitacoes);
    }
    catch (error) {
        console.error("Erro ao buscar licitação:", error);
        res.status(500).json({ error: "Erro ao buscar licitação" });
    }
};
exports.default = { findLicitacao };
//Objejtivo de buscar licitação pelo numero do controle PNCP
