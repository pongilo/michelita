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
      <div className="join">{children}</div>
    </ToggleGroupContext.Provider>
  );
}

type ToggleGroupItemProps = {
  value: string;
  activeVariant?: string;
  children: ReactNode;
};

function ToggleGroupItem({ value, activeVariant = "btn-primary", children }: ToggleGroupItemProps) {
  const { value: selectedValue, onChange } = useToggleGroupContext();
  const isActive = selectedValue === value;
  return (
    <button
      type="button"
      className={`join-item btn btn-xs ${isActive ? activeVariant : "btn-ghost border border-base-300"}`}
      onClick={() => onChange(value)}
    >
      {children}
    </button>
  );
}

export const ToggleGroup = Object.assign(ToggleGroupRoot, { Item: ToggleGroupItem });
