# 🔄 Migração de Endpoints - Sistema de Análise

## 📋 **RESUMO DAS MUDANÇAS**

Sistema migrado de análise automática para **análise sob demanda** com dados estruturados.

---

## 🗑️ **ENDPOINTS REMOVIDOS/DEPRECIADOS**

### `/edital/*` (DEPRECIADO)
```
❌ POST /edital/analysis
❌ POST /edital/chat  
❌ POST /edital/iniciar
❌ GET /edital/status/:numeroControlePNCP
```

**Motivo:** Sistema de fila automática substituído por análise manual sob demanda.

---

## 🚀 **NOVOS ENDPOINTS - `/analises/*`**

### **🎯 Análise Sob Demanda**
```typescript
// Iniciar análise manual
POST /analises/iniciar
Body: { numeroControlePNCP: string, empresaCNPJ: string }
Response: { status: "analisando", message: string }

// Verificar status (polling)
GET /analises/status/:pncp/:cnpj
Response: { status: "analisando" | "analisada" | "em_analise" }

// Obter análise completa
GET /analises/completa/:pncp/:cnpj
Response: { dadosEdital, analiseAgente, status }

// Tomar decisão final
POST /analises/decisao/:pncp
Body: { acao: "aprovar" | "recusar", empresaCNPJ: string }
Response: { status: "aprovada_final" | "recusada_final" }

// Verificar análises em andamento
GET /analises/usuario/:cnpj/em-andamento
Response: { temAnaliseEmAndamento: boolean, analisesEmAndamento: [] }
```

### **📊 Dados Estruturados**
```typescript
// Dados extraídos do edital
GET /analises/dados-edital/:pncp
Response: DadosEdital (modalidade, valor, datas, documentos)

// Análise do agente IA
GET /analises/agente/:pncp/:cnpj
Response: AnaliseAgente (recomendação, viabilidade, riscos)

// Listar análises por empresa
GET /analises/empresa/:cnpj?recomendacao=ALTA&limit=10
Response: { total: number, analises: AnaliseAgente[] }
```

### **🔍 Dados Específicos**
```typescript
// Pontos críticos
GET /analises/pontos-criticos/:pncp/:cnpj?categoria=tecnico
Response: { total: number, pontosCriticos: PontoCritico[] }

// Riscos identificados
GET /analises/riscos/:pncp/:cnpj?impacto=alto&probabilidade=alta
Response: { total: number, riscos: Risco[] }

// Cronograma de eventos
GET /analises/cronograma/:pncp/:cnpj?status=proximo
Response: { total: number, cronograma: EventoCronograma[] }

// Viabilidade financeira
GET /analises/viabilidade/:pncp/:cnpj
Response: { valor, margem, score, justificativa }

// Recomendação do agente
GET /analises/recomendacao/:pncp/:cnpj
Response: { nivel, descricao, score }

// Dashboard consolidado
GET /analises/dashboard/:cnpj
Response: { estatisticas, ultimasAnalises }
```

---

## 🔄 **FLUXO ATUALIZADO**

### **ANTES (Automático)**
```
Aprovação → Fila → Análise IA → Relatório
```

### **AGORA (Manual)**
```
1. Recomendação → Aprovação (status: "em_analise")
2. Usuário → Botão "Analisar" (status: "analisando") 
3. IA → Processa (análise assíncrona)
4. Sistema → Conclusão (status: "analisada")
5. Usuário → Decisão Final (status: "aprovada_final" | "recusada_final")
```

---

## 📋 **ESTADOS DA LICITAÇÃO**

```typescript
type StatusLicitacao = 
  | "nao_definido"    // Match automático
  | "em_analise"      // Aprovada pelo usuário
  | "analisando"      // Análise IA em andamento
  | "analisada"       // Análise concluída
  | "aprovada_final"  // Aprovada após análise
  | "recusada_final"  // Recusada após análise
```

---

## 🎯 **CONTROLES IMPORTANTES**

### **Concorrência**
- ✅ Máximo 1 análise simultânea por usuário
- ✅ Controle em memória (Map) para análises ativas
- ✅ Cleanup automático após conclusão/erro

### **Segurança**
- ✅ Todas as rotas protegidas com `authMiddleware`
- ✅ Validação de parâmetros obrigatórios
- ✅ Tratamento de erros padronizado

### **Performance**
- ✅ Polling de 3s para status
- ✅ Dados estruturados em tabelas separadas
- ✅ Índices otimizados para consultas

---

## 🚀 **PRÓXIMOS PASSOS**

1. **Frontend:** Atualizar chamadas de API
2. **UI:** Implementar botões dinâmicos baseados em status
3. **Página:** Criar `/analise/:pncp` com dados estruturados
4. **Testes:** Validar fluxo completo
5. **Cleanup:** Remover rotas antigas após migração completa

---

**Data:** 2025-01-18  
**Responsável:** Sistema de Migração Automática  
**Status:** ✅ Endpoints Criados - Aguardando Implementação Frontend