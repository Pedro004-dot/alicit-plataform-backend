"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditalChatService = void 0;
const openai_1 = __importDefault(require("openai"));
const RAGService_1 = require("./RAGService");
const openaiClient = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
class EditalChatService {
    constructor() {
        this.initialized = false;
        this.ragService = new RAGService_1.EditalRAGService();
    }
    async initialize() {
        if (!this.initialized) {
            await this.ragService.initialize();
            this.initialized = true;
        }
    }
    async chat(licitacaoId, query, empresaId) {
        try {
            await this.initialize();
            console.log(`💬 Iniciando chat - Licitação: ${licitacaoId}, Query: ${query}`);
            // 1. Verificar se edital foi processado
            const isProcessed = await this.ragService.isEditalProcessed(licitacaoId);
            if (!isProcessed) {
                throw new Error(`Edital ${licitacaoId} não foi processado ainda. Execute a análise primeiro.`);
            }
            // 2. Buscar chunks relevantes usando estratégia híbrida
            console.log(`🔍 Buscando contexto relevante...`);
            const searchTerms = this.expandSearchTerms(query);
            console.log(`🔧 Termos expandidos: ${searchTerms}`);
            // Primeira tentativa: busca vetorial normal
            let relevantChunks = await this.ragService.queryEdital(licitacaoId, searchTerms, 8);
            // Se busca para "objeto" não encontrou chunks relevantes, tentar busca alternativa
            if (query.toLowerCase().includes('objeto') && this.isContextIrrelevant(relevantChunks, 'objeto')) {
                console.log(`🔄 Chunks irrelevantes detectados, tentando busca alternativa...`);
                relevantChunks = await this.alternativeObjectSearch(licitacaoId);
            }
            if (!relevantChunks || relevantChunks.length === 0) {
                console.log(`⚠️ Nenhum contexto relevante encontrado para: ${query}`);
                return {
                    answer: "Desculpe, não encontrei informações relevantes sobre sua pergunta nos documentos da licitação. Tente reformular sua pergunta ou seja mais específico.",
                    relevantChunks: [],
                    confidence: 0,
                    licitacaoId,
                    query
                };
            }
            console.log(`✅ ${relevantChunks.length} chunks encontrados`);
            // 3. Preparar contexto para LLM
            const contextText = relevantChunks.join('\n\n---\n\n');
            // 4. Gerar resposta usando OpenAI
            const answer = await this.generateAnswer(query, contextText, licitacaoId);
            // 5. Calcular confidence simples baseado na quantidade de contexto
            const confidence = Math.min(95, Math.max(20, relevantChunks.length * 15));
            return {
                answer,
                relevantChunks,
                confidence,
                licitacaoId,
                query
            };
        }
        catch (error) {
            console.error(`❌ Erro no chat:`, error);
            throw new Error(`Erro no chat: ${error.message}`);
        }
    }
    async generateAnswer(query, context, licitacaoId) {
        try {
            console.log(`🤖 Gerando resposta com OpenAI...`);
            const systemPrompt = `Você é um assistente especialista em análise de licitações públicas da Alicit.

CONTEXTO: Você está analisando a licitação ${licitacaoId}.

INSTRUÇÕES:
1. Responda APENAS com base no contexto fornecido dos documentos da licitação
2. Seja preciso, técnico e objetivo
3. Se não encontrar a informação exata, analise o contexto disponível e forneça informações relacionadas
4. Use linguagem profissional mas acessível
5. Cite trechos específicos do documento quando relevante
6. Para perguntas sobre OBJETO: procure por descrições do que será adquirido, contratado ou fornecido
7. Para perguntas sobre PRAZOS: foque em cronogramas, datas e períodos
8. Para perguntas sobre VALORES: mencione custos, orçamentos e valores estimados
9. Se realmente não houver informação relacionada, diga "Não encontrei essa informação específica nos trechos analisados"

CONTEXTO DOS DOCUMENTOS:
${context}`;
            const response = await openaiClient.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: query }
                ],
                temperature: 0.3,
                max_tokens: 1000,
            });
            const answer = response.choices[0]?.message?.content || 'Não foi possível gerar resposta.';
            console.log(`✅ Resposta gerada com ${answer.length} caracteres`);
            return answer;
        }
        catch (error) {
            console.error(`❌ Erro ao gerar resposta OpenAI:`, error);
            throw new Error('Erro ao processar resposta da IA');
        }
    }
    expandSearchTerms(query) {
        // Mapear perguntas comuns para termos de busca mais específicos
        const expandedTerms = query.toLowerCase();
        if (expandedTerms.includes('objeto') || expandedTerms.includes('escopo')) {
            return `${query} objeto do edital objeto da licitação escopo aquisição fornecimento contratação`;
        }
        if (expandedTerms.includes('prazo') || expandedTerms.includes('entrega')) {
            return `${query} prazo entrega cronograma tempo dias úteis`;
        }
        if (expandedTerms.includes('valor') || expandedTerms.includes('preço')) {
            return `${query} valor estimado preço orçamento custo total`;
        }
        if (expandedTerms.includes('requisito') || expandedTerms.includes('qualificação')) {
            return `${query} requisitos qualificação habilitação documentação exigências`;
        }
        return query; // Retorna query original se não encontrar padrões
    }
    isContextIrrelevant(chunks, topic) {
        if (!chunks || chunks.length === 0)
            return true;
        // Verificar se chunks contêm principalmente informações sobre multas/penalidades
        const combinedText = chunks.join(' ').toLowerCase();
        const irrelevantKeywords = ['multa', 'penalidade', 'sanção', 'inexecução', 'descumprimento', 'advertência'];
        const relevantKeywords = topic === 'objeto' ? ['objeto', 'produto', 'serviço', 'aquisição', 'fornecimento', 'contratação'] : [];
        const irrelevantCount = irrelevantKeywords.filter(word => combinedText.includes(word)).length;
        const relevantCount = relevantKeywords.filter(word => combinedText.includes(word)).length;
        // Se tem mais palavras irrelevantes que relevantes, considerar irrelevante
        return irrelevantCount > relevantCount && irrelevantCount > 3;
    }
    async alternativeObjectSearch(licitacaoId) {
        console.log(`🔧 Tentando busca alternativa para objeto da licitação...`);
        // Tentar buscar com termos mais específicos
        const alternativeTerms = [
            'aquisição',
            'fornecimento',
            'contratação',
            'item',
            'especificação',
            'descrição',
            'produto',
            'serviço',
            'material'
        ];
        for (const term of alternativeTerms) {
            console.log(`🔍 Testando termo: ${term}`);
            const chunks = await this.ragService.queryEdital(licitacaoId, term, 5);
            if (chunks && chunks.length > 0 && !this.isContextIrrelevant(chunks, 'objeto')) {
                console.log(`✅ Encontrado contexto relevante com termo: ${term}`);
                return chunks;
            }
        }
        console.log(`⚠️ Busca alternativa não encontrou contexto relevante`);
        return [];
    }
}
exports.EditalChatService = EditalChatService;
