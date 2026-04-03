import type { ReactNode } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export const DEFAULT_PERIOD_OPTIONS = [
  { value: "daily", label: "Diário" },
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensal" },
];

function PeriodFilterRoot({ children }: { children: ReactNode }) {
  return <div className="flex gap-2">{children}</div>;
}

type SelectProps = {
  value: string;
  onChange: (value: string) => void;
  options?: { value: string; label: string }[];
};

function PeriodFilterSelect({ value, onChange, options = DEFAULT_PERIOD_OPTIONS }: SelectProps) {
  return (
    <Select value={value} onValueChange={(v) => v && onChange(v)}>
      <SelectTrigger>
        <SelectValue>{options.find((o) => o.value === value)?.label}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

type DateInputProps = {
  value: string;
  onChange: (value: string) => void;
};

function PeriodFilterDateInput({ value, onChange }: DateInputProps) {
  return (
    <Input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-36"
    />
  );
}

export const PeriodFilter = Object.assign(PeriodFilterRoot, {
  Select: PeriodFilterSelect,
  DateInput: PeriodFilterDateInput,
});
