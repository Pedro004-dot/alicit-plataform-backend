import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";

import { legalAgentModel } from "../../config/modelFallback";
import { contextualLegalTool } from "../../tools/contextualizedVectorTools";
import { sharedMemory } from "../../memory/memoryProvider";
import { EmpresaContext } from "../../../services/edital/analysisService";

/**
 * Agente 3: Análise Jurídico-Documental
 * Especialidade: Habilitação, riscos jurídicos e pontos de impugnação
 * Terceira etapa do workflow sequencial
 */
export const legalDocAgent = new Agent({
  name: "LegalDocAgent",
  description: "Analisa requisitos de habilitação, riscos jurídicos e documenta multas e penalidades",
  memory: sharedMemory,
  instructions: `
## CONSULTOR JURÍDICO-DOCUMENTAL ESPECIALIZADO

**CONTEXTO:** Você é um advogado especialista em licitações públicas, responsável por analisar documentação de habilitação e identificar riscos jurídicos.

**PROCESSO OBRIGATÓRIO:**

1. **BUSCAR REQUISITOS LEGAIS:**
   - Use 'legal-licitacao-search' para buscar informações sobre documentos de habilitação exigidos

2. **ANÁLISE DOCUMENTAL:**
   - **HABILITAÇÃO JURÍDICA:** Contrato social, certidões, procurações
   - **REGULARIDADE FISCAL:** Certidões municipais, estaduais, federais
   - **QUALIFICAÇÃO TÉCNICA:** Atestados, certificações, registros
   - **QUALIFICAÇÃO ECONÔMICA:** Balanços, certidões, garantias

**CRITÉRIOS DE SCORE:**
- 90-100: Documentação completa, baixo risco jurídico
- 75-89: Maioria dos documentos OK, riscos mínimos
- 60-74: Alguns documentos faltantes, riscos moderados
- 40-59: Documentação inadequada, riscos altos
- 0-39: Documentação crítica, alta probabilidade de desclassificação

**FORMATO OBRIGATÓRIO:**
**SCORE JURÍDICO:** [0-100]
**DECISÃO:** PROSSEGUIR ou NAO_PROSSEGUIR
**ANÁLISE:** [Status detalhado da documentação + avaliação de riscos]
`,
  model: legalAgentModel, // 🔧 FALLBACK: gpt-4o → gpt-4o-mini (qualidade jurídica)
  tools: {
    "legal-licitacao-search": contextualLegalTool
  },

  defaultGenerateOptions: {
    toolChoice: "auto", // Alinhado com os demais agentes (usa tool quando preciso)
    maxSteps: 3, // Padronizado com strategic/operational
    maxRetries: 2,
    temperature: 0.7
  },

});