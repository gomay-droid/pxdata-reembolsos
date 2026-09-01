import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  REIMBURSEMENT_STATUS_FILTER_OPTIONS,
  type ReimbursementStatus,
} from "@/lib/reimbursementStatus";

type Props = {
  value: "all" | ReimbursementStatus;
  onChange: (value: "all" | ReimbursementStatus) => void;
  className?: string;
};

export function ReimbursementStatusFilter({ value, onChange, className }: Props) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Props["value"])}>
      <SelectTrigger className={className ?? "h-9 w-full sm:w-[220px] rounded-xl"} aria-label="Filtrar por status">
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      <SelectContent>
        {REIMBURSEMENT_STATUS_FILTER_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
