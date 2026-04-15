import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useGetOrdersOverview } from "@/hooks/tanstack/order/use-get-orders-overview";
import { LoadingState } from "@/components/ui/loading-state";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { currencyFormatter, monthFormatter } from "@/lib/utils/formatter";
import { Button } from "@/components/ui/button";

const dayMonthFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  timeZone: "UTC",
});

function getWeeksInMonth(year: number, month: number) {
  const firstDay = new Date(Date.UTC(year, month, 1));
  const lastDay = new Date(Date.UTC(year, month + 1, 0));
  const weeks: { start: Date; end: Date }[] = [];
  let current = new Date(firstDay);

  while (current <= lastDay) {
    const weekStart = new Date(current);
    const dayOfWeek = current.getUTCDay(); // 0=Dom, 1=Seg ... 6=Sáb
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    const sundayCandidate = new Date(
      Date.UTC(year, month, current.getUTCDate() + daysUntilSunday),
    );
    const weekEnd = sundayCandidate > lastDay ? new Date(lastDay) : sundayCandidate;
    weeks.push({ start: weekStart, end: weekEnd });
    current = new Date(
      Date.UTC(weekEnd.getUTCFullYear(), weekEnd.getUTCMonth(), weekEnd.getUTCDate() + 1),
    );
  }

  return weeks;
}

export const Route = createFileRoute("/app/overview/")({
  component: OverviewPage,
});

function getMonthPeriod(offset: number) {
  const now = new Date();
  const start = new Date(Date.UTC(now.getFullYear(), now.getMonth() + offset, 1));
  const end = new Date(Date.UTC(now.getFullYear(), now.getMonth() + offset + 1, 1));
  return { start, end };
}

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

  const orders = (data?.orders ?? []) as (Order & { orderedAt: string })[];
  const pendingRevenue = orders
    .filter((o) => !o.isPaid)
    .reduce((sum, o) => sum + orderTotal(o), 0);

  const totalItems = orders.reduce((sum, o) => sum + o.item.reduce((s, i) => s + i.quantity, 0), 0);
  const pendingItems = orders.reduce(
    (sum, o) => sum + o.item.filter((i) => !i.isDelivered).reduce((s, i) => s + i.quantity, 0),
    0,
  );

  const weeks = getWeeksInMonth(start.getUTCFullYear(), start.getUTCMonth());
  const weeklyRevenue = weeks.map(({ start: wStart, end: wEnd }) => {
    const nextDay = new Date(
      Date.UTC(wEnd.getUTCFullYear(), wEnd.getUTCMonth(), wEnd.getUTCDate() + 1),
    );
    const weekOrders = orders.filter((o) => {
      const d = new Date(o.orderedAt);
      return d >= wStart && d < nextDay;
    });
    const revenue = weekOrders.reduce((sum, o) => sum + orderTotal(o), 0);
    const pending = weekOrders
      .filter((o) => !o.isPaid)
      .reduce((sum, o) => sum + orderTotal(o), 0);
    return { start: wStart, end: wEnd, revenue, pending };
  });

  const todayUTC = new Date(
    Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()),
  );

  return (
    <main className="mx-auto w-full max-w-6xl p-5 space-y-8">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-heading">Visão geral</h1>
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
            {monthLabel}
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

      {isLoading && <LoadingState label="Carregando visão geral..." />}
      {isError && <p className="text-destructive text-sm">{error.message}</p>}

      {data && (
        <>
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

          <Card size="sm">
            <CardHeader>
              <CardDescription>Faturamento por semana</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="divide-y divide-border">
                {weeklyRevenue.map(({ start: wStart, end: wEnd, revenue, pending }, i) => {
                  const isCurrentWeek = todayUTC >= wStart && todayUTC <= wEnd;
                  return (
                    <li
                      key={i}
                      className={`flex items-center justify-between py-2.5 text-sm ${isCurrentWeek ? "font-semibold" : ""}`}
                    >
                      <span className="text-muted-foreground tabular-nums">
                        {dayMonthFormatter.format(wStart)}
                        {" – "}
                        {dayMonthFormatter.format(wEnd)}
                        {isCurrentWeek && (
                          <span className="ml-1.5 text-xs font-normal text-primary">(atual)</span>
                        )}
                      </span>
                      <span className="flex items-center gap-2">
                        {revenue > 0 ? currencyFormatter.format(revenue) : "—"}
                        {pending > 0 && (
                          <span className="text-xs font-normal text-amber-700">
                            {currencyFormatter.format(pending)} pendente
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}
