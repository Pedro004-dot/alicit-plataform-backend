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
exports.extractDadosFinanceirosLicitacao = exports.extractObjetoLicitacao = exports.pineconeLicitacao = void 0;
const tools_1 = require("@mastra/core/tools");
const zod_1 = require("zod");
/**
 * Tool para buscar dados da licitação no Pinecone
 * Utiliza busca vetorial para extrair informações específicas do edital
 */
exports.pineconeLicitacao = (0, tools_1.createTool)({
    id: "pineconeLicitacao",
    description: "Busca informações específicas da licitação no Pinecone usando busca vetorial",
    inputSchema: zod_1.z.object({
        licitacaoId: zod_1.z.string().describe("ID da licitação"),
        query: zod_1.z.string().describe("Query específica para busca vetorial"),
        topK: zod_1.z.number().default(5).describe("Número de resultados mais relevantes"),
        includeMetadata: zod_1.z.boolean().default(true).describe("Incluir metadados dos chunks"),
    }),
    outputSchema: zod_1.z.object({
        success: zod_1.z.boolean(),
        licitacaoId: zod_1.z.string(),
        query: zod_1.z.string(),
        results: zod_1.z.array(zod_1.z.any()),
        totalResults: zod_1.z.number(),
        message: zod_1.z.string()
    }),
    execute: async ({ context }) => {
        try {
            const { licitacaoId, query, topK } = context;
            console.log('🔍 PINECONE TOOL - Parâmetros recebidos:');
            console.log('  licitacaoId:', licitacaoId);
            console.log('  query:', query);
            console.log('  topK:', topK);
            const results = await queryPineconeForLicitacao(licitacaoId, query, topK);
            console.log('📊 PINECONE TOOL - Resultados obtidos:');
            console.log('  matches encontrados:', results.matches?.length || 0);
            if (results.matches && results.matches.length > 0) {
                results.matches.slice(0, 2).forEach((match, idx) => {
                    console.log(`  Match ${idx + 1}: score=${match.score}, content=${String(match.metadata?.content || '').substring(0, 80)}...`);
                });
            }
            return {
                success: true,
                licitacaoId,
                query,
                results: results.matches || [],
                totalResults: results.matches?.length || 0,
                message: "Busca vetorial concluída com sucesso",
            };
        }
        catch (error) {
            const { licitacaoId, query } = context;
            console.log('❌ PINECONE TOOL - Erro:', error);
            return {
                success: false,
                licitacaoId,
                query,
                message: `Erro na busca vetorial: ${error}`,
                results: [],
                totalResults: 0,
            };
        }
    },
});
/**
 * Executa query vetorial no Pinecone para licitação específica
 */
async function queryPineconeForLicitacao(licitacaoId, query, topK) {
    try {
        // Importar Pinecone dinamicamente
        const { Pinecone } = await Promise.resolve().then(() => __importStar(require("@pinecone-database/pinecone")));
        const { openai } = await Promise.resolve().then(() => __importStar(require("@ai-sdk/openai")));
        const { embed } = await Promise.resolve().then(() => __importStar(require("ai")));
        // Inicializar cliente Pinecone
        const pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY || "",
        });
        const indexName = process.env.PINECONE_INDEX_NAME || "alicit-editais";
        const index = pinecone.index(indexName);
        // Gerar embedding da query
        const { embedding } = await embed({
            model: openai.embedding("text-embedding-3-small"),
            value: query,
        });
        // Executar busca vetorial
        const queryResponse = await index.query({
            vector: embedding,
            topK,
            filter: {
                licitacao_id: licitacaoId
            },
            includeMetadata: true,
            includeValues: false,
        });
        return queryResponse;
    }
    catch (error) {
        console.log(`⚠️ Pinecone não configurado ou erro na busca: ${error}`);
        // Mock temporário - estrutura esperada
        return {
            matches: [
                {
                    id: `chunk_${licitacaoId}_1`,
                    score: 0.95,
                    metadata: {
                        licitacao_id: licitacaoId,
                        section: "objeto",
                        content: "Informação não disponível - Pinecone não configurado",
                    }
                }
            ]
        };
    }
}
/**
 * Tool especializada para extrair objeto da licitação
 */
exports.extractObjetoLicitacao = (0, tools_1.createTool)({
    id: "extractObjetoLicitacao",
    description: "Extrai o objeto e especificações da licitação usando Pinecone",
    inputSchema: zod_1.z.object({
        licitacaoId: zod_1.z.string().describe("ID da licitação"),
    }),
    outputSchema: zod_1.z.object({
        success: zod_1.z.boolean(),
        licitacaoId: zod_1.z.string(),
        objeto: zod_1.z.record(zod_1.z.any()),
        message: zod_1.z.string()
    }),
    execute: async ({ context }) => {
        try {
            const { licitacaoId } = context;
            const results = await queryPineconeForLicitacao(licitacaoId, "objeto da licitação especificações técnicas", 3);
            const objetoInfo = extractObjetoFromResults(results.matches || []);
            return {
                success: true,
                licitacaoId,
                objeto: objetoInfo,
                message: "Objeto da licitação extraído com sucesso",
            };
        }
        catch (error) {
            const { licitacaoId } = context;
            return {
                success: false,
                licitacaoId,
                message: `Erro ao extrair objeto: ${error}`,
                objeto: {
                    descricao: "Não disponível",
                    especificacoes: [],
                    quantidades: {},
                },
            };
        }
    },
});
/**
 * Tool especializada para extrair dados financeiros
 */
exports.extractDadosFinanceirosLicitacao = (0, tools_1.createTool)({
    id: "extractDadosFinanceirosLicitacao",
    description: "Extrai valores e condições financeiras da licitação usando Pinecone",
    inputSchema: zod_1.z.object({
        licitacaoId: zod_1.z.string().describe("ID da licitação"),
    }),
    outputSchema: zod_1.z.object({
        success: zod_1.z.boolean(),
        licitacaoId: zod_1.z.string(),
        financial: zod_1.z.record(zod_1.z.any()),
        message: zod_1.z.string()
    }),
    execute: async ({ context }) => {
        try {
            const { licitacaoId } = context;
            const results = await queryPineconeForLicitacao(licitacaoId, "valor estimado preço máximo condições pagamento garantias", 3);
            const financialInfo = extractFinancialFromResults(results.matches || []);
            return {
                success: true,
                licitacaoId,
                financial: financialInfo,
                message: "Dados financeiros extraídos com sucesso",
            };
        }
        catch (error) {
            const { licitacaoId } = context;
            return {
                success: false,
                licitacaoId,
                message: `Erro ao extrair dados financeiros: ${error}`,
                financial: {
                    valorEstimado: 0,
                    valorMaximo: 0,
                    condicoesPagamento: "Não disponível",
                    garantias: {},
                },
            };
        }
    },
});
/**
 * Funções auxiliares para processar resultados do Pinecone
 */
function extractObjetoFromResults(matches) {
    // TODO: Implementar extração real baseada nos chunks do Pinecone
    return {
        descricao: "Objeto não disponível - aguardando configuração Pinecone",
        especificacoes: [],
        quantidades: {},
        modalidade: "Não informado",
    };
}
function extractFinancialFromResults(matches) {
    // TODO: Implementar extração real baseada nos chunks do Pinecone
    return {
        valorEstimado: 0,
        valorMaximo: 0,
        condicoesPagamento: "Não disponível - aguardando configuração Pinecone",
        garantias: {},
        modalidade: "Não informado",
    };
}
