import { MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMobileNav } from "@/contexts/mobile-nav-context";

export function AppTitle({ children }: { children: React.ReactNode }) {
  const { enabled, setOpen } = useMobileNav();

  return (
    <span className="inline-flex items-center gap-2 md:contents">
      {enabled && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setOpen(true)}
        >
          <MenuIcon className="size-5" />
          <span className="sr-only">Abrir menu</span>
        </Button>
      )}
      <h1 className="text-2xl font-heading">{children}</h1>
    </span>
  );
}
