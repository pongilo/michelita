import { SidebarTrigger } from "@/components/ui/sidebar";

export function AppTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2">
      <SidebarTrigger className="md:hidden" />
      <h1 className="text-2xl font-heading">{children}</h1>
    </div>
  );
}