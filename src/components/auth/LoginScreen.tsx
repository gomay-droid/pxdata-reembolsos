import { GoogleLogin } from "@react-oauth/google";
import { Building2 } from "lucide-react";
import { toast } from "sonner";
import { BrandLogoMark } from "@/components/BrandLogoMark";
import { apiUrl, googleAuthCallbackUrl } from "@/lib/apiBase";
import { isMobileBrowser } from "@/lib/isMobileBrowser";

interface Props {
  onLoggedIn: () => void;
  configError?: string;
}

export function LoginScreen({ onLoggedIn, configError }: Props) {
  const useRedirect = isMobileBrowser();
  const loginUri = googleAuthCallbackUrl();

  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center px-4 py-12 pb-[max(3rem,env(safe-area-inset-bottom))]">
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
            <div className="w-full flex justify-center overflow-visible">
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
                    toast.error(
                      "Não foi possível contatar a API. Verifique sua conexão e tente novamente."
                    );
                  }
                }}
                onError={() => {
                  toast.error("Login Google cancelado ou indisponível. Tente novamente.");
                }}
                useOneTap={false}
                theme="outline"
                size="large"
                text="continue_with"
                shape="pill"
                locale="pt-BR"
                width={280}
                ux_mode={useRedirect ? "redirect" : "popup"}
                login_uri={useRedirect ? loginUri : undefined}
              />
            </div>
            {useRedirect && (
              <p className="text-xs text-muted-foreground font-light">
                No celular, você será redirecionado ao Google e voltará automaticamente ao app.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
