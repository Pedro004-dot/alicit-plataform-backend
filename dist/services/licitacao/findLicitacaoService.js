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
        console.log(`🔍 Iniciando busca: "${findRequest.palavraChave}"`);
        // Buscar todas as licitações
        const licitacoes = await pineconeLicitacaoRepository_1.default.getAllLicitacoes();
        console.log(`📊 Total de licitações na base: ${licitacoes.length}`);
        // NOVA ESTRATÉGIA: Verificar se é busca por ID PNCP
        const isIdPNCP = isPNCPId(findRequest.palavraChave);
        console.log(`🎯 Tipo de busca: ${isIdPNCP ? 'ID PNCP' : 'Texto'}`);
        let licitacoesFiltradas = [];
        if (isIdPNCP) {
            // BUSCA POR ID PNCP
            licitacoesFiltradas = licitacoes.filter(licitacao => licitacao.numeroControlePNCP === findRequest.palavraChave);
            console.log(`📋 Busca por ID PNCP "${findRequest.palavraChave}": ${licitacoesFiltradas.length} encontradas`);
        }
        // Se não encontrou por ID ou não é ID, busca por texto
        if (licitacoesFiltradas.length === 0) {
            console.log(`🔤 Executando busca textual...`);
            licitacoesFiltradas = licitacoes.filter(licitacao => {
                // Campos principais da licitação
                const textoCompleto = `${licitacao.objetoCompra || ''} ${licitacao.informacaoComplementar || ''}`.toLowerCase();
                const itensTexto = licitacao.itens?.map(item => `${item.descricao || ''} ${item.materialOuServicoNome || ''}`).join(' ').toLowerCase() || '';
                // NOVO: Adicionar numeroControlePNCP na busca textual também
                const numeroControl = licitacao.numeroControlePNCP || '';
                // Buscar em todos os textos combinados + ID
                const todosTextos = `${textoCompleto} ${itensTexto} ${numeroControl}`;
                return todosTextos.includes(findRequest.palavraChave.toLowerCase());
            });
            console.log(`📝 Busca textual: ${licitacoesFiltradas.length} encontradas`);
        }
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
        console.log(`✅ Busca manual concluída: ${resultadoFiltros.licitacoesFiltradas.length} resultados finais`);
        return resultadoFiltros.licitacoesFiltradas;
    }
    catch (error) {
        console.error('❌ Erro na busca manual:', error);
        return [];
    }
};
// Função auxiliar para detectar se é um ID PNCP
const isPNCPId = (texto) => {
    // IDs PNCP geralmente são números longos ou códigos alfanuméricos
    // Exemplos: "2023001234567890", "20230012345", etc.
    const textoLimpo = texto.trim();
    // Critérios para considerar como ID PNCP:
    // 1. Só números com mais de 10 dígitos
    // 2. Ou código alfanumérico específico do PNCP
    const somenteNumeros = /^\d{10,}$/.test(textoLimpo);
    const formatoPNCP = /^[A-Z0-9]{10,}$/i.test(textoLimpo);
    return somenteNumeros || formatoPNCP;
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
