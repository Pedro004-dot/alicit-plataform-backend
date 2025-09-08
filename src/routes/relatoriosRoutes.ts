import { Router } from 'express';
import { RelatoriosController } from '../controller/edital/relatoriosController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
const controller = new RelatoriosController();

router.get('/empresa/:empresaCNPJ', authMiddleware, async (req, res) => {
    await controller.listarRelatoriosEmpresa(req, res);
});

router.get('/:empresaCNPJ/:numeroControlePNCP', authMiddleware, async (req, res) => {
    await controller.buscarRelatorio(req, res);
});

router.get('/:relatorioId/download', authMiddleware, async (req, res) => {
    await controller.downloadRelatorio(req, res);
});

router.get('/:relatorioId/url', authMiddleware, async (req, res) => {
    await controller.gerarUrlDownload(req, res);
});

router.get('/:empresaCNPJ/:numeroControlePNCP/verificar', authMiddleware, async (req, res) => {
    await controller.verificarRelatorioExistente(req, res);
});

export default router;