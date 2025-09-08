# Deploy do Backend ALICIT no Render

## 📋 Pré-requisitos

1. Conta no [Render.com](https://render.com)
2. Repositório Git com o código do backend
3. Variáveis de ambiente configuradas

## 🚀 Passos para Deploy

### 1. Preparação do Código

✅ **Já configurado:**
- `package.json` com scripts `build` e `start`
- `tsconfig.json` para compilação TypeScript
- `render.yaml` para configuração automática
- `.dockerignore` para otimizar build

### 2. Configurar Variáveis de Ambiente no Render

No dashboard do Render, configure estas variáveis:

```
NODE_ENV=production
OPENAI_API_KEY=sk-proj-... (sua chave)
PINECONE_API_KEY=pcsk_... (sua chave)
PINECONE_INDEX_NAME=alicit-editais
PINECONE_ENVIRONMENT=us-east-1-aws
SUPABASE_URL=https://hdlowzlkwrboqfzjewom.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiI... (sua chave)
SUPABASE_DB_PASSWORD=wlsvXL7ycypbagQJ
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiI... (sua chave)
```

### 3. Deploy via Dashboard Render

1. **Login no Render**: https://dashboard.render.com
2. **New Web Service**: Clique em "New +" > "Web Service"
3. **Connect Repository**: Conecte seu repositório Git
4. **Configurações Básicas**:
   - **Name**: `alicit-backend`
   - **Region**: Ohio (recomendado)
   - **Branch**: `main`
   - **Runtime**: Node
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`

### 4. Deploy via render.yaml (Automático)

Se você tem o arquivo `render.yaml` na raiz, o Render detectará automaticamente e usará essas configurações.

## 🔧 Comandos Úteis

```bash
# Testar build local
npm run build
npm start

# Verificar se todas as dependências estão corretas
npm install --production
```

## ⚠️ Pontos Importantes

### Dependências de Produção
- Puppeteer pode precisar de configurações especiais no Render
- Certifique-se que todas as dependências estão em `dependencies` (não `devDependencies`)

### Performance
- Use plano **Starter** ou superior para aplicações com AI
- Configure health checks se necessário

### Logs
- Acesse logs em tempo real no dashboard do Render
- Use `console.log` para debug em produção

## 🌐 URLs de Exemplo

Após deploy:
- **Production URL**: `https://alicit-backend.onrender.com`
- **Health Check**: `https://alicit-backend.onrender.com/health`

## 🔍 Troubleshooting

### Build Failures
```bash
# Verificar se TypeScript compila
npm run build

# Verificar dependências
npm audit
```

### Runtime Errors
- Verificar variáveis de ambiente
- Verificar logs no dashboard
- Testar localmente com NODE_ENV=production

### Puppeteer Issues
Se tiver problemas com Puppeteer:
```bash
# Adicionar ao package.json se necessário
"scripts": {
  "postinstall": "node node_modules/puppeteer/install.js"
}
```

## 📊 Monitoramento

- Dashboard Render mostra CPU, memória, requests
- Configure alertas se necessário
- Use logs para debug de issues específicas

## 🔄 Auto-Deploy

Com `autoDeploy: true` no render.yaml, cada push na branch principal fará deploy automático.

## 💡 Dicas

1. **Teste local** antes de fazer push
2. **Monitor logs** após deploy
3. **Configure health checks** se necessário
4. **Use secrets** para variáveis sensíveis
5. **Monitore performance** e custos

---

**Próximos passos**: Após deploy bem-sucedido, teste todas as rotas principais e configure monitoramento.