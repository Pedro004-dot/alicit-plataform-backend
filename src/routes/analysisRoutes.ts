import { Router } from "express";
import { EditalAnalysisController } from "../controller/edital/analysisController";
import { EditalChatController } from "../controller/edital/chatController";
import analiseQueueController from "../controller/edital/analiseQueueController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();
const controller = new EditalAnalysisController();
const chatController = new EditalChatController();

router.post('/analysis', async (req, res) => {
  await controller.analyzeEdital(req, res);
});

router.post('/chat', async (req, res) => {
  await chatController.chat(req, res);
});

// Rotas da fila de análises
router.post('/iniciar', authMiddleware, async (req, res) => {
  await analiseQueueController.iniciarAnalise(req, res);
});

router.get('/status/:numeroControlePNCP', authMiddleware, async (req, res) => {
  await analiseQueueController.buscarStatusAnalise(req, res);
});

export default router;