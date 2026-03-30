# Imagem só da API Express (use na Railway, Render, Fly, etc.).
# O front continua na Vercel; copie a URL pública do serviço para VITE_API_BASE_URL.

FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma/

RUN npm ci

COPY server ./server/

RUN npx prisma generate

RUN mkdir -p uploads

ENV NODE_ENV=production

EXPOSE 3001

# Aplica migrações em disco vazio; em seguida sobe a API.
CMD ["sh", "-c", "npx prisma migrate deploy && exec npx tsx server/index.ts"]
