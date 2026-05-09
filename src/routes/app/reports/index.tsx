import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useGetItemsReport } from "@/hooks/tanstack/order/use-get-items-report";
import { LoadingState } from "@/components/ui/loading-state";
import { monthFormatter } from "@/lib/utils/formatter";
import { Button } from "@/components/ui/button";
import { AppTitle } from "@/components/app-title";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const Route = createFileRoute("/app/reports/")({
  component: ItemsReportPage,
});

function getMonthOffset(offset: number) {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1 + offset;
  const normalized = new Date(Date.UTC(year, month - 1, 1));
  return {
    year: normalized.getUTCFullYear(),
    month: normalized.getUTCMonth() + 1,
    label: monthFormatter.format(normalized),
  };
}

function ItemsReportPage() {
  const { organization } = useAuth();
  const [monthOffset, setMonthOffset] = useState(0);
  const { year, month, label } = getMonthOffset(monthOffset);

  const { data, isLoading, isError, error } = useGetItemsReport({
    organizationId: organization!.id,
    year,
    month,
  });

  const isCurrentMonth = monthOffset === 0;
  const maxQty = data?.items[0]?.quantity ?? 1;

  return (
    <main className="mx-auto w-full max-w-6xl p-5 space-y-8">
      <header className="flex items-center justify-between gap-4">
        <AppTitle>Relatório de itens</AppTitle>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setMonthOffset((o) => o - 1)}
            aria-label="Mês anterior"
            variant="ghost"
            size="icon"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm font-medium capitalize text-center">
            {label}
          </span>
          <Button
            onClick={() => setMonthOffset((o) => o + 1)}
            disabled={isCurrentMonth}
            aria-label="Próximo mês"
            variant="ghost"
            size="icon"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </header>

      {isLoading && <LoadingState label="Carregando relatório..." />}
      {isError && <p className="text-destructive text-sm">{error.message}</p>}

      {data && (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card size="sm">
              <CardHeader>
                <CardDescription>Total de itens produzidos</CardDescription>
                <CardTitle className="text-2xl">{data.totalItems}</CardTitle>
              </CardHeader>
            </Card>
            <Card size="sm">
              <CardHeader>
                <CardDescription>Tipos de itens distintos</CardDescription>
                <CardTitle className="text-2xl">{data.items.length}</CardTitle>
              </CardHeader>
            </Card>
          </section>

          <section className="space-y-3">
            {data.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum item neste período.
              </p>
            ) : (
              <div className="rounded-xl border border-base-200 overflow-hidden divide-y divide-base-200">
                {data.items.map((item, index) => {
                  const pct = Math.round((item.quantity / maxQty) * 100);
                  return (
                    <div key={item.description} className="flex items-center gap-4 px-4 py-3">
                      <span className="text-xs text-muted-foreground w-5 shrink-0 text-right">
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-sm font-medium truncate">{item.description}</p>
                          <span className="text-sm font-semibold shrink-0">{item.quantity}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-base-200 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[var(--color-michelita-purple)]"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
