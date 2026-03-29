import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import session from "express-session";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { OAuth2Client } from "google-auth-library";
/// <reference path="./session.d.ts" />
import { PrismaClient } from "@prisma/client";
import { buildHintsByDocKind, extractTextFromBuffer } from "./extractLab";
import {
  adminReimbursementDetailInclude,
  buildAdminExpenseRowsForJson,
} from "./buildAdminReimbursementDetail";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const uploadsDir = path.join(rootDir, "uploads");

dotenv.config({ path: path.join(rootDir, ".env") });

// Garante que a pasta base de uploads exista antes do Multer escrever arquivos.
// Sem isso, o upload pode falhar com ENOENT (no such file or directory).
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const prisma = new PrismaClient();
const app = express();
const PORT = Number(process.env.PORT) || 3001;

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const SESSION_SECRET = process.env.SESSION_SECRET ?? "dev-only-mude-em-producao";
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/** Front na Vercel + API em outro domínio: cookie de sessão precisa SameSite=None + Secure. */
const TRUST_CROSS_SITE_SESSION =
  process.env.TRUST_CROSS_SITE_SESSION === "1" ||
  process.env.TRUST_CROSS_SITE_SESSION === "true";

/** localhost ↔ 127.0.0.1 (mesma máquina) para não quebrar CORS se o .env tiver só um dos dois. */
function expandCorsOrigins(raw: string): string[] {
  const bases = raw
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean);
  const set = new Set<string>();
  for (const o of bases) {
    set.add(o);
    try {
      const u = new URL(o);
      if (u.hostname === "localhost") {
        u.hostname = "127.0.0.1";
        set.add(u.origin);
      } else if (u.hostname === "127.0.0.1") {
        u.hostname = "localhost";
        set.add(u.origin);
      }
    } catch {
      /* ignore */
    }
  }
  return [...set];
}

const CORS_ALLOWED_ORIGINS = expandCorsOrigins(CLIENT_ORIGIN);

const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

if (GOOGLE_CLIENT_ID) {
  console.log("[auth] Google OAuth: GOOGLE_CLIENT_ID carregado no servidor.");
} else {
  console.warn("[auth] GOOGLE_CLIENT_ID ausente — login Google retornará 503.");
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (CORS_ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
        return;
      }
      console.warn(`[cors] origem bloqueada: ${origin} (permitidas: ${CORS_ALLOWED_ORIGINS.join(", ")})`);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(
  session({
    name: "reembolso.sid",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      path: "/",
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite:
        process.env.NODE_ENV === "production" && TRUST_CROSS_SITE_SESSION ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
    },
  })
);

app.use("/uploads", express.static(uploadsDir));

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const sub = req.session.user?.sub;
  if (!sub) {
    return res.status(401).json({ error: "Faça login com Google para continuar" });
  }
  next();
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const email = req.session.user?.email;
  if (!ADMIN_EMAILS.length) {
    return res.status(403).json({ error: "Admin não configurado. Defina ADMIN_EMAILS no .env." });
  }
  if (!email || !ADMIN_EMAILS.includes(email)) {
    return res.status(403).json({ error: "Acesso administrativo negado" });
  }
  next();
}

const DEFAULT_COMPANY_SETTINGS = {
  name: "PX Data Tecnologia em Informática LTDA",
  address:
    "Rua Visconde de Inhaúma, 134 - Sala 1801, Centro, Rio de Janeiro - RJ, CEP 20091-007",
  cnpj: "24.602.118/0001-58",
  email: "backoffice@pxdata.ai",
} as const;

async function ensureCompanySettings(): Promise<void> {
  try {
    const c = await prisma.companySettings.count();
    if (c === 0) {
      await prisma.companySettings.create({
        data: { id: 1, ...DEFAULT_COMPANY_SETTINGS },
      });
      console.log("[company] Registro inicial de dados da empresa criado (id=1).");
    }
  } catch (e) {
    console.error("[company] ensureCompanySettings:", e);
  }
}

void ensureCompanySettings();

app.get("/api/auth/me", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Não autenticado" });
  }
  res.json(req.session.user);
});

app.get("/api/auth/is-admin", requireAuth, (req, res) => {
  const email = req.session.user?.email;
  const isAdmin = Boolean(email && ADMIN_EMAILS.includes(email));
  res.json({ isAdmin });
});

