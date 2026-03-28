import { createContext, useContext } from "react";
import type { ReactNode } from "react";

type ToggleGroupContextValue = {
  value: string;
  onChange: (value: string) => void;
};

const ToggleGroupContext = createContext<ToggleGroupContextValue | null>(null);

function useToggleGroupContext() {
  const ctx = useContext(ToggleGroupContext);
  if (!ctx) throw new Error("ToggleGroup.Item must be used inside ToggleGroup");
  return ctx;
}

type ToggleGroupProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  children: ReactNode;
};

function ToggleGroupRoot<T extends string>({ value, onChange, children }: ToggleGroupProps<T>) {
  return (
    <ToggleGroupContext.Provider value={{ value, onChange: onChange as (v: string) => void }}>
      <div className="flex rounded-lg border border-border overflow-hidden">{children}</div>
    </ToggleGroupContext.Provider>
  );
}

type ToggleGroupItemProps = {
  value: string;
  activeClassName?: string;
  children: ReactNode;
};

function ToggleGroupItem({ value, activeClassName = "bg-primary text-primary-foreground", children }: ToggleGroupItemProps) {
  const { value: selectedValue, onChange } = useToggleGroupContext();
  const isActive = selectedValue === value;
  return (
    <button
      type="button"
      className={`px-3 h-7 text-xs font-medium border-r border-border last:border-r-0 transition-colors ${
        isActive ? activeClassName : "text-muted-foreground hover:bg-muted"
      }`}
      onClick={() => onChange(value)}
    >
      {children}
    </button>
  );
}

export const ToggleGroup = Object.assign(ToggleGroupRoot, { Item: ToggleGroupItem });
