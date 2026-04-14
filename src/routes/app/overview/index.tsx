import { createFileRoute, Link } from "@tanstack/react-router";
import { useRequiredAuth } from "@/contexts/auth-context";
import { useState } from "react";
import { useGetOrdersOverview } from "@/hooks/tanstack/order/use-get-orders-overview";
import { currencyFormatter, shortDateFormatter } from "@/lib/utils/formatter";
import { LoadingState } from "@/components/ui/loading-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Item, ItemActions, ItemContent, ItemGroup, ItemTitle } from "@/components/ui/item";

type QuickFilter = "today" | "tomorrow" | "week" | "month" | "custom";
type OverviewPeriod = "daily" | "weekly" | "monthly";

function currentDateInputValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function tomorrowDateInputValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  local.setDate(local.getDate() + 1);
  return local.toISOString().slice(0, 10);
}

function currentMonthInputValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 7);
}

function quickFilterToPeriod(filter: QuickFilter, customDate: string, customMonth: string, customWeek: string): { period: OverviewPeriod; referenceDate: string } {
  switch (filter) {
    case "today":
      return { period: "daily", referenceDate: currentDateInputValue() };
    case "tomorrow":
      return { period: "daily", referenceDate: tomorrowDateInputValue() };
    case "week":
      return { period: "weekly", referenceDate: customWeek };
    case "month":
      return { period: "monthly", referenceDate: `${customMonth}-01` };
    case "custom":
      return { period: "daily", referenceDate: customDate };
  }
}

export const Route = createFileRoute("/app/overview/")({
  component: OverviewPage,
});

const QUICK_FILTERS: { key: QuickFilter; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "tomorrow", label: "Amanhã" },
  { key: "week", label: "Esta semana" },
  { key: "month", label: "Este mês" },
  { key: "custom", label: "Escolher data" },
];

function OverviewPage() {
  const { organization } = useRequiredAuth();
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("month");
  const [customDate, setCustomDate] = useState<string>(currentDateInputValue);
  const [customMonth, setCustomMonth] = useState<string>(currentMonthInputValue);
  const [customWeek, setCustomWeek] = useState<string>(currentDateInputValue);

  const { period, referenceDate } = quickFilterToPeriod(quickFilter, customDate, customMonth, customWeek);

  const { data, isLoading, isError, error } = useGetOrdersOverview({
    organizationId: organization.id,
    period,
    referenceDate,
  });

  const rangeLabel =
    data
      ? `${shortDateFormatter.format(new Date(data.rangeStart))} – ${shortDateFormatter.format(new Date(data.rangeEnd))}`
      : "";

  return (
    <main className="mx-auto w-full max-w-6xl p-5 space-y-8">
      <header className="space-y-4">
        <h1 className="text-2xl font-heading">Visão geral</h1>
        <div className="flex gap-2 flex-wrap">
          {QUICK_FILTERS.map(({ key, label }) => (
            <Button
              key={key}
              onClick={() => setQuickFilter(key)}
              variant={quickFilter === key ? "default" : "outline"}
            >
              {label}
            </Button>
          ))}
          {quickFilter === "week" && (
            <Input
              type="date"
              value={customWeek}
              onChange={(e) => setCustomWeek(e.target.value)}
            />
          )}
          {quickFilter === "custom" && (
            <Input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
            />
          )}
          {quickFilter === "month" && (
            <Input
              type="month"
              value={customMonth}
              onChange={(e) => setCustomMonth(e.target.value)}
            />
          )}
        </div>
        {rangeLabel && (
          <p className="text-sm text-muted-foreground">{rangeLabel}</p>
        )}
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
              </CardHeader>
            </Card>
            <Card size="sm">
              <CardHeader>
                <CardDescription>Pedidos realizados</CardDescription>
                <CardTitle className="text-2xl">
                  {data.stats.orderCount}
                </CardTitle>
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

          <section className="space-y-3">
            <div className="flex items-baseline gap-2">
              <h2 className="text-lg font-heading">Pedidos pendentes</h2>
              {data.pendingOrders.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {data.pendingOrders.length}{" "}
                  {data.pendingOrders.length === 1 ? "pedido" : "pedidos"}
                </p>
              )}
            </div>

            {data.pendingOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum pedido pendente.</p>
            ) : (
              <ItemGroup>
                {data.pendingOrders.map((order) => (
                  <Item
                    key={order.id}
                    variant="outline"
                    className="items-start"
                    render={
                      <Link to="/app/orders/$orderId" params={{ orderId: order.id }} />
                    }
                  >
                    <ItemContent>
                      <ItemTitle>
                        {order.customer?.name ?? "Cliente não informado"}
                      </ItemTitle>
                      <p className="text-sm text-muted-foreground">
                        {order.itemCount}{" "}
                        {order.itemCount === 1 ? "item" : "itens"} ·{" "}
                        {shortDateFormatter.format(new Date(order.orderedAt))}
                      </p>
                    </ItemContent>
                    <ItemActions>
                      <span className="font-medium text-sm">
                        {currencyFormatter.format(order.total)}
                      </span>
                      {!order.isPaid && (
                        <Badge className="bg-red-500/10 text-red-700 border-red-200">
                          Pagamento pendente
                        </Badge>
                      )}
                      {!order.allItemsDelivered && (
                        <Badge className="bg-amber-400/20 text-amber-700 border-amber-300">
                          Entrega pendente
                        </Badge>
                      )}
                    </ItemActions>
                  </Item>
                ))}
              </ItemGroup>
            )}
          </section>
        </>
      )}
    </main>
  );
}
