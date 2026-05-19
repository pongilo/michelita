import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useGetCustomersRanking } from "@/hooks/tanstack/customer/use-get-customers-ranking";
import { LoadingState } from "@/components/ui/loading-state";
import { monthFormatter, currencyFormatter } from "@/lib/utils/formatter";
import { Button } from "@/components/ui/button";
import { AppTitle } from "@/components/app-title";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const TOP_N = 10;

export const Route = createFileRoute("/app/reports/customers")({
  component: CustomersRankingPage,
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

const MEDALS = ["🥇", "🥈", "🥉"];

function CustomersRankingPage() {
  const { organization } = useAuth();
  const [monthOffset, setMonthOffset] = useState(0);
  const { year, month, label } = getMonthOffset(monthOffset);

  const { data, isLoading, isError, error } = useGetCustomersRanking({
    organizationId: organization!.id,
    year,
    month,
  });

  const top = useMemo(() => {
    if (!data) return [];
    return [...data]
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, TOP_N);
  }, [data]);

  const isCurrentMonth = monthOffset === 0;
  const maxSpent = top[0]?.totalSpent ?? 1;

  return (
    <main className="mx-auto w-full max-w-6xl p-5 space-y-6">
      <header className="flex items-center justify-between gap-4">
        <AppTitle>Ranking de clientes</AppTitle>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setMonthOffset((o) => o - 1)}
            aria-label="Mês anterior"
            variant="ghost"
            size="icon"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm font-medium capitalize text-center min-w-28">
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

      {isLoading && <LoadingState label="Carregando ranking..." />}
      {isError && <p className="text-destructive text-sm">{error.message}</p>}

      {data && (
        <>
          <section>
            <Card size="sm">
              <CardHeader>
                <CardDescription>Clientes ativos no mês</CardDescription>
                <CardTitle className="text-2xl">{data.length}</CardTitle>
              </CardHeader>
            </Card>
          </section>

          <section>
            {top.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum cliente neste período.</p>
            ) : (
              <div className="rounded-xl border border-base-200 overflow-hidden divide-y divide-base-200">
                {top.map((customer, index) => {
                  const pct = Math.round((customer.totalSpent / maxSpent) * 100);
                  const medal = MEDALS[index];
                  return (
                    <Link
                      key={customer.id}
                      to="/app/customers/$customerId"
                      params={{ customerId: customer.id }}
                      className="flex items-center gap-4 px-4 py-3 hover:bg-base-200/50 transition-colors"
                    >
                      <span className="w-7 shrink-0 text-center text-sm">
                        {medal ?? (
                          <span className="text-xs text-muted-foreground">{index + 1}</span>
                        )}
                      </span>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{customer.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {customer.orderCount}{" "}
                              {customer.orderCount === 1 ? "pedido" : "pedidos"}
                            </p>
                          </div>
                          <span className="text-sm font-semibold shrink-0 text-michelita-purple">
                            {currencyFormatter.format(customer.totalSpent)}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-base-200 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-michelita-yellow"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </Link>
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
