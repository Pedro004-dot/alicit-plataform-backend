import multer from 'multer';
import empresaRepository from "../../repositories/empresaRepository";
const upload = multer({ storage: multer.memoryStorage() });
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
        const documento = await empresaRepository.uploadDocumento(empresaId, file.buffer, nomeDocumento, dataExpiracao);
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
        const documentos = await empresaRepository.getDocumentosByEmpresaId(empresaId);
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
        const result = await empresaRepository.deleteDocumento(documentoId);
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
        const documento = await empresaRepository.updateStatusDocumento(documentoId, status);
        res.status(200).json(documento);
    }
    catch (error) {
        console.error("Erro ao atualizar status do documento:", error);
        res.status(500).json({ error: error.message || "Erro ao atualizar status do documento" });
    }
};
export default {
    upload,
    uploadDocumento,
    getDocumentos,
    deleteDocumento,
    updateStatusDocumento
};
