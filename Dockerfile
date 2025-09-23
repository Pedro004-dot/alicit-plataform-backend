# Use a imagem oficial do Node.js 20 Alpine (mais leve)
# Node 20 é requerido pelo Mastra framework
FROM node:20-alpine

# Instalar Chrome e dependências para Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Configurar Puppeteer para usar Chrome do sistema
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Definir diretório de trabalho no container
WORKDIR /app

# Copiar package.json e package-lock.json (se existe) primeiro
# Isso permite cache das dependências se não mudaram
COPY package*.json ./

# Instalar dependências
RUN npm install --production=false

# Copiar todo o código fonte
COPY . .

# Compilar TypeScript para JavaScript
RUN npm run build

# Expor a porta da aplicação (Railway usa PORT env var)
EXPOSE ${PORT:-3002}

# Definir variável de ambiente para produção
ENV NODE_ENV=production

# Comando para iniciar a aplicação
CMD ["npm", "start"]

# Metadata
LABEL maintainer="Alicit Team"
LABEL description="Backend da plataforma Alicit - Sistema de análise de licitações com IA"