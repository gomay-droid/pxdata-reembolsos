import { GoogleLogin } from "@react-oauth/google";
import { Building2 } from "lucide-react";
import { toast } from "sonner";
import { BrandLogoMark } from "@/components/BrandLogoMark";
import { apiUrl } from "@/lib/apiBase";

interface Props {
  onLoggedIn: () => void;
  configError?: string;
}

export function LoginScreen({ onLoggedIn, configError }: Props) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="flex justify-center">
          <BrandLogoMark size="lg" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-medium text-foreground tracking-tight">Reembolsos PX Data</h1>
          <p className="text-sm text-muted-foreground font-light">
            Entre com sua conta Google para enviar solicitações e ver apenas o seu histórico.
          </p>
        </div>

        {configError ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-left text-sm text-destructive">
            {configError}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 shadow-refined">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
              <Building2 className="h-4 w-4" />
              Acesso restrito
            </div>
            <GoogleLogin
              onSuccess={async (credentialResponse) => {
                const credential = credentialResponse.credential;
                if (!credential) return;
                try {
                  const res = await fetch(apiUrl("/api/auth/google"), {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ credential }),
                  });
                  const data = (await res.json().catch(() => ({}))) as {
                    sub?: string;
                    email?: string;
                    error?: string;
                    hint?: string;
                  };
                  if (!res.ok) {
                    const msg = [data.error, data.hint].filter(Boolean).join(" — ");
                    toast.error(msg || "Falha no login");
                    return;
                  }
                  if (data.sub && data.email) {
                    onLoggedIn();
                  }
                } catch (err) {
                  console.error(err);
                  const api =
                    import.meta.env.VITE_API_BASE_URL?.trim() ||
                    "localhost (use npm run dev — proxy /api)";
                  toast.error(
                    `Não foi possível contatar a API (${api}). Verifique se o backend está no ar e a URL configurada.`
                  );
                }
              }}
              onError={() => console.error("Login Google falhou")}
              useOneTap={false}
              theme="outline"
              size="large"
              text="continue_with"
              shape="pill"
              locale="pt-BR"
            />
          </div>
        )}
      </div>
    </div>
  );
}
