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
Object.defineProperty(exports, "__esModule", { value: true });
const pinecone_1 = require("@pinecone-database/pinecone");
/**
 * Drop-in replacement do Redis usando Pinecone
 * Mantém exatamente a mesma interface para compatibilidade total
 */
class PineconeLicitacaoRepository {
    constructor() {
        this.indexName = 'alicit-editais'; // Padronizado com outros repositórios
        // Cache Service - Mantém compatibilidade com código existente
        this.textCache = new Map();
        this.scoreCache = new Map();
        this.pinecone = new pinecone_1.Pinecone({
            apiKey: process.env.PINECONE_API_KEY,
        });
    }
    async initialize() {
        try {
            const indexes = await this.pinecone.listIndexes();
            const indexExists = indexes.indexes?.some(index => index.name === this.indexName);
            if (!indexExists) {
                await this.pinecone.createIndex({
                    name: this.indexName,
                    dimension: 1536, // Para embeddings se necessário
                    metric: 'cosine',
                    spec: {
                        serverless: {
                            cloud: 'aws',
                            region: 'us-east-1'
                        }
                    }
                });
                // Aguardar criação
                await this.waitForIndex();
            }
        }
        catch (error) {
            console.error('❌ Erro ao inicializar Pinecone:', error);
            throw error;
        }
    }
    async waitForIndex() {
        let ready = false;
        let attempts = 0;
        const maxAttempts = 30;
        while (!ready && attempts < maxAttempts) {
            try {
                const indexStats = await this.pinecone.describeIndex(this.indexName);
                ready = indexStats.status?.ready === true;
                if (!ready) {
                    await new Promise(resolve => setTimeout(resolve, 10000));
                    attempts++;
                }
            }
            catch (error) {
                await new Promise(resolve => setTimeout(resolve, 10000));
                attempts++;
            }
        }
        if (!ready) {
            throw new Error('Timeout aguardando criação do índice Pinecone');
        }
    }
    async saveLicitacoes(licitacoes) {
        try {
            await this.initialize();
            const index = this.pinecone.index(this.indexName);
            // MELHORIA 1: Filtrar duplicatas antes de processar
            const novasLicitacoes = await this.filterExistingLicitacoes(licitacoes);
            if (novasLicitacoes.length === 0) {
                return 0;
            }
            const vectors = [];
            let processedCount = 0;
            for (const licitacao of novasLicitacoes) {
                try {
                    const embedding = await this.generateEmbedding(licitacao);
                    const vector = {
                        id: `licitacao:${licitacao.numeroControlePNCP}`,
                        values: embedding,
                        metadata: {
                            // 🔄 FLAT METADATA: Respeitando limite 40KB e estrutura plana do Pinecone
                            numeroControlePNCP: licitacao.numeroControlePNCP,
                            objetoCompra: (licitacao.objetoCompra || '').substring(0, 500), // Reduzido
                            valorTotal: licitacao.valorTotalEstimado || 0,
                            createdAt: new Date().toISOString(),
                            // ❌ Removido: itens (violava estrutura plana + limite 40KB)
                            totalItens: licitacao.itens?.length || 0 // Apenas contagem
                        }
                    };
                    vectors.push(vector);
                    processedCount++;
                }
                catch (embeddingError) {
                    // Continua com próxima licitação
                }
            }
            // MELHORIA 4: Upsert com retry em caso de falha
            const BATCH_SIZE = 50; // Reduzido para maior estabilidade
            let savedCount = 0;
            for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
                const batch = vectors.slice(i, i + BATCH_SIZE);
                const batchNum = Math.floor(i / BATCH_SIZE) + 1;
                const totalBatches = Math.ceil(vectors.length / BATCH_SIZE);
                try {
                    await this.upsertWithRetry(index, batch);
                    savedCount += batch.length;
                }
                catch (batchError) {
                    // Continua com próximo batch
                }
                // MELHORIA 5: Pausa maior para evitar rate limiting (Pinecone: 100 req/min)
                if (i + BATCH_SIZE < vectors.length) {
                    await new Promise(resolve => setTimeout(resolve, 1000)); // 1s entre batches
                }
            }
            return savedCount;
        }
        catch (error) {
            console.error('❌ Erro ao salvar licitações no Pinecone:', error);
            return 0;
        }
    }
    // Filtrar licitações já existentes para evitar duplicatas
    async filterExistingLicitacoes(licitacoes) {
        const index = this.pinecone.index(this.indexName);
        const existingIds = [];
        const BATCH_SIZE = 100;
        // Verificar em batches quais já existem
        for (let i = 0; i < licitacoes.length; i += BATCH_SIZE) {
            const batch = licitacoes.slice(i, i + BATCH_SIZE);
            const ids = batch.map(l => `licitacao:${l.numeroControlePNCP}`);
            try {
                const fetchResponse = await index.fetch(ids);
                const existingInBatch = Object.keys(fetchResponse.records || {});
                existingIds.push(...existingInBatch);
            }
            catch (error) {
            }
        }
        // Filtrar apenas as não existentes
        return licitacoes.filter(l => !existingIds.includes(`licitacao:${l.numeroControlePNCP}`));
    }
    // Gerar embedding real usando OpenAI
    async generateEmbedding(licitacao) {
        try {
            // TEXTO ENRIQUECIDO PARA EMBEDDING - Máxima qualidade de matching
            const textoCompleto = [
                licitacao.objetoCompra || '',
                licitacao.informacaoComplementar || '',
                licitacao.itens
                    ?.sort((a, b) => (b.valorTotal || 0) - (a.valorTotal || 0)) // Ordenar por valor
                    ?.map(item => [
                    item.descricao || '',
                    item.materialOuServicoNome || '',
                    item.informacaoComplementar || '',
                ].filter(Boolean).join(' ')).join('. ') || '',
            ].filter(Boolean).join('. ').substring(0, 8000); // Limite de tokens OpenAI
            if (!textoCompleto.trim()) {
                // Fallback para vector neutro se não há texto
                return new Array(1536).fill(0.1);
            }
            // Se OpenAI configurado, usar embedding real
            if (process.env.OPENAI_API_KEY) {
                const { OpenAI } = await Promise.resolve().then(() => __importStar(require('openai')));
                const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
                const response = await openai.embeddings.create({
                    model: 'text-embedding-3-small',
                    input: textoCompleto,
                    encoding_format: 'float',
                });
                return response.data[0].embedding;
            }
            else {
                // Fallback para hash-based vector se OpenAI não configurado
                return this.generateHashBasedVector(textoCompleto);
            }
        }
        catch (error) {
            console.error('❌ ERRO ao gerar embedding:', error);
            console.log('🔄 Fallback para vector hash-based...');
            return this.generateHashBasedVector(licitacao.objetoCompra || 'default');
        }
    }
    // Gerar vector único baseado no hash do conteúdo
    generateHashBasedVector(text) {
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
    }
    // Upsert com retry para maior confiabilidade
    async upsertWithRetry(index, batch, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await index.upsert(batch);
                return; // Sucesso
            }
            catch (error) {
                console.error(`❌ ERRO PINECONE - Tentativa ${attempt}/${maxRetries}:`, {
                    error: error.message || error,
                    errorCode: error.code || 'N/A',
                    batchSize: batch.length,
                    vectorIds: batch.slice(0, 3).map(v => v.id), // Primeiros 3 IDs
                    metadataSize: JSON.stringify(batch[0]?.metadata || {}).length + ' chars',
                    vectorDimension: batch[0]?.values?.length || 'N/A'
                });
                if (attempt === maxRetries) {
                    throw error; // Última tentativa, propagar erro
                }
                console.warn(`⚠️ Tentativa ${attempt} falhou, tentando novamente em ${1000 * attempt}ms...`);
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Backoff exponencial
            }
        }
    }
    /**
     * REMOVIDO: getLicitacao agora é responsabilidade do Supabase
     * Mantido apenas para compatibilidade durante transição
     */
    async getLicitacao(numeroControlePNCP) {
        console.warn('⚠️ DEPRECATED: getLicitacao() do Pinecone foi movido para Supabase. Use supabaseLicitacaoRepository.getLicitacao()');
        try {
            await this.initialize();
            const index = this.pinecone.index(this.indexName);
            // Busca simplificada apenas para fallback
            const queryResponse = await index.query({
                vector: new Array(1536).fill(0.1),
                topK: 1,
                includeValues: false,
                includeMetadata: true,
                filter: { numeroControlePNCP: { $eq: numeroControlePNCP } }
            });
            if (queryResponse.matches && queryResponse.matches.length > 0) {
                const match = queryResponse.matches[0];
                if (match.metadata?.data) {
                    const licitacao = JSON.parse(match.metadata.data);
                    return licitacao;
                }
            }
            return null;
        }
        catch (error) {
            console.error('❌ Erro ao buscar licitação no Pinecone (fallback):', error);
            return null;
        }
    }
    /**
     * REMOVIDO: getAllLicitacoes agora é responsabilidade do Supabase
     * Mantido apenas para compatibilidade durante transição
     */
    async getAllLicitacoes() {
        console.warn('⚠️ DEPRECATED: getAllLicitacoes() do Pinecone foi movido para Supabase. Use supabaseLicitacaoRepository.getAllLicitacoes()');
        try {
            // Busca simplificada apenas para fallback
            await this.initialize();
            const index = this.pinecone.index(this.indexName);
            const queryResponse = await index.query({
                vector: new Array(1536).fill(0.1),
                topK: 1000, // Reduzido para fallback
                includeValues: false,
                includeMetadata: true,
                filter: { numeroControlePNCP: { $exists: true } }
            });
            const licitacoes = [];
            for (const match of queryResponse.matches || []) {
                if (match.metadata?.data) {
                    try {
                        const licitacao = JSON.parse(match.metadata.data);
                        if (licitacao && licitacao.numeroControlePNCP) {
                            licitacoes.push(licitacao);
                        }
                    }
                    catch (error) {
                        // Continue processing
                    }
                }
            }
            return licitacoes;
        }
        catch (error) {
            console.error('❌ Erro ao buscar licitações no Pinecone (fallback):', error);
            return [];
        }
    }
    // Cache Service - Mantém compatibilidade total com Redis
    getCachedText(key) {
        return this.textCache.get(key);
    }
    setCachedText(key, value) {
        this.textCache.set(key, value);
    }
    getCachedScore(key) {
        return this.scoreCache.get(key);
    }
    setCachedScore(key, value) {
        this.scoreCache.set(key, value);
    }
    clearTextCache() {
        this.textCache.clear();
    }
    clearScoreCache() {
        this.scoreCache.clear();
    }
    clearAllCaches() {
        this.textCache.clear();
        this.scoreCache.clear();
    }
    // Métodos de municípios - Implementação básica (pode ser expandida)
    async loadMunicipiosToRedis() {
        return 0;
    }
    async getMunicipioByIbge(codigoIbge) {
        return null;
    }
    async getMunicipioByNome(nome) {
        return null;
    }
    async checkMunicipiosLoaded() {
        return false;
    }
    /**
     * Métodos para inspecionar estrutura do Pinecone
     */
    async getIndexStats() {
        try {
            await this.initialize();
            const index = this.pinecone.index(this.indexName);
            // Estatísticas do índice
            const stats = await index.describeIndexStats();
            return stats;
        }
        catch (error) {
            console.error('❌ Erro ao obter estatísticas do índice:', error);
            return null;
        }
    }
    async getSampleData(limit = 2) {
        try {
            await this.initialize();
            const index = this.pinecone.index(this.indexName);
            // Buscar amostras de dados
            const queryResponse = await index.query({
                vector: new Array(1536).fill(0.1),
                topK: limit,
                includeValues: false,
                includeMetadata: true,
                filter: { numeroControlePNCP: { $exists: true } }
            });
            const samples = [];
            for (const match of queryResponse.matches || []) {
                if (match.metadata) {
                    // Estrutura da metadata sem o JSON completo (muito grande)
                    const { data, ...metadataStructure } = match.metadata;
                    samples.push({
                        id: match.id,
                        score: match.score,
                        metadata: metadataStructure,
                        // Apenas primeiros 200 chars do JSON para visualização
                        dataPreview: data ? data.substring(0, 200) + '...' : null
                    });
                }
            }
            return samples;
        }
        catch (error) {
            console.error('❌ Erro ao buscar amostras:', error);
            return [];
        }
    }
    async analyzeMetadataStructure() {
        try {
            await this.initialize();
            const index = this.pinecone.index(this.indexName);
            // Buscar uma amostra maior para análise
            const queryResponse = await index.query({
                vector: new Array(1536).fill(0.1),
                topK: 50,
                includeValues: false,
                includeMetadata: true,
                filter: { numeroControlePNCP: { $exists: true } }
            });
            const fieldCounts = {};
            const fieldTypes = {};
            const fieldSamples = {};
            for (const match of queryResponse.matches || []) {
                if (match.metadata) {
                    for (const [field, value] of Object.entries(match.metadata)) {
                        // Contar campos
                        fieldCounts[field] = (fieldCounts[field] || 0) + 1;
                        // Identificar tipos
                        if (!fieldTypes[field])
                            fieldTypes[field] = new Set();
                        fieldTypes[field].add(typeof value);
                        // Coletar amostras (exceto data que é muito grande)
                        if (field !== 'data') {
                            if (!fieldSamples[field])
                                fieldSamples[field] = [];
                            if (fieldSamples[field].length < 3) {
                                fieldSamples[field].push(value);
                            }
                        }
                    }
                }
            }
            // Converter Sets para arrays
            const analysis = {};
            for (const field of Object.keys(fieldCounts)) {
                analysis[field] = {
                    count: fieldCounts[field],
                    types: Array.from(fieldTypes[field]),
                    samples: fieldSamples[field] || []
                };
            }
            return {
                totalSamples: queryResponse.matches?.length || 0,
                fields: analysis
            };
        }
        catch (error) {
            console.error('❌ Erro ao analisar estrutura:', error);
            return null;
        }
    }
    async getFullDataStructure() {
        try {
            const stats = await this.getIndexStats();
            const samples = await this.getSampleData(2);
            const structure = await this.analyzeMetadataStructure();
            return {
                indexStats: stats,
                sampleRecords: samples,
                metadataStructure: structure
            };
        }
        catch (error) {
            console.error('❌ Erro ao obter estrutura completa:', error);
            return null;
        }
    }
    /**
     * NOVO: Busca semântica que retorna apenas IDs para uso híbrido com Supabase
     */
    async buscarIdsRelevantes(texto) {
        try {
            await this.initialize();
            const index = this.pinecone.index(this.indexName);
            if (!texto || texto.trim().length < 3)
                return [];
            // Gerar embedding do texto de busca
            const queryEmbedding = await this.generateQueryEmbedding(texto);
            // Busca semântica otimizada
            const queryResponse = await index.query({
                vector: queryEmbedding,
                topK: 100, // Reduzido para performance
                includeValues: false,
                includeMetadata: true,
                filter: { numeroControlePNCP: { $exists: true } }
            });
            // Retornar apenas IDs dos resultados mais relevantes
            const ids = queryResponse.matches
                ?.filter(match => match.score && match.score > 0.7) // Filtro de relevância
                ?.map(match => match.metadata?.numeroControlePNCP)
                ?.filter(Boolean) || [];
            console.log(`🎯 Busca semântica encontrou ${ids.length} IDs relevantes para: "${texto}"`);
            return ids;
        }
        catch (error) {
            console.error('❌ Erro na busca semântica por IDs:', error);
            return [];
        }
    }
    /**
     * Gerar embedding para query de busca
     */
    async generateQueryEmbedding(texto) {
        try {
            if (process.env.OPENAI_API_KEY) {
                const { OpenAI } = await Promise.resolve().then(() => __importStar(require('openai')));
                const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
                const response = await openai.embeddings.create({
                    model: 'text-embedding-3-small',
                    input: texto.substring(0, 8000),
                    encoding_format: 'float',
                });
                return response.data[0].embedding;
            }
            else {
                return this.generateHashBasedVector(texto);
            }
        }
        catch (error) {
            console.error('❌ Erro ao gerar embedding da query:', error);
            return this.generateHashBasedVector(texto);
        }
    }
    /**
     * DEPRECATED: Busca textual otimizada - Use buscarIdsRelevantes + Supabase
     * Mantido para compatibilidade durante transição
     */
    async buscarPorTexto(texto) {
        console.warn('⚠️ DEPRECATED: buscarPorTexto() foi substituído por buscarIdsRelevantes() + Supabase');
        // Implementação simplificada para fallback
        try {
            await this.initialize();
            const index = this.pinecone.index(this.indexName);
            const textoNormalizado = texto.toLowerCase().trim();
            if (!textoNormalizado)
                return [];
            const resultados = [];
            const idsEncontrados = new Set();
            // 🎯 ESTRATÉGIA 1: Busca por categorias estratégicas
            // Dividir a base de 109k+ em consultas mais focadas
            const categoriasModalidade = [
                'pregao_eletronico', 'concorrencia', 'tomada_de_precos',
                'convite', 'concurso', 'leilao'
            ];
            for (const modalidade of categoriasModalidade) {
                try {
                    const queryResponse = await index.query({
                        vector: new Array(1536).fill(0.1),
                        topK: 2000, // Otimizado para performance
                        includeValues: false,
                        includeMetadata: true,
                        filter: {
                            $and: [
                                { numeroControlePNCP: { $exists: true } },
                                { modalidadeNome: { $eq: modalidade } }
                            ]
                        }
                    });
                    await this.processarResultados(queryResponse, textoNormalizado, resultados, idsEncontrados);
                }
                catch (error) {
                    console.log(`⚠️ Erro na busca por modalidade ${modalidade}:`, error);
                }
            }
            // 🎯 ESTRATÉGIA 2: Busca por Estados (UF) - cobertura geográfica
            if (resultados.length < 100) {
                const ufsComuns = ['SP', 'RJ', 'MG', 'RS', 'PR', 'SC', 'BA', 'PE', 'CE', 'GO'];
                for (const uf of ufsComuns) {
                    try {
                        const queryResponse = await index.query({
                            vector: new Array(1536).fill(0.1),
                            topK: 1500,
                            includeValues: false,
                            includeMetadata: true,
                            filter: {
                                $and: [
                                    { numeroControlePNCP: { $exists: true } },
                                    { uf: { $eq: uf } }
                                ]
                            }
                        });
                        await this.processarResultados(queryResponse, textoNormalizado, resultados, idsEncontrados);
                    }
                    catch (error) {
                        console.log(`⚠️ Erro na busca por UF ${uf}:`, error);
                    }
                }
            }
            // 🎯 ESTRATÉGIA 3: Busca por faixas de valor - cobertura econômica
            if (resultados.length < 50) {
                const faixasValor = [
                    { min: 0, max: 100000 },
                    { min: 100000, max: 500000 },
                    { min: 500000, max: 1000000 },
                    { min: 1000000, max: 10000000 }
                ];
                for (const faixa of faixasValor) {
                    try {
                        const queryResponse = await index.query({
                            vector: new Array(1536).fill(0.1),
                            topK: 1200,
                            includeValues: false,
                            includeMetadata: true,
                            filter: {
                                $and: [
                                    { numeroControlePNCP: { $exists: true } },
                                    { valorTotal: { $gte: faixa.min, $lte: faixa.max } }
                                ]
                            }
                        });
                        await this.processarResultados(queryResponse, textoNormalizado, resultados, idsEncontrados);
                    }
                    catch (error) {
                        console.log(`⚠️ Erro na busca por valor ${faixa.min}-${faixa.max}:`, error);
                    }
                }
            }
            console.log(`🔍 Busca textual otimizada encontrou ${resultados.length} resultados únicos`);
            return resultados.slice(0, 1000); // Limitar resultado final
        }
        catch (error) {
            console.error('❌ Erro na busca textual otimizada:', error);
            return [];
        }
    }
    /**
     * Processa resultados e filtra por relevância textual
     */
    async processarResultados(queryResponse, textoNormalizado, resultados, idsEncontrados) {
        for (const match of queryResponse.matches || []) {
            if (match.metadata?.data && !idsEncontrados.has(match.id)) {
                try {
                    const licitacao = JSON.parse(match.metadata.data);
                    if (licitacao && licitacao.numeroControlePNCP) {
                        // Verificar relevância textual
                        if (this.verificarRelevanciaTextual(licitacao, textoNormalizado)) {
                            resultados.push(licitacao);
                            idsEncontrados.add(match.id);
                        }
                    }
                }
                catch (error) {
                    // Continue processando
                }
            }
        }
    }
    /**
     * Verifica se a licitação é relevante para o texto buscado
     */
    verificarRelevanciaTextual(licitacao, textoNormalizado) {
        const campos = [
            licitacao.objetoCompra || '',
            licitacao.informacaoComplementar || '',
            licitacao.numeroControlePNCP || '',
            licitacao.orgaoEntidade?.razaoSocial || '',
            licitacao.unidadeOrgao?.nomeUnidade || '',
            licitacao.modalidadeNome || '',
            licitacao.situacaoCompraNome || '',
            ...(licitacao.itens?.map(item => `${item.descricao || ''} ${item.materialOuServicoNome || ''} ${item.itemCategoriaNome || ''}`) || [])
        ];
        const textoCompleto = campos.join(' ').toLowerCase();
        // Estratégia de busca flexível
        const palavras = textoNormalizado.split(' ').filter(p => p.length > 2);
        if (palavras.length === 0) {
            return textoCompleto.includes(textoNormalizado);
        }
        if (palavras.length === 1) {
            return textoCompleto.includes(palavras[0]);
        }
        // Para múltiplas palavras, pelo menos 70% devem estar presentes
        const palavrasEncontradas = palavras.filter(palavra => textoCompleto.includes(palavra));
        return palavrasEncontradas.length >= Math.ceil(palavras.length * 0.7);
    }
}
// Export com mesma interface do Redis
const pineconeLicitacaoRepository = new PineconeLicitacaoRepository();
exports.default = {
    // 🔄 MÉTODOS PRINCIPAIS (Embeddings semânticos)
    saveLicitacoes: (licitacoes) => pineconeLicitacaoRepository.saveLicitacoes(licitacoes),
    buscarIdsRelevantes: (texto) => pineconeLicitacaoRepository.buscarIdsRelevantes(texto),
    // ⚠️ MÉTODOS DEPRECATED (Migrados para Supabase)
    getLicitacao: (numeroControlePNCP) => pineconeLicitacaoRepository.getLicitacao(numeroControlePNCP),
    getAllLicitacoes: () => pineconeLicitacaoRepository.getAllLicitacoes(),
    buscarPorTexto: (texto) => pineconeLicitacaoRepository.buscarPorTexto(texto),
    // 🗂️ CACHE SERVICE (Mantido para compatibilidade)
    getCachedText: (key) => pineconeLicitacaoRepository.getCachedText(key),
    setCachedText: (key, value) => pineconeLicitacaoRepository.setCachedText(key, value),
    getCachedScore: (key) => pineconeLicitacaoRepository.getCachedScore(key),
    setCachedScore: (key, value) => pineconeLicitacaoRepository.setCachedScore(key, value),
    clearTextCache: () => pineconeLicitacaoRepository.clearTextCache(),
    clearScoreCache: () => pineconeLicitacaoRepository.clearScoreCache(),
    clearAllCaches: () => pineconeLicitacaoRepository.clearAllCaches(),
    // 🏛️ MUNICÍPIOS (Placeholder - pode ser implementado no Supabase)
    loadMunicipiosToRedis: () => pineconeLicitacaoRepository.loadMunicipiosToRedis(),
    getMunicipioByIbge: (codigoIbge) => pineconeLicitacaoRepository.getMunicipioByIbge(codigoIbge),
    getMunicipioByNome: (nome) => pineconeLicitacaoRepository.getMunicipioByNome(nome),
    checkMunicipiosLoaded: () => pineconeLicitacaoRepository.checkMunicipiosLoaded(),
    // 🔍 MÉTODOS DE INSPEÇÃO (Mantidos para debug)
    getIndexStats: () => pineconeLicitacaoRepository.getIndexStats(),
    getSampleData: (limit) => pineconeLicitacaoRepository.getSampleData(limit),
    analyzeMetadataStructure: () => pineconeLicitacaoRepository.analyzeMetadataStructure(),
    getFullDataStructure: () => pineconeLicitacaoRepository.getFullDataStructure()
};
