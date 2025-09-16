# Workflow Sequencial de Análise de Licitações

Este workflow implementa uma análise sequencial de licitações usando 4 agentes especialistas, com parada condicional baseada nos scores de cada etapa.

## Arquitetura

O workflow é composto por 5 steps principais:

1. **Strategic Step** - Análise estratégica de adequação produto-licitação
2. **Operational Step** - Análise de capacidade operacional
3. **Legal Step** - Análise jurídico-documental e riscos legais
4. **Financial Step** - Análise financeira e atratividade econômica
5. **Consolidation Step** - Consolidação final e decisão

## Funcionamento

### Fluxo Sequencial com Parada Condicional

O workflow executa os agentes em sequência, mas **para automaticamente** se qualquer agente retornar um score abaixo do threshold:

- **Strategic**: Score < 50 → Para workflow
- **Operational**: Score < 50 → Para workflow  
- **Legal**: Score < 40 → Para workflow (threshold mais baixo)
- **Financial**: Score < 40 → Para workflow (threshold mais baixo)

### Uso da Função `bail()`

Cada step usa a função `bail()` do Mastra para parar o workflow quando necessário:

```typescript
if (score < 50) {
  return bail({
    decision: "NAO_PROSSEGUIR",
    score,
    analysis,
    stoppedReason: `Score estratégico insuficiente: ${score}/100`
  });
}
```

### Consolidação Final

Se todos os agentes passarem, o step de consolidação:

1. Calcula score consolidado (média ponderada)
2. Gera decisão final baseada no score consolidado (≥60 = PARTICIPAR)
3. Cria relatório executivo completo
4. Retorna metadados de execução

## Schemas

### Input Schema
```typescript
{
  licitacaoId: string,
  empresaId: string,
  empresaContext?: {
    nome: string,
    cnpj: string,
    porte: "Pequeno" | "Médio" | "Grande",
    segmento: string,
    produtos: string[],
    servicos: string[],
    localizacao: string,
    capacidadeOperacional: string,
    faturamento?: number,
    capitalSocial?: number,
    certificacoes: Array<{
      nome: string,
      descricao?: string,
      dataVencimento?: string,
      status?: string
    }>,
    documentosDisponiveis?: Record<string, any>
  }
}
```

### Output Schema
```typescript
{
  decision: "PARTICIPAR" | "NAO_PARTICIPAR",
  consolidatedScore: number, // 0-100
  scores: {
    strategic: number,
    operational: number,
    legal: number,
    financial: number
  },
  executiveReport: string,
  stoppedAt: "strategic" | "operational" | "legal" | "financial" | "completed",
  executionMetadata: {
    totalTimeMs: number,
    agentsExecuted: number,
    stoppedReason?: string
  }
}
```

## Como Usar

### 1. Execução Básica

```typescript
import { mastra } from "./mastra";

const run = await mastra.getWorkflow("sequentialWorkflowStep").createRunAsync();

const result = await run.start({
  inputData: {
    licitacaoId: "LIC_001",
    empresaId: "empresa_123",
    empresaContext: {
      // ... dados da empresa
    }
  }
});

if (result.status === 'success') {
  console.log("Decisão:", result.result.decision);
  console.log("Score:", result.result.consolidatedScore);
  console.log("Relatório:", result.result.executiveReport);
}
```

### 2. Monitoramento com Watch

```typescript
const run = await mastra.getWorkflow("sequentialWorkflowStep").createRunAsync();

// Monitorar progresso
run.watch((event) => {
  console.log("Step executado:", event.payload.currentStep?.id);
});

const result = await run.start({ inputData });
```

### 3. Streaming de Resultados

```typescript
const run = await mastra.getWorkflow("sequentialWorkflowStep").createRunAsync();

const stream = await run.stream({ inputData });

for await (const chunk of stream.stream) {
  console.log("Progresso:", chunk.payload.output.stats);
}
```

## Teste

Execute o script de teste:

```bash
npx tsx src/test-sequential-workflow.ts
```

## Agentes Utilizados

- **strategicFitAgent**: Analisa adequação produto/serviço vs licitação
- **operationalAgent**: Avalia capacidade operacional da empresa
- **legalDocAgent**: Analisa riscos jurídicos e documentação
- **financialAgent**: Avalia atratividade financeira

## Características Técnicas

- ✅ **Parada Condicional**: Usa `bail()` para parar workflow quando necessário
- ✅ **Type Safety**: Schemas Zod para validação completa
- ✅ **Error Handling**: Try/catch em cada step com fallback
- ✅ **Runtime Context**: Compartilha dados entre agentes
- ✅ **Memory Management**: Usa working memory para persistir análises
- ✅ **Monitoring**: Suporte a watch e stream para acompanhamento

## Exemplo de Resultado

```json
{
  "decision": "PARTICIPAR",
  "consolidatedScore": 75,
  "scores": {
    "strategic": 80,
    "operational": 70,
    "legal": 75,
    "financial": 70
  },
  "stoppedAt": "completed",
  "executionMetadata": {
    "totalTimeMs": 45000,
    "agentsExecuted": 4
  }
}
```
