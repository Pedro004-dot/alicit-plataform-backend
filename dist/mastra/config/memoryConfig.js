"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sequentialWorkflowMemory = void 0;
const memory_1 = require("@mastra/memory");
const pg_1 = require("@mastra/pg");
const openai_1 = require("@ai-sdk/openai");
// Processadores comentados temporariamente por erro de importação
// import { TokenLimiter, ToolCallFilter } from "@mastra/memory/processors";
/**
 * Configuração de memória otimizada para workflow sequencial
 * - Working Memory: Estado global da análise + contexto empresarial
 * - Thread Management: 1 thread por licitação com títulos automáticos
 * - Semantic Recall: Desabilitado (usaremos Pinecone diretamente nos tools)
 * - PostgreSQL storage para produção
 */
exports.sequentialWorkflowMemory = new memory_1.Memory({
    // PostgreSQL storage para produção, fallback para desenvolvimento sem DB
    ...(process.env.DATABASE_URL ? {
        storage: new pg_1.PostgresStore({
            connectionString: process.env.DATABASE_URL,
        })
    } : {}),
    // Vector store desabilitado temporariamente por incompatibilidade de tipos
    // TODO: Aguardar atualização de compatibilidade entre @mastra/core e @mastra/pinecone
    // vector: new PineconeVector({
    //   apiKey: process.env.PINECONE_API_KEY || "",
    //   environment: process.env.PINECONE_ENVIRONMENT || "us-east-1-aws",
    // }),
    // Modelo de embedding
    embedder: openai_1.openai.embedding("text-embedding-3-small"),
    options: {
        // Contexto mínimo para performance
        lastMessages: 5,
        // Semantic recall desabilitado temporariamente (sem vector store)
        // semanticRecall: {
        //   topK: 3,
        //   messageRange: 2,
        //   scope: 'resource',
        // },
        // Working memory como estado global
        workingMemory: {
            enabled: true,
            scope: 'resource',
            template: getWorkingMemoryTemplate(),
        },
        // Títulos automáticos para organização
        threads: {
            generateTitle: {
                model: (0, openai_1.openai)("gpt-4o-mini"),
                instructions: "Gere um título conciso para esta análise de licitação baseado no objeto e órgão licitante."
            }
        },
        // Processadores comentados temporariamente
        // processors: [
        //   new ToolCallFilter({ exclude: ["queryEditalTool"] }),
        //   new TokenLimiter(120000),
        // ]
    }
});
/**
 * Template da working memory para contexto empresarial e análise progressiva
 */
function getWorkingMemoryTemplate() {
    return `# CONTEXTO EMPRESARIAL

## Dados da Empresa
- **Nome**:
- **CNPJ**:
- **Porte**: [Pequeno/Médio/Grande]
- **Segmento**:
- **Produtos**: 
- **Serviços**:
- **Localização**:
- **Capacidade Operacional**:

## Documentos Disponíveis na Plataforma
- **Certidões**: [Lista com validades]
- **Atestados Técnicos**: [Lista com capacidades]
- **Documentos Societários**: [Status]
- **Habilitação Fiscal**: [Status]

## ANÁLISE PROGRESSIVA ATUAL
### Licitação: [ID]
- **Agente Aderência**: [Score + Status]
- **Agente Operacional**: [Score + Status] 
- **Agente Jurídico**: [Score + Status]
- **Agente Financeiro**: [Score + Status]
- **Decisão Orquestrador**: [Pendente/Finalizada]

## HISTÓRICO DE LICITAÇÕES
- **Participações Anteriores**: [Resumo]
- **Padrões de Sucesso**: [Insights]
- **Lições Aprendidas**: [Pontos de atenção]
`;
}
