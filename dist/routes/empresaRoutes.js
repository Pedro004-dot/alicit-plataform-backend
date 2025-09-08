"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const createEmpresaController_1 = __importDefault(require("../controller/empresa/createEmpresaController"));
const getAllEmpresaController_1 = __importDefault(require("../controller/empresa/getAllEmpresaController"));
const getUniqueController_1 = __importDefault(require("../controller/empresa/getUniqueController"));
const deleteEmpresaController_1 = __importDefault(require("../controller/empresa/deleteEmpresaController"));
const putEmpresaController_1 = __importDefault(require("../controller/empresa/putEmpresaController"));
const empresaDocumentosController_1 = __importDefault(require("../controller/empresa/empresaDocumentosController"));
const router = (0, express_1.Router)();
// Rotas básicas CRUD
router.post('/', authMiddleware_1.authMiddleware, createEmpresaController_1.default.createEmpresa);
router.get('/', getAllEmpresaController_1.default.getAllEmpresa);
router.get('/:cnpj', getUniqueController_1.default.getUniqueEmpresa);
router.put('/:cnpj', putEmpresaController_1.default.putEmpresa);
router.delete('/:cnpj', deleteEmpresaController_1.default.deleteEmpresa);
// Rotas de configuração da empresa
router.put('/:empresaId/config', authMiddleware_1.authMiddleware, putEmpresaController_1.default.atualizarEmpresa);
router.put('/:empresaId/dados-bancarios', authMiddleware_1.authMiddleware, putEmpresaController_1.default.atualizarDadosBancarios);
router.get('/:empresaId/completa', authMiddleware_1.authMiddleware, putEmpresaController_1.default.buscarEmpresaCompleta);
router.get('/cnpj/:cnpj/completa', authMiddleware_1.authMiddleware, putEmpresaController_1.default.buscarEmpresaPorCnpj);
// Rotas de documentos  
router.post('/:empresaId/documentos', authMiddleware_1.authMiddleware, empresaDocumentosController_1.default.upload.single('arquivo'), empresaDocumentosController_1.default.uploadDocumento);
router.get('/:empresaId/documentos', authMiddleware_1.authMiddleware, empresaDocumentosController_1.default.getDocumentos);
router.delete('/documentos/:documentoId', authMiddleware_1.authMiddleware, empresaDocumentosController_1.default.deleteDocumento);
router.put('/documentos/:documentoId/status', authMiddleware_1.authMiddleware, empresaDocumentosController_1.default.updateStatusDocumento);
exports.default = router;
