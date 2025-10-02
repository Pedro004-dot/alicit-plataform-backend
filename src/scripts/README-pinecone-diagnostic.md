# Diagnóstico do Pinecone - Guia de Uso

## 🔍 Script de Linha de Comando

### Executar diagnóstico completo:
```bash
cd backend
npx ts-node src/scripts/pineconeDiagnostic.ts
```

### O que o script mostra:
- ✅ Estatísticas do índice (vetores, dimensões, etc.)
- ✅ Amostras de 2 registros com metadata completa
- ✅ Análise da estrutura de todos os campos
- ✅ Teste de busca por ID específico
- ✅ Resumo da tokenização identificada

## 🌐 Endpoints da API

### Estatísticas do índice:
```http
GET /api/licitacao/pinecone/index-stats
```

### Amostras de registros:
```http
GET /api/licitacao/pinecone/samples?limit=3
```

### Estrutura da metadata:
```http
GET /api/licitacao/pinecone/metadata-structure
```

### Análise completa:
```http
GET /api/licitacao/pinecone/full-structure
```

## 📊 Estrutura Identificada

Baseado no código, os dados no Pinecone têm esta estrutura:

### Campos de Metadata:
- `data` - JSON completo da licitação
- `numeroControlePNCP` - Identificador único
- `modalidadeNome` - Tipo da licitação
- `valorTotal` - Valor estimado
- `municipio` - Cidade
- `uf` - Estado
- `objetoCompra` - Descrição truncada (1000 chars)
- `objetoCompraCompleto` - Descrição completa
- `situacaoCompra` - Status da licitação
- `dataAbertura` - Data de abertura
- `orgaoRazaoSocial` - Nome do órgão
- `createdAt` / `updatedAt` - Timestamps

### Embeddings:
- **Dimensão**: 1536 (OpenAI text-embedding-3-small)
- **Conteúdo**: Texto enriquecido incluindo:
  - Objeto da compra
  - Informações complementares
  - Dados do órgão
  - Top 10 itens mais valiosos
  - Contexto legal e geográfico

### Tokenização:
- ✅ Campos de texto são indexados para busca
- ✅ Campos numéricos (valor, datas) para filtros
- ✅ Campos categóricos (UF, modalidade) para agrupamento

## 🎯 Casos de Uso

### 1. Verificar quantos dados existem:
```bash
npx ts-node src/scripts/pineconeDiagnostic.ts
```

### 2. Ver estrutura via API:
```bash
curl http://localhost:3000/api/licitacao/pinecone/full-structure
```

### 3. Testar busca específica:
```bash
curl "http://localhost:3000/api/licitacao/pinecone/samples?limit=1"
# Pegar numeroControlePNCP do resultado
# Testar busca: curl http://localhost:3000/api/licitacao/getUniqueLicitacao?numeroControlePNCP=XXX
```