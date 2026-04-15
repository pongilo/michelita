import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useGetOrdersOverview } from "@/hooks/tanstack/order/use-get-orders-overview";
import { LoadingState } from "@/components/ui/loading-state";
import { currencyFormatter, formatDayLabel } from "@/lib/utils/formatter";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/app/history/")({
  component: HistoryPage,
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
  id: string;
  isPaid: boolean;
  orderedAt: string;
  shippingFee: number | null;
  discount: number | null;
  customer: { name: string } | null;
  item: { description: string; quantity: number; total: number; isDelivered: boolean }[];
};

function orderTotal(order: Order) {
  const items = order.item.reduce((sum, i) => sum + i.total, 0);
  return items + (order.shippingFee ?? 0) - (order.discount ?? 0);
}

function getTodayUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
    .toISOString()
    .slice(0, 10);
}

function getDayLabel(date: string) {
  const today = getTodayUTC();
  const yesterday = new Date(Date.UTC(...(today.split("-").map(Number) as [number, number, number])));
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  const formatted = formatDayLabel(new Date(date + "T00:00:00Z"));
  if (date === today) return `Hoje, ${formatted}`;
  if (date === yesterdayStr) return `Ontem, ${formatted}`;
  return formatDayLabel(new Date(date + "T00:00:00Z"));
}

function groupOrdersByDay(orders: Order[]): { date: string; orders: Order[] }[] {
  const map = new Map<string, Order[]>();
  for (const order of orders) {
    const day = order.orderedAt.slice(0, 10);
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(order);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, orders]) => ({ date, orders }));
}

function HistoryPage() {
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
  const dayGroups = groupOrdersByDay(orders);

  return (
    <main className="mx-auto w-full max-w-6xl p-5 space-y-8">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-heading">Histórico</h1>
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

      {isLoading && <LoadingState label="Carregando histórico..." />}
      {isError && <p className="text-destructive text-sm">{error.message}</p>}

      {data && (
        <section className="space-y-6">
          {dayGroups.length === 0 && (
            <p className="text-sm text-base-content/50">Nenhum pedido neste período.</p>
          )}
          {dayGroups.map(({ date, orders }) => {
            const dayTotal = orders.reduce((sum, o) => sum + orderTotal(o as Order), 0);
            const dayPending = orders
              .filter((o) => !o.isPaid)
              .reduce((sum, o) => sum + orderTotal(o as Order), 0);
            return (
              <div key={date} className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                    {getDayLabel(date)}
                  </p>
                  <div className="flex items-center gap-2">
                    {dayPending > 0 && (
                      <span className="text-xs text-amber-700">
                        {currencyFormatter.format(dayPending)} pendente
                      </span>
                    )}
                    <span className="text-xs font-semibold text-muted-foreground">
                      {currencyFormatter.format(dayTotal)}
                    </span>
                  </div>
                </div>
                <div className="divide-y divide-base-200 rounded-xl border border-base-200 overflow-hidden">
                  {orders.map((order) => {
                    const total = orderTotal(order);
                    const itemSummary = order.item
                      .map((i) => `${i.quantity}× ${i.description}`)
                      .join(", ");
                    return (
                      <Link
                        key={order.id}
                        to="/app/orders/$orderId"
                        params={{ orderId: order.id }}
                        className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-base-100 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {order.customer?.name ?? "Cliente não informado"}
                          </p>
                          {itemSummary && (
                            <p className="text-xs text-base-content/50 truncate">{itemSummary}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {order.isPaid ? (
                            <Badge className="bg-green-500/15 text-green-700 border-green-200">
                              Pago
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-400/20 text-amber-700 border-amber-300">
                              Pagamento pendente
                            </Badge>
                          )}
                          <span className="text-sm font-semibold">
                            {currencyFormatter.format(total)}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </main>
  );
}
