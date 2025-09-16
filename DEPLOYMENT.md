# Configuração de Deploy - Railway & Vercel

## Problema CORS Solucionado

### O que foi mudado:
- Configuração CORS atualizada para suportar múltiplas origins
- Sistema mais robusto que permite localhost e Vercel simultaneamente
- Melhor logging para debug de problemas de CORS

### Variáveis de Ambiente - Railway

Configure essas variáveis no seu projeto Railway:

```bash
# CORS (opcional - já configurado no código)
CORS_ORIGIN=https://alicitplataform.vercel.app

# Database (obrigatórias)
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_KEY=...

# OpenAI (obrigatório)
OPENAI_API_KEY=sk-...

# Pinecone (se estiver usando)
PINECONE_API_KEY=...
PINECONE_INDEX_NAME=...

# Porta (opcional - Railway configura automaticamente)
PORT=3002
```

### Como aplicar no Railway:

1. Acesse seu projeto no Railway
2. Vá na aba "Variables"
3. Adicione as variáveis necessárias
4. Faça redeploy

### Teste da configuração:

O backend agora aceita requests de:
- `http://localhost:3000` (desenvolvimento)
- `https://alicitplataform.vercel.app` (produção)
- Qualquer origin definida em `CORS_ORIGIN`

### Debug CORS:

Se ainda houver problemas, verifique os logs do Railway. O sistema agora loga origins bloqueadas:
```
CORS bloqueou origin: https://exemplo.com
```

### URLs de Deploy:

- **Frontend (Vercel):** https://alicitplataform.vercel.app
- **Backend (Railway):** https://alicit-backend-production-ffcd.up.railway.app

### Próximos passos:

1. Commit e push dessas alterações
2. Railway fará redeploy automático
3. Teste o login no frontend