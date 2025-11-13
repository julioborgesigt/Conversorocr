# Dockerfile para OCR PDF Processor
# Versão 2.0 - Profissional e Otimizada

# Usar imagem Node.js baseada em Debian (melhor suporte para GraphicsMagick)
FROM node:18-bullseye-slim

# Definir diretório de trabalho
WORKDIR /app

# Instalar dependências do sistema
# GraphicsMagick: Para converter PDF em imagens
# Ghostscript: Para suporte a PDF no GraphicsMagick
RUN apt-get update && apt-get install -y \
    graphicsmagick \
    ghostscript \
    && rm -rf /var/lib/apt/lists/*

# Copiar arquivos de dependências
COPY backend/package*.json ./backend/

# Instalar dependências do Node.js
WORKDIR /app/backend
RUN npm ci --only=production

# Copiar código do aplicativo
WORKDIR /app
COPY backend/ ./backend/
COPY index.html ./

# Criar diretório para arquivos temporários
RUN mkdir -p /app/backend/temp && \
    mkdir -p /app/backend/uploads

# Expor porta
EXPOSE 3000

# Definir variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=3000

# Comando para iniciar o servidor
WORKDIR /app/backend
CMD ["node", "server.js"]
