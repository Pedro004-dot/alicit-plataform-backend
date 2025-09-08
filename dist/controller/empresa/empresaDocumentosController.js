"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const multer_1 = __importDefault(require("multer"));
const empresaRepository_1 = __importDefault(require("../../repositories/empresaRepository"));
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
const uploadDocumento = async (req, res) => {
    try {
        console.log('📁 [UPLOAD] Iniciando upload de documento...');
        console.log('📁 [UPLOAD] Params:', req.params);
        console.log('📁 [UPLOAD] Body:', req.body);
        console.log('📁 [UPLOAD] File:', req.file ? { name: req.file.originalname, size: req.file.size, mimetype: req.file.mimetype } : 'Nenhum arquivo');
        const { empresaId } = req.params;
        const { nomeDocumento, dataExpiracao } = req.body;
        const file = req.file;
        if (!empresaId) {
            console.log('❌ [UPLOAD] ID da empresa não fornecido');
            return res.status(400).json({ error: "ID da empresa é obrigatório" });
        }
        if (!nomeDocumento) {
            console.log('❌ [UPLOAD] Nome do documento não fornecido');
            return res.status(400).json({ error: "Nome do documento é obrigatório" });
        }
        if (!file) {
            console.log('❌ [UPLOAD] Arquivo não fornecido');
            return res.status(400).json({ error: "Arquivo é obrigatório" });
        }
        console.log('🚀 [UPLOAD] Chamando repositório para upload...');
        const documento = await empresaRepository_1.default.uploadDocumento(empresaId, file.buffer, nomeDocumento, dataExpiracao);
        console.log('✅ [UPLOAD] Upload realizado com sucesso:', documento);
        res.status(201).json(documento);
    }
    catch (error) {
        console.error("❌ [UPLOAD] Erro ao fazer upload do documento:", error);
        res.status(500).json({ error: error.message || "Erro ao fazer upload do documento" });
    }
};
const getDocumentos = async (req, res) => {
    try {
        const { empresaId } = req.params;
        if (!empresaId) {
            return res.status(400).json({ error: "ID da empresa é obrigatório" });
        }
        const documentos = await empresaRepository_1.default.getDocumentosByEmpresaId(empresaId);
        res.status(200).json(documentos);
    }
    catch (error) {
        console.error("Erro ao buscar documentos:", error);
        res.status(500).json({ error: error.message || "Erro ao buscar documentos" });
    }
};
const deleteDocumento = async (req, res) => {
    try {
        const { documentoId } = req.params;
        if (!documentoId) {
            return res.status(400).json({ error: "ID do documento é obrigatório" });
        }
        const result = await empresaRepository_1.default.deleteDocumento(documentoId);
        res.status(200).json(result);
    }
    catch (error) {
        console.error("Erro ao deletar documento:", error);
        res.status(500).json({ error: error.message || "Erro ao deletar documento" });
    }
};
const updateStatusDocumento = async (req, res) => {
    try {
        const { documentoId } = req.params;
        const { status } = req.body;
        if (!documentoId) {
            return res.status(400).json({ error: "ID do documento é obrigatório" });
        }
        if (!status) {
            return res.status(400).json({ error: "Status é obrigatório" });
        }
        const documento = await empresaRepository_1.default.updateStatusDocumento(documentoId, status);
        res.status(200).json(documento);
    }
    catch (error) {
        console.error("Erro ao atualizar status do documento:", error);
        res.status(500).json({ error: error.message || "Erro ao atualizar status do documento" });
    }
};
exports.default = {
    upload,
    uploadDocumento,
    getDocumentos,
    deleteDocumento,
    updateStatusDocumento
};
