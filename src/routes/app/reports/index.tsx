import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useGetItemsReport } from "@/hooks/tanstack/order/use-get-items-report";
import { useGetCustomersRanking } from "@/hooks/tanstack/customer/use-get-customers-ranking";
import { LoadingState } from "@/components/ui/loading-state";
import { monthFormatter } from "@/lib/utils/formatter";
import { Button } from "@/components/ui/button";
import { AppTitle } from "@/components/app-title";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/app/reports/")({
  component: RankingsPage,
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
const TOP_N = 10;

function MonthNav({
  offset,
  onChange,
}: {
  offset: number;
  onChange: (fn: (o: number) => number) => void;
}) {
  const { label } = getMonthOffset(offset);
  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={() => onChange((o) => o - 1)}
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
        onClick={() => onChange((o) => o + 1)}
        disabled={offset === 0}
        aria-label="Próximo mês"
        variant="ghost"
        size="icon"
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}

function ProductsTab() {
  const { organization } = useAuth();
  const [monthOffset, setMonthOffset] = useState(0);
  const { year, month } = getMonthOffset(monthOffset);

  const { data, isLoading, isError, error } = useGetItemsReport({
    organizationId: organization!.id,
    year,
    month,
  });

  const maxQty = data?.items[0]?.quantity ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <MonthNav offset={monthOffset} onChange={setMonthOffset} />
      </div>

      {isLoading && <LoadingState label="Carregando ranking..." />}
      {isError && <p className="text-destructive text-sm">{error.message}</p>}

      {data && (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card size="sm">
              <CardHeader>
                <CardDescription>Total de produtos produzidos</CardDescription>
                <CardTitle className="text-2xl">{data.totalItems}</CardTitle>
              </CardHeader>
            </Card>
            <Card size="sm">
              <CardHeader>
                <CardDescription>Tipos de produtos distintos</CardDescription>
                <CardTitle className="text-2xl">{data.items.length}</CardTitle>
              </CardHeader>
            </Card>
          </section>

          <section>
            {data.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum produto neste período.
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
                            className="h-full rounded-full bg-michelita-purple"
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
    </div>
  );
}

function CustomersTab() {
  const { organization } = useAuth();
  const [monthOffset, setMonthOffset] = useState(0);
  const { year, month } = getMonthOffset(monthOffset);

  const { data, isLoading, isError, error } = useGetCustomersRanking({
    organizationId: organization!.id,
    year,
    month,
  });

  const top = useMemo(() => {
    if (!data) return [];
    return [...data].sort((a, b) => b.orderCount - a.orderCount).slice(0, TOP_N);
  }, [data]);

  const maxOrders = top[0]?.orderCount ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <MonthNav offset={monthOffset} onChange={setMonthOffset} />
      </div>

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
              <p className="text-sm text-muted-foreground">
                Nenhum cliente neste período.
              </p>
            ) : (
              <div className="rounded-xl border border-base-200 overflow-hidden divide-y divide-base-200">
                {top.map((customer, index) => {
                  const pct = Math.round((customer.orderCount / maxOrders) * 100);
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
                          <p className="text-sm font-medium truncate">{customer.name}</p>
                          <span className="text-sm font-semibold shrink-0 text-michelita-purple">
                            {customer.orderCount}{" "}
                            {customer.orderCount === 1 ? "pedido" : "pedidos"}
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
    </div>
  );
}

function RankingsPage() {
  return (
    <main className="mx-auto w-full max-w-6xl p-5 space-y-6">
      <AppTitle>Rankings</AppTitle>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">Produtos</TabsTrigger>
          <TabsTrigger value="customers">Clientes</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <ProductsTab />
        </TabsContent>

        <TabsContent value="customers">
          <CustomersTab />
        </TabsContent>
      </Tabs>
    </main>
  );
}
