import OpenAI from 'openai';
import { PineconeRepository } from '../../../../repositories/pineconeRepository';
export class PineconeStorage {
    constructor() {
        this.TTL_SEMANA = 7 * 24 * 60 * 60; // Mantém para compatibilidade (não usado no Pinecone)
        this.vectorStore = new Map(); // Cache in-memory mantido
        this.pineconeRepo = new PineconeRepository();
        this.openaiClient = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    async initialize() {
        try {
            await this.pineconeRepo.initialize();
            console.log('✅ PineconeStorage inicializado com sucesso');
        }
        catch (error) {
            console.error('❌ Erro ao inicializar PineconeStorage:', error);
            throw error;
        }
    }
    /**
     * Salva chunks com embeddings - INTERFACE IDÊNTICA ao VectorStorage
     */
    async saveChunks(chunks, licitacaoId) {
        try {
            await this.pineconeRepo.saveChunks(chunks, licitacaoId);
            // Mantém cache em memória para compatibilidade
            for (const chunk of chunks) {
                if (chunk.embedding) {
                    this.vectorStore.set(chunk.id, chunk.embedding);
                }
            }
        }
        catch (error) {
            console.error('❌ Erro ao salvar chunks:', error);
            throw error;
        }
    }
    /**
     * Carrega embeddings - INTERFACE IDÊNTICA ao VectorStorage
     */
    async loadEmbeddings(licitacaoId) {
        try {
            await this.pineconeRepo.loadEmbeddings(licitacaoId);
            // Sincronizar cache local com Pinecone
            const chunkIds = await this.pineconeRepo.getChunkIds(licitacaoId);
            let loadedCount = 0;
            for (const chunkId of chunkIds) {
                const embedding = this.pineconeRepo.getEmbedding(chunkId);
                if (embedding) {
                    this.vectorStore.set(chunkId, embedding);
                    loadedCount++;
                }
            }
            console.log(`✅ ${loadedCount}/${chunkIds.length} embeddings sincronizados com cache local`);
        }
        catch (error) {
            console.error('❌ Erro ao carregar embeddings:', error);
        }
    }
    /**
     * Gera embeddings - FUNCIONALIDADE IDÊNTICA ao VectorStorage
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
     * Verifica se edital já foi processado - INTERFACE IDÊNTICA
     */
    async isEditalProcessed(licitacaoId) {
        try {
            return await this.pineconeRepo.isEditalProcessed(licitacaoId);
        }
        catch (error) {
            console.error('❌ Erro ao verificar se edital foi processado:', error);
            return false;
        }
    }
    /**
     * Retorna embedding do cache - INTERFACE IDÊNTICA
     */
    getEmbedding(chunkId) {
        // Primeiro tenta cache local, depois repository
        const localEmbedding = this.vectorStore.get(chunkId);
        if (localEmbedding) {
            return localEmbedding;
        }
        // Se não tem no cache, busca no repository
        return this.pineconeRepo.getEmbedding(chunkId);
    }
    /**
     * Retorna IDs dos chunks - INTERFACE IDÊNTICA
     */
    async getChunkIds(licitacaoId) {
        try {
            return await this.pineconeRepo.getChunkIds(licitacaoId);
        }
        catch (error) {
            console.error('❌ Erro ao buscar chunk IDs:', error);
            return [];
        }
    }
    /**
     * Busca dados de um chunk específico - INTERFACE IDÊNTICA
     */
    async getChunkData(chunkId) {
        try {
            return await this.pineconeRepo.getChunkData(chunkId);
        }
        catch (error) {
            console.error(`❌ Erro ao buscar dados do chunk ${chunkId}:`, error);
            return null;
        }
    }
    /**
     * NOVA FUNCIONALIDADE: Busca vetorial por similaridade
     * Não estava no VectorStorage original
     */
    async searchSimilar(queryText, licitacaoId, topK = 5) {
        try {
            // Gerar embedding da query
            const response = await this.openaiClient.embeddings.create({
                model: 'text-embedding-3-small',
                input: queryText,
                encoding_format: 'float',
            });
            const queryEmbedding = response.data[0].embedding;
            // Buscar similar no Pinecone
            return await this.pineconeRepo.searchSimilar(queryEmbedding, licitacaoId, topK);
        }
        catch (error) {
            console.error('❌ Erro na busca por similaridade:', error);
            return [];
        }
    }
    /**
     * NOVA FUNCIONALIDADE: Busca com embedding já gerado
     */
    async searchSimilarWithEmbedding(queryEmbedding, licitacaoId, topK = 5) {
        try {
            return await this.pineconeRepo.searchSimilar(queryEmbedding, licitacaoId, topK);
        }
        catch (error) {
            console.error('❌ Erro na busca por similaridade:', error);
            return [];
        }
    }
    async close() {
        await this.pineconeRepo.close();
    }
}
// Export da classe como default para manter compatibilidade
export { PineconeStorage as VectorStorage };
export default PineconeStorage;
