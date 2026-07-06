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
    const onDocPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
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
        Título / Item da despesa *
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
          placeholder="Ex.: Cursor, ChatGPT, passagem aérea…"
          className="bg-secondary border-border font-light"
          autoComplete="off"
        />
        {open && filtered.length > 0 && (
          <ul
            className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-2xl border border-border bg-popover p-1 text-popover-foreground shadow-refined"
            role="listbox"
          >
          {filtered.map((opt) => (
            <li key={opt}>
              <button
                type="button"
                className="w-full rounded-lg px-3 py-2 text-left text-sm font-light hover:bg-accent hover:text-accent-foreground"
                onPointerDown={(e) => e.preventDefault()}
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
