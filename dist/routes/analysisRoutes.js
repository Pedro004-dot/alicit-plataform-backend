"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const analysisController_1 = require("../controller/edital/analysisController");
const chatController_1 = require("../controller/edital/chatController");
const router = (0, express_1.Router)();
const controller = new analysisController_1.EditalAnalysisController();
const chatController = new chatController_1.EditalChatController();
router.post('/analysis', async (req, res) => {
    await controller.analyzeEdital(req, res);
});
// Nova rota para buscar análise detalhada com dados dos agentes
router.get('/analise-detalhada/:empresaCNPJ/:numeroControlePNCP', async (req, res) => {
    await controller.buscarAnaliseDetalhada(req, res);
});
router.post('/chat', async (req, res) => {
    await chatController.chat(req, res);
});
exports.default = router;
