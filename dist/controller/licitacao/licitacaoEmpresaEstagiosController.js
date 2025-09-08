"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const licitacaoEmpresaEstagiosService_1 = __importDefault(require("../../services/licitacao/licitacaoEmpresaEstagiosService"));
const listarLicitacoesComEstagios = async (req, res) => {
    try {
        const { cnpj } = req.params;
        if (!cnpj) {
            return res.status(400).json({
                error: 'CNPJ é obrigatório'
            });
        }
        const resultado = await licitacaoEmpresaEstagiosService_1.default.listarLicitacoesComEstagios(cnpj);
        return res.json(resultado);
    }
    catch (error) {
        return res.status(500).json({
            error: error.message || 'Erro interno do servidor'
        });
    }
};
exports.default = { listarLicitacoesComEstagios };
