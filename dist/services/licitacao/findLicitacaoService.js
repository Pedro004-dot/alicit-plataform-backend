"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pineconeLicitacaoRepository_1 = __importDefault(require("../../repositories/pineconeLicitacaoRepository"));
const geolocation_1 = require("./geolocation");
const filters_1 = require("./filters");
const findWithKeywordAndFilters = async (findRequest) => {
    try {
        // Buscar todas as licitações
        const licitacoes = await pineconeLicitacaoRepository_1.default.getAllLicitacoes();
        // Filtrar por palavra-chave - busca em todos os campos relevantes
        const licitacoesFiltradas = licitacoes.filter(licitacao => {
            // Campos principais da licitação
            const textoCompleto = `${licitacao.objetoCompra || ''} ${licitacao.informacaoComplementar || ''}`.toLowerCase();
            const itensTexto = licitacao.itens?.map(item => `${item.descricao || ''} ${item.materialOuServicoNome || ''} ${item.descricao || ''} ${item.descricao || ''}`).join(' ').toLowerCase() || '';
            // Buscar em todos os textos combinados
            const todosTextos = `${textoCompleto} ${itensTexto}`;
            return todosTextos.includes(findRequest.palavraChave.toLowerCase());
        });
        // Criar perfil empresa para usar filtros existentes
        const empresaPerfil = {
            cnpj: findRequest.cnpj,
            termosInteresse: [findRequest.palavraChave],
            valorMinimo: findRequest.valorMinimo,
            valorMaximo: findRequest.valorMaximo,
            valorMinimoUnitario: findRequest.valorMinimoUnitario,
            valorMaximoUnitario: findRequest.valorMaximoUnitario,
            raioRadar: findRequest.raioDistancia,
            cidadeRadar: findRequest.cidade_radar,
        };
        // Aplicar filtros usando função existente
        const resultadoFiltros = await (0, filters_1.aplicarFiltrosAtivos)(licitacoesFiltradas, empresaPerfil);
        // console.log(`✅ Busca manual concluída: ${resultadoFiltros.licitacoesFiltradas.length} resultados finais`);
        return resultadoFiltros.licitacoesFiltradas;
    }
    catch (error) {
        console.error('❌ Erro na busca manual:', error);
        return [];
    }
};
const clearGeographicCache = () => {
    (0, geolocation_1.clearCoordenadasCache)();
    (0, geolocation_1.clearCidadesRaioCache)();
    console.log('🧹 Cache geográfico limpo');
};
exports.default = {
    findWithKeywordAndFilters,
    clearCache: pineconeLicitacaoRepository_1.default.clearAllCaches,
    clearGeographicCache
};