/** Dados da empresa (PX) para o formulário — qualquer usuário autenticado. */
app.get("/api/company", requireAuth, async (_req, res) => {
  try {
    await ensureCompanySettings();
    const row = await prisma.companySettings.findUnique({ where: { id: 1 } });
    if (!row) {
      return res.status(500).json({ error: "Configuração da empresa indisponível" });
    }
    res.json({
      name: row.name,
      address: row.address,
      cnpj: row.cnpj,
      email: row.email,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao carregar dados da empresa" });
  }
});

/** Leitura para edição no painel admin. */
app.get("/api/admin/company", requireAuth, requireAdmin, async (_req, res) => {
  try {
    await ensureCompanySettings();
    const row = await prisma.companySettings.findUnique({ where: { id: 1 } });
    if (!row) {
      return res.status(500).json({ error: "Configuração da empresa indisponível" });
    }
    res.json({
      name: row.name,
      address: row.address,
      cnpj: row.cnpj,
      email: row.email,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao carregar dados da empresa" });
  }
});

app.put("/api/admin/company", requireAuth, requireAdmin, async (req, res) => {
  try {
    const name = String(req.body?.name ?? "").trim();
    const address = String(req.body?.address ?? "").trim();
    const cnpj = String(req.body?.cnpj ?? "").trim();
    const email = String(req.body?.email ?? "").trim();
    if (!name || !address || !cnpj || !email) {
      return res.status(400).json({ error: "Nome, endereço, CNPJ e e-mail são obrigatórios" });
    }
    await ensureCompanySettings();
    const updated = await prisma.companySettings.update({
      where: { id: 1 },
      data: { name, address, cnpj, email },
    });
    res.json({
      name: updated.name,
      address: updated.address,
      cnpj: updated.cnpj,
      email: updated.email,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao salvar dados da empresa" });
  }
});

app.post("/api/auth/google", async (req, res) => {
  if (!googleClient || !GOOGLE_CLIENT_ID) {
    return res.status(503).json({ error: "Login Google não configurado (GOOGLE_CLIENT_ID)" });
  }
  const credential = req.body?.credential as string | undefined;
  if (!credential) {
    return res.status(400).json({ error: "Credencial ausente" });
  }
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) {
      return res.status(401).json({ error: "Token Google inválido" });
    }
    req.session.user = {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    };
    res.json(req.session.user);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[auth/google] verifyIdToken:", msg);
    const audienceMismatch = /audience|Audience|recipient/i.test(msg);
    const hint = audienceMismatch
      ? "No .env, GOOGLE_CLIENT_ID (servidor) deve ser exatamente igual a VITE_GOOGLE_CLIENT_ID (front). Use o mesmo ID do cliente OAuth (tipo Aplicativo da Web) no Google Cloud."
      : "Confira GOOGLE_CLIENT_ID no .env, reinicie api + Vite após alterar, e veja o erro completo no terminal do servidor.";
    res.status(401).json({
      error: "Não foi possível validar o login Google.",
      hint,
    });
  }
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Erro ao encerrar sessão" });
    }
    res.clearCookie("reembolso.sid", { path: "/" });
    res.status(204).end();
  });
});

function formatReimbursementId(dbId: number) {
  return `REIMB-${String(dbId).padStart(4, "0")}`;
}

function parseDbIdFromPublicId(publicId: string): number | null {
  const m = /^REIMB-(\d+)$/.exec(publicId.trim());
  if (!m) return null;
  return parseInt(m[1], 10);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const safe = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    cb(null, safe);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype === "application/pdf" ||
      file.mimetype === "image/jpeg" ||
      file.mimetype === "image/png";
    cb(null, ok);
  },
});

const labUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype === "application/pdf" ||
      file.mimetype === "image/jpeg" ||
      file.mimetype === "image/png";
    cb(null, ok);
  },
});

type PayloadExpense = {
  description: string;
  expenseLine: string;
  accountCode?: string;
  amount: string | number;
};

type PayloadBody = {
  requesterName: string;
  requesterAddress?: string;
  requesterDocument: string;
  requesterEmail: string;
  expenses: PayloadExpense[];
};

app.get("/api/reimbursements", requireAuth, async (req, res) => {
  const sub = req.session.user!.sub;
  try {
    const rows = await prisma.reimbursement.findMany({
      where: { ownerGoogleSub: sub },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { expenses: true } } },
    });
    const list = rows.map((r) => ({
      id: formatReimbursementId(r.id),
      requesterName: r.requesterName,
      requesterEmail: r.requesterEmail,
      totalAmount: r.totalAmount,
      expenseCount: r._count.expenses,
      status: r.status as "enviado" | "aprovado" | "rejeitado",
      // ISO completo: o front formata no fuso local (slice só em UTC gerava “um dia à frente” à noite no BR)
      createdAt: r.createdAt.toISOString(),
    }));
    res.json(list);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao listar reembolsos" });
  }
});

