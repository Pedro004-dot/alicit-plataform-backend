import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";

/**
 * Agent de teste simples para verificar configuração básica da OpenAI
 * Sem tools, sem memory, sem complexidade - apenas para testar conectividade
 */
export const testAgent = new Agent({
  name: "TestAgent",
  description: "Agent simples para testar configuração básica da OpenAI",
  
  instructions: `
Você é um agent de teste simples.

MISSÃO: Retornar exatamente o texto "TESTE FUNCIONANDO" seguido de um score aleatório entre 1 e 100.

FORMATO OBRIGATÓRIO:
TESTE FUNCIONANDO - Score: [número entre 1-100]

Exemplo: TESTE FUNCIONANDO - Score: 73

Seja direto e objetivo. Não adicione explicações extras.
  `,
  
  model: openai("gpt-4o"),
  
  defaultGenerateOptions: {
    temperature: 0.7,
    maxSteps: 1,
    maxRetries: 1
  }
});