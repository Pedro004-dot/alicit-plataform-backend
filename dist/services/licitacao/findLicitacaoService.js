"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
        // 🎯 ESTRATÉGIA HÍBRIDA INTELIGENTE
        const isIdPNCP = isPNCPId(findRequest.palavraChave);
        console.log(`🎯 Tipo de busca detectado: ${isIdPNCP ? 'ID PNCP' : 'Texto'}`);
        let licitacoesFiltradas = [];
        let estrategiaUsada = '';
        if (isIdPNCP) {
            // 1️⃣ BUSCA DIRETA VIA PINECONE (evita limite de 10k do getAllLicitacoes)
            console.log(`🎯 Executando busca direta no Pinecone por ID: "${findRequest.palavraChave}"`);
            try {
                const licitacaoDirecta = await pineconeLicitacaoRepository_1.default.getLicitacao(findRequest.palavraChave);
                if (licitacaoDirecta) {
                    licitacoesFiltradas = [licitacaoDirecta];
                    estrategiaUsada = 'Busca direta no Pinecone por ID';
                    console.log(`✅ Licitação encontrada diretamente: ${licitacaoDirecta.numeroControlePNCP}`);
                }
                else {
                    console.log(`❌ ID não encontrado no Pinecone: ${findRequest.palavraChave}`);
                }
            }
            catch (error) {
                console.error('❌ Erro na busca direta:', error);
            }
            // 🔄 FALLBACK 1: Se não encontrou diretamente, tentar busca parcial via getAllLicitacoes
            if (licitacoesFiltradas.length === 0) {
                console.log(`🔄 Fallback: Busca parcial no ID via getAllLicitacoes...`);
                licitacoesFiltradas = licitacoes.filter(licitacao => licitacao.numeroControlePNCP?.includes(findRequest.palavraChave));
                estrategiaUsada = 'Busca parcial por ID (fallback)';
                console.log(`📋 Resultado busca parcial: ${licitacoesFiltradas.length} licitações encontradas`);
            }
        }
        // 2️⃣ BUSCA TEXTUAL (quando não é ID ou quando ID não encontrou nada)
        if (licitacoesFiltradas.length === 0) {
            console.log(`🔤 Executando busca textual em getAllLicitacoes...`);
            const palavraChaveLower = findRequest.palavraChave.toLowerCase();
            licitacoesFiltradas = licitacoes.filter(licitacao => {
                // Campos de texto principais
                const objetoCompra = (licitacao.objetoCompra || '').toLowerCase();
                const informacaoComplementar = (licitacao.informacaoComplementar || '').toLowerCase();
                // Texto dos itens
                const itensTexto = licitacao.itens?.map(item => `${item.descricao || ''} ${item.materialOuServicoNome || ''} ${item.itemCategoriaNome || ''}`).join(' ').toLowerCase() || '';
                // Dados do órgão
                const orgaoTexto = `${licitacao.orgaoEntidade?.razaoSocial || ''} ${licitacao.unidadeOrgao?.nomeUnidade || ''}`.toLowerCase();
                // ID PNCP também pode ser buscado como texto
                const numeroControl = (licitacao.numeroControlePNCP || '').toLowerCase();
                // Modalidade e situação
                const metadados = `${licitacao.modalidadeNome || ''} ${licitacao.situacaoCompraNome || ''}`.toLowerCase();
                // 🔍 BUSCA EM MÚLTIPLOS CAMPOS
                const camposPrincipais = `${objetoCompra} ${informacaoComplementar}`;
                const todosOsCampos = `${camposPrincipais} ${itensTexto} ${orgaoTexto} ${numeroControl} ${metadados}`;
                return todosOsCampos.includes(palavraChaveLower);
            });
            console.log(`📝 Resultado busca textual getAllLicitacoes: ${licitacoesFiltradas.length} licitações encontradas`);
            // 🚀 FALLBACK SEMÂNTICO: Se não encontrou nada, buscar diretamente no Pinecone
            if (licitacoesFiltradas.length === 0) {
                console.log(`🔍 Fallback: Busca semântica direta no Pinecone...`);
                try {
                    const resultadosSemanticos = await buscarSemanticamenteNoPinecone(findRequest.palavraChave);
                    licitacoesFiltradas = resultadosSemanticos;
                    estrategiaUsada = 'Busca semântica direta no Pinecone (fallback)';
                    console.log(`🎯 Resultado busca semântica: ${licitacoesFiltradas.length} licitações encontradas`);
                }
                catch (error) {
                    console.error('❌ Erro na busca semântica:', error);
                    estrategiaUsada = isIdPNCP ? 'Busca textual (fallback do ID)' : 'Busca textual';
                }
            }
            else {
                estrategiaUsada = isIdPNCP ? 'Busca textual (fallback do ID)' : 'Busca textual';
            }
        }
        console.log(`✅ Estratégia final utilizada: ${estrategiaUsada}`);
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
    if (isId) {
        console.log(`🎯 ID PNCP detectado: "${textoLimpo}" (padrão: ${somenteNumeros ? 'números puros' :
            padraoEspecifico ? 'CNPJ-modalidade-numero/ano' :
                'formato governo com números'})`);
    }
    else {
        console.log(`📝 Texto detectado (não é ID): "${textoLimpo}"`);
    }
    return isId;
};
// Função para busca semântica direta no Pinecone (fallback para casos como limite de 10k)
const buscarSemanticamenteNoPinecone = async (textoBusca) => {
    try {
        console.log(`🧠 Gerando embedding para: "${textoBusca.substring(0, 50)}..."`);
        // Gerar embedding para o texto de busca
        let searchVector;
        if (process.env.OPENAI_API_KEY) {
            const { OpenAI } = await Promise.resolve().then(() => __importStar(require('openai')));
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            const embeddingResponse = await openai.embeddings.create({
                model: 'text-embedding-3-small',
                input: textoBusca,
                encoding_format: 'float',
            });
            searchVector = embeddingResponse.data[0].embedding;
            console.log(`✅ Embedding OpenAI gerado: ${searchVector.length} dimensões`);
        }
        else {
            // Fallback para vector hash-based se OpenAI não configurado
            searchVector = generateHashBasedVector(textoBusca);
            console.log(`⚠️ Usando embedding hash-based (OpenAI não configurado)`);
        }
        // Buscar no Pinecone usando o embedding
        const { Pinecone } = await Promise.resolve().then(() => __importStar(require('@pinecone-database/pinecone')));
        const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
        const index = pinecone.index('alicit-editais');
        console.log(`🔍 Buscando semanticamente no Pinecone...`);
        const queryResponse = await index.query({
            vector: searchVector,
            topK: 100, // Buscar mais resultados para compensar possíveis filtros
            includeValues: false,
            includeMetadata: true,
            filter: { numeroControlePNCP: { $exists: true } }
        });
        const licitacoes = [];
        for (const match of queryResponse.matches || []) {
            if (match.metadata?.data && match.score && match.score > 0.7) { // Filtro de relevância
                try {
                    const licitacao = JSON.parse(match.metadata.data);
                    if (licitacao.itens?.length > 0) {
                        licitacoes.push(licitacao);
                    }
                }
                catch (error) {
                    console.warn('Erro ao parsear licitação da busca semântica:', error);
                }
            }
        }
        console.log(`🎯 Busca semântica retornou: ${licitacoes.length} licitações relevantes`);
        return licitacoes;
    }
    catch (error) {
        console.error('❌ Erro na busca semântica:', error);
        return [];
    }
};
// Função auxiliar para gerar vector baseado em hash (fallback)
const generateHashBasedVector = (text) => {
    const vector = new Array(1536);
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    // Usar hash para gerar vector único
    for (let i = 0; i < 1536; i++) {
        vector[i] = Math.sin(hash + i) * 0.5;
    }
    return vector;
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
