"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const relatoriosController_1 = require("../controller/edital/relatoriosController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
const controller = new relatoriosController_1.RelatoriosController();
router.get('/empresa/:empresaCNPJ', authMiddleware_1.authMiddleware, async (req, res) => {
    await controller.listarRelatoriosEmpresa(req, res);
});
router.get('/:empresaCNPJ/:numeroControlePNCP', authMiddleware_1.authMiddleware, async (req, res) => {
    await controller.buscarRelatorio(req, res);
});
router.get('/:relatorioId/download', authMiddleware_1.authMiddleware, async (req, res) => {
    await controller.downloadRelatorio(req, res);
});
router.get('/:relatorioId/url', authMiddleware_1.authMiddleware, async (req, res) => {
    await controller.gerarUrlDownload(req, res);
});
router.get('/:empresaCNPJ/:numeroControlePNCP/verificar', authMiddleware_1.authMiddleware, async (req, res) => {
    await controller.verificarRelatorioExistente(req, res);
});
exports.default = router;
