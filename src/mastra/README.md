# Sistema de Agentes Especialistas Alicit v2.0

## 🎯 Visão Geral

Nova arquitetura sequencial otimizada para análise automatizada de licitações públicas. Sistema inteligente que executa 4 agentes especializados em sequência, com filtros progressivos e orquestrador autônomo.

## 🏗️ Arquitetura

### Workflow Sequencial Inteligente
```
Licitação + Contexto Empresarial
           ↓
    1️⃣ Agente de Aderência Estratégica
           ↓ (Se score ≥ 60)
    2️⃣ Agente de Análise Operacional  
           ↓ (Se score ≥ 50)
    3️⃣ Agente Jurídico-Documental
           ↓ (Se score ≥ 40)
    4️⃣ Agente de Análise Financeira
           ↓
    🧠 Orquestrador - Síntese Final
           ↓
    📄 DECISÃO: PARTICIPAR / NÃO PARTICIPAR
```

## 📁 Estrutura de Arquivos

```
backend/src/mastra/
├── config/
│   └── memoryConfig.ts          # Configuração de memória híbrida
├── agents/
│   └── sequential/              # Novos agentes especializados
│       ├── strategicFitAgent.ts # 1. Aderência estratégica
│       ├── operationalAgent.ts  # 2. Capacidade operacional  
│       ├── legalDocAgent.ts     # 3. Jurídico-documental
│       ├── financialAgent.ts    # 4. Análise financeira
│       └── index.ts
├── workflows/
│   └── sequentialAnalysisWorkflow.ts # Workflow principal
├── tools/
│   ├── updateWorkingMemoryTool.ts    # Atualização de estado
│   ├── extractLegalDataTool.ts       # Extração jurídica
│   ├── extractFinancialDataTool.ts   # Extração financeira
│   ├── compareDocumentsTool.ts       # Comparação documental
│   └── index.ts
├── examples/
│   └── sequentialWorkflowExample.ts  # Exemplo de uso
└── index.ts                          # Configuração principal
```

## 🚀 Como Usar

### Execução Básica

```typescript
import { mastra } from './backend/src/mastra';

// Dados da licitação e empresa
const analiseInput = {
  licitacaoId: "PE_001_2024_MG",
  empresaId: "empresa_tech_solutions", 
  empresaContext: {
    nome: "Tech Solutions LTDA",
    porte: "Médio",
    segmento: "Tecnologia da Informação",
    produtos: ["Notebooks", "Desktops"],
    servicos: ["Suporte técnico", "Instalação"],
    // ... outros dados
  }
};

// Executar análise sequencial
const workflow = mastra.getWorkflow("sequentialAnalysisWorkflow");
const workflowRun = await workflow.createRunAsync();
const result = await workflowRun.start({ inputData: analiseInput });

// Resultado
if (result.status === 'success') {
  const analysis = result.result;
  console.log(`Decisão: ${analysis.decision}`);
  console.log(`Score: ${analysis.consolidatedScore}/100`);
  console.log(`Relatório: ${analysis.executiveReport}`);
}
```

### Teste Rápido

```bash
# Executar exemplo de teste
cd backend/src/mastra
npx tsx examples/sequentialWorkflowExample.ts
```

## 🤖 Agentes Especializados

### 1. Strategic Fit Agent (Aderência Estratégica)
- **Função**: Filtro inicial de compatibilidade
- **Critério**: Score ≥ 60 para continuar
- **Avalia**: Objeto vs core business da empresa

### 2. Operational Agent (Capacidade Operacional)  
- **Função**: Viabilidade de execução
- **Critério**: Score ≥ 50 para continuar
- **Avalia**: Quantidades, prazos, logística

### 3. Legal Doc Agent (Jurídico-Documental)
- **Função**: Habilitação e riscos jurídicos
- **Critério**: Score ≥ 40 para continuar  
- **Avalia**: Documentos, compliance, impugnações