app.post(
  "/api/reimbursements",
  requireAuth,
  upload.array("files", 20),
  async (req, res) => {
    const ownerSub = req.session.user!.sub;
    let payload: PayloadBody;
    try {
      payload = JSON.parse(String(req.body.payload ?? "{}")) as PayloadBody;
    } catch {
      return res.status(400).json({ error: "Payload JSON inválido" });
    }

    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (!payload.requesterName?.trim()) {
      return res.status(400).json({ error: "Nome é obrigatório" });
    }
    if (!payload.requesterEmail?.trim()) {
      return res.status(400).json({ error: "Email é obrigatório" });
    }
    if (!payload.requesterDocument?.trim()) {
      return res.status(400).json({ error: "CPF/CNPJ é obrigatório" });
    }
    if (!Array.isArray(payload.expenses) || payload.expenses.length === 0) {
      return res.status(400).json({ error: "Inclua pelo menos uma despesa" });
    }
    if (files.length === 0) {
      return res.status(400).json({ error: "Anexe o comprovante em cada despesa" });
    }
    if (files.length !== payload.expenses.length) {
      return res.status(400).json({
        error: `Envie um comprovante por despesa (${payload.expenses.length} arquivo(s) esperado(s), ${files.length} recebido(s)).`,
      });
    }

    for (const e of payload.expenses) {
      if (!e.description?.trim() || !e.expenseLine) {
        return res.status(400).json({ error: "Cada despesa precisa de descrição e linha" });
      }
      const amt = typeof e.amount === "string" ? parseFloat(e.amount) : e.amount;
      if (!amt || amt <= 0) {
        return res.status(400).json({ error: "Valor de despesa inválido" });
      }
    }

    const totalAmount = payload.expenses.reduce((sum, e) => {
      const amt = typeof e.amount === "string" ? parseFloat(e.amount) : e.amount;
      return sum + (Number.isFinite(amt) ? amt : 0);
    }, 0);

    try {
      const created = await prisma.reimbursement.create({
        data: {
          ownerGoogleSub: ownerSub,
          requesterName: payload.requesterName.trim(),
          requesterAddress: payload.requesterAddress?.trim() || null,
          requesterDocument: payload.requesterDocument.trim(),
          requesterEmail: payload.requesterEmail.trim(),
          totalAmount,
          expenses: {
            create: payload.expenses.map((e) => ({
              description: e.description.trim(),
              expenseLine: e.expenseLine,
              accountCode: e.accountCode?.trim() || null,
              amount:
                typeof e.amount === "string" ? parseFloat(e.amount) : Number(e.amount),
            })),
          },
        },
      });

      const subDir = path.join(uploadsDir, String(created.id));
      fs.mkdirSync(subDir, { recursive: true });

      const expensesOrdered = await prisma.expense.findMany({
        where: { reimbursementId: created.id },
        orderBy: { id: "asc" },
      });

      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const expenseRow = expensesOrdered[i];
        if (!expenseRow) break;
        const dest = path.join(subDir, f.filename);
        fs.renameSync(f.path, dest);
        await prisma.attachment.create({
          data: {
            reimbursementId: created.id,
            expenseId: expenseRow.id,
            originalName: f.originalname,
            storedPath: path.relative(rootDir, dest).replace(/\\/g, "/"),
            mimeType: f.mimetype,
            size: f.size,
          },
        });
      }

      res.status(201).json({
        id: formatReimbursementId(created.id),
        totalAmount: created.totalAmount,
        expenseCount: payload.expenses.length,
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erro ao salvar reembolso" });
    }
  }
);

app.patch("/api/reimbursements/:id/status", requireAuth, async (req, res) => {
  const sub = req.session.user!.sub;
  const dbId = parseDbIdFromPublicId(req.params.id);
  if (dbId === null) {
    return res.status(400).json({ error: "ID inválido" });
  }
  const status = req.body?.status as string | undefined;
  if (!status || !["enviado", "aprovado", "rejeitado"].includes(status)) {
    return res.status(400).json({ error: "Status inválido" });
  }
  try {
    const existing = await prisma.reimbursement.findUnique({ where: { id: dbId } });
    if (!existing || existing.ownerGoogleSub !== sub) {
      return res.status(403).json({ error: "Sem permissão para alterar este reembolso" });
    }
    const updated = await prisma.reimbursement.update({
      where: { id: dbId },
      data: { status },
    });
    res.json({
      id: formatReimbursementId(updated.id),
      status: updated.status,
    });
  } catch {
    res.status(404).json({ error: "Reembolso não encontrado" });
  }
});

app.get("/api/admin/reimbursements", requireAuth, requireAdmin, async (req, res) => {
  try {
    const rows = await prisma.reimbursement.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { expenses: true } } },
    });

    const list = rows.map((r) => ({
      id: formatReimbursementId(r.id),
      requesterName: r.requesterName,
      requesterEmail: r.requesterEmail,
      totalAmount: r.totalAmount,
      expenseCount: r._count.expenses,
      status: r.status as "enviado" | "aprovado" | "rejeitado",
      createdAt: r.createdAt.toISOString(),
    }));

    res.json(list);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao listar despesas (admin)" });
  }
});

