"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const empresaConfigService_1 = __importDefault(require("../../services/empresa/empresaConfigService"));
const atualizarEmpresa = async (req, res) => {
    try {
        const { empresaId } = req.params;
        const empresaData = req.body;
        if (!empresaId) {
            return res.status(400).json({ error: "ID da empresa é obrigatório" });
        }
        const empresaAtualizada = await empresaConfigService_1.default.atualizarConfiguracoesEmpresa(empresaId, empresaData);
        res.status(200).json(empresaAtualizada);
    }
    catch (error) {
        console.error("Erro ao atualizar empresa:", error);
        res.status(500).json({ error: error.message || "Erro ao atualizar empresa" });
    }
};
const putEmpresa = async (req, res) => {
    try {
        const cnpj = req.params.cnpj;
        if (!cnpj) {
            return res.status(400).json({ error: "CNPJ não informado" });
        }
        const putEmpresa = await empresaConfigService_1.default.putEmpresa(cnpj, req.body);
        res.status(201).json(putEmpresa);
        return putEmpresa;
    }
    catch (error) {
        console.error("Erro ao atualizar empresa:", error);
        res.status(500).json({ error: "Erro ao atualizar empresa" });
    }
};
const atualizarDadosBancarios = async (req, res) => {
    try {
        const { empresaId } = req.params;
        const dadosBancarios = req.body;
        if (!empresaId) {
            return res.status(400).json({ error: "ID da empresa é obrigatório" });
        }
        if (!dadosBancarios.agencia || !dadosBancarios.numeroConta || !dadosBancarios.nomeTitular) {
            return res.status(400).json({ error: "Agência, número da conta e nome do titular são obrigatórios" });
        }
        const dadosAtualizados = await empresaConfigService_1.default.atualizarConfiguracoesEmpresa(empresaId, { dadosBancarios });
        res.status(200).json(dadosAtualizados);
    }
    catch (error) {
        console.error("Erro ao atualizar dados bancários:", error);
        res.status(500).json({ error: error.message || "Erro ao atualizar dados bancários" });
    }
};
const buscarEmpresaCompleta = async (req, res) => {
    try {
        const { empresaId } = req.params;
        if (!empresaId) {
            return res.status(400).json({ error: "ID da empresa é obrigatório" });
        }
        const empresa = await empresaConfigService_1.default.buscarEmpresaCompleta(empresaId);
        res.status(200).json(empresa);
    }
    catch (error) {
        console.error("Erro ao buscar empresa:", error);
        res.status(500).json({ error: error.message || "Erro ao buscar empresa" });
    }
};
const buscarEmpresaPorCnpj = async (req, res) => {
    try {
        const { cnpj } = req.params;
        if (!cnpj) {
            return res.status(400).json({ error: "CNPJ é obrigatório" });
        }
        const empresa = await empresaConfigService_1.default.buscarEmpresaPorCnpjCompleta(cnpj);
        res.status(200).json(empresa);
    }
    catch (error) {
        console.error("Erro ao buscar empresa por CNPJ:", error);
        res.status(500).json({ error: error.message || "Erro ao buscar empresa por CNPJ" });
    }
};
exports.default = {
    atualizarEmpresa,
    atualizarDadosBancarios,
    buscarEmpresaCompleta,
    buscarEmpresaPorCnpj,
    putEmpresa
};
