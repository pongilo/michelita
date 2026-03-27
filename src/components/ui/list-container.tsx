import type { ReactNode } from "react";

type ListContainerProps = {
  children: ReactNode;
};

export function ListContainer({ children }: ListContainerProps) {
  return (
    <div className="flex flex-col divide-y divide-base-300 rounded-box overflow-hidden">
      {children}
    </div>
  );
}
