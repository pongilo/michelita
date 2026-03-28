import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

const DEFAULT_PERIOD_OPTIONS = [
  { value: "daily", label: "Diário" },
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensal" },
];

function PeriodFilterRoot({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

type SelectProps = {
  value: string;
  onChange: (value: string) => void;
  options?: { value: string; label: string }[];
};

function PeriodFilterSelect({ value, onChange, options = DEFAULT_PERIOD_OPTIONS }: SelectProps) {
  return (
    <label className="space-y-1">
      <span className="label text-xs">Período</span>
      <select
        className="select select-bordered select-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

type DateInputProps = {
  value: string;
  onChange: (value: string) => void;
};

function PeriodFilterDateInput({ value, onChange }: DateInputProps) {
  return (
    <label className="space-y-1">
      <span className="label text-xs">Data de referência</span>
      <input
        type="date"
        className="input input-bordered input-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

type RefreshProps = {
  isFetching?: boolean;
  onClick: () => void;
};

function PeriodFilterRefresh({ isFetching = false, onClick }: RefreshProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={isFetching}
    >
      {isFetching ? <span className="loading loading-spinner loading-xs" /> : null}
      {isFetching ? "Atualizando..." : "Atualizar"}
    </Button>
  );
}

export const PeriodFilter = Object.assign(PeriodFilterRoot, {
  Select: PeriodFilterSelect,
  DateInput: PeriodFilterDateInput,
  Refresh: PeriodFilterRefresh,
});
