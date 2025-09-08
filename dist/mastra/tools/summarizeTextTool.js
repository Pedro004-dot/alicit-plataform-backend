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
exports.summarizeText = void 0;
const tools_1 = require("@mastra/core/tools");
const zod_1 = require("zod");
// Lazy initialization do OpenAI client
let openaiClient = null;
const getOpenAIClient = async () => {
    if (!openaiClient) {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY não configurado');
        }
        const OpenAI = (await Promise.resolve().then(() => __importStar(require("openai")))).default;
        openaiClient = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    return openaiClient;
};
exports.summarizeText = (0, tools_1.createTool)({
    id: "summarizeText",
    description: "Condensa textos longos em resumos objetivos mantendo informações essenciais",
    inputSchema: zod_1.z.object({
        text: zod_1.z.string().describe("Texto a ser resumido"),
        maxLength: zod_1.z.number().optional().default(500).describe("Tamanho máximo do resumo em caracteres"),
        focus: zod_1.z.string().optional().describe("Aspecto específico para focar no resumo"),
    }),
    outputSchema: zod_1.z.object({
        summary: zod_1.z.string().describe("Resumo condensado do texto"),
        originalLength: zod_1.z.number().describe("Tamanho do texto original"),
        summaryLength: zod_1.z.number().describe("Tamanho do resumo gerado"),
        compressionRatio: zod_1.z.number().describe("Taxa de compressão (0-1)"),
    }),
    execute: async ({ context }) => {
        try {
            console.log(`📝 Tool: summarizeText - Resumindo texto de ${context.text.length} caracteres`);
            const focusInstruction = context.focus
                ? `Foque especialmente em: ${context.focus}.`
                : "";
            const prompt = `
Resuma o seguinte texto de forma objetiva e técnica, mantendo todas as informações essenciais para análise de editais de licitação.

${focusInstruction}

REGRAS:
- Máximo ${context.maxLength} caracteres
- Linguagem técnica e precisa
- Manter valores, datas e especificações
- Priorizar informações críticas
- Use bullet points quando apropriado

TEXTO PARA RESUMIR:
${context.text}

RESUMO:`;
            const client = await getOpenAIClient();
            const response = await client.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
                max_tokens: Math.ceil(context.maxLength / 3),
            });
            const summary = (response.choices[0]?.message?.content || '').substring(0, context.maxLength);
            const compressionRatio = summary.length / context.text.length;
            console.log(`📊 Tool: summarizeText - Compressão: ${context.text.length} → ${summary.length} chars (${(compressionRatio * 100).toFixed(1)}%)`);
            return {
                summary,
                originalLength: context.text.length,
                summaryLength: summary.length,
                compressionRatio,
            };
        }
        catch (error) {
            console.error("❌ Erro na tool summarizeText:", error);
            // Fallback: resumo básico por truncamento inteligente
            const sentences = context.text.split(/[.!?]+/).filter((s) => s.trim().length > 10);
            const targetSentences = Math.max(1, Math.ceil(sentences.length * 0.3));
            const fallbackSummary = sentences.slice(0, targetSentences).join('. ').substring(0, context.maxLength);
            return {
                summary: fallbackSummary,
                originalLength: context.text.length,
                summaryLength: fallbackSummary.length,
                compressionRatio: fallbackSummary.length / context.text.length,
            };
        }
    },
});
