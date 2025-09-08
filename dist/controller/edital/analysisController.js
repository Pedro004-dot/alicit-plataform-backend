"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditalAnalysisController = void 0;
const analysisService_1 = require("../../services/edital/analysisService");
class EditalAnalysisController {
    constructor() {
        this.initialized = false;
        this.analysisService = new analysisService_1.EditalAnalysisService();
    }
    async ensureInitialized() {
        if (!this.initialized) {
            await this.analysisService.initialize();
            this.initialized = true;
        }
    }
    async analyzeEdital(req, res) {
        try {
            // Garantir que Pinecone está inicializado
            await this.ensureInitialized();
            const { numeroControlePNCP, empresaCNPJ } = req.body;
            console.log(`🔍 Dados recebidos: numeroControlePNCP=${numeroControlePNCP}, empresaCNPJ=${empresaCNPJ}`);
            const result = await this.analysisService.analyzeEdital({
                licitacaoId: numeroControlePNCP,
                empresaCNPJ
            });
            res.json(result);
        }
        catch (error) {
            console.error(`❌ Erro na análise do edital:`, error);
            // Diferentes tipos de erro
            if (error.message?.includes('não encontrada') && (error.message?.includes('Redis') || error.message?.includes('base de dados'))) {
                res.status(404).json({
                    error: "Licitação não encontrada",
                    message: `Licitação ${req.body.licitacaoId} não foi encontrada na base de dados`,
                    code: "LICITACAO_NOT_FOUND"
                });
                return;
            }
            if (error.message?.includes('Nenhum documento encontrado')) {
                res.status(404).json({
                    error: "Documentos não encontrados",
                    message: "Nenhum documento foi encontrado para esta licitação no PNCP",
                    code: "DOCUMENTS_NOT_FOUND"
                });
                return;
            }
            if (error.message?.includes('Falha no download')) {
                res.status(502).json({
                    error: "Erro no download",
                    message: "Falha ao baixar documentos do PNCP. Tente novamente mais tarde",
                    code: "DOWNLOAD_FAILED"
                });
                return;
            }
            // Erro genérico
            res.status(500).json({
                error: "Erro interno do servidor",
                message: error.message || "Erro desconhecido durante o processamento",
                code: "INTERNAL_SERVER_ERROR"
            });
        }
    }
}
exports.EditalAnalysisController = EditalAnalysisController;
