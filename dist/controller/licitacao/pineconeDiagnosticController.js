"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const licitacaoPineconeService_1 = __importDefault(require("../../services/licitacao/licitacaoPineconeService"));
const pineconeLicitacaoRepository_1 = __importDefault(require("../../repositories/pineconeLicitacaoRepository"));
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
const obterEstatisticasIndice = async (req, res) => {
    try {
        console.log('📊 Obtendo estatísticas do índice Pinecone...');
        const stats = await pineconeLicitacaoRepository_1.default.getIndexStats();
        res.status(200).json({
            success: true,
            data: stats,
            message: 'Estatísticas do índice obtidas com sucesso'
        });
    }
    catch (error) {
        console.error('❌ Erro ao obter estatísticas do índice:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao obter estatísticas do índice',
            error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
    }
};
const obterAmostrasRecords = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 3;
        console.log(`📋 Obtendo ${limit} amostras de registros...`);
        const samples = await pineconeLicitacaoRepository_1.default.getSampleData(limit);
        res.status(200).json({
            success: true,
            data: {
                totalAmostras: samples.length,
                amostras: samples
            },
            message: `${samples.length} amostras obtidas com sucesso`
        });
    }
    catch (error) {
        console.error('❌ Erro ao obter amostras:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao obter amostras',
            error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
    }
};
const analisarEstruturaMetadata = async (req, res) => {
    try {
        console.log('🔬 Analisando estrutura da metadata...');
        const structure = await pineconeLicitacaoRepository_1.default.analyzeMetadataStructure();
        res.status(200).json({
            success: true,
            data: structure,
            message: 'Análise da estrutura concluída com sucesso'
        });
    }
    catch (error) {
        console.error('❌ Erro ao analisar estrutura:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao analisar estrutura',
            error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
    }
};
const obterEstruturaCompleta = async (req, res) => {
    try {
        console.log('🔍 Obtendo estrutura completa dos dados...');
        const fullStructure = await pineconeLicitacaoRepository_1.default.getFullDataStructure();
        res.status(200).json({
            success: true,
            data: fullStructure,
            message: 'Estrutura completa obtida com sucesso'
        });
    }
    catch (error) {
        console.error('❌ Erro ao obter estrutura completa:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao obter estrutura completa',
            error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
    }
};
exports.default = {
    obterEstatisticasPinecone,
    obterLicitacoesPorEstado,
    // Novos métodos de diagnóstico
    obterEstatisticasIndice,
    obterAmostrasRecords,
    analisarEstruturaMetadata,
    obterEstruturaCompleta
};
