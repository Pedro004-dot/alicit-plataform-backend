import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";

/**
 * STRATEGIC AGENT SIMPLIFICADO - SEM TOOLS
 * Para testar se o problema está nas tools ou no agent
 */
export const simpleStrategicAgent = new Agent({
  name: "SimpleStrategicAgent",
  description: "Versão simplificada do strategic agent sem tools para debug",
  
  instructions: ({ runtimeContext }) => {
    const empresaData:any = runtimeContext?.get("empresaContext");
    const licitacaoId = runtimeContext?.get("licitacaoId");
    
    return `
## ANÁLISE ESTRATÉGICA SIMPLIFICADA

Você é um analista especializado em licitações.

**Empresa:** ${empresaData?.nome || 'N/A'}
**Produtos:** ${empresaData?.produtos?.slice(0,3).join(', ') || 'N/A'}
**Licitação:** ${licitacaoId || 'N/A'}

**INSTRUÇÕES:**
1. Simule uma análise estratégica básica
2. Considere compatibilidade entre produtos farmacêuticos e licitação pública
3. Atribua um score de 0-100
4. Decida PROSSEGUIR ou NAO_PROSSEGUIR

**FORMATO DE RESPOSTA (OBRIGATÓRIO):**
**SCORE DE ADEQUAÇÃO:** [número 0-100]
**DECISÃO:** [PROSSEGUIR ou NAO_PROSSEGUIR]
**ANÁLISE:** [Justificativa em máximo 100 palavras]

Seja direto e objetivo. Responda apenas no formato solicitado.
    `;
  },
  
  model: openai("gpt-4o"),
  // ❌ SEM TOOLS - para testar se o problema está nas tools
  tools: {},
});