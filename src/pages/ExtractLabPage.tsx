import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { BrandLogoMark } from "@/components/BrandLogoMark";
import { ArrowLeft, FileSearch, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiUrl } from "@/lib/apiBase";

const DOC_KINDS = [
  { value: "nf_foto", label: "Nota fiscal (foto do celular — JPEG/PNG)" },
  { value: "extrato_print", label: "Print / captura do extrato no cartão (imagem)" },
  { value: "pdf_licenca", label: "PDF — cobrança / licença (ex.: ChatGPT)" },
] as const;

type DocKind = (typeof DOC_KINDS)[number]["value"];

type LabHints = {
  charCount: number;
  reais: string[];
  dates: string[];
  times: string[];
  manualOnly?: boolean;
  note?: string;
  suggestedTotal?: string | null;
  suggestedDateTime?: string | null;
};

type ExtractResponse = {
  text: string;
  method: string;
  docKind: string;
  filename: string;
  mimeType: string;
  hints: LabHints;
};

const GOOGLE_CONFIGURED = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

export default function ExtractLabPage() {
  const navigate = useNavigate();
  const { user, loading, refresh } = useAuth();
  const [docKind, setDocKind] = useState<DocKind>("nf_foto");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ExtractResponse | null>(null);

  const run = async () => {
    if (!file) {
      toast.error("Selecione um arquivo");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("docKind", docKind);
      const res = await fetch(apiUrl("/api/lab/extract"), {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = (await res.json().catch(() => ({}))) as ExtractResponse & { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Falha na extração");
        return;
      }
      setResult(data);
      toast.success("Texto extraído");
    } catch {
      toast.error("Não foi possível contatar o servidor");
    } finally {
      setBusy(false);
    }
  };

  if (!GOOGLE_CONFIGURED) {
    return (
      <LoginScreen
        configError="Configure o Google OAuth no .env para usar o app."
        onLoggedIn={() => {}}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLoggedIn={() => void refresh()} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="rounded-xl gap-2 shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <BrandLogoMark size="sm" />
            <span className="text-sm font-medium text-foreground truncate">Lab — extração</span>
          </div>
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground hidden sm:inline">
            Reembolsos
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-12 space-y-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-medium text-foreground tracking-tight flex items-center gap-2">
            <FileSearch className="h-7 w-7 text-primary shrink-0" />
            Teste de leitura de documentos
          </h1>
          <p className="text-sm text-muted-foreground font-light max-w-2xl">
            Envie um arquivo para ver o texto bruto extraído.{" "}
            <strong className="font-medium text-foreground">PDF</strong> usa leitura de texto embutido;{" "}
            <strong className="font-medium text-foreground">imagens</strong> usam OCR (Tesseract). Na primeira
            execução o OCR pode demorar ao baixar os idiomas. Os &quot;palpites&quot; abaixo são só regex
            (R$, datas) — não são campos estruturados garantidos.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-refined space-y-5">
          <div className="space-y-2">
            <Label>Tipo de documento (para o seu teste)</Label>
            <Select value={docKind} onValueChange={(v) => setDocKind(v as DocKind)}>
              <SelectTrigger className="rounded-xl w-full max-w-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOC_KINDS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lab-file">Arquivo (PDF ou imagem JPEG/PNG)</Label>
            <input
              id="lab-file"
              type="file"
              accept=".pdf,image/jpeg,image/png"
              className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-xl file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-foreground"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setResult(null);
              }}
            />
          </div>

          <Button
            type="button"
            className="rounded-xl gap-2"
            disabled={busy || !file}
            onClick={() => void run()}
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Extraindo…
              </>
            ) : (
              <>
                <FileSearch className="h-4 w-4" />
                Extrair texto
              </>
            )}
          </Button>
        </div>

        {result && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3 text-sm">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Metadados</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-foreground">
                <div>
                  <span className="text-muted-foreground">Arquivo:</span> {result.filename}
                </div>
                <div>
                  <span className="text-muted-foreground">MIME:</span> {result.mimeType}
                </div>
                <div>
                  <span className="text-muted-foreground">Método:</span> {result.method}
                </div>
                <div>
                  <span className="text-muted-foreground">Cenário:</span> {result.docKind}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Palpites (heurística)</p>
              {result.hints.manualOnly && result.hints.note && (
                <p className="text-sm text-foreground border border-amber-500/30 bg-amber-500/5 rounded-xl p-3">
                  {result.hints.note}
                </p>
              )}
              {!result.hints.manualOnly && (
                <div className="space-y-2 text-sm">
                  {(result.hints.suggestedTotal || result.hints.suggestedDateTime) && (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-1 text-foreground">
                      {result.hints.suggestedTotal && (
                        <p>
                          <span className="text-muted-foreground">Valor sugerido (PDF):</span>{" "}
                          <strong>{result.hints.suggestedTotal}</strong>
                        </p>
                      )}
                      {result.hints.suggestedDateTime && (
                        <p>
                          <span className="text-muted-foreground">Data/hora sugerida:</span>{" "}
                          <strong>{result.hints.suggestedDateTime}</strong>
                        </p>
                      )}
                    </div>
                  )}
                  <p>
                    <span className="text-muted-foreground">Valores (R$):</span>{" "}
                    {result.hints.reais.length ? result.hints.reais.join(" · ") : "—"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Datas:</span>{" "}
                    {result.hints.dates.length ? result.hints.dates.join(" · ") : "—"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Horários:</span>{" "}
                    {result.hints.times.length ? result.hints.times.join(" · ") : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">Caracteres: {result.hints.charCount}</p>
                </div>
              )}
              {result.hints.manualOnly && (
                <p className="text-xs text-muted-foreground">
                  Caracteres extraídos (OCR): {result.hints.charCount}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-background p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Texto extraído</p>
              <pre className="text-xs text-foreground whitespace-pre-wrap break-words max-h-[480px] overflow-auto font-mono">
                {result.text.trim() || "(vazio — PDF pode ser só imagem escaneada ou OCR falhou)"}
              </pre>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
