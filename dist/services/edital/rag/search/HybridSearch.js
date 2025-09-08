"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HybridSearch = void 0;
const openai_1 = __importDefault(require("openai"));
class HybridSearch {
    constructor(vectorStorage) {
        this.vectorStorage = vectorStorage;
        this.openaiClient = new openai_1.default({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    /**
     * Busca híbrida principal que os agentes vão usar
     */
    async search(query, licitacaoId, topK = 10, hybridWeight = 0.7 // Peso vetorial vs keyword
    ) {
        try {
            console.log(`🔍 Busca híbrida para "${query}" em ${licitacaoId}`);
            // Usar busca direta do Pinecone - mais eficiente
            const similarResults = await this.vectorStorage.searchSimilar(query, licitacaoId, topK);
            if (similarResults.length === 0) {
                console.log(`❌ Nenhum chunk encontrado para ${licitacaoId}`);
                return [];
            }
            console.log(`📋 Top ${similarResults.length} chunks encontrados (scores: ${similarResults.map(r => r.score?.toFixed(3)).join(', ')})`);
            console.log(`📋 Tool: queryEditalDatabase - ${similarResults.length} resultados encontrados`);
            return similarResults.map(r => r.metadata?.text || '').filter(text => text.length > 0);
        }
        catch (error) {
            console.error('❌ Erro na busca híbrida:', error);
            return [];
        }
    }
    /**
     * Gera embedding para query de busca
     */
    async generateQueryEmbedding(text) {
        try {
            const response = await this.openaiClient.embeddings.create({
                model: 'text-embedding-3-small',
                input: text,
                encoding_format: 'float',
            });
            return response.data[0].embedding;
        }
        catch (error) {
            console.error('❌ Erro ao gerar embedding para query:', error);
            throw error;
        }
    }
    /**
     * Calcula similaridade coseno entre vetores
     */
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
    /**
     * Score por keywords com sinônimos de licitações
     */
    calculateKeywordScore(query, text) {
        const queryLower = query.toLowerCase();
        const textLower = text.toLowerCase();
        // Expandir query com sinônimos específicos de editais
        const expandedTerms = this.expandQueryTerms(queryLower);
        let totalScore = 0;
        let termCount = 0;
        for (const term of expandedTerms) {
            termCount++;
            // Diferentes tipos de match
            if (textLower.includes(term.term)) {
                if (textLower.includes(term.term + ' ')) {
                    totalScore += term.weight * 1.0; // Match exato
                }
                else {
                    totalScore += term.weight * 0.7; // Match parcial
                }
            }
            // Busca por palavras próximas
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
    /**
     * Expandir query com sinônimos de licitações
     */
    expandQueryTerms(query) {
        const terms = [];
        // Termo original com peso máximo
        terms.push({ term: query, weight: 1.0 });
        // Dicionário de sinônimos para editais brasileiros
        const synonyms = {
            'modalidade': ['pregão', 'tomada de preços', 'concorrência', 'convite', 'eletrônico'],
            'prazo': ['tempo', 'período', 'cronograma', 'data', 'vencimento', 'dias úteis'],
            'valor': ['preço', 'custo', 'montante', 'quantia', 'estimativa', 'R$', 'orçamento'],
            'garantia': ['caução', 'seguro', 'fiança', 'bancária'],
            'habilitação': ['qualificação', 'documentação', 'certidão', 'atestado'],
            'técnico': ['profissional', 'especialista', 'CREA', 'responsável'],
            'execução': ['realização', 'desenvolvimento', 'entrega', 'fornecimento'],
            'contrato': ['acordo', 'ajuste', 'instrumento', 'vigência'],
            'abertura': ['início', 'sessão', 'horário', 'data'],
            'penalidade': ['multa', 'sanção', 'advertência', 'rescisão'],
            'objeto': ['escopo', 'finalidade', 'descrição', 'serviço'],
            'pagamento': ['quitação', 'financeiro', 'medição', 'liberação']
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
     * Boost estrutural baseado em metadados hierárquicos
     */
    calculateStructuralBoost(chunkData, query) {
        let boost = 0;
        // 1. Boost por criticidade do chunk
        const criticality = chunkData.criticality || 0;
        boost += criticality * 0.25; // Até 25% de boost
        // 2. Boost por profundidade (seções principais > subseções)
        const depth = chunkData.depth || 0;
        if (depth === 0) {
            boost += 0.15; // Seções principais
        }
        else if (depth === 1) {
            boost += 0.10; // Subseções
        }
        else {
            boost += Math.max(0.03, 0.08 - (depth * 0.02)); // Subseções profundas
        }
        // 3. Boost por caminho hierárquico crítico
        const hierarchyPath = (chunkData.hierarchyPath || '').toLowerCase();
        const criticalPaths = {
            'objeto': 0.12,
            'valor': 0.12,
            'prazo': 0.11,
            'participacao': 0.10,
            'abertura': 0.09,
            'habilitacao': 0.08
        };
        for (const [path, pathBoost] of Object.entries(criticalPaths)) {
            if (hierarchyPath.includes(path)) {
                boost += pathBoost;
                break;
            }
        }
        // 4. Boost contextual por query
        if (this.queryMatchesHierarchy(query, hierarchyPath)) {
            boost += 0.08;
        }
        return Math.min(0.5, boost); // Cap de 50%
    }
    /**
     * Verifica se query tem afinidade com hierarquia
     */
    queryMatchesHierarchy(query, hierarchyPath) {
        const queryLower = query.toLowerCase();
        const pathLower = hierarchyPath.toLowerCase();
        // Afinidade valor <-> valor
        if (queryLower.includes('valor') || queryLower.includes('preço')) {
            return pathLower.includes('valor') || pathLower.includes('orcamento');
        }
        // Afinidade prazo <-> prazo
        if (queryLower.includes('prazo') || queryLower.includes('entrega')) {
            return pathLower.includes('prazo') || pathLower.includes('cronograma');
        }
        // Afinidade participação <-> participação
        if (queryLower.includes('participar') || queryLower.includes('empresa')) {
            return pathLower.includes('participacao') || pathLower.includes('habilitacao');
        }
        return false;
    }
}
exports.HybridSearch = HybridSearch;
