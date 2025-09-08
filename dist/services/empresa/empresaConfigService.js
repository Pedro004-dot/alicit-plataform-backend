"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const empresaRepository_1 = __importDefault(require("../../repositories/empresaRepository"));
const atualizarConfiguracoesEmpresa = async (empresaId, dadosEmpresa) => {
    try {
        const empresaAtualizada = await empresaRepository_1.default.updateEmpresa(empresaId, dadosEmpresa);
        // Se dados bancários foram fornecidos, atualizar separadamente
        if (dadosEmpresa.dadosBancarios) {
            await empresaRepository_1.default.updateDadosBancarios(empresaId, dadosEmpresa.dadosBancarios);
        }
        return empresaAtualizada;
    }
    catch (error) {
        console.error('Erro no service ao atualizar empresa:', error);
        throw error;
    }
};
const buscarEmpresaCompleta = async (empresaId) => {
    try {
        const empresa = await empresaRepository_1.default.getEmpresaById(empresaId);
        const documentos = await empresaRepository_1.default.getDocumentosByEmpresaId(empresaId);
        return {
            ...empresa,
            documentos
        };
    }
    catch (error) {
        console.error('Erro no service ao buscar empresa completa:', error);
        throw error;
    }
};
const buscarEmpresaPorCnpjCompleta = async (cnpj) => {
    try {
        const empresa = await empresaRepository_1.default.getEmpresaByCnpj(cnpj);
        const documentos = await empresaRepository_1.default.getDocumentosByEmpresaId(empresa.id);
        return {
            ...empresa,
            documentos
        };
    }
    catch (error) {
        console.error('Erro no service ao buscar empresa por CNPJ:', error);
        throw error;
    }
};
const processarDocumentosEmpresa = async (empresaId, documentos) => {
    try {
        const documentosProcessados = [];
        for (const doc of documentos) {
            if (doc.arquivo) {
                const documentoSalvo = await empresaRepository_1.default.uploadDocumento(empresaId, doc.arquivo, doc.nomeDocumento, doc.dataExpiracao);
                documentosProcessados.push(documentoSalvo);
            }
        }
        return documentosProcessados;
    }
    catch (error) {
        console.error('Erro no service ao processar documentos:', error);
        throw error;
    }
};
const putEmpresa = async (id, empresaInput) => {
    const empresaAtualizada = await empresaRepository_1.default.updateEmpresa(id, empresaInput);
    return empresaAtualizada;
};
exports.default = {
    atualizarConfiguracoesEmpresa,
    buscarEmpresaCompleta,
    buscarEmpresaPorCnpjCompleta,
    processarDocumentosEmpresa,
    putEmpresa
};
