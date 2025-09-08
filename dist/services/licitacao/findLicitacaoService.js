import pineconeLicitacaoRepository from '../../repositories/pineconeLicitacaoRepository';
import { calculateMatchingScore } from './metrics';
import { clearCoordenadasCache, clearCidadesRaioCache } from './geolocation';
import { aplicarFiltrosAtivos } from './filters';
/**
 * Busca todas as licitações armazenadas no Pinecone
 * @returns Array de licitações válidas
 */
const findLicitacao = async () => {
    return await pineconeLicitacaoRepository.getAllLicitacoes();
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
        const resultadoFiltros = await aplicarFiltrosAtivos(licitacoes, empresaPerfil);
        console.log(`🔍 Filtros aplicados: ${resultadoFiltros.filtrosAplicados.join(', ') || 'nenhum'}`);
        console.log(`📊 ${resultadoFiltros.estatisticas.totalInicial} → ${resultadoFiltros.estatisticas.totalFinal} licitações (${resultadoFiltros.estatisticas.reducaoPercentual}% filtradas)`);
        // Calcular matching scores
        const matches = resultadoFiltros.licitacoesFiltradas
            .map(licitacao => calculateMatchingScore(empresaPerfil, licitacao))
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
    clearCoordenadasCache();
    clearCidadesRaioCache();
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
            const itensTexto = licitacao.itens?.map(item => `${item.descricao || ''} ${item.materialOuServicoNome || ''} ${item.descricao || ''} ${item.descricao || ''}`).join(' ').toLowerCase() || '';
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
        const resultadoFiltros = await aplicarFiltrosAtivos(licitacoesFiltradas, empresaPerfil);
        console.log(`✅ Busca manual concluída: ${resultadoFiltros.licitacoesFiltradas.length} resultados finais`);
        return resultadoFiltros.licitacoesFiltradas;
    }
    catch (error) {
        console.error('❌ Erro na busca manual:', error);
        return [];
    }
};
export default {
    calculateMatching,
    findWithKeywordAndFilters,
    clearCache: pineconeLicitacaoRepository.clearAllCaches,
    clearGeographicCache
};
