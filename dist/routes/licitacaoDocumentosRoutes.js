"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const licitacaoDocumentosController_js_1 = require("../controller/licitacao/licitacaoDocumentosController.js");
const authMiddleware_js_1 = require("../middleware/authMiddleware.js");
const router = (0, express_1.Router)();
const controller = new licitacaoDocumentosController_js_1.LicitacaoDocumentosController();
router.get('/:numeroControlePNCP/documentos', authMiddleware_js_1.authMiddleware, async (req, res) => {
    await controller.listarDocumentos(req, res);
});
router.get('/documentos/:documentoId/preview', authMiddleware_js_1.authMiddleware, async (req, res) => {
    await controller.gerarPreview(req, res);
});
router.get('/documentos/:documentoId/download', authMiddleware_js_1.authMiddleware, async (req, res) => {
    await controller.downloadDocumento(req, res);
});
router.get('/:numeroControlePNCP/documentos/verificar', authMiddleware_js_1.authMiddleware, async (req, res) => {
    await controller.verificarExistencia(req, res);
});
exports.default = router;
