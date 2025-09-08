"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_js_1 = require("../middleware/authMiddleware.js");
const createEmpresaController_js_1 = __importDefault(require("../controller/empresa/createEmpresaController.js"));
const getAllEmpresaController_js_1 = __importDefault(require("../controller/empresa/getAllEmpresaController.js"));
const getUniqueController_js_1 = __importDefault(require("../controller/empresa/getUniqueController.js"));
const deleteEmpresaController_js_1 = __importDefault(require("../controller/empresa/deleteEmpresaController.js"));
const putEmpresaController_js_1 = __importDefault(require("../controller/empresa/putEmpresaController.js"));
const empresaDocumentosController_js_1 = __importDefault(require("../controller/empresa/empresaDocumentosController.js"));
const router = (0, express_1.Router)();
// Rotas básicas CRUD
router.post('/', authMiddleware_js_1.authMiddleware, createEmpresaController_js_1.default.createEmpresa);
router.get('/', getAllEmpresaController_js_1.default.getAllEmpresa);
router.get('/:cnpj', getUniqueController_js_1.default.getUniqueEmpresa);
router.put('/:cnpj', putEmpresaController_js_1.default.putEmpresa);
router.delete('/:cnpj', deleteEmpresaController_js_1.default.deleteEmpresa);
// Rotas de configuração da empresa
router.put('/:empresaId/config', authMiddleware_js_1.authMiddleware, putEmpresaController_js_1.default.atualizarEmpresa);
router.put('/:empresaId/dados-bancarios', authMiddleware_js_1.authMiddleware, putEmpresaController_js_1.default.atualizarDadosBancarios);
router.get('/:empresaId/completa', authMiddleware_js_1.authMiddleware, putEmpresaController_js_1.default.buscarEmpresaCompleta);
router.get('/cnpj/:cnpj/completa', authMiddleware_js_1.authMiddleware, putEmpresaController_js_1.default.buscarEmpresaPorCnpj);
// Rotas de documentos  
router.post('/:empresaId/documentos', authMiddleware_js_1.authMiddleware, empresaDocumentosController_js_1.default.upload.single('arquivo'), empresaDocumentosController_js_1.default.uploadDocumento);
router.get('/:empresaId/documentos', authMiddleware_js_1.authMiddleware, empresaDocumentosController_js_1.default.getDocumentos);
router.delete('/documentos/:documentoId', authMiddleware_js_1.authMiddleware, empresaDocumentosController_js_1.default.deleteDocumento);
router.put('/documentos/:documentoId/status', authMiddleware_js_1.authMiddleware, empresaDocumentosController_js_1.default.updateStatusDocumento);
exports.default = router;
