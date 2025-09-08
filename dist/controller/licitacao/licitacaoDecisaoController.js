"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const licitacaoDecisaoService_1 = __importDefault(require("../../services/licitacao/licitacaoDecisaoService"));
const processarDecisao = async (req, res) => {
    try {
        const { numeroControlePNCP, empresaCnpj, aprovada } = req.body;
        console.log(`Recebendo decisão: ${numeroControlePNCP}, ${empresaCnpj}, ${aprovada}`);
        // Validações
        if (!numeroControlePNCP || !empresaCnpj || typeof aprovada !== 'boolean') {
            return res.status(400).json({
                error: 'Dados inválidos. numeroControlePNCP, empresaCnpj e aprovada são obrigatórios'
            });
        }
        if (typeof numeroControlePNCP !== 'string' || typeof empresaCnpj !== 'string') {
            return res.status(400).json({
                error: 'numeroControlePNCP e empresaCnpj devem ser strings'
            });
        }
        const resultado = await licitacaoDecisaoService_1.default.processarDecisao({
            numeroControlePNCP,
            empresaCnpj,
            statusAprovacao: aprovada ? 'aprovada' : 'recusada'
        });
        return res.status(201).json(resultado);
    }
    catch (error) {
        return res.status(400).json({
            error: error.message || 'Erro interno do servidor'
        });
    }
};
const listarLicitacoesAprovadas = async (req, res) => {
    try {
        const { cnpj } = req.params;
        if (!cnpj) {
            return res.status(400).json({
                error: 'CNPJ é obrigatório'
            });
        }
        const resultado = await licitacaoDecisaoService_1.default.listarLicitacoesAprovadas(cnpj);
        return res.json(resultado);
    }
    catch (error) {
        return res.status(500).json({
            error: error.message || 'Erro interno do servidor'
        });
    }
};
const atualizarEstagio = async (req, res) => {
    try {
        const { id } = req.params;
        const { novoEstagio, observacoes } = req.body;
        if (!id || !novoEstagio) {
            return res.status(400).json({
                error: 'ID da licitação e novoEstagio são obrigatórios'
            });
        }
        const resultado = await licitacaoDecisaoService_1.default.atualizarEstagio({
            licitacaoEmpresaId: id,
            novoEstagio,
            observacoes
        });
        return res.json(resultado);
    }
    catch (error) {
        return res.status(400).json({
            error: error.message || 'Erro interno do servidor'
        });
    }
};
exports.default = {
    processarDecisao,
    listarLicitacoesAprovadas,
    atualizarEstagio
};
