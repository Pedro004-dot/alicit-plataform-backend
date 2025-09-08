"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const analysisController_1 = require("../controller/edital/analysisController");
const chatController_1 = require("../controller/edital/chatController");
const analiseQueueController_1 = __importDefault(require("../controller/edital/analiseQueueController"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
const controller = new analysisController_1.EditalAnalysisController();
const chatController = new chatController_1.EditalChatController();
router.post('/analysis', async (req, res) => {
    await controller.analyzeEdital(req, res);
});
router.post('/chat', async (req, res) => {
    await chatController.chat(req, res);
});
// Rotas da fila de análises
router.post('/iniciar', authMiddleware_1.authMiddleware, async (req, res) => {
    await analiseQueueController_1.default.iniciarAnalise(req, res);
});
router.get('/status/:numeroControlePNCP', authMiddleware_1.authMiddleware, async (req, res) => {
    await analiseQueueController_1.default.buscarStatusAnalise(req, res);
});
exports.default = router;
