"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const licitacaoPineconeService_1 = __importDefault(require("../../services/licitacao/licitacaoPineconeService"));
const pineconeDiagnosticService = new licitacaoPineconeService_1.default();
const obterLicitacoesPorEstado = async (req, res) => {
    try {
        const { uf } = req.params;
        if (!uf || uf.length !== 2) {
            res.status(400).json({
                success: false,
                message: 'UF deve ter 2 caracteres (ex: SP, RJ, MG)'
            });
            return;
        }
        console.log(`🔍 Buscando licitações do estado: ${uf.toUpperCase()}`);
        await pineconeDiagnosticService.initialize();
        const licitacoesPorEstado = await pineconeDiagnosticService.buscarLicitacoesPorEstado(uf.toUpperCase());
        console.log(`📋 Encontradas ${licitacoesPorEstado.length} licitações em ${uf.toUpperCase()}`);
        res.status(200).json({
            success: true,
            data: {
                uf: uf.toUpperCase(),
                totalLicitacoes: licitacoesPorEstado.length,
                licitacoes: licitacoesPorEstado
            },
            message: `${licitacoesPorEstado.length} licitações encontradas em ${uf.toUpperCase()}`
        });
    }
    catch (error) {
        console.error('❌ Erro ao buscar licitações por estado:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar licitações por estado',
            error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
    }
};
const obterEstatisticasPinecone = async (req, res) => {
    try {
        console.log('🔍 Obtendo estatísticas completas do Pinecone...');
        await pineconeDiagnosticService.initialize();
        const stats = await pineconeDiagnosticService.obterEstatisticasPinecone();
        console.log(`📊 Estatísticas gerais: ${stats.totalVetores} vetores (${stats.totalLicitacoes} licitações + ${stats.totalEditais} editais)`);
        console.log(`🗺️ Distribuição por estado:`);
        // Log das estatísticas por estado
        stats.estatisticasPorEstado.slice(0, 10).forEach((estado, idx) => {
            console.log(`  ${idx + 1}. ${estado.uf}: ${estado.totalLicitacoes} licitações (R$ ${estado.valorTotalEstimado.toLocaleString('pt-BR')})`);
        });
        res.status(200).json({
            success: true,
            data: {
                ...stats,
                resumo: {
                    totalVetores: stats.totalVetores,
                    totalLicitacoes: stats.totalLicitacoes,
                    totalEditais: stats.totalEditais,
                    estadosComLicitacoes: stats.estatisticasPorEstado.length,
                    valorTotalGeral: stats.estatisticasPorEstado.reduce((sum, estado) => sum + estado.valorTotalEstimado, 0),
                    top5Estados: stats.estatisticasPorEstado.slice(0, 5).map(estado => ({
                        uf: estado.uf,
                        quantidade: estado.totalLicitacoes,
                        percentual: ((estado.totalLicitacoes / stats.totalLicitacoes) * 100).toFixed(1) + '%'
                    }))
                }
            },
            message: `${stats.totalLicitacoes} licitações encontradas em ${stats.estatisticasPorEstado.length} estados`
        });
    }
    catch (error) {
        console.error('❌ Erro ao obter estatísticas do Pinecone:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao obter estatísticas do Pinecone',
            error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
    }
};
exports.default = {
    obterEstatisticasPinecone,
    obterLicitacoesPorEstado
};
