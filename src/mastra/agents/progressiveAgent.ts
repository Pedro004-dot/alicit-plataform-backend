import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";

/**
 * AGENT PROGRESSIVO - TESTANDO DIFERENTES CONFIGURAÇÕES
 */

// 1. Agent mais básico possível
export const basicAgent = new Agent({
  name: "BasicAgent",
  instructions: "Responda apenas: OK",
  model: openai("gpt-4o"),
});

// 2. Agent com instructions de função
export const functionInstructionsAgent = new Agent({
  name: "FunctionInstructionsAgent", 
  instructions: () => "Responda apenas: OK FUNCTION",
  model: openai("gpt-4o"),
});

// 3. Agent com runtimeContext
export const runtimeContextAgent = new Agent({
  name: "RuntimeContextAgent",
  instructions: ({ runtimeContext }) => {
    console.log('🧪 [RUNTIME CONTEXT AGENT] runtimeContext:', !!runtimeContext);
    return "Responda apenas: OK CONTEXT";
  },
  model: openai("gpt-4o"),
});

// 4. Agent com description
export const descriptionAgent = new Agent({
  name: "DescriptionAgent",
  description: "Agent com descrição",
  instructions: "Responda apenas: OK DESCRIPTION",
  model: openai("gpt-4o"),
});

// 5. Agent exatamente igual ao nosso ultraSimpleAgent
export const replicaAgent = new Agent({
  name: "ReplicaAgent",
  description: "Réplica exata do ultraSimpleAgent",
  instructions: () => {
    console.log(`🤖 [REPLICA AGENT] Instructions executadas`);
    return `
Você é um analista simples de licitações.

Responda SEMPRE neste formato exato:
**SCORE DE ADEQUAÇÃO:** 75
**DECISÃO:** PROSSEGUIR  
**ANÁLISE:** Análise simulada para teste.

Seja direto. Use apenas o formato solicitado.
    `;
  },
  model: openai("gpt-4o"),
});