app.get("/api/admin/reimbursements/:id", requireAuth, requireAdmin, async (req, res) => {
  const dbId = parseDbIdFromPublicId(req.params.id);
  if (dbId === null) {
    return res.status(400).json({ error: "ID inválido" });
  }
  try {
    const r = await prisma.reimbursement.findUnique({
      where: { id: dbId },
      include: adminReimbursementDetailInclude,
    });
    if (!r) return res.status(404).json({ error: "Reembolso não encontrado" });

    const expensesPayload = buildAdminExpenseRowsForJson(r);

    res.json({
      id: formatReimbursementId(r.id),
      requesterName: r.requesterName,
      requesterEmail: r.requesterEmail,
      requesterDocument: r.requesterDocument,
      requesterAddress: r.requesterAddress,
      status: r.status,
      totalAmount: r.totalAmount,
      createdAt: r.createdAt.toISOString(),
      expenses: expensesPayload,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao carregar detalhes (admin)" });
  }
});

app.get("/api/admin/metrics", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const rows = await prisma.reimbursement.findMany({
      select: { status: true, totalAmount: true },
    });

    const totalAmount = rows.reduce((sum, r) => sum + (r.totalAmount ?? 0), 0);
    const totalCount = rows.length;
    const approvedCount = rows.filter((r) => r.status === "aprovado").length;
    const rejectedCount = rows.filter((r) => r.status === "rejeitado").length;
    const sentCount = rows.filter((r) => r.status === "enviado").length;
    const pendingCount = sentCount; // "pendentes" = enviados aguardando análise

    res.json({
      totalAmount,
      totalCount,
      approvedCount,
      rejectedCount,
      pendingCount,
      sentCount,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao carregar métricas (admin)" });
  }
});

app.patch("/api/admin/reimbursements/:id/status", requireAuth, requireAdmin, async (req, res) => {
  const dbId = parseDbIdFromPublicId(req.params.id);
  if (dbId === null) {
    return res.status(400).json({ error: "ID inválido" });
  }
  const status = req.body?.status as string | undefined;
  if (!status || !["enviado", "aprovado", "rejeitado"].includes(status)) {
    return res.status(400).json({ error: "Status inválido" });
  }

  try {
    const updated = await prisma.reimbursement.update({
      where: { id: dbId },
      data: { status },
    });
    res.json({ id: formatReimbursementId(updated.id), status: updated.status });
  } catch {
    res.status(404).json({ error: "Reembolso não encontrado" });
  }
});

/** Laboratório: extrai texto de PDF (camada de texto) ou imagem (OCR). Requer login. */
app.post("/api/lab/extract", requireAuth, labUpload.single("file"), async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: "Envie um arquivo PDF ou imagem (JPEG/PNG)" });
  }
  const docKind = typeof req.body?.docKind === "string" ? req.body.docKind : "desconhecido";
  try {
    const { text, method } = await extractTextFromBuffer(file.buffer, file.mimetype);
    const hints = buildHintsByDocKind(text, docKind, file.mimetype);
    res.json({
      text,
      method,
      hints,
      docKind,
      filename: file.originalname,
      mimeType: file.mimetype,
    });
  } catch (e) {
    console.error("[lab/extract]", e);
    const msg = e instanceof Error ? e.message : "Falha ao extrair texto";
    res.status(500).json({ error: msg });
  }
});

// Tratador genérico de erros (ex.: erros do Multer/upload) para retornar JSON
// e o front conseguir mostrar a mensagem real.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // Se já respondeu, não mexe.
  if (res.headersSent) return;
  console.error("API error:", err);
  const anyErr = err as any;
  const message =
    anyErr?.message ||
    (anyErr?.code ? `Erro no upload (${anyErr.code})` : "Erro no servidor");
  res.status(400).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`API em http://127.0.0.1:${PORT}`);
});
