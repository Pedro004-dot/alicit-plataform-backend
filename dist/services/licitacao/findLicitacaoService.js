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
        const licitacoes = await pineconeLicitacaoRepository_1.default.getAllLicitacoes();
        const isIdPNCP = isPNCPId(findRequest.palavraChave);
        let licitacoesFiltradas = [];
        let estrategiaUsada = '';
        if (isIdPNCP) {
            try {
                const licitacaoDirecta = await pineconeLicitacaoRepository_1.default.getLicitacao(findRequest.palavraChave);
                if (licitacaoDirecta) {
                    licitacoesFiltradas = [licitacaoDirecta];
                    estrategiaUsada = 'Busca direta no Pinecone por ID';
                }
            }
            catch (error) {
                // Continue to fallback
            }
            if (licitacoesFiltradas.length === 0) {
                licitacoesFiltradas = licitacoes.filter(licitacao => licitacao.numeroControlePNCP?.includes(findRequest.palavraChave));
                estrategiaUsada = 'Busca parcial por ID (fallback)';
            }
        }
        // 2️⃣ BUSCA TEXTUAL RÁPIDA (estilo SQL)
        if (licitacoesFiltradas.length === 0) {
            console.log(`🔤 Executando busca textual rápida (estilo SQL)...`);
            const palavraChaveLower = findRequest.palavraChave.toLowerCase();
            // 🚀 BUSCA DIRETA NO CACHE (EQUIVALENTE AO SQL)
            // Isso é MUITO mais rápido que consultar Pinecone
            licitacoesFiltradas = licitacoes.filter(licitacao => {
                // Campos de texto principais
                const objetoCompra = normalizarTexto(licitacao.objetoCompra || '');
                const informacaoComplementar = normalizarTexto(licitacao.informacaoComplementar || '');
                // Texto dos itens
                const itensTexto = licitacao.itens?.map((item) => normalizarTexto(`${item.descricao || ''} ${item.materialOuServicoNome || ''} ${item.itemCategoriaNome || ''}`)).join(' ') || '';
                // Dados do órgão
                const orgaoTexto = normalizarTexto(`${licitacao.orgaoEntidade?.razaoSocial || ''} ${licitacao.unidadeOrgao?.nomeUnidade || ''}`);
                // ID PNCP também pode ser buscado como texto
                const numeroControl = (licitacao.numeroControlePNCP || '').toLowerCase();
                // Modalidade e situação
                const metadados = normalizarTexto(`${licitacao.modalidadeNome || ''} ${licitacao.situacaoCompraNome || ''}`);
                // 🔍 BUSCA EM MÚLTIPLOS CAMPOS com normalização
                const todosOsCampos = `${objetoCompra} ${informacaoComplementar} ${itensTexto} ${orgaoTexto} ${numeroControl} ${metadados}`;
                const palavraChaveNormalizada = normalizarTexto(findRequest.palavraChave);
                // 💡 ESTRATÉGIA SIMILAR AO SQL:
                // WHERE objeto LIKE '%DIGITALIZAÇÃO%' OR pncp_id = 'X' OR itens.descricao LIKE '%DIGITALIZAÇÃO%'
                // 1. Busca exata no ID
                if (numeroControl === palavraChaveNormalizada) {
                    return true;
                }
                // 2. Busca LIKE em campos principais (equivalente ao SQL LIKE '%texto%')
                if (objetoCompra.includes(palavraChaveNormalizada) ||
                    informacaoComplementar.includes(palavraChaveNormalizada) ||
                    itensTexto.includes(palavraChaveNormalizada) ||
                    orgaoTexto.includes(palavraChaveNormalizada)) {
                    return true;
                }
                // 3. Para textos longos, usar estratégia de palavras-chave
                const palavras = palavraChaveNormalizada.split(' ').filter(p => p.length > 2);
                if (palavras.length === 0) {
                    return false;
                }
                if (palavras.length === 1) {
                    return todosOsCampos.includes(palavras[0]);
                }
                // Para múltiplas palavras, todas devem estar presentes (mais restritivo = mais rápido)
                return palavras.every(palavra => todosOsCampos.includes(palavra));
            });
            estrategiaUsada = 'Busca textual rápida em cache (estilo SQL)';
            // 🔄 FALLBACK: Apenas se não encontrou nada E é uma busca complexa
            if (licitacoesFiltradas.length === 0 && findRequest.palavraChave.length > 50) {
                console.log(`🤖 Fallback: Tentando busca semântica no Pinecone...`);
                try {
                    const buscaSemantica = await pineconeLicitacaoRepository_1.default.buscarPorTexto(findRequest.palavraChave);
                    if (buscaSemantica && buscaSemantica.length > 0) {
                        licitacoesFiltradas = buscaSemantica;
                        estrategiaUsada = 'Busca semântica no Pinecone (fallback)';
                    }
                }
                catch (error) {
                    console.log('⚠️ Busca semântica falhou');
                }
            }
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
        return resultadoFiltros.licitacoesFiltradas;
    }
    catch (error) {
        return [];
    }
};
// Função auxiliar para detectar se é um ID PNCP
const isPNCPId = (texto) => {
    const textoLimpo = texto.trim();
    // VERSÃO REFINADA: Mais precisa para evitar falsos positivos
    // Exemplos reais: "27142058000126-1-000518/2025", "2023001234567890", etc.
    // 1. Números puros com 10+ dígitos (IDs numéricos)
    const somenteNumeros = /^\d{10,}$/.test(textoLimpo);
    // 2. Padrão específico do PNCP: CNPJ-modalidade-numero/ano (mais restritivo)
    const padraoEspecifico = /^\d{14}-\d+-\d+\/\d{4}$/i.test(textoLimpo);
    // 3. Outros padrões com números e caracteres especiais (mais de 70% números)
    const temMuitosNumeros = (textoLimpo.match(/\d/g) || []).length / textoLimpo.length > 0.7;
    const temCaracteresEspeciais = /[\-\/\.]/.test(textoLimpo);
    const formatoGovernoComNumeros = temMuitosNumeros && temCaracteresEspeciais && textoLimpo.length >= 10;
    const isId = somenteNumeros || padraoEspecifico || formatoGovernoComNumeros;
    return isId;
};
// Função para normalizar texto (remover acentos, pontuação, espaços extras)
const normalizarTexto = (texto) => {
    return texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^\w\s]/g, ' ') // Substitui pontuação por espaços
        .replace(/\s+/g, ' ') // Normaliza espaços múltiplos
        .trim();
};
const clearGeographicCache = () => {
    (0, geolocation_1.clearCoordenadasCache)();
    (0, geolocation_1.clearCidadesRaioCache)();
};
exports.default = {
    findWithKeywordAndFilters,
    clearCache: pineconeLicitacaoRepository_1.default.clearAllCaches,
    clearGeographicCache
};
