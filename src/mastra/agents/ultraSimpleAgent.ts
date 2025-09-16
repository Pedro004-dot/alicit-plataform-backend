import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";

/**
 * AGENT ULTRA SIMPLES - CONFIGURAÇÃO MÍNIMA
 * Para testar se qualquer agent funciona no workflow
 */
export const ultraSimpleAgent = new Agent({
  name: "UltraSimpleAgent",
  description: "Agent ultra simples para debug",
  
  // Instructions mínimas - sem runtimeContext
  instructions: () => {
    const prompt = `
Você é um analista simples de licitações.

Responda SEMPRE neste formato exato:
**SCORE DE ADEQUAÇÃO:** 75
**DECISÃO:** PROSSEGUIR  
**ANÁLISE:** Análise simulada para teste. A empresa tem produtos farmacêuticos compatíveis com licitações públicas.

Seja direto. Use apenas o formato solicitado.
    `;
    
    console.log(`🤖 [ULTRA SIMPLE AGENT] ========== INSTRUCTIONS ==========`);
    console.log(prompt);
    console.log(`========== FIM DAS INSTRUCTIONS ==========`);
    
    return prompt;
  },
  
  // Modelo simples
  model: openai("gpt-4o"),
  
  // Sem tools
  // Sem memory
});