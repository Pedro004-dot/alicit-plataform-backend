"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pineconeLicitacaoRepository_1 = __importDefault(require("../../repositories/pineconeLicitacaoRepository"));
const metrics_1 = require("./metrics");
const geolocation_1 = require("./geolocation");
const filters_1 = require("./filters");
/**
 * Busca todas as licitações armazenadas no Pinecone
 * @returns Array de licitações válidas
 */
const findLicitacao = async () => {
    return await pineconeLicitacaoRepository_1.default.getAllLicitacoes();
};
/**
 * Calcula matching entre perfil da empresa e licitações usando algoritmos tradicionais
 * @param empresaPerfil - Perfil da empresa com critérios de busca
 * @returns Array de resultados ordenados por score descendente
 */
const calculateMatching = async (empresaPerfil) => {
    try {
        console.log('📊 Iniciando matching tradicional...');
        // Buscar todas as licitações
        const licitacoes = await findLicitacao();
        console.log(`🔍 Encontradas ${licitacoes.length} licitações para análise`);
        // Aplicar filtros
        const resultadoFiltros = await (0, filters_1.aplicarFiltrosAtivos)(licitacoes, empresaPerfil);
        console.log(`🔍 Filtros aplicados: ${resultadoFiltros.filtrosAplicados.join(', ') || 'nenhum'}`);
        console.log(`📊 ${resultadoFiltros.estatisticas.totalInicial} → ${resultadoFiltros.estatisticas.totalFinal} licitações (${resultadoFiltros.estatisticas.reducaoPercentual}% filtradas)`);
        // Calcular matching scores
        const matches = resultadoFiltros.licitacoesFiltradas
            .map(licitacao => (0, metrics_1.calculateMatchingScore)(empresaPerfil, licitacao))
            .filter(match => match.matchScore > 0.1)
            .sort((a, b) => b.matchScore - a.matchScore);
        console.log(`✅ Matching tradicional concluído: ${matches.length} resultados finais`);
        return matches;
    }
    catch (error) {
        console.error('❌ Erro no matching tradicional:', error);
        return [];
    }
};
/**
 * Limpa todos os caches de coordenadas e raio
 */
const clearGeographicCache = () => {
    (0, geolocation_1.clearCoordenadasCache)();
    (0, geolocation_1.clearCidadesRaioCache)();
    console.log('🧹 Cache geográfico limpo');
};
const findWithKeywordAndFilters = async (findRequest) => {
    try {
        console.log('🔍 Iniciando busca manual com filtros...');
        // Buscar todas as licitações
        const licitacoes = await findLicitacao();
        console.log(`📊 Encontradas ${licitacoes.length} licitações para análise`);
        // Filtrar por palavra-chave - busca em todos os campos relevantes
        const licitacoesFiltradas = licitacoes.filter(licitacao => {
            // Campos principais da licitação
            const textoCompleto = `${licitacao.objetoCompra || ''} ${licitacao.informacaoComplementar || ''}`.toLowerCase();
            // Incluir texto dos itens onde software/tecnologia geralmente aparecem
            const itensTexto = licitacao.itens?.map(item => `${item.descricao || ''} ${item.materialOuServicoNome || ''} ${item.itemCategoriaNome || ''} ${item.informacaoComplementar || ''}`).join(' ').toLowerCase() || '';
            // Buscar em todos os textos combinados
            const todosTextos = `${textoCompleto} ${itensTexto}`;
            return todosTextos.includes(findRequest.palavraChave.toLowerCase());
        });
        console.log(`🔍 ${licitacoesFiltradas.length} licitações encontradas com palavra-chave "${findRequest.palavraChave}"`);
        // Criar perfil empresa para usar filtros existentes
        const empresaPerfil = {
            cnpj: findRequest.cnpj,
            termosInteresse: [findRequest.palavraChave],
            valorMinimo: findRequest.valorMinimo,
            valorMaximo: findRequest.valorMaximo
        };
        // Aplicar filtros usando função existente
        const resultadoFiltros = await (0, filters_1.aplicarFiltrosAtivos)(licitacoesFiltradas, empresaPerfil);
        console.log(`✅ Busca manual concluída: ${resultadoFiltros.licitacoesFiltradas.length} resultados finais`);
        return resultadoFiltros.licitacoesFiltradas;
    }
    catch (error) {
        console.error('❌ Erro na busca manual:', error);
        return [];
    }
};
exports.default = {
    calculateMatching,
    findWithKeywordAndFilters,
    clearCache: pineconeLicitacaoRepository_1.default.clearAllCaches,
    clearGeographicCache
};
