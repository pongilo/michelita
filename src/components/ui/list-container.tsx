import type { ReactNode } from "react";

type ListContainerProps = {
  children: ReactNode;
};

export function ListContainer({ children }: ListContainerProps) {
  return (
    <div className="flex flex-col divide-y divide-border rounded-2xl overflow-hidden">
      {children}
    </div>
  );
}
