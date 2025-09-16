# 🧠 NOVA ARQUITETURA DE MEMÓRIA DOS AGENTES

## 📖 Visão Geral

Nova arquitetura híbrida que combina **Supabase** (dados estruturados) + **Pinecone** (busca semântica) + **Mastra Memory** (workflow mínimo) para otimizar a memória dos agentes de licitação.

### 🎯 Benefícios
- **Performance**: Busca SQL rápida + contexto semântico quando necessário
- **Escalabilidade**: Cada empresa tem memória isolada
- **Inteligência**: Agentes aprendem com histórico de decisões
- **Desacoplamento**: Fácil adicionar/remover agentes

---

## 🗄️ Estrutura do Banco (Supabase)

### Tabelas Criadas:

#### 1. `empresa_licitacao_historico`
- **Finalidade**: Histórico completo de análises por empresa
- **Uso**: Alimenta contexto dos agentes com decisões passadas
- **Campos**: scores, decisões e análises de cada agente

#### 2. `empresa_agent_profiles` 
- **Finalidade**: Cache de padrões e capacidades por empresa
- **Uso**: Otimiza contexto sem precisar calcular sempre
- **Campos**: patterns estratégicos, dados operacionais, legais, financeiros

#### 3. `agent_workflow_memory`
- **Finalidade**: Working memory para coordenação entre agentes
- **Uso**: Mastra Memory usa para sincronizar workflow
- **Campos**: status, análises parciais, resource_id

#### 4. `pinecone_contexts`
- **Finalidade**: Metadados dos vetores no Pinecone
- **Uso**: Rastreia o que foi salvo para busca semântica
- **Campos**: vector_id, contexto, empresa_id, agent_type

---

## 🔧 Configuração Necessária

### Variáveis de Ambiente:
```env
# Supabase (já configurado)
SUPABASE_URL=https://hdlowzlkwrboqfzjewom.supabase.co
SUPABASE_ANON_KEY=seu_anon_key

# Pinecone (configurar)
PINECONE_API_KEY=seu_pinecone_key
PINECONE_INDEX_NAME=licitacoes-context

# OpenAI (para embeddings)
OPENAI_API_KEY=seu_openai_key
```

### Instalação de Dependências:
```bash
npm install @pinecone-database/pinecone @supabase/supabase-js
```

---

## 🤖 Como os Agentes Mudaram

### ✅ Strategic Agent (`strategicFitAgent`)
- **Nova funcionalidade**: Busca histórico de licitações similares
- **Tools adicionais**:
  - `strategic-context-search`: Busca padrões históricos
  - `save-agent-analysis`: Salva análise no sistema
  - `get-empresa-context`: Dados básicos da empresa

### ✅ Operational Agent (`operationalAgent`)
- **Nova funcionalidade**: Contexto de capacidades operacionais
- **Tools adicionais**:
  - `operational-context-search`: Histórico operacional
  - `save-agent-analysis`: Salva análise
  - `get-empresa-context`: Contexto da empresa

### ✅ Legal Agent (`legalDocAgent`)
- **Nova funcionalidade**: Status de documentação inteligente
- **Tools adicionais**:
  - `legal-context-search`: Histórico de habilitação
  - `save-agent-analysis`: Salva análise
  - `get-empresa-context`: Documentos disponíveis

### 🆕 Report Builder Agent (`reportBuilderAgent`)
- **Novo agente**: Consolida todas as análises
- **Tools**:
  - `get-workflow-analyses`: Busca análises consolidadas
  - `get-empresa-context`: Context da empresa
- **Output**: Relatório executivo estruturado

---

## 🚀 Como Usar

### Exemplo Básico:
```typescript
import { strategicFitAgent } from "./agents/sequential";
import { createResourceId } from "./memory/hybridMemoryArchitecture";

const empresaId = "uuid-da-empresa";
const licitacaoId = "numero-controle-pncp";
const resourceId = createResourceId(licitacaoId, empresaId);

const runtimeContext = new Map([
  ["empresaId", empresaId],
  ["licitacaoId", licitacaoId]
]);

const result = await strategicFitAgent.stream(
  "Analise esta licitação: Medicamentos básicos, R$ 50k, prazo 30 dias",
  {
    resourceId,
    threadId: `strategic_${Date.now()}`,
    runtimeContext
  }
);
```

### Workflow Completo:
```typescript
// 1. Strategic Agent
const strategic = await strategicFitAgent.stream(input, params);

// 2. Operational Agent  
const operational = await operationalAgent.stream(input, params);

// 3. Legal Agent
const legal = await legalDocAgent.stream(input, params);

// 4. Report Builder (consolida tudo)
const report = await reportBuilderAgent.stream(
  "Gere relatório executivo final", 
  params
);
```

---

## 🔄 Fluxo de Dados

### 1. **Análise Individual** (Strategic/Operational/Legal):
```
Input → Agent → Busca Contexto (Supabase + Pinecone) → Análise → Salva Resultado
```

### 2. **Contexto Histórico**:
```
Query → Supabase (estruturado, rápido) → Se pouco resultado → Pinecone (semântico)
```

### 3. **Salvar Nova Análise**:
```
Análise → Supabase (histórico estruturado) → Pinecone (vetor para busca futura) → Working Memory (workflow)
```

### 4. **Report Final**:
```
Request → Busca todas análises → Calcula scores → Gera relatório executivo
```

---

## 📊 Arquivos Principais

### Core da Arquitetura:
- `src/mastra/memory/hybridMemoryArchitecture.ts` - Service principal
- `src/mastra/tools/agentMemoryTools.ts` - Tools para agentes

### Agentes Atualizados:
- `src/mastra/agents/sequential/strategicFitAgent.ts`
- `src/mastra/agents/sequential/operationalAgent.ts` 
- `src/mastra/agents/sequential/legalDocAgent.ts`
- `src/mastra/agents/sequential/reportBuilderAgent.ts` (novo)

### Exemplo de Uso:
- `src/mastra/examples/hybridMemoryExample.ts`

---

## 🎯 Próximos Passos

### Para Implementar:
1. **Configurar Pinecone**: Criar index e configurar API key
2. **Testar Basic Flow**: Executar exemplo simples
3. **Popular Dados**: Migrar dados existentes para nova estrutura
4. **Ajustar Agentes**: Fine-tuning baseado nos testes

### Para Evoluir:
1. **Analytics**: Métricas de acerto dos agentes
2. **Auto-Learning**: Atualização automática de padrões
3. **Caching**: Redis para contextos frequentes
4. **Monitoring**: Observability da memória

---

## 🔍 Debug e Troubleshooting

### Verificar Tabelas:
```sql
-- Verificar se tabelas foram criadas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%agent%' OR table_name LIKE '%empresa%';
```

### Testar Contexto:
```typescript
import { agentMemoryService } from "./memory/hybridMemoryArchitecture";

// Testar busca de contexto
const context = await agentMemoryService.getStrategicContext(
  "empresa-id", 
  "medicamentos", 
  50000
);
console.log(context);
```

### Logs Importantes:
- Erros de conexão Pinecone
- Falhas na busca semântica  
- Working memory não sincronizada
- Tools não encontradas

---

## 📝 Notas Técnicas

- **Memory Scope**: `resource` = empresa+licitação isolado
- **Thread IDs**: Únicos por agente para evitar conflitos
- **Resource ID Format**: `analysis_licitacao_{id}_empresa_{id}`
- **Pinecone Namespace**: Por empresa para isolamento
- **Embedding Model**: `text-embedding-3-small` (OpenAI)

**Implementação finalizada! ✅**