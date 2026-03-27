import type { ReactNode } from "react";

function MetricCardRoot({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-box border border-base-300 bg-base-100 px-4 py-4">
      {children}
    </div>
  );
}

function MetricCardLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs opacity-60 uppercase tracking-wide mb-1">{children}</p>
  );
}

function MetricCardValue({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={`text-xl font-bold ${className ?? ""}`}>{children}</p>
  );
}

export const MetricCard = Object.assign(MetricCardRoot, {
  Label: MetricCardLabel,
  Value: MetricCardValue,
});
