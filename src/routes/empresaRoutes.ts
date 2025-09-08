import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import createEmpresaController from '../controller/empresa/createEmpresaController.js';
import getAllEmpresaController from '../controller/empresa/getAllEmpresaController.js';
import getUniqueEmpresaController from '../controller/empresa/getUniqueController.js';   
import deleteEmpresaController from '../controller/empresa/deleteEmpresaController.js';
import putEmpresaController from '../controller/empresa/putEmpresaController.js';
import empresaDocumentosController from '../controller/empresa/empresaDocumentosController.js';

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