"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const analysisController_js_1 = require("../controller/edital/analysisController.js");
const chatController_js_1 = require("../controller/edital/chatController.js");
const analiseQueueController_js_1 = __importDefault(require("../controller/edital/analiseQueueController.js"));
const authMiddleware_js_1 = require("../middleware/authMiddleware.js");
const router = (0, express_1.Router)();
const controller = new analysisController_js_1.EditalAnalysisController();
const chatController = new chatController_js_1.EditalChatController();
router.post('/analysis', async (req, res) => {
    await controller.analyzeEdital(req, res);
});
router.post('/chat', async (req, res) => {
    await chatController.chat(req, res);
});
// Rotas da fila de análises
router.post('/iniciar', authMiddleware_js_1.authMiddleware, async (req, res) => {
    await analiseQueueController_js_1.default.iniciarAnalise(req, res);
});
router.get('/status/:numeroControlePNCP', authMiddleware_js_1.authMiddleware, async (req, res) => {
    await analiseQueueController_js_1.default.buscarStatusAnalise(req, res);
});
exports.default = router;
