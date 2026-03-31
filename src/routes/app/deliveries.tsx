import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getDailyDashboard } from "@/lib/api/dashboard/get-daily-dashboard";
import { timeFormatter, shortDateFormatter, formatDayLabel } from "@/lib/utils/formatter";
import { LoadingState } from "@/components/ui/loading-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
import { useQueryState } from 'nuqs'
import { Clock, CheckCircle2, Circle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Item, ItemActions, ItemContent, ItemGroup, ItemMedia, ItemSeparator, ItemTitle } from "@/components/ui/item";

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
  return local.toISOString().slice(0, 7); // "YYYY-MM"
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

export const Route = createFileRoute("/app/deliveries")({
  component: DeliveriesPage,
});

const QUICK_FILTERS: { key: QuickFilter; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "tomorrow", label: "Amanhã" },
  { key: "week", label: "Esta semana" },
  { key: "month", label: "Este mês" },
  { key: "custom", label: "Escolher data" },
];

function DeliveriesPage() {
  const { organization } = Route.useRouteContext();
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("today");
  const [customDate, setCustomDate] = useState<string>(currentDateInputValue);
  const [customMonth, setCustomMonth] = useState<string>(currentMonthInputValue);
  const [selectedItem, setSelectedItem] = useQueryState('selectedItem');

  const { period, referenceDate } = quickFilterToPeriod(quickFilter, customDate, customMonth);

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ["dashboard", organization.id, "daily", period, referenceDate],
    queryFn: async () =>
      getDailyDashboard({ organizationId: organization.id, period, referenceDate }),
    enabled: !!organization.id,
    refetchInterval: 60_000,
  });

  const allItems = data?.itemsByDay.flatMap(day => day.items) ?? [];
  const totalItems = allItems.length;
  const deliveredCount = allItems.filter(i => i.isDelivered).length;

  const selectedItemContent = allItems.find(i => i.id === selectedItem) ?? null;

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8">
      <header className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-baseline gap-2">
            <h1 className="text-2xl font-heading">Entregas</h1>
            {totalItems > 0 && (
              <p className="text-sm text-muted-foreground">
                ({deliveredCount} de {totalItems} entregues)
              </p>
            )}
          </div>
          <Button
            onClick={() => refetch()}
            aria-label="Atualizar"
            size="icon-sm"
            variant="ghost"
          >
            <RefreshCw className={cn("size-4", isFetching && "animate-spin")} />
          </Button>
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


      {isLoading && <LoadingState label="Carregando dados..." />}
      {isError && <p className="text-destructive text-sm">{error.message}</p>}

      {data && (
        <div className="space-y-12">
          {data.itemsByDay.map((itemByDay, index) => {
            return (
              <div key={index} className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  {itemByDay.items.length} {itemByDay.items.length === 1 ? "item" : "itens"} para {formatDayLabel(new Date(itemByDay.date))}
                </p>
                {itemByDay.items.length === 0 ? (
                  <Item variant="outline" className="text-muted-foreground">
                    Nenhuma entrega para este dia.
                  </Item>
                ) : (
                  <ItemGroup>
                    {itemByDay.items.map((item) => (
                      <Item variant="outline" className="items-start" render={
                        <Link to="." search={{ selectedItem: item.id }} resetScroll={false}>
                          <ItemMedia>
                            {timeFormatter.format(new Date(item.deliveredAt))}
                          </ItemMedia>
                          <ItemContent>
                            <ItemTitle>
                              {item.quantity > 1 && (
                                <span className="text-primary mr-1">{item.quantity}x</span>
                              )}
                              {item.description}
                            </ItemTitle>
                            {item.note && (
                              <p className="text-sm text-muted-foreground italic">
                                {item.note}
                              </p>
                            )}
                            {item.order.customer && (
                              <p className="text-sm text-muted-foreground">
                                {item.order.customer.name}
                              </p>
                            )}
                          </ItemContent>
                          <ItemActions>
                            {item.isDelivered ? (
                              <Badge className="bg-green-500/15 text-green-700 border-green-200">
                                Entregue
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-400/20 text-amber-700 border-amber-300">
                                A entregar
                              </Badge>
                            )}
                            {item.order.isPaid ? (
                              <Badge className="bg-green-500/15 text-green-700 border-green-200">
                                Pago
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-400/20 text-amber-700 border-amber-300">
                                Pagamento pendente
                              </Badge>
                            )}
                          </ItemActions>
                        </Link>
                      }/>
                    ))}
                  </ItemGroup>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Detail drawer */}
      <Drawer open={!!selectedItem} onOpenChange={() => setSelectedItem(null)} direction="right">
        <DrawerContent>
          {selectedItemContent ? (
            <>
              <DrawerHeader>
                <DrawerTitle className="truncate">{selectedItemContent.description}</DrawerTitle>
                <DrawerDescription>
                  {timeFormatter.format(new Date(selectedItemContent.deliveredAt))}
                  {selectedItemContent.order.customer ? <> · {selectedItemContent.order.customer.name}</> : null}
                </DrawerDescription>
              </DrawerHeader>

              <div className="flex-1 overflow-y-auto px-4 py-2">
                <div className="space-y-5">
                  <div className="flex gap-2">
                    <Badge
                      className={selectedItemContent.isDelivered ? "bg-green-500/15 text-green-700 border-green-200" : ""}
                      variant={selectedItemContent.isDelivered ? "default" : "outline"}
                    >
                      {selectedItemContent.isDelivered ? "Entregue" : "A entregar"}
                    </Badge>
                    <Badge className={selectedItemContent.order.isPaid
                      ? "bg-blue-500/15 text-blue-700 border-blue-200"
                      : "bg-amber-400/20 text-amber-700 border-amber-300"}
                    >
                      {selectedItemContent.order.isPaid ? "Pago" : "Pagamento pendente"}
                    </Badge>
                  </div>

                  {selectedItemContent.order.customer ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Cliente</p>
                      <p className="font-medium">{selectedItemContent.order.customer.name}</p>
                      {selectedItemContent.order.customer.phone && (
                        <p className="text-sm text-muted-foreground mt-0.5">{selectedItemContent.order.customer.phone}</p>
                      )}
                      {selectedItemContent.order.customer.address && (
                        <p className="text-sm text-muted-foreground mt-0.5">{selectedItemContent.order.customer.address}</p>
                      )}
                      {selectedItemContent.order.customer.note && (
                        <p className="text-sm text-muted-foreground italic mt-0.5">{selectedItemContent.order.customer.note}</p>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>

              <DrawerFooter>
                <Button type="button" variant="ghost" render={
                  <Link to="/app/order/$orderId" params={{ orderId: selectedItemContent.order.id }}>
                    Ver pedido completo
                  </Link>
                } />
                {selectedItemContent.isDelivered ? (
                  <Button type="button" variant="ghost" onClick={() => {}}>
                    Desfazer entrega
                  </Button>
                ) : (
                  <Button type="button" variant="ghost">
                    Confirmar entrega
                  </Button>
                )}
              </DrawerFooter>
            </>
          ) : null}
        </DrawerContent>
      </Drawer>
    </main>
  );
}
