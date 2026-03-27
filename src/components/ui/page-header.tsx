import type { ReactNode } from "react";

function PageHeaderRoot({ children }: { children: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      {children}
    </div>
  );
}

function PageHeaderInfo({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}

function PageHeaderTitle({ children }: { children: ReactNode }) {
  return <h1 className="text-2xl font-semibold">{children}</h1>;
}

function PageHeaderSubtitle({ children }: { children: ReactNode }) {
  return <p className="text-sm opacity-60 mt-0.5">{children}</p>;
}

function PageHeaderControls({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-end gap-2">{children}</div>;
}

export const PageHeader = Object.assign(PageHeaderRoot, {
  Info: PageHeaderInfo,
  Title: PageHeaderTitle,
  Subtitle: PageHeaderSubtitle,
  Controls: PageHeaderControls,
});
