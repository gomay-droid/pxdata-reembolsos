# Deploy na Vercel (front) + API em outro host

A Vercel serve **apenas o front-end estático** gerado pelo Vite (`npm run build`).  
A **API Express** (sessão, Prisma, SQLite, uploads em disco) **não roda** na Vercel neste setup.

**Onde está a API?** No mesmo repositório, pasta `server/` — você sobe em **Railway, Render, etc.** usando o **`Dockerfile`** na raiz. Passo a passo: **[DEPLOY_API.md](./DEPLOY_API.md)**.

Arquitetura:

1. **Vercel** — SPA React (`dist/`).
2. **Outro host** — API via Docker (`Dockerfile`) ou `npm start`, com **volume** para `prisma/dev.db` e `uploads/`.

---

## 1. Variáveis na Vercel (Build / Production)

No painel do projeto → **Settings → Environment Variables**:

| Nome | Exemplo | Obrigatório |
|------|---------|-------------|
| `VITE_GOOGLE_CLIENT_ID` | `xxx.apps.googleusercontent.com` | Sim |
| `VITE_API_BASE_URL` | `https://sua-api.railway.app` **sem barra no final** | Sim (produção) |

Deixe `VITE_API_BASE_URL` vazio em **Preview** se quiser apontar preview para uma API de staging (ou defina outra URL).

O Google OAuth precisa ter **Origem JavaScript autorizada** = URL exata do front na Vercel, ex.: `https://seu-projeto.vercel.app`.

---

## 2. Variáveis na API (host do backend)

Além do `.env` que você já usa em dev:

| Variável | Uso |
|----------|-----|
| `NODE_ENV` | `production` |
| `PORT` | Geralmente definido pelo host (ex.: Railway injeta) |
| `GOOGLE_CLIENT_ID` | **Igual** ao `VITE_GOOGLE_CLIENT_ID` |
| `SESSION_SECRET` | String longa e aleatória |
| `CLIENT_ORIGIN` | URL(s) do front na Vercel, separadas por vírgula se precisar de mais de uma |
| `ADMIN_EMAILS` | E-mails admin, separados por vírgula |
| `TRUST_CROSS_SITE_SESSION` | `1` ou `true` quando front e API estão em **domínios diferentes** (obrigatório para cookie de sessão no browser) |

Com `TRUST_CROSS_SITE_SESSION` ativo em produção, o cookie usa `SameSite=None` e `Secure` (HTTPS).

**CORS:** `CLIENT_ORIGIN` deve incluir a origem exata do app na Vercel (`https://...`).

**Persistência:** em SQLite, o arquivo do banco e `uploads/` precisam estar em **volume persistente** no provedor; senão, a cada deploy os dados somem.

---

## 3. Conectar o repositório na Vercel

1. Importe o repo no dashboard da Vercel.
2. **Framework Preset:** Vite (ou deixe em automático).
3. **Root Directory:** raiz do projeto (onde está `package.json`).
4. **Build Command:** `npm run build` (já em `vercel.json`).
5. **Output Directory:** `dist`.
6. Adicione as variáveis `VITE_*` acima.
7. Deploy.

O arquivo `vercel.json` na raiz define **rewrite** para `index.html` (React Router em rotas como `/admin`).

---

## 4. Checklist pós-deploy

- [ ] Front abre e carrega sem erro de rede (aba Network: chamadas vão para `VITE_API_BASE_URL`).
- [ ] Login Google funciona (origens e, se aplicável, URIs de redirecionamento no console Google).
- [ ] Após login, `/api/auth/me` retorna 200 (cookie com domínio cruzado só funciona com HTTPS + `TRUST_CROSS_SITE_SESSION`).
- [ ] Envio de reembolso e download de comprovante no admin.
- [ ] Backup do banco e da pasta `uploads/` no provedor da API.

---

## 5. Alternativa futura (monólito na Vercel)

Seria necessário migrar a API para **Vercel Serverless/Edge Functions**, trocar SQLite por banco gerenciado e arquivos por storage externo (S3, etc.). Fora do escopo deste guia.
