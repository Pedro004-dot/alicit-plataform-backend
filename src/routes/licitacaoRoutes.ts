import { Router } from 'express';
import licitacaoController from '../controller/licitacao/search_licitacao_controller';
import findLicitacaoController from '../controller/licitacao/find_licitacao_controller';
import matchingLicitacaoController from '../controller/licitacao/matching_licitacao_controller';
import licitacaoEmpresaController from '../controller/licitacao/statusLicitacaoEmpresaController';
import recomendacaoController from '../controller/licitacao/recomendacaoController';
import dashboardController from '../controller/licitacao/dashboardController';
import pineconeDiagnosticController from '../controller/licitacao/pineconeDiagnosticController';
import getUniqueLicitacaoController from '../controller/licitacao/getUniqueLicitacaoController';

const router = Router();    
// busca novas licitacoes 
router.post('/search', licitacaoController.searchLicitacao);
// busca licitacoes  no banco de dados
router.post('/find', findLicitacaoController.findLicitacao);
//cruzza as licitacoes com a empresa
router.post('/matching', matchingLicitacaoController.calculateMatching);

router.get('/getUniqueLicitacao', getUniqueLicitacaoController.getUniqueLicitacao);
// diagnostico do Pinecone
router.get('/pinecone/stats', pineconeDiagnosticController.obterEstatisticasPinecone);
router.get('/pinecone/estado/:uf', pineconeDiagnosticController.obterLicitacoesPorEstado);

// rotas de dashboard (DEVEM VIR ANTES das rotas /empresa para evitar conflitos)
router.get('/:cnpj/dashboard', dashboardController.getDashboardData);
router.get('/:cnpj/estagios', dashboardController.getLicitacoesComEstagios);

// CRUD licitacao_empresa
router.post('/empresa', licitacaoEmpresaController.criar);
router.put('/empresa/:id/status', licitacaoEmpresaController.atualizarStatus);
router.put('/empresa/status', licitacaoEmpresaController.atualizarStatusPorChaves);
router.get('/empresa/:cnpj', licitacaoEmpresaController.listarTodas);
router.get('/empresa/licitacao/:id', licitacaoEmpresaController.buscarUma);
router.delete('/empresa/:id', licitacaoEmpresaController.deletar);
router.delete('/empresa/status', licitacaoEmpresaController.deletarPorStatus);

// rotas de recomendacoes
router.get('/recomendacoes/:cnpj', recomendacaoController.listarRecomendacoes);
// router.delete('/recomendacoes/remover', recomendacaoController.removerRecomendacao);
// router.post('/recomendacoes/limpar-antigas', recomendacaoController.limparRecomendacoesAntigas);

export default router;