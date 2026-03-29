import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, FileText, Image } from "lucide-react";

interface Props {
  attachments: File[];
  error?: string;
  onAdd: (files: FileList) => void;
  onRemove: (index: number) => void;
}

export function AttachmentsSection({ attachments, error, onAdd, onRemove }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Upload className="h-5 w-5 text-accent-foreground" />
        </div>
        <div>
          <h3 className="text-base font-medium text-foreground">Comprovantes</h3>
          <p className="text-sm text-muted-foreground">PDF ou imagens (obrigatório)</p>
        </div>
      </div>

      <div
        onClick={() => inputRef.current?.click()}
        className="rounded-2xl border-2 border-dashed border-border hover:border-primary/30 transition-colors duration-300 p-8 text-center cursor-pointer group"
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => e.target.files && onAdd(e.target.files)}
          className="hidden"
        />
        <Upload className="h-8 w-8 mx-auto text-muted-foreground group-hover:text-primary/60 transition-colors mb-3" />
        <p className="text-sm text-muted-foreground">Clique ou arraste arquivos aqui</p>
        <p className="text-xs text-muted-foreground mt-1">PDF, JPG ou PNG</p>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center justify-between rounded-xl border border-border bg-card p-3 animate-fade-in"
            >
              <div className="flex items-center gap-3">
                {file.type.includes("pdf") ? (
                  <FileText className="h-5 w-5 text-destructive/70" />
                ) : (
                  <Image className="h-5 w-5 text-info" />
                )}
                <div>
                  <p className="text-sm font-normal text-foreground truncate max-w-[200px] md:max-w-[400px]">
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemove(index)}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
