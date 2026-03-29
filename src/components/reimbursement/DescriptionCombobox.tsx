import { useMemo, useRef, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AI_PROGRAM_OPTIONS } from "@/types/reimbursement";

interface Props {
  inputId: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function DescriptionCombobox({ inputId, value, onChange, error }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return AI_PROGRAM_OPTIONS;
    return AI_PROGRAM_OPTIONS.filter((o) => o.toLowerCase().includes(q));
  }, [value]);

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div ref={rootRef} className="md:col-span-2 space-y-2">
      <Label htmlFor={inputId} className="text-sm text-muted-foreground">
        Descrição *
      </Label>
      <div className="relative">
        <Input
          id={inputId}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Digite ou escolha uma sugestão na lista"
          className="h-12 rounded-xl bg-secondary border-border font-light"
          autoComplete="off"
        />
        {open && filtered.length > 0 && (
          <ul
            className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-md"
            role="listbox"
          >
          {filtered.map((opt) => (
            <li key={opt}>
              <button
                type="button"
                className="w-full rounded-lg px-3 py-2 text-left text-sm font-light hover:bg-accent hover:text-accent-foreground"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
              >
                {opt}
              </button>
            </li>
          ))}
          </ul>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
