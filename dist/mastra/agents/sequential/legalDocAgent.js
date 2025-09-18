"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.legalDocAgent = void 0;
const agent_1 = require("@mastra/core/agent");
const modelFallback_1 = require("../../config/modelFallback");
const contextualizedVectorTools_1 = require("../../tools/contextualizedVectorTools");
const memoryProvider_1 = require("../../memory/memoryProvider");
/**
 * Agente 3: Análise Jurídico-Documental
 * Especialidade: Habilitação, riscos jurídicos e pontos de impugnação
 * Terceira etapa do workflow sequencial
 */
exports.legalDocAgent = new agent_1.Agent({
    name: "LegalDocAgent",
    description: "Analisa requisitos de habilitação, riscos jurídicos e documenta multas e penalidades",
    memory: memoryProvider_1.sharedMemory,
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
    model: modelFallback_1.legalAgentModel, // 🔧 FALLBACK: gpt-4o → gpt-4o-mini (qualidade jurídica)
    tools: {
        "legal-licitacao-search": contextualizedVectorTools_1.contextualLegalTool
    },
    defaultGenerateOptions: {
        toolChoice: "auto", // Alinhado com os demais agentes (usa tool quando preciso)
        maxSteps: 3, // Padronizado com strategic/operational
        maxRetries: 2,
        temperature: 0.7
    },
});
