import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { RECEIPT_ACCEPT_ATTR } from "@/types/reimbursement";
import { CloudUpload, FileStack } from "lucide-react";

interface Props {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}

export function ReceiptBulkUpload({ onFiles, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = useCallback(
    (list: FileList | File[]) => {
      if (disabled) return;
      const files = Array.from(list);
      if (files.length === 0) return;
      onFiles(files);
    },
    [disabled, onFiles]
  );

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled) setDragActive(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled) setDragActive(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragActive(false);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragActive(false);
          if (disabled) return;
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          "relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer",
          "min-h-[200px] flex flex-col items-center justify-center gap-4 px-6 py-10 text-center",
          disabled && "opacity-50 pointer-events-none cursor-not-allowed",
          dragActive
            ? "border-primary bg-primary/10 scale-[1.01] shadow-lg shadow-primary/10"
            : "border-border bg-muted/20 hover:border-primary/40 hover:bg-muted/35"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={RECEIPT_ACCEPT_ATTR}
          className="sr-only"
          disabled={disabled}
          onChange={(e) => {
            // FileList é referência viva ao input: limpar value antes esvazia a lista em vários navegadores.
            const picked = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (picked.length) handleFiles(picked);
          }}
        />
        <div
          className={cn(
            "h-16 w-16 rounded-2xl flex items-center justify-center shrink-0",
            dragActive ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
          )}
        >
          {dragActive ? (
            <CloudUpload className="h-8 w-8" aria-hidden />
          ) : (
            <FileStack className="h-8 w-8" aria-hidden />
          )}
        </div>
        <div className="space-y-1 max-w-md">
          <p className="text-base font-medium text-foreground">
            Arraste comprovantes aqui ou clique para escolher
          </p>
          <p className="text-sm text-muted-foreground font-light leading-relaxed">
            Cada arquivo vira uma despesa. Formatos: PDF, JPG ou PNG · até 15 MB por arquivo · vários
            arquivos de uma vez
          </p>
        </div>
      </div>
    </div>
  );
}

export function toastBulkUploadSummary(added: number, errors: string[]) {
  if (added > 0) {
    toast.success(
      added === 1 ? "1 comprovante adicionado" : `${added} comprovantes adicionados`,
      {
        description:
          errors.length > 0
            ? `${errors.length} arquivo(s) ignorado(s). Veja os detalhes no canto da tela.`
            : "Cada um virou um item de despesa abaixo.",
      }
    );
  }
  if (errors.length > 0) {
    errors.slice(0, 3).forEach((msg) => toast.error(msg));
    if (errors.length > 3) {
      toast.message(`E mais ${errors.length - 3} arquivo(s) com problema.`);
    }
  }
}
