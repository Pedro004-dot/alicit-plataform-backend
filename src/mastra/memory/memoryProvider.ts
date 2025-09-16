/**
 * Memory Provider Configuration for Mastra Agents
 * Configuração centralizada de memoria com LibSQL
 */

import { Memory } from "@mastra/memory";
import { LibSQLStore, LibSQLVector } from "@mastra/libsql";
import { openai } from "@ai-sdk/openai";

// Configuração do storage LibSQL
const memoryStorage = new LibSQLStore({
  url: process.env.LIBSQL_DB_URL || "file:./data/mastra-memory.db",
  authToken: process.env.LIBSQL_AUTH_TOKEN // Opcional para Turso
});

// Configuração do vector store LibSQL
const memoryVector = new LibSQLVector({
  connectionUrl: process.env.LIBSQL_DB_URL || "file:./data/mastra-memory.db",
  authToken: process.env.LIBSQL_AUTH_TOKEN // Opcional para Turso
});

// Memory instance compartilhada para todos os agents
export const sharedMemory = new Memory({
  storage: memoryStorage,
  vector: memoryVector, // ✅ VECTOR STORE CONFIGURADO
  embedder: openai.embedding("text-embedding-3-small"), // Embedder para semantic recall
  options: {
    lastMessages: 10, // Manter 10 mensagens recentes
    semanticRecall: {
      topK: 3, // 3 mensagens mais similares
      messageRange: 2, // 2 mensagens antes/depois
      scope: 'thread' // Por thread (pode ser 'resource' para cross-thread)
    },
    workingMemory: {
      enabled: true,
      scope: 'thread', // Memory isolado por thread
      template: `
# Contexto da Análise de Licitação

## Empresa
- **Nome**:
- **CNPJ**:
- **Segmento**:
- **Porte**:

## Licitação
- **ID PNCP**:
- **Objeto**:
- **Status da Análise**:

## Insights Identificados
- **Pontos Favoráveis**:
- **Riscos Identificados**:
- **Recomendação Preliminar**:

## Working Memory Agent
- **Última Análise**:
- **Score Parcial**:
- **Próximo Passo**:
`
    }
  }
});

// Memory configuration para testes (sem persistência)
export const testMemory = new Memory({
  options: {
    lastMessages: 5,
    semanticRecall: false, // Desabilitado para testes
    workingMemory: {
      enabled: true,
      scope: 'thread',
      template: `# Test Context\n- **Test ID**:\n- **Status**:`
    }
  }
});