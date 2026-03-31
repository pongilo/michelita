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

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export const Route = createFileRoute("/app/overview")({
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
  const progressPercent = totalItems > 0 ? (deliveredCount / totalItems) * 100 : 0;

  const selectedItemContent = allItems.find(i => i.id === selectedItem) ?? null;

  const headerSubtitle = period === "weekly"
    ? "Esta semana"
    : period === "monthly"
    ? monthFormatter.format(new Date(`${referenceDate}T00:00:00`))
    : formatDayLabel(new Date(`${referenceDate}T00:00:00`));

  const sectionPeriodLabel = quickFilter === "today" ? "HOJE"
    : quickFilter === "tomorrow" ? "AMANHÃ"
    : quickFilter === "week" ? "ESTA SEMANA"
    : quickFilter === "month" ? monthFormatter.format(new Date(`${referenceDate}T00:00:00`)).toUpperCase()
    : shortDateFormatter.format(new Date(`${customDate}T00:00:00`));

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground capitalize">{headerSubtitle}</p>
          <h1 className="text-4xl font-heading font-bold tracking-tight">Entregas</h1>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-1 p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground"
          aria-label="Atualizar"
        >
          <RefreshCw className={cn("size-4", isFetching && "animate-spin")} />
        </button>
      </div>

      {/* Quick filter pills */}
      <div className="flex gap-2 flex-wrap mb-5">
        {QUICK_FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setQuickFilter(key)}
            className={cn(
              "px-4 h-9 rounded-full text-sm font-medium border transition-colors",
              quickFilter === key
                ? "bg-foreground text-background border-foreground"
                : "bg-transparent text-foreground border-border hover:bg-muted"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Custom date input */}
      {quickFilter === "custom" && (
        <div className="mb-5">
          <input
            type="date"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            className="h-9 px-3 rounded-xl text-sm border border-border bg-background"
          />
        </div>
      )}

      {/* Custom month input */}
      {quickFilter === "month" && (
        <div className="mb-5">
          <input
            type="month"
            value={customMonth}
            onChange={(e) => setCustomMonth(e.target.value)}
            className="h-9 px-3 rounded-xl text-sm border border-border bg-background"
          />
        </div>
      )}

      {/* Progress bar */}
      {totalItems > 0 && (
        <div className="mb-6">
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {isLoading ? <LoadingState label="Carregando dados..." /> : null}
      {isError ? <p className="text-destructive text-sm">{error.message}</p> : null}

      {data ? (
        <div className="space-y-8">
          {data.itemsByDay.map((itemByDay, index) => {
            if (itemByDay.items.length === 0) return null;
            const dayLabel = period === "daily"
              ? sectionPeriodLabel
              : formatDayLabel(new Date(itemByDay.date)).toUpperCase();

            return (
              <div key={index}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                  {itemByDay.items.length} {itemByDay.items.length === 1 ? "ITEM" : "ITENS"} PARA {dayLabel}
                </p>
                <div className="space-y-3">
                  {itemByDay.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="w-full text-left"
                      onClick={() => setSelectedItem(item.id)}
                    >
                      <Card className="hover:ring-foreground/20 transition-shadow">
                        <CardContent className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-heading font-semibold text-base leading-snug">
                              {item.quantity > 1 && (
                                <span className="text-primary mr-1">{item.quantity}x</span>
                              )}
                              {item.description}
                            </p>
                            {item.order.customer && (
                              <p className="text-sm text-muted-foreground mt-0.5">
                                {item.order.customer.name}
                              </p>
                            )}
                            {item.note && (
                              <p className="text-sm text-muted-foreground italic mt-0.5">
                                {item.note}
                              </p>
                            )}
                            <div className="flex items-center gap-1.5 mt-2.5 text-xs text-muted-foreground">
                              <Clock className="size-3.5 shrink-0" />
                              <span>{timeFormatter.format(new Date(item.deliveredAt))}</span>
                            </div>
                          </div>
                          <div className="shrink-0 mt-0.5">
                            {item.isDelivered
                              ? <CheckCircle2 className="size-6 text-green-500" />
                              : <Circle className="size-6 text-muted-foreground/30" />
                            }
                          </div>
                        </CardContent>
                      </Card>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          {totalItems === 0 && (
            <p className="text-sm text-muted-foreground text-center py-10">
              Nenhuma entrega para este período.
            </p>
          )}

          {totalItems > 0 && (
            <p className="text-sm text-muted-foreground text-center pb-4">
              {deliveredCount} de {totalItems} {totalItems === 1 ? "entregue" : "entregues"}
            </p>
          )}
        </div>
      ) : null}

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
