import { Router } from "express";
import { EditalAnalysisController } from "../controller/edital/analysisController";
import { EditalChatController } from "../controller/edital/chatController";


const router = Router();
const controller = new EditalAnalysisController();
const chatController = new EditalChatController();

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


export default router;