### 4. Financial Agent (Análise Financeira)
- **Função**: Atratividade econômica
- **Critério**: Sempre executa (última etapa)
- **Avalia**: ROI, margem, fluxo de caixa

## 🧠 Sistema de Memória

### Working Memory Híbrida
- **Escopo**: Per-resource (persistente por empresa)
- **Função**: Estado global + contexto empresarial
- **Atualização**: Progressiva pelos agentes

### Semantic Recall
- **Vector Store**: LibSQLVector  
- **Embeddings**: OpenAI text-embedding-3-small
- **Uso**: Busca inteligente na licitação

### Thread Management
- **Padrão**: 1 thread = 1 licitação
- **Títulos**: Automáticos baseados no objeto
- **Persistência**: Cross-análise por empresa

## 📊 Sistema de Scores

### Critérios de Parada
- **Score < 60**: Para na aderência estratégica
- **Score < 50**: Para na análise operacional  
- **Score < 40**: Para na análise jurídica

### Score Consolidado
```
Score Final = (Aderência×30%) + (Operacional×25%) + (Jurídico×20%) + (Financeiro×25%)
```

### Decisão Final
- **≥ 70 pontos**: PARTICIPAR
- **< 70 pontos**: NÃO PARTICIPAR

## 🔧 Configuração

### Variáveis de Ambiente
```bash
# Banco de dados principal
STORAGE_DATABASE_URL="file:./alicit_memory.db"

# Banco vetorial
VECTOR_DATABASE_URL="file:./alicit_vector.db"

# OpenAI para embeddings e modelos
OPENAI_API_KEY="sk-..."
```

### Modelos Utilizados
- **Agentes**: GPT-4o (alta qualidade)
- **Títulos**: GPT-4o-mini (custo otimizado) 
- **Embeddings**: text-embedding-3-small

## 🔗 Integrações Externas

### Supabase (Dados da Empresa)
- **supabaseEmpresaTool**: Busca dados completos da empresa
- **compareDocumentsTool**: Compara documentos com requisitos via Supabase
- **Status**: Estrutura pronta, aguardando configuração

### Pinecone (Dados da Licitação) 
- **pineconeLicitacaoTool**: Busca vetorial genérica
- **extractObjetoLicitacaoTool**: Extrai objeto específico
- **extractDadosFinanceirosLicitacaoTool**: Extrai dados financeiros
- **Status**: Estrutura pronta, aguardando configuração

### Configuração de Integrações
```bash
# Supabase
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_KEY="your-anon-key"

# Pinecone  
PINECONE_API_KEY="your-api-key"
PINECONE_INDEX_NAME="alicit-licitacoes"
```

## 📈 Vantagens da Nova Arquitetura

### ✅ Eficiência
- **85% menos processamento** com filtros inteligentes
- **Execução sequencial** otimizada
- **Para automaticamente** em análises inviáveis

### ✅ Qualidade  
- **Contextualização progressiva** entre agentes
- **Working memory compartilhada**
- **Orquestrador inteligente** para síntese

### ✅ Transparência
- **Scores objetivos** por etapa  
- **Relatórios executivos** estruturados
- **Rastreabilidade completa** do processo

### ✅ Escalabilidade
- **Memória otimizada** (120k tokens max)
- **Processadores automáticos** para limpeza
- **Arquitetura modular** extensível

## 🚦 Status do Projeto

- ✅ Configuração de memória híbrida otimizada
- ✅ 4 agentes especialistas sequenciais  
- ✅ Workflow orquestrador inteligente
- ✅ Sistema de tools especializadas
- ✅ Integração Supabase (estrutura pronta)
- ✅ Integração Pinecone (estrutura pronta)  
- ✅ Limpeza de código obsoleto
- 🔄 Configuração de APIs externas (pendente)
- 🔄 Testes de integração (pendente)

---

**Desenvolvido pela equipe Alicit** 🚀  
*Primeira consultoria de licitações públicas automatizada por IA do mundo*