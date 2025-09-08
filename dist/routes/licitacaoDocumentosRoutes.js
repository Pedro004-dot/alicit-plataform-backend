import { Router } from 'express';
import { LicitacaoDocumentosController } from '../controller/licitacao/licitacaoDocumentosController';
import { authMiddleware } from '../middleware/authMiddleware';
const router = Router();
const controller = new LicitacaoDocumentosController();
router.get('/:numeroControlePNCP/documentos', authMiddleware, async (req, res) => {
    await controller.listarDocumentos(req, res);
});
router.get('/documentos/:documentoId/preview', authMiddleware, async (req, res) => {
    await controller.gerarPreview(req, res);
});
router.get('/documentos/:documentoId/download', authMiddleware, async (req, res) => {
    await controller.downloadDocumento(req, res);
});
router.get('/:numeroControlePNCP/documentos/verificar', authMiddleware, async (req, res) => {
    await controller.verificarExistencia(req, res);
});
export default router;
