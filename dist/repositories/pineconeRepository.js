"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PineconeRepository = void 0;
const pinecone_1 = require("@pinecone-database/pinecone");
const openai_1 = __importDefault(require("openai"));
class PineconeRepository {
    constructor() {
        this.indexName = 'alicit-editais';
        this.vectorStore = new Map(); // Cache em memória para compatibilidade
        this.pinecone = new pinecone_1.Pinecone({
            apiKey: process.env.PINECONE_API_KEY,
        });
        this.openaiClient = new openai_1.default({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    async retryOperation(operation, maxRetries = 3, delay = 2000) {
        let lastError;
        for (let i = 0; i < maxRetries; i++) {
            try {
                if (i > 0) {
                    console.log(`🔄 Tentativa ${i + 1}/${maxRetries} de conectar ao Pinecone...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
                return await operation();
            }
            catch (error) {
                lastError = error;
                if (i === maxRetries - 1) {
                    throw lastError;
                }
            }
        }
        throw lastError;
    }
    async initialize() {
        try {
            console.log('🔄 Conectando ao Pinecone...');
            // Verificar se índice existe, se não, criar com retry
            const indexes = await this.retryOperation(() => this.pinecone.listIndexes());
            const indexExists = indexes.indexes?.some(index => index.name === this.indexName);
            if (!indexExists) {
                console.log(`🔧 Criando índice Pinecone: ${this.indexName}...`);
                await this.pinecone.createIndex({
                    name: this.indexName,
                    dimension: 1536, // text-embedding-3-small dimension
                    metric: 'cosine',
                    spec: {
                        serverless: {
                            cloud: 'aws',
                            region: 'us-east-1'
                        }
                    }
                });
                // Aguardar criação do índice
                await this.waitForIndex(this.indexName);
            }
            console.log('✅ PineconeRepository inicializado com sucesso');
        }
        catch (error) {
            console.error('❌ Erro ao inicializar PineconeRepository:', error);
            if (error instanceof Error) {
                if (error.message.includes('ENOTFOUND') || error.message.includes('fetch failed')) {
                    throw new Error('Falha de conectividade com Pinecone. Verifique sua conexão de internet ou tente novamente mais tarde.');
                }
            }
            throw error;
        }
    }
    async waitForIndex(indexName) {
        console.log('⏳ Aguardando índice ficar pronto...');
        let ready = false;
        let attempts = 0;
        const maxAttempts = 30;
        while (!ready && attempts < maxAttempts) {
            try {
                const indexStats = await this.pinecone.describeIndex(indexName);
                ready = indexStats.status?.ready === true;
                if (!ready) {
                    console.log(`⏳ Tentativa ${attempts + 1}/${maxAttempts} - Índice ainda não está pronto...`);
                    await new Promise(resolve => setTimeout(resolve, 10000)); // 10 segundos
                    attempts++;
                }
            }
            catch (error) {
                console.log(`⏳ Tentativa ${attempts + 1}/${maxAttempts} - Verificando índice...`);
                await new Promise(resolve => setTimeout(resolve, 10000));
                attempts++;
            }
        }
        if (!ready) {
            throw new Error('Timeout aguardando criação do índice Pinecone');
        }
        console.log('✅ Índice Pinecone pronto!');
    }
    /**
     * Salva chunks com embeddings no Pinecone - compatível com VectorStorage
     */
    async saveChunks(chunks, licitacaoId) {
        try {
            console.log(`💾 Salvando ${chunks.length} chunks no Pinecone para ${licitacaoId}...`);
            const index = this.pinecone.index(this.indexName);
            const vectors = [];
            for (const chunk of chunks) {
                if (!chunk.embedding || chunk.embedding.length === 0) {
                    console.log(`⚠️ Chunk ${chunk.id} sem embedding, pulando...`);
                    continue;
                }
                // Cache embedding em memória para compatibilidade
                this.vectorStore.set(chunk.id, chunk.embedding);
                // Debug dos metadados (apenas primeiro chunk)
                if (vectors.length === 0) {
                    console.log(`🔍 Debug primeiro chunk - ID: ${chunk.id}, licitacaoId: ${chunk.metadata.licitacaoId}`);
                }
                const vector = {
                    id: chunk.id,
                    values: chunk.embedding,
                    metadata: {
                        document: chunk.text.substring(0, 40000), // ✅ CAMPO CORRETO para Mastra
                        text: chunk.text.substring(0, 40000), // ✅ MANTÉM para compatibilidade
                        licitacaoId: chunk.metadata.licitacaoId,
                        documentIndex: chunk.metadata.documentIndex,
                        documentType: chunk.metadata.documentType,
                        hierarchyPath: chunk.metadata.hierarchyPath || 'geral',
                        depth: chunk.metadata.depth || 0,
                        criticality: chunk.metadata.criticality || 0.5,
                        sectionType: chunk.metadata.sectionType || 'geral',
                        createdAt: new Date().toISOString()
                    }
                };
                vectors.push(vector);
            }
            if (vectors.length === 0) {
                console.log('⚠️ Nenhum chunk válido para salvar no Pinecone');
                return;
            }
            // Upsert em batches de 100
            const BATCH_SIZE = 100;
            for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
                const batch = vectors.slice(i, i + BATCH_SIZE);
                await index.upsert(batch);
                console.log(`✅ Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(vectors.length / BATCH_SIZE)} salvo`);
            }
            console.log(`✅ ${vectors.length} chunks salvos no Pinecone para ${licitacaoId}`);
        }
        catch (error) {
            console.error('❌ Erro ao salvar chunks no Pinecone:', error);
            throw error;
        }
    }
    /**
     * Carrega embeddings - compatível com VectorStorage
     */
    async loadEmbeddings(licitacaoId) {
        try {
            console.log(`🔄 Carregando embeddings do Pinecone para ${licitacaoId}...`);
            const index = this.pinecone.index(this.indexName);
            // Query por licitacaoId para carregar todos os vetores
            const queryResponse = await index.query({
                vector: new Array(1536).fill(0), // Vector dummy para query
                filter: { licitacaoId: { $eq: licitacaoId } },
                topK: 10000, // Limite alto para pegar todos
                includeValues: true,
                includeMetadata: true
            });
            let loadedCount = 0;
            for (const match of queryResponse.matches || []) {
                if (match.values && match.id) {
                    this.vectorStore.set(match.id, match.values);
                    loadedCount++;
                }
            }
            console.log(`✅ ${loadedCount} embeddings carregados do Pinecone para memória`);
        }
        catch (error) {
            console.error('❌ Erro ao carregar embeddings do Pinecone:', error);
        }
    }
    /**
     * Gera embeddings - mantém funcionalidade original
     */
    async generateEmbeddings(chunks) {
        console.log(`🤖 Gerando embeddings para ${chunks.length} chunks...`);
        const chunksWithEmbeddings = [];
        const BATCH_SIZE = 5;
        for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
            const batch = chunks.slice(i, i + BATCH_SIZE);
            try {
                const texts = batch.map(chunk => chunk.text);
                const response = await this.openaiClient.embeddings.create({
                    model: 'text-embedding-3-small',
                    input: texts,
                    encoding_format: 'float',
                });
                batch.forEach((chunk, index) => {
                    chunksWithEmbeddings.push({
                        ...chunk,
                        embedding: response.data[index].embedding
                    });
                });
                console.log(`✅ Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)} processado`);
                if (i + BATCH_SIZE < chunks.length) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
            catch (error) {
                console.error(`❌ Erro ao gerar embeddings para batch ${i}:`, error);
                batch.forEach(chunk => {
                    chunksWithEmbeddings.push(chunk);
                });
            }
        }
        return chunksWithEmbeddings;
    }
    /**
     * Verifica se edital foi processado - compatível com VectorStorage
     */
    async isEditalProcessed(licitacaoId) {
        try {
            const index = this.pinecone.index(this.indexName);
            const queryResponse = await index.query({
                vector: new Array(1536).fill(0),
                filter: { licitacaoId: { $eq: licitacaoId } },
                topK: 1,
                includeMetadata: false
            });
            return (queryResponse.matches?.length || 0) > 0;
        }
        catch (error) {
            console.error('❌ Erro ao verificar se edital foi processado:', error);
            return false;
        }
    }
    /**
     * Busca vetorial por similaridade
     */
    async searchSimilar(queryEmbedding, licitacaoId, topK = 5) {
        try {
            const index = this.pinecone.index(this.indexName);
            const queryParams = {
                vector: queryEmbedding,
                topK,
                includeValues: false,
                includeMetadata: true
            };
            // Só adicionar filtro se tiver licitacaoId
            if (licitacaoId) {
                queryParams.filter = { licitacaoId: { "$eq": licitacaoId } };
                console.log(`🔍 Pinecone filter aplicado:`, JSON.stringify(queryParams.filter));
            }
            else {
                console.log(`🔍 Pinecone query sem filtro (buscar tudo)`);
            }
            const queryResponse = await index.query(queryParams);
            console.log(`📊 Pinecone query response: ${queryResponse.matches?.length || 0} matches found`);
            return queryResponse.matches?.map(match => ({
                id: match.id,
                score: match.score,
                metadata: match.metadata
            })) || [];
        }
        catch (error) {
            console.error('❌ Erro na busca vetorial:', error);
            return [];
        }
    }
    /**
     * Retorna embedding do cache - compatibilidade total
     */
    getEmbedding(chunkId) {
        return this.vectorStore.get(chunkId);
    }
    /**
     * Busca IDs dos chunks - compatível com VectorStorage
     */
    async getChunkIds(licitacaoId) {
        try {
            const index = this.pinecone.index(this.indexName);
            const queryResponse = await index.query({
                vector: new Array(1536).fill(0),
                filter: { licitacaoId: { $eq: licitacaoId } },
                topK: 10000,
                includeValues: false,
                includeMetadata: false
            });
            return queryResponse.matches?.map(match => match.id) || [];
        }
        catch (error) {
            console.error('❌ Erro ao buscar chunk IDs:', error);
            return [];
        }
    }
    /**
     * Busca dados de chunk - compatível com VectorStorage
     */
    async getChunkData(chunkId) {
        try {
            const index = this.pinecone.index(this.indexName);
            const fetchResponse = await index.fetch([chunkId]);
            const vector = fetchResponse.records?.[chunkId];
            if (vector) {
                return {
                    id: chunkId,
                    text: vector.metadata?.text,
                    embedding: vector.values,
                    licitacaoId: vector.metadata?.licitacaoId,
                    documentIndex: vector.metadata?.documentIndex,
                    documentType: vector.metadata?.documentType,
                    hierarchyPath: vector.metadata?.hierarchyPath,
                    depth: vector.metadata?.depth,
                    criticality: vector.metadata?.criticality,
                    sectionType: vector.metadata?.sectionType,
                    createdAt: vector.metadata?.createdAt
                };
            }
            return null;
        }
        catch (error) {
            console.error(`❌ Erro ao buscar dados do chunk ${chunkId}:`, error);
            return null;
        }
    }
    async close() {
        // Pinecone não requer fechamento de conexão
        console.log('✅ PineconeRepository fechado');
    }
    // Métodos para limpeza de dados
    async deleteAll() {
        try {
            const index = this.pinecone.index(this.indexName);
            await index.deleteAll();
            console.log('✅ Todos os vetores foram deletados do Pinecone');
        }
        catch (error) {
            console.error('❌ Erro ao deletar todos os vetores:', error);
            throw error;
        }
    }
    async deleteByIds(ids) {
        try {
            const index = this.pinecone.index(this.indexName);
            await index.deleteMany(ids);
            console.log(`✅ Deletados ${ids.length} vetores do Pinecone`);
        }
        catch (error) {
            console.error(`❌ Erro ao deletar ${ids.length} vetores:`, error);
            throw error;
        }
    }
    async getIndexStats() {
        try {
            const index = this.pinecone.index(this.indexName);
            const stats = await index.describeIndexStats();
            return stats;
        }
        catch (error) {
            console.error('❌ Erro ao obter estatísticas do índice:', error);
            throw error;
        }
    }
    async query(params) {
        try {
            const index = this.pinecone.index(this.indexName);
            const result = await index.query(params);
            return result;
        }
        catch (error) {
            console.error('❌ Erro ao fazer query no Pinecone:', error);
            throw error;
        }
    }
}
exports.PineconeRepository = PineconeRepository;
exports.default = PineconeRepository;
