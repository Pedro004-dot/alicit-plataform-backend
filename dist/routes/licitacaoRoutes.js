"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const search_licitacao_controller_js_1 = __importDefault(require("../controller/licitacao/search_licitacao_controller.js"));
const find_licitacao_controller_js_1 = __importDefault(require("../controller/licitacao/find_licitacao_controller.js"));
const matching_licitacao_controller_js_1 = __importDefault(require("../controller/licitacao/matching_licitacao_controller.js"));
const statusLicitacaoEmpresaController_js_1 = __importDefault(require("../controller/licitacao/statusLicitacaoEmpresaController.js"));
const recomendacaoController_js_1 = __importDefault(require("../controller/licitacao/recomendacaoController.js"));
const dashboardController_js_1 = __importDefault(require("../controller/licitacao/dashboardController.js"));
const pineconeDiagnosticController_js_1 = __importDefault(require("../controller/licitacao/pineconeDiagnosticController.js"));
const router = (0, express_1.Router)();
// busca novas licitacoes 
router.post('/search', search_licitacao_controller_js_1.default.searchLicitacao);
// busca licitacoes  no banco de dados
router.post('/find', find_licitacao_controller_js_1.default.findLicitacao);
//cruzza as licitacoes com a empresa
router.post('/matching', matching_licitacao_controller_js_1.default.calculateMatching);
// diagnostico do Pinecone
router.get('/pinecone/stats', pineconeDiagnosticController_js_1.default.obterEstatisticasPinecone);
router.get('/pinecone/estado/:uf', pineconeDiagnosticController_js_1.default.obterLicitacoesPorEstado);
// rotas de dashboard (DEVEM VIR ANTES das rotas /empresa para evitar conflitos)
router.get('/:cnpj/dashboard', dashboardController_js_1.default.getDashboardData);
router.get('/:cnpj/estagios', dashboardController_js_1.default.getLicitacoesComEstagios);
// CRUD licitacao_empresa
router.post('/empresa', statusLicitacaoEmpresaController_js_1.default.criar);
router.put('/empresa/:id/status', statusLicitacaoEmpresaController_js_1.default.atualizarStatus);
router.put('/empresa/status', statusLicitacaoEmpresaController_js_1.default.atualizarStatusPorChaves);
router.get('/empresa/:cnpj', statusLicitacaoEmpresaController_js_1.default.listarTodas);
router.get('/empresa/licitacao/:id', statusLicitacaoEmpresaController_js_1.default.buscarUma);
router.delete('/empresa/:id', statusLicitacaoEmpresaController_js_1.default.deletar);
// rotas de recomendacoes
router.get('/recomendacoes/:cnpj', recomendacaoController_js_1.default.listarRecomendacoes);
// router.delete('/recomendacoes/remover', recomendacaoController.removerRecomendacao);
// router.post('/recomendacoes/limpar-antigas', recomendacaoController.limparRecomendacoesAntigas);
exports.default = router;
