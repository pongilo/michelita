import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useListOrders } from "@/hooks/tanstack/order/use-list-orders";
import { timeFormatter, formatDayLabel } from "@/lib/utils/formatter";
import { LoadingState } from "@/components/ui/loading-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Item, ItemActions, ItemContent, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";

type QuickFilter = "today" | "tomorrow" | "week" | "month" | "custom";
type DashboardPeriod = "daily" | "weekly" | "monthly";

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

function quickFilterToPeriod(filter: QuickFilter, customDate: string, customMonth: string): { period: DashboardPeriod; referenceDate: string } {
  switch (filter) {
    case "today":
      return { period: "daily", referenceDate: currentDateInputValue() };
    case "tomorrow":
      return { period: "daily", referenceDate: tomorrowDateInputValue() };
    case "week":
      return { period: "weekly", referenceDate: currentDateInputValue() };
    case "month":
      return { period: "monthly", referenceDate: `${customMonth}-01` };
    case "custom":
      return { period: "daily", referenceDate: customDate };
  }
}

export const Route = createFileRoute("/app/orders/")({
  component: OrdersPage,
});

const QUICK_FILTERS: { key: QuickFilter; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "tomorrow", label: "Amanhã" },
  { key: "week", label: "Esta semana" },
  { key: "month", label: "Este mês" },
  { key: "custom", label: "Escolher data" },
];

function OrdersPage() {
  const { organization } = Route.useRouteContext();
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("today");
  const [customDate, setCustomDate] = useState<string>(currentDateInputValue);
  const [customMonth, setCustomMonth] = useState<string>(currentMonthInputValue);

  const { period, referenceDate } = quickFilterToPeriod(quickFilter, customDate, customMonth);

  const { data, isLoading, isError, error } = useListOrders({
    organizationId: organization.id,
    period,
    referenceDate,
  });

  const allItems = data?.itemsByDay.flatMap(day => day.groups.flatMap(g => g.items)) ?? [];
  const totalItems = data?.itemsByDay.reduce((sum, day) => sum + day.itemCount, 0) ?? 0;
  const deliveredCount = allItems.filter(i => i.isDelivered).length;

  return (
    <main className="mx-auto w-full max-w-6xl p-5">
      <header className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-baseline gap-2">
            <h1 className="text-2xl font-heading">Pedidos</h1>
            {totalItems > 0 && (
              <p className="text-sm text-muted-foreground">
                ({deliveredCount} de {totalItems} entregues)
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap mb-5">
          {QUICK_FILTERS.map(({ key, label }) => (
            <Button
              key={key}
              onClick={() => setQuickFilter(key)}
              variant={quickFilter === key ? "default" : "outline"}
            >
              {label}
            </Button>
          ))}
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
      </header>

      {isLoading && <LoadingState label="Carregando entregas..." />}
      {isError && <p className="text-destructive text-sm">{error.message}</p>}

      {data && (
        <div className="space-y-12">
          {data.itemsByDay.map((itemByDay, index) => {
            return (
              <div key={index} className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  {formatDayLabel(new Date(itemByDay.date))} - {itemByDay.itemCount} {itemByDay.itemCount === 1 ? "item" : "itens"}
                </p>
                {itemByDay.groups.length === 0 ? (
                  <Item variant="outline" className="text-muted-foreground">
                    Nenhuma entrega para este dia.
                  </Item>
                ) : (
                  <ItemGroup>
                    {itemByDay.groups.map((group) => {
                      const allDelivered = group.items.every(i => i.isDelivered);
                      return (
                        <Item
                          key={group.key}
                          variant="outline"
                          className="items-start"
                          render={
                            <Link to="/app/orders/$orderId" params={{ orderId: group.order.id }} />
                          }
                        >
                          <ItemMedia>
                            {timeFormatter.format(new Date(group.deliveredAt))}
                          </ItemMedia>
                          <ItemContent>
                            {group.items.map((item) => (
                              <div key={item.id}>
                                <ItemTitle>
                                  <span className="text-primary font-bold">{item.quantity}x</span>
                                  {item.description}
                                </ItemTitle>
                                {item.note && (
                                  <p className="text-sm text-muted-foreground italic">
                                    {item.note}
                                  </p>
                                )}
                              </div>
                            ))}
                            {group.order.customer && (
                              <p className="text-sm text-muted-foreground">
                                {group.order.customer.name}
                              </p>
                            )}
                          </ItemContent>
                          <ItemActions>
                            {allDelivered ? (
                              <Badge className="bg-green-500/15 text-green-700 border-green-200">
                                Entregue
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-400/20 text-amber-700 border-amber-300">
                                A entregar
                              </Badge>
                            )}
                            {group.order.isPaid ? (
                              <Badge className="bg-green-500/15 text-green-700 border-green-200">
                                Pago
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-400/20 text-amber-700 border-amber-300">
                                Pagamento pendente
                              </Badge>
                            )}
                          </ItemActions>
                        </Item>
                      );
                    })}
                  </ItemGroup>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
