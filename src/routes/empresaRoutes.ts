import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import createEmpresaController from '../controller/empresa/createEmpresaController';
import getAllEmpresaController from '../controller/empresa/getAllEmpresaController';
import getUniqueEmpresaController from '../controller/empresa/getUniqueController';   
import deleteEmpresaController from '../controller/empresa/deleteEmpresaController';
import putEmpresaController from '../controller/empresa/putEmpresaController';
import empresaDocumentosController from '../controller/empresa/empresaDocumentosController';

const router = Router();    

// Rotas básicas CRUD
router.post('/', authMiddleware, createEmpresaController.createEmpresa);
router.get('/', getAllEmpresaController.getAllEmpresa);
router.get('/:cnpj', getUniqueEmpresaController.getUniqueEmpresa);
router.put('/:cnpj', putEmpresaController.putEmpresa);
router.delete('/:cnpj', deleteEmpresaController.deleteEmpresa);

// Rotas de configuração da empresa
router.put('/:empresaId/config', authMiddleware, putEmpresaController.atualizarEmpresa);
router.put('/:empresaId/dados-bancarios', authMiddleware, putEmpresaController.atualizarDadosBancarios);
router.get('/:empresaId/completa', authMiddleware, putEmpresaController.buscarEmpresaCompleta);
router.get('/cnpj/:cnpj/completa', authMiddleware, putEmpresaController.buscarEmpresaPorCnpj);

// Rotas de documentos  
router.post('/:empresaId/documentos', authMiddleware, empresaDocumentosController.upload.single('arquivo'), empresaDocumentosController.uploadDocumento);
router.get('/:empresaId/documentos', authMiddleware, empresaDocumentosController.getDocumentos);
router.delete('/documentos/:documentoId', authMiddleware, empresaDocumentosController.deleteDocumento);
router.put('/documentos/:documentoId/status', authMiddleware, empresaDocumentosController.updateStatusDocumento);

export default router;