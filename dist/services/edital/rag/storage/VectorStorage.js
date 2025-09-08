import { createClient } from 'redis';
import OpenAI from 'openai';
export class VectorStorage {
    constructor(redisUrl = 'redis://localhost:6379') {
        this.TTL_SEMANA = 7 * 24 * 60 * 60; // 7 dias em segundos
        this.vectorStore = new Map(); // Cache in-memory
        this.redisClient = createClient({ url: redisUrl });
        this.openaiClient = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    async connect() {
        if (!this.redisClient.isOpen) {
            await this.redisClient.connect();
        }
    }
    async initialize() {
        try {
            await this.connect();
            console.log('✅ VectorStorage inicializado com sucesso');
        }
        catch (error) {
            console.error('❌ Erro ao inicializar VectorStorage:', error);
            throw error;
        }
    }
    /**
     * Salva chunks com embeddings no Redis
     */
    async saveChunks(chunks, licitacaoId) {
        try {
            await this.connect();
            console.log(`💾 Salvando ${chunks.length} chunks com embeddings para ${licitacaoId}...`);
            // Batch operation no Redis
            const pipeline = this.redisClient.multi();
            for (const chunk of chunks) {
                // Cache embedding em memória
                if (chunk.embedding) {
                    this.vectorStore.set(chunk.id, chunk.embedding);
                }
                const chunkData = {
                    id: chunk.id,
                    text: chunk.text,
                    embedding: chunk.embedding,
                    licitacaoId: chunk.metadata.licitacaoId,
                    documentIndex: chunk.metadata.documentIndex,
                    documentType: chunk.metadata.documentType,
                    createdAt: new Date().toISOString(),
                    hierarchyPath: chunk.metadata.hierarchyPath || 'geral',
                    depth: chunk.metadata.depth || 0,
                    criticality: chunk.metadata.criticality || 0.5,
                    sectionType: chunk.metadata.sectionType || 'geral'
                };
                const key = `edital:chunk:${chunk.id}`;
                pipeline.setEx(key, this.TTL_SEMANA, JSON.stringify(chunkData));
            }
            await pipeline.exec();
            // Salvar lista de chunk IDs para a licitação
            const licitacaoKey = `edital:licitacao:${licitacaoId}`;
            const chunkIds = chunks.map(c => c.id);
            await this.redisClient.setEx(licitacaoKey, this.TTL_SEMANA, JSON.stringify(chunkIds));
            console.log(`✅ ${chunks.length} chunks salvos no Redis para ${licitacaoId}`);
        }
        catch (error) {
            console.error('❌ Erro ao salvar chunks:', error);
            throw error;
        }
    }
    /**
     * Carrega embeddings do Redis para memória
     */
    async loadEmbeddings(licitacaoId) {
        try {
            await this.connect();
            const licitacaoKey = `edital:licitacao:${licitacaoId}`;
            const chunkIdsStr = await this.redisClient.get(licitacaoKey);
            if (!chunkIdsStr) {
                console.log(`❌ Nenhum chunk encontrado para licitação ${licitacaoId}`);
                return;
            }
            const chunkIds = JSON.parse(chunkIdsStr);
            console.log(`🔄 Carregando ${chunkIds.length} embeddings para ${licitacaoId}...`);
            let loadedCount = 0;
            for (const chunkId of chunkIds) {
                const chunkKey = `edital:chunk:${chunkId}`;
                const chunkDataStr = await this.redisClient.get(chunkKey);
                if (chunkDataStr) {
                    const chunkData = JSON.parse(chunkDataStr);
                    if (chunkData.embedding && Array.isArray(chunkData.embedding)) {
                        this.vectorStore.set(chunkId, chunkData.embedding);
                        loadedCount++;
                    }
                }
            }
            console.log(`✅ ${loadedCount}/${chunkIds.length} embeddings carregados em memória`);
        }
        catch (error) {
            console.error('❌ Erro ao carregar embeddings:', error);
        }
    }
    /**
     * Gera embeddings para chunks usando OpenAI
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
                // Adicionar embeddings aos chunks
                batch.forEach((chunk, index) => {
                    chunksWithEmbeddings.push({
                        ...chunk,
                        embedding: response.data[index].embedding
                    });
                });
                console.log(`✅ Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)} processado`);
                // Rate limiting para OpenAI
                if (i + BATCH_SIZE < chunks.length) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
            catch (error) {
                console.error(`❌ Erro ao gerar embeddings para batch ${i}:`, error);
                // Adicionar chunks sem embeddings como fallback
                batch.forEach(chunk => {
                    chunksWithEmbeddings.push(chunk);
                });
            }
        }
        return chunksWithEmbeddings;
    }
    /**
     * Verifica se edital já foi processado
     */
    async isEditalProcessed(licitacaoId) {
        try {
            await this.connect();
            const licitacaoKey = `edital:licitacao:${licitacaoId}`;
            const exists = await this.redisClient.exists(licitacaoKey);
            return exists === 1;
        }
        catch (error) {
            console.error('❌ Erro ao verificar se edital foi processado:', error);
            return false;
        }
    }
    /**
     * Retorna embedding do cache para busca
     */
    getEmbedding(chunkId) {
        return this.vectorStore.get(chunkId);
    }
    /**
     * Retorna IDs dos chunks de uma licitação
     */
    async getChunkIds(licitacaoId) {
        try {
            await this.connect();
            const licitacaoKey = `edital:licitacao:${licitacaoId}`;
            const chunkIdsStr = await this.redisClient.get(licitacaoKey);
            return chunkIdsStr ? JSON.parse(chunkIdsStr) : [];
        }
        catch (error) {
            console.error('❌ Erro ao buscar chunk IDs:', error);
            return [];
        }
    }
    /**
     * Busca dados de um chunk específico
     */
    async getChunkData(chunkId) {
        try {
            await this.connect();
            const chunkKey = `edital:chunk:${chunkId}`;
            const chunkDataStr = await this.redisClient.get(chunkKey);
            return chunkDataStr ? JSON.parse(chunkDataStr) : null;
        }
        catch (error) {
            console.error(`❌ Erro ao buscar dados do chunk ${chunkId}:`, error);
            return null;
        }
    }
    async close() {
        if (this.redisClient.isOpen) {
            await this.redisClient.quit();
        }
    }
}
