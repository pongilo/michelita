import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

function ChecklistList({ children }: { children: ReactNode }) {
  return <div className="md:px-5">{children}</div>;
}

function ChecklistItemRoot({ children, selected }: { children: ReactNode; selected?: boolean }) {
  return <div className={cn("p-3 rounded-md hover:bg-muted/50", selected && "bg-muted")}>{children}</div>;
}

function ChecklistItemRow({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-2">{children}</div>;
}

function ChecklistItemLabel({
  htmlFor,
  title,
  info,
}: {
  htmlFor?: string;
  title: ReactNode;
  info?: ReactNode;
}) {
  const content = (
    <>
      <span className="truncate font-heading font-medium">{title}</span>
      {info && <span className="hidden shrink-0 text-xs text-muted-foreground md:inline">{info}</span>}
    </>
  );

  if (!htmlFor) {
    return <div className="flex min-w-0 flex-1 items-baseline gap-2">{content}</div>;
  }

  return (
    <label htmlFor={htmlFor} className="flex min-w-0 flex-1 cursor-pointer items-baseline gap-2">
      {content}
    </label>
  );
}

function ChecklistItemQuantity({
  value,
  unit,
  onChange,
}: {
  value: string;
  unit: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <Input
        type="number"
        step="0.001"
        min="0"
        placeholder="Qtd."
        autoFocus
        className="h-8 w-20"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <span className="text-xs text-muted-foreground">{unit}</span>
    </div>
  );
}

function ChecklistItemDetails({ children }: { children: ReactNode }) {
  return <div className="mt-3 space-y-2 rounded-xl bg-muted/30 p-3 text-sm">{children}</div>;
}

export const ChecklistItem = Object.assign(ChecklistItemRoot, {
  Row: ChecklistItemRow,
  Label: ChecklistItemLabel,
  Quantity: ChecklistItemQuantity,
  Details: ChecklistItemDetails,
});

export { ChecklistList };
