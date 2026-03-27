import type { ReactNode } from "react";

type AlertVariant = "success" | "error" | "warning" | "info";

type AlertProps = {
  children: ReactNode;
  variant?: AlertVariant;
  className?: string;
};

export function Alert({ children, variant = "info", className = "mb-5" }: AlertProps) {
  if (!children) return null;
  return (
    <div className={`alert alert-${variant} ${className}`}>
      {children}
    </div>
  );
}
