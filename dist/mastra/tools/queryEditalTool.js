"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryEditalDatabase = void 0;
const tools_1 = require("@mastra/core/tools");
const zod_1 = require("zod");
const HybridSearch_1 = require("../../services/edital/rag/search/HybridSearch");
const PineconeStorage_1 = require("../../services/edital/rag/storage/PineconeStorage");
// Instanciar dependências de forma lazy
let vectorStorage = null;
let hybridSearch = null;
let initialized = false;
const initializeStorage = async () => {
    if (!initialized) {
        // Só instancia se as variáveis de ambiente estiverem configuradas
        if (!process.env.PINECONE_API_KEY) {
            throw new Error('PINECONE_API_KEY não configurado');
        }
        vectorStorage = new PineconeStorage_1.PineconeStorage();
        hybridSearch = new HybridSearch_1.HybridSearch(vectorStorage);
        await vectorStorage.initialize();
        initialized = true;
    }
};
exports.queryEditalDatabase = (0, tools_1.createTool)({
    id: "queryEditalDatabase",
    description: "Consulta o banco de dados vetorial do edital para encontrar informações específicas",
    inputSchema: zod_1.z.object({
        query: zod_1.z.string().describe("Query de busca em linguagem natural"),
        licitacaoId: zod_1.z.string().describe("ID da licitação para busca"),
        topK: zod_1.z.number().optional().default(10).describe("Número máximo de resultados"),
    }),
    outputSchema: zod_1.z.object({
        results: zod_1.z.array(zod_1.z.string()).describe("Trechos relevantes encontrados"),
        totalFound: zod_1.z.number().describe("Total de resultados encontrados"),
    }),
    execute: async ({ context }) => {
        try {
            console.log(`🔍 Tool: queryEditalDatabase - Buscando "${context.query}" em ${context.licitacaoId}`);
            // Garantir que PineconeStorage está inicializado
            await initializeStorage();
            if (!hybridSearch) {
                throw new Error('HybridSearch não inicializado');
            }
            const results = await hybridSearch.search(context.query, context.licitacaoId, context.topK);
            console.log(`📋 Tool: queryEditalDatabase - ${results.length} resultados encontrados`);
            return {
                results,
                totalFound: results.length,
            };
        }
        catch (error) {
            console.error("❌ Erro na tool queryEditalDatabase:", error);
            return {
                results: [],
                totalFound: 0,
            };
        }
    },
});
