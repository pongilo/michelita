import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useGetOrdersOverview } from "@/hooks/tanstack/order/use-get-orders-overview";
import { LoadingState } from "@/components/ui/loading-state";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { currencyFormatter } from "@/lib/utils/formatter";

export const Route = createFileRoute("/app/overview/")({
  component: OverviewPage,
});

function getMonthPeriod(offset: number) {
  const now = new Date();
  const start = new Date(Date.UTC(now.getFullYear(), now.getMonth() + offset, 1));
  const end = new Date(Date.UTC(now.getFullYear(), now.getMonth() + offset + 1, 1));
  return { start, end };
}

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

type Order = {
  isPaid: boolean;
  shippingFee: number | null;
  discount: number | null;
  item: { quantity: number; total: number; isDelivered: boolean }[];
};

function orderTotal(order: Order) {
  const items = order.item.reduce((sum, i) => sum + i.total, 0);
  return items + (order.shippingFee ?? 0) - (order.discount ?? 0);
}

function OverviewPage() {
  const { organization } = useAuth();
  const [monthOffset, setMonthOffset] = useState(0);
  const { start, end } = getMonthPeriod(monthOffset);

  const { data, isLoading, isError, error } = useGetOrdersOverview({
    organizationId: organization!.id,
    startAt: start,
    endAt: end,
  });

  const monthLabel = monthFormatter.format(start);
  const isCurrentMonth = monthOffset === 0;

  const orders = (data?.orders ?? []) as Order[];
  const pendingRevenue = orders
    .filter((o) => !o.isPaid)
    .reduce((sum, o) => sum + orderTotal(o), 0);

  const totalItems = orders.reduce((sum, o) => sum + o.item.reduce((s, i) => s + i.quantity, 0), 0);
  const pendingItems = orders.reduce(
    (sum, o) => sum + o.item.filter((i) => !i.isDelivered).reduce((s, i) => s + i.quantity, 0),
    0,
  );

  return (
    <main className="mx-auto w-full max-w-6xl p-5 space-y-8">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-heading">Visão geral</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMonthOffset((o) => o - 1)}
            className="btn btn-ghost btn-sm btn-circle"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-sm font-medium capitalize min-w-32 text-center">
            {monthLabel}
          </span>
          <button
            onClick={() => setMonthOffset((o) => o + 1)}
            disabled={isCurrentMonth}
            className="btn btn-ghost btn-sm btn-circle disabled:opacity-30"
            aria-label="Próximo mês"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </header>

      {isLoading && <LoadingState label="Carregando visão geral..." />}
      {isError && <p className="text-destructive text-sm">{error.message}</p>}

      {data && (
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card size="sm">
            <CardHeader>
              <CardDescription>Total faturado</CardDescription>
              <CardTitle className="text-2xl">
                {currencyFormatter.format(data.stats.totalRevenue)}
              </CardTitle>
              {pendingRevenue > 0 && (
                <p className="text-xs text-amber-700">
                  {currencyFormatter.format(pendingRevenue)} pendente
                </p>
              )}
            </CardHeader>
          </Card>
          <Card size="sm">
            <CardHeader>
              <CardDescription>Pedidos realizados</CardDescription>
              <CardTitle className="text-2xl">
                {data.stats.orderCount}
              </CardTitle>
              {totalItems > 0 && (
                <p className="text-xs text-muted-foreground">
                  {totalItems} {totalItems === 1 ? "item" : "itens"} no total
                  {pendingItems > 0 && (
                    <span className="text-amber-700"> · {pendingItems} a entregar</span>
                  )}
                </p>
              )}
            </CardHeader>
          </Card>
          <Card size="sm">
            <CardHeader>
              <CardDescription>Ticket médio</CardDescription>
              <CardTitle className="text-2xl">
                {data.stats.orderCount > 0
                  ? currencyFormatter.format(data.stats.averageTicket)
                  : "—"}
              </CardTitle>
            </CardHeader>
          </Card>
        </section>
      )}
    </main>
  );
}
