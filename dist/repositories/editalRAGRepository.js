"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditalRAGRepository = void 0;
const redis_1 = require("redis");
const openai_1 = __importDefault(require("openai"));
class EditalRAGRepository {
    constructor(redisUrl = 'redis://localhost:6379') {
        this.TTL_SEMANA = 7 * 24 * 60 * 60; // 7 dias em segundos
        this.vectorStore = new Map(); // In-memory vector store
        this.redisClient = (0, redis_1.createClient)({ url: redisUrl });
        this.openaiClient = new openai_1.default({
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
            console.log(`✅ Repository inicializado com sucesso`);
        }
        catch (error) {
            console.error("❌ Erro ao inicializar repository:", error);
            throw error;
        }
    }
    async saveChunks(chunks, licitacaoId) {
        try {
            await this.connect();
            // Salvar chunks em batch no Redis
            const pipeline = this.redisClient.multi();
            for (const chunk of chunks) {
                // Armazenar embedding em memória para busca vetorial
                if (chunk.embedding) {
                    this.vectorStore.set(chunk.id, chunk.embedding);
                }
                const chunkData = {
                    id: chunk.id,
                    text: chunk.text,
                    embedding: chunk.embedding,
                    licitacaoId: chunk.metadata.licitacaoId,
                    documentIndex: chunk.metadata.documentIndex,
                    pageNumber: chunk.metadata.pageNumber || 0,
                    documentType: chunk.metadata.documentType,
                    createdAt: new Date().toISOString(),
                    hierarchyPath: chunk.metadata.hierarchyPath || 'geral',
                    depth: chunk.metadata.depth || 0,
                    criticality: chunk.metadata.criticality || 0.1,
                    sectionType: chunk.metadata.sectionType || 'prosa'
                };
                const key = `edital:chunk:${chunk.id}`;
                pipeline.setEx(key, this.TTL_SEMANA, JSON.stringify(chunkData));
            }
            await pipeline.exec();
            // Salvar lista de chunk IDs para a licitação
            const licitacaoKey = `edital:licitacao:${licitacaoId}`;
            const chunkIds = chunks.map(c => c.id);
            const existingChunksStr = await this.redisClient.get(licitacaoKey);
            let allChunkIds = chunkIds;
            if (existingChunksStr) {
                const existingChunkIds = JSON.parse(existingChunksStr);
                allChunkIds = [...existingChunkIds, ...chunkIds];
            }
            await this.redisClient.setEx(licitacaoKey, this.TTL_SEMANA, JSON.stringify(allChunkIds));
            console.log(`✅ ${chunks.length} chunks salvos no Redis para ${licitacaoId}`);
        }
        catch (error) {
            console.error("❌ Erro ao salvar chunks:", error);
            throw error;
        }
    }
    async hybridSearch(query, licitacaoId, limit = 5, hybridWeight = 0.7 // Peso para busca vetorial vs keyword
    ) {
        try {
            await this.connect();
            console.log(`🔍 Realizando busca vetorial para: "${query}"`);
            // Gerar embedding da query
            const queryEmbedding = await this.generateEmbeddingForSearch(query);
            console.log(`📊 Embedding da query gerado: ${queryEmbedding.length} dimensões`);
            // Buscar chunks da licitação no Redis
            const licitacaoKey = `edital:licitacao:${licitacaoId}`;
            const chunkIdsStr = await this.redisClient.get(licitacaoKey);
            if (!chunkIdsStr) {
                console.log(`Nenhum chunk encontrado para licitação ${licitacaoId}`);
                return [];
            }
            const chunkIds = JSON.parse(chunkIdsStr);
            console.log(`🔧 DEBUG: ${chunkIds.length} chunks encontrados no Redis para ${licitacaoId}`);
            const results = [];
            // Calcular similaridade coseno para cada chunk
            for (const chunkId of chunkIds) {
                const chunkKey = `edital:chunk:${chunkId}`;
                const chunkDataStr = await this.redisClient.get(chunkKey);
                if (chunkDataStr) {
                    const chunkData = JSON.parse(chunkDataStr);
                    const chunkEmbedding = this.vectorStore.get(chunkId);
                    let vectorScore = 0;
                    let keywordScore = 0;
                    // 1. Score vetorial
                    if (chunkEmbedding) {
                        vectorScore = Math.max(0, this.cosineSimilarity(queryEmbedding, chunkEmbedding));
                    }
                    // 2. Score por keywords (sempre calcular)
                    keywordScore = this.enhancedKeywordScore(query, chunkData.text);
                    // 3. Boost estrutural enriquecido
                    const structuralBoost = this.calculateEnrichedStructuralBoost(chunkData, query);
                    // 4. Score híbrido otimizado
                    const hybridScore = (hybridWeight * vectorScore) + ((1 - hybridWeight) * keywordScore) + structuralBoost;
                    // DEBUG: Adicionar TODOS os chunks com scores para análise
                    results.push({
                        id: chunkData.id,
                        text: chunkData.text,
                        metadata: {
                            licitacaoId: chunkData.licitacaoId,
                            documentIndex: chunkData.documentIndex,
                            documentType: chunkData.documentType,
                            text: chunkData.text,
                            score: hybridScore,
                            vectorScore: vectorScore,
                            keywordScore: keywordScore
                        }
                    });
                }
            }
            // Ordenar por score (similaridade coseno) - maior é melhor
            results.sort((a, b) => (b.metadata.score || 0) - (a.metadata.score || 0));
            console.log(`🔍 DEBUG: Total chunks processados: ${results.length}/${chunkIds.length}`);
            console.log(`📊 DEBUG: Top 5 scores: ${results.slice(0, 5).map(r => `${r.id.split('-').slice(-1)[0]}:${r.metadata.score?.toFixed(3)}`).join(', ')}`);
            const topResults = results.slice(0, limit);
            console.log(`📋 Busca vetorial encontrou ${topResults.length} chunks relevantes (scores: ${topResults.map(r => r.metadata.score?.toFixed(3)).join(', ')})`);
            return topResults;
        }
        catch (error) {
            console.error("❌ Erro na busca por similaridade:", error);
            return [];
        }
    }
    async isEditalProcessed(licitacaoId) {
        try {
            await this.connect();
            const licitacaoKey = `edital:licitacao:${licitacaoId}`;
            const exists = await this.redisClient.exists(licitacaoKey);
            return exists === 1;
        }
        catch (error) {
            console.error("❌ Erro ao verificar se edital foi processado:", error);
            return false;
        }
    }
    cosineSimilarity(vectorA, vectorB) {
        if (vectorA.length !== vectorB.length) {
            throw new Error('Vetores devem ter o mesmo tamanho');
        }
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < vectorA.length; i++) {
            dotProduct += vectorA[i] * vectorB[i];
            normA += vectorA[i] * vectorA[i];
            normB += vectorB[i] * vectorB[i];
        }
        const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
        if (magnitude === 0) {
            return 0;
        }
        return dotProduct / magnitude;
    }
    enhancedKeywordScore(query, text) {
        const queryLower = query.toLowerCase();
        const textLower = text.toLowerCase();
        // Expandir query com sinônimos e termos relacionados
        const expandedTerms = this.expandQueryTerms(queryLower);
        let totalScore = 0;
        let termCount = 0;
        for (const term of expandedTerms) {
            termCount++;
            // Diferentes tipos de match com pesos diferentes
            if (textLower.includes(term.term)) {
                if (textLower.includes(term.term + ' ')) {
                    totalScore += term.weight * 1.0; // Match exato
                }
                else {
                    totalScore += term.weight * 0.7; // Match parcial
                }
            }
            // Busca por palavras-chave próximas
            const termWords = term.term.split(' ');
            let proximityScore = 0;
            for (const word of termWords) {
                if (word.length > 3 && textLower.includes(word)) {
                    proximityScore += 0.3;
                }
            }
            totalScore += Math.min(proximityScore, term.weight * 0.5);
        }
        return Math.min(1.0, totalScore / Math.max(1, termCount));
    }
    expandQueryTerms(query) {
        const terms = [];
        // Termo original
        terms.push({ term: query, weight: 1.0 });
        // Dicionário expandido de sinônimos para licitações
        const synonyms = {
            'modalidade': ['pregão', 'tomada de preços', 'concorrência', 'convite', 'eletrônico', 'presencial'],
            'prazo': ['tempo', 'período', 'cronograma', 'data', 'vencimento', 'limite', 'até', 'dias', 'úteis'],
            'valor': ['preço', 'custo', 'montante', 'quantia', 'estimativa', 'R$', 'reais', 'orçamento'],
            'garantia': ['caução', 'seguro', 'fiança', 'percentual', 'bancária'],
            'habilitação': ['qualificação', 'capacitação', 'documentação', 'certidão', 'atestado', 'comprovação'],
            'técnico': ['profissional', 'especialista', 'responsável', 'CREA', 'registro'],
            'execução': ['realização', 'desenvolvimento', 'implementação', 'entrega', 'fornecimento'],
            'contrato': ['acordo', 'ajuste', 'instrumento', 'assinatura', 'vigência'],
            'impugnação': ['recurso', 'contestação', 'questionamento', 'esclarecimento'],
            'abertura': ['início', 'começo', 'sessão', 'horário', 'data'],
            'penalidade': ['multa', 'sanção', 'punição', 'advertência', 'rescisão'],
            'disputa': ['lances', 'competição', 'modo', 'aberto', 'fechado', 'randômico'],
            'objeto': ['escopo', 'finalidade', 'descrição', 'software', 'serviço', 'SaaS'],
            'pagamento': ['quitação', 'cronograma', 'financeiro', 'medição', 'liberação'],
            'documentação': ['exigida', 'certidões', 'regularidade', 'comprovante', 'declaração']
        };
        // Adicionar sinônimos relevantes
        for (const [key, values] of Object.entries(synonyms)) {
            if (query.includes(key)) {
                for (const synonym of values) {
                    terms.push({ term: synonym, weight: 0.8 });
                }
            }
        }
        return terms;
    }
    /**
     * Calcula boost estrutural enriquecido com novos metadados
     */
    calculateEnrichedStructuralBoost(chunkData, query) {
        let boost = 0;
        // 1. Boost por criticidade algorítmica (0-0.3)
        const criticality = chunkData.criticality || 0;
        if (criticality > 0.5) {
            boost += criticality * 0.3; // Chunks críticos têm prioridade máxima
        }
        else {
            boost += criticality * 0.15; // Chunks normais têm boost menor
        }
        // 2. Boost por profundidade hierárquica (seções principais > subseções)
        const depth = chunkData.depth || 0;
        if (depth === 0) {
            boost += 0.2; // Seções principais (ex: "2. DA PARTICIPAÇÃO")
        }
        else if (depth === 1) {
            boost += 0.15; // Subseções (ex: "2.1. Poderão participar")  
        }
        else {
            boost += Math.max(0.05, 0.1 - (depth * 0.03)); // Subseções profundas
        }
        // 3. Boost por tipo de conteúdo
        const sectionType = chunkData.sectionType || 'prosa';
        const typeBoosts = {
            'lista': 0.12, // Listas são muito específicas
            'tabela': 0.10, // Tabelas têm dados estruturados  
            'titulo': 0.08, // Títulos são contextuais
            'prosa': 0.05 // Prosa é mais genérica
        };
        boost += typeBoosts[sectionType] || 0.05;
        // 4. Boost por path hierárquico crítico
        const hierarchyPath = chunkData.hierarchyPath || '';
        const pathLower = hierarchyPath.toLowerCase();
        const criticalPaths = {
            'objeto': 0.15, // Mais crítico
            'valor': 0.14, // Muito crítico
            'prazo': 0.13, // Muito crítico
            'participacao': 0.12, // Crítico
            'abertura': 0.11, // Crítico
            'habilitacao': 0.10, // Importante
            'penalidades': 0.08 // Importante
        };
        for (const [path, pathBoost] of Object.entries(criticalPaths)) {
            if (pathLower.includes(path)) {
                boost += pathBoost;
                break; // Apenas um boost por path
            }
        }
        // 5. Boost contextual por query
        if (this.queryMatchesContext(query, hierarchyPath, sectionType)) {
            boost += 0.1;
        }
        return Math.min(0.6, boost); // Cap aumentado para aproveitar metadados ricos
    }
    /**
     * Verifica se query tem afinidade com contexto do chunk
     */
    queryMatchesContext(query, hierarchyPath, sectionType) {
        const queryLower = query.toLowerCase();
        const pathLower = hierarchyPath.toLowerCase();
        // Queries sobre valores -> boost em seções de valor
        if (queryLower.includes('valor') || queryLower.includes('preço') || queryLower.includes('r$')) {
            return pathLower.includes('valor') || pathLower.includes('orcamento');
        }
        // Queries sobre prazos -> boost em seções de prazo
        if (queryLower.includes('prazo') || queryLower.includes('entrega') || queryLower.includes('dias')) {
            return pathLower.includes('prazo') || pathLower.includes('cronograma');
        }
        // Queries sobre participação -> boost em seções de participação
        if (queryLower.includes('participar') || queryLower.includes('empresa') || queryLower.includes('licitante')) {
            return pathLower.includes('participacao') || pathLower.includes('habilitacao');
        }
        return false;
    }
    async loadEmbeddingsFromRedis(licitacaoId) {
        try {
            await this.connect();
            const licitacaoKey = `edital:licitacao:${licitacaoId}`;
            const chunkIdsStr = await this.redisClient.get(licitacaoKey);
            if (!chunkIdsStr) {
                console.log(`❌ Nenhum chunk encontrado para licitação ${licitacaoId}`);
                return;
            }
            const chunkIds = JSON.parse(chunkIdsStr);
            console.log(`🔄 Carregando ${chunkIds.length} embeddings reais do Redis para ${licitacaoId}...`);
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
            console.log(`✅ ${loadedCount}/${chunkIds.length} embeddings reais carregados em memória`);
        }
        catch (error) {
            console.error("❌ Erro ao carregar embeddings do Redis:", error);
        }
    }
    async generateEmbeddingForSearch(text) {
        try {
            const response = await this.openaiClient.embeddings.create({
                model: 'text-embedding-3-small',
                input: text,
                encoding_format: 'float',
            });
            return response.data[0].embedding;
        }
        catch (error) {
            console.error("❌ Erro ao gerar embedding para busca:", error);
            throw error;
        }
    }
    async close() {
        if (this.redisClient.isOpen) {
            await this.redisClient.quit();
        }
    }
}
exports.EditalRAGRepository = EditalRAGRepository;
