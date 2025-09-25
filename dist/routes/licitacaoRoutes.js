"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const search_licitacao_controller_1 = __importDefault(require("../controller/licitacao/search_licitacao_controller"));
const find_licitacao_controller_1 = __importDefault(require("../controller/licitacao/find_licitacao_controller"));
const matching_licitacao_controller_1 = __importDefault(require("../controller/licitacao/matching_licitacao_controller"));
const statusLicitacaoEmpresaController_1 = __importDefault(require("../controller/licitacao/statusLicitacaoEmpresaController"));
const recomendacaoController_1 = __importDefault(require("../controller/licitacao/recomendacaoController"));
const dashboardController_1 = __importDefault(require("../controller/licitacao/dashboardController"));
const pineconeDiagnosticController_1 = __importDefault(require("../controller/licitacao/pineconeDiagnosticController"));
const getUniqueLicitacaoController_1 = __importDefault(require("../controller/licitacao/getUniqueLicitacaoController"));
const router = (0, express_1.Router)();
// busca novas licitacoes 
router.post('/search', search_licitacao_controller_1.default.searchLicitacao);
// busca licitacoes  no banco de dados
router.post('/find', find_licitacao_controller_1.default.findLicitacao);
//cruzza as licitacoes com a empresa
router.post('/matching', matching_licitacao_controller_1.default.calculateMatching);
router.get('/getUniqueLicitacao', getUniqueLicitacaoController_1.default.getUniqueLicitacao);
// diagnostico do Pinecone
router.get('/pinecone/stats', pineconeDiagnosticController_1.default.obterEstatisticasPinecone);
router.get('/pinecone/estado/:uf', pineconeDiagnosticController_1.default.obterLicitacoesPorEstado);
// rotas de dashboard (DEVEM VIR ANTES das rotas /empresa para evitar conflitos)
router.get('/:cnpj/dashboard', dashboardController_1.default.getDashboardData);
router.get('/:cnpj/estagios', dashboardController_1.default.getLicitacoesComEstagios);
// CRUD licitacao_empresa
router.post('/empresa', statusLicitacaoEmpresaController_1.default.criar);
router.put('/empresa/:id/status', statusLicitacaoEmpresaController_1.default.atualizarStatus);
router.put('/empresa/status', statusLicitacaoEmpresaController_1.default.atualizarStatusPorChaves);
router.get('/empresa/:cnpj', statusLicitacaoEmpresaController_1.default.listarTodas);
router.get('/empresa/licitacao/:id', statusLicitacaoEmpresaController_1.default.buscarUma);
router.delete('/empresa/:id', statusLicitacaoEmpresaController_1.default.deletar);
router.delete('/empresa/status', statusLicitacaoEmpresaController_1.default.deletarPorStatus);
// rotas de recomendacoes
router.get('/recomendacoes/:cnpj', recomendacaoController_1.default.listarRecomendacoes);
// router.delete('/recomendacoes/remover', recomendacaoController.removerRecomendacao);
// router.post('/recomendacoes/limpar-antigas', recomendacaoController.limparRecomendacoesAntigas);
exports.default = router;
