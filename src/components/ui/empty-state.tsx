import { createContext, useContext } from "react";
import type { ReactNode } from "react";

const EmptyStateContext = createContext(false);

function EmptyStateRoot({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return (
    <EmptyStateContext.Provider value={compact}>
      <div className="card border border-base-300 bg-base-100">
        <div className={`card-body items-center text-center ${compact ? "py-12" : "py-16"}`}>
          {children}
        </div>
      </div>
    </EmptyStateContext.Provider>
  );
}

function EmptyStateIcon({ children }: { children: ReactNode }) {
  const compact = useContext(EmptyStateContext);
  return (
    <div className={compact ? "text-4xl mb-2" : "text-5xl mb-3"}>{children}</div>
  );
}

function EmptyStateTitle({ children }: { children: ReactNode }) {
  const compact = useContext(EmptyStateContext);
  return (
    <h3 className={`font-semibold ${compact ? "" : "text-lg"}`}>{children}</h3>
  );
}

function EmptyStateDescription({ children }: { children: ReactNode }) {
  return <p className="text-sm opacity-60 max-w-xs">{children}</p>;
}

function EmptyStateAction({ children }: { children: ReactNode }) {
  return <div className="mt-4">{children}</div>;
}

export const EmptyState = Object.assign(EmptyStateRoot, {
  Icon: EmptyStateIcon,
  Title: EmptyStateTitle,
  Description: EmptyStateDescription,
  Action: EmptyStateAction,
});
