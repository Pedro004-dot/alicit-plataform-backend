# 🐳 Deploy com Docker - Alicit Backend

## 🚀 Setup Rápido

### 1. **Build da Imagem**
```bash
docker build -t alicit-backend .
```

### 2. **Configurar Variáveis de Ambiente**
```bash
# Copie o arquivo exemplo
cp .env.example .env

# Edite com suas credenciais
nano .env
```

### 3. **Run com Docker**
```bash
# Desenvolvimento
docker run --rm -p 3002:3002 --env-file .env alicit-backend

# Produção (com restart automático)
docker run -d --name alicit-backend --restart unless-stopped \
  -p 3002:3002 --env-file .env alicit-backend
```

### 4. **Docker Compose (Recomendado)**
```bash
# Subir todos os serviços
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar
docker-compose down
```

## 🛠 Comandos Úteis

```bash
# Ver logs do container
docker logs alicit-backend -f

# Entrar no container
docker exec -it alicit-backend sh

# Rebuild e restart
docker-compose up --build -d

# Limpar imagens antigas
docker image prune -f
```

## 📋 Variáveis de Ambiente Necessárias

```env
NODE_ENV=production
PORT=3002
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
```

## 🚀 Deploy no Railway

1. **Via GitHub:**
   - Conecte seu repositório no Railway
   - Railway detecta automaticamente o Dockerfile
   - Configure as variáveis de ambiente no dashboard
   - Deploy automático a cada push

2. **Via Railway CLI:**
   ```bash
   # Instalar Railway CLI
   npm install -g @railway/cli
   
   # Login
   railway login
   
   # Deploy
   railway up
   ```

## ⚙️ Configurações Avançadas

### Multi-stage Build (Otimizado)
Se quiser uma imagem menor, pode usar multi-stage:

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage  
FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3002
CMD ["npm", "start"]
```

### Health Check
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3002/health || exit 1
```

## 🐛 Troubleshooting

### Container não inicia
```bash
# Ver logs detalhados
docker logs alicit-backend

# Verificar se porta está disponível
netstat -an | grep 3002
```

### Problemas de memória
```bash
# Aumentar limite de memória
docker run --memory=2g alicit-backend
```

### Problemas com Mastra
- Certificar que Node.js 20+ está sendo usado
- Verificar se storage está desabilitado para serverless

## 📊 Monitoramento

```bash
# Stats em tempo real
docker stats alicit-backend

# Uso de espaço
docker system df
```

---
✅ **Pronto para produção no Railway!**