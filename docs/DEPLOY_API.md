# Onde está a API? Como subir (Railway, Render, etc.)

A API **não fica na Vercel** neste projeto: ela é o servidor Node em **`server/index.ts`**.  
Quem “traz” a URL pública é **você**, ao criar um serviço em um host que rode Node de forma contínua.

Este repositório inclui um **`Dockerfile`** na raiz que sobe **só a API** (Prisma + Express + pasta `uploads/`).

---

## O que você vai obter

Depois do deploy, o provedor mostra uma URL HTTPS, por exemplo:

- `https://pxdata-api-production.up.railway.app`

Esse valor é o que você coloca na Vercel como **`VITE_API_BASE_URL`** (sem barra no final).

---

## Opção A — Railway (Docker)

1. Crie conta em [railway.app](https://railway.app) e **New Project** → **Deploy from GitHub repo** (o mesmo do código).
2. Crie um serviço que use **Dockerfile** (Railway costuma detectar o `Dockerfile` na raiz).
3. **Importante:** adicione um **volume** persistente e monte:
   - caminho no container: `/app/prisma` (para `dev.db` sobreviver a redeploys), **e/ou**
   - caminho no container: `/app/uploads` (comprovantes).
   
   Sem volume, **SQLite e arquivos somem** a cada novo deploy.

4. Em **Variables**, configure (Production):

   | Variável | Exemplo |
   |----------|---------|
   | `PORT` | Railway define automaticamente; o código já usa `process.env.PORT \|\| 3001` |
   | `NODE_ENV` | `production` |
   | `GOOGLE_CLIENT_ID` | Igual ao `VITE_GOOGLE_CLIENT_ID` |
   | `SESSION_SECRET` | String longa aleatória |
   | `CLIENT_ORIGIN` | `https://seu-app.vercel.app` |
   | `ADMIN_EMAILS` | `email1@...,email2@...` |
   | `TRUST_CROSS_SITE_SESSION` | `1` |

5. **Deploy** e copie a URL pública do serviço → use na Vercel em `VITE_API_BASE_URL`.

---

## Opção B — Render (Web Service)

1. [render.com](https://render.com) → **New** → **Web Service** → conecte o repositório.
2. **Runtime:** Docker (aponta para o `Dockerfile` na raiz).
3. Adicione **Disk** persistente e monte em `/app/prisma` e/ou `/app/uploads` (conforme a UI do Render).
4. Mesmas variáveis de ambiente da tabela acima.
5. Copie a URL `https://....onrender.com` → `VITE_API_BASE_URL` na Vercel.

---

## Opção C — Sem Docker (Node direto)

No serviço, se o provedor rodar `npm start`:

- O `package.json` tem `"start": "npx prisma migrate deploy && npx tsx server/index.ts"`.
- É preciso **instalar dependências com `npm ci`** (inclui `devDependencies` necessárias ao Prisma/tsx) ou ajustar o provedor.

Prefira o **Dockerfile** para comportamento previsível.

---

## Conferência rápida

No browser ou com `curl`:

```text
GET https://SUA-API/api/auth/me
```

Sem cookie deve responder **401** — assim você sabe que a API está no ar.

---

## Resumo

| O quê | Onde |
|--------|------|
| Front (React) | **Vercel** → `VITE_API_BASE_URL` aponta para baixo |
| API (Express) | **Railway / Render / VPS** → URL que você copia do painel |
| Eu (assistente) | Não tenho conta no seu provedor; não consigo publicar por você |

Depois de subir a API, faça **redeploy** na Vercel se mudar `VITE_API_BASE_URL`.
