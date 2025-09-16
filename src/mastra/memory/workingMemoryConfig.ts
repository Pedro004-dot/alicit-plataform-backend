import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";

/**
 * Configuração de Working Memory para análises de licitação
 * Resource-scoped para compartilhar contexto entre os 4 agents sequenciais
 */
export const createLicitacaoMemory = () => {
  return new Memory({
    // 💾 STORAGE: LibSQL local para Working Memory (estável e rápido)
    storage: new LibSQLStore({
      url: process.env.NODE_ENV === 'production' 
        ? 'file:./data/licitacoes_memory.db'
        : 'file:./licitacoes_memory.db'
    }),
    
    // 🧠 VECTOR STORE: Pinecone integration via tools (melhor compatibilidade)
    // vector: Implementado via contextualizedVectorTools nos agents
    options: {
      workingMemory: {
        enabled: true,
        scope: 'resource', // 🔑 COMPARTILHA entre agents, ISOLA por empresa+licitação
        template: `# ANÁLISE DE LICITAÇÃO - CONTEXTO COMPARTILHADO

## 📋 INFORMAÇÕES BÁSICAS
- **Empresa**: 
- **Licitação ID**: 
- **Valor Estimado**: 
- **Prazo de Entrega**: 
- **Local**: 
- **Status**: Em análise

---

## 🎯 ANÁLISE ESTRATÉGICA
### Viabilidade Estratégica:
- **Score**: /100
- **Produtos Compatíveis**: 
- **Variações Linguísticas Identificadas**: 
- **Recomendação**: 
- **Pontos de Atenção**: 

---

## ⚙️ ANÁLISE OPERACIONAL  
### Capacidade Operacional:
- **Score**: /100
- **Capacidade vs Demanda**: 
- **Prazos Viáveis**: 
- **Recursos Necessários**: 
- **Limitações Identificadas**: 

---

## ⚖️ ANÁLISE LEGAL
### Conformidade Jurídica:
- **Score**: /100
- **Documentos TEMOS**: 
- **Documentos FALTAM**: 
- **Multas/Penalidades**: 
- **Riscos Jurídicos**: 
- **Plano de Ação**: 

---

## 💰 ANÁLISE FINANCEIRA
### Atratividade Financeira:
- **Score**: /100
- **Preços de Referência**: 
- **Margem Estimada**: 
- **Condições de Pagamento**: 
- **Garantias Exigidas**: 
- **ROI Projetado**: 

---

## 🔍 DADOS COLETADOS (CACHE RAG)
### Buscas Realizadas:
- **Strategic**: 
- **Operational**: 
- **Legal**: 
- **Financial**: 

### Informações Extraídas:
- **Especificações Técnicas**: 
- **Prazos e Cronograma**: 
- **Documentação Exigida**: 
- **Valores e Condições**: 
`
      }
    }
  });
};

/**
 * Cria resourceId único para isolamento empresa+licitação
 */
export const createResourceId = (empresaId: string, licitacaoId: string): string => {
  return `empresa_${empresaId}_licitacao_${licitacaoId}`;
};

/**
 * Cria threadId único para o workflow de análise
 */
export const createThreadId = (empresaId: string, licitacaoId: string): string => {
  return `analysis_thread_${empresaId}_${licitacaoId}_${Date.now()}`;
};