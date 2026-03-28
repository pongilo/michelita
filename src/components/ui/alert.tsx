import type { ReactNode } from "react";

type AlertVariant = "success" | "error" | "warning" | "info";

const variantClasses: Record<AlertVariant, string> = {
  success: "border-green-200 bg-green-50 text-green-800",
  error: "border-destructive/30 bg-destructive/10 text-destructive",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
};

type AlertProps = {
  children: ReactNode;
  variant?: AlertVariant;
  className?: string;
};

export function Alert({ children, variant = "info", className = "mb-5" }: AlertProps) {
  if (!children) return null;
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${variantClasses[variant]} ${className}`}>
      {children}
    </div>
  );
}
