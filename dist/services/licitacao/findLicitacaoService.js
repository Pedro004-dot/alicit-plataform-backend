"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supabaseLicitacaoRepository_1 = __importDefault(require("../../repositories/supabaseLicitacaoRepository"));
const supabaseGeoRepository_1 = __importDefault(require("../../repositories/supabaseGeoRepository"));
/**
 * BUSCA 100% SINTÁTICA NO SUPABASE
 * Campos analisados:
 * 1. numero_controle_pncp (busca exata por ID)
 * 2. objeto_compra (full-text search)
 * 3. licitacao_itens.descricao (full-text search via JOIN)
 */
const findWithKeywordAndFilters = async (findRequest) => {
    try {
        console.log('🔍 Iniciando busca sintática no Supabase...');
        console.log('📝 Termo de busca:', findRequest.palavraChave);
        // Preparar parâmetros de busca
        const searchParams = {
            texto: findRequest.palavraChave,
            valorMin: findRequest.valorMinimo,
            valorMax: findRequest.valorMaximo,
            modalidade: findRequest.tipoLicitacao,
            dataInicio: findRequest.dataInicio,
            dataFim: findRequest.dataFim,
            limit: 1000
        };
        // Executar busca full-text no Supabase
        let licitacoesFiltradas = await supabaseLicitacaoRepository_1.default.findWithFullTextSearch(searchParams);
        console.log(`✅ Busca textual encontrou ${licitacoesFiltradas.length} licitações`);
        // 🗺️ APLICAR FILTRO GEOGRÁFICO (se solicitado)
        if (findRequest.raioDistancia && findRequest.cidade_radar) {
            console.log(`🌍 Aplicando filtro geográfico: ${findRequest.cidade_radar} (${findRequest.raioDistancia}km)`);
            try {
                // Buscar IDs das licitações dentro do raio
                const idsGeoFiltrados = await supabaseGeoRepository_1.default.filterLicitacoesByRadius(findRequest.cidade_radar, findRequest.raioDistancia);
                if (idsGeoFiltrados.length > 0) {
                    // Filtrar resultados da busca textual pelos IDs geográficos
                    const licitacoesGeoFiltradas = licitacoesFiltradas.filter(licitacao => idsGeoFiltrados.includes(licitacao.numeroControlePNCP));
                    console.log(`📍 Filtro geográfico aplicado: ${licitacoesFiltradas.length} → ${licitacoesGeoFiltradas.length} licitações`);
                    licitacoesFiltradas = licitacoesGeoFiltradas;
                }
                else {
                    console.log(`⚠️ Nenhuma licitação encontrada no raio especificado`);
                    licitacoesFiltradas = []; // Nenhuma licitação no raio
                }
            }
            catch (error) {
                console.error(`❌ Erro no filtro geográfico: ${error}`);
                // Manter resultados originais em caso de erro no filtro geográfico
                console.log(`🔄 Continuando sem filtro geográfico (${licitacoesFiltradas.length} licitações)`);
            }
        }
        console.log(`🎯 Retornando ${licitacoesFiltradas.length} licitações finais`);
        return licitacoesFiltradas;
    }
    catch (error) {
        console.error('❌ Erro na busca sintática:', error);
        throw error;
    }
};
/**
 * BUSCA POR ID PNCP ESPECÍFICO
 */
const findById = async (numeroControlePNCP) => {
    try {
        console.log('🎯 Buscando por ID PNCP:', numeroControlePNCP);
        const licitacao = await supabaseLicitacaoRepository_1.default.getLicitacao(numeroControlePNCP);
        if (licitacao) {
            console.log('✅ Licitação encontrada');
            return licitacao;
        }
        else {
            console.log('❌ Licitação não encontrada');
            return null;
        }
    }
    catch (error) {
        console.error('❌ Erro na busca por ID:', error);
        throw error;
    }
};
/**
 * Helper para detectar se é um ID PNCP
 */
const isPNCPId = (texto) => {
    // Formato: 99999999999999-9-999999/9999
    const pncpPattern = /^\d{14}-\d-\d{6}\/\d{4}$/;
    return pncpPattern.test(texto);
};
exports.default = {
    findWithKeywordAndFilters,
    findById,
    isPNCPId
};
