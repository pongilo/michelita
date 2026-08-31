import { ChevronLeftIcon } from "lucide-react";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function AppTitle({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isHome = useRouterState({ select: (s) => s.location.pathname === "/app" });

  return (
    <span className="inline-flex items-center gap-2 md:contents">
      {!isHome && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => router.history.back()}
        >
          <ChevronLeftIcon className="size-5" />
          <span className="sr-only">Voltar</span>
        </Button>
      )}
      <h1 className="text-2xl font-heading">{children}</h1>
    </span>
  );
}
