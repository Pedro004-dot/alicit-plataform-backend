import { createTool } from "@mastra/core/tools";
import { z } from "zod";

// Lazy initialization do OpenAI client
let openaiClient: any = null;

const getOpenAIClient = async () => {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY não configurado');
    }
    const OpenAI = (await import("openai")).default;
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
};

export const summarizeText = createTool({
  id: "summarizeText",
  description: "Condensa textos longos em resumos objetivos mantendo informações essenciais",
  inputSchema: z.object({
    text: z.string().describe("Texto a ser resumido"),
    maxLength: z.number().optional().default(500).describe("Tamanho máximo do resumo em caracteres"),
    focus: z.string().optional().describe("Aspecto específico para focar no resumo"),
  }),
  outputSchema: z.object({
    summary: z.string().describe("Resumo condensado do texto"),
    originalLength: z.number().describe("Tamanho do texto original"),
    summaryLength: z.number().describe("Tamanho do resumo gerado"),
    compressionRatio: z.number().describe("Taxa de compressão (0-1)"),
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
    } catch (error) {
      console.error("❌ Erro na tool summarizeText:", error);
      
      // Fallback: resumo básico por truncamento inteligente
      const sentences = context.text.split(/[.!?]+/).filter((s: string) => s.trim().length > 10);
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