import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getDailyDashboard } from "@/lib/api/dashboard/get-daily-dashboard";
import { currencyFormatter, timeFormatter, dateFormatter, dayLabelFormatter } from "@/lib/utils/formatter";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/loading-state";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Item, ItemGroup, ItemContent, ItemTitle, ItemDescription, ItemActions, ItemMedia } from "@/components/ui/item";
import { PeriodFilter } from "@/components/ui/period-filter";
import { ToggleGroup } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { useQueryState } from 'nuqs'

const dateRangeFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

type DashboardPeriod = "daily" | "weekly" | "monthly";

function currentDateInputValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function formatDayLabel(date: Date) {
  const formatted = dayLabelFormatter.format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getPeriodBounds(period: DashboardPeriod, referenceDate: string): { startDate: string; endDate: string } {
  const base = new Date(`${referenceDate}T00:00:00`);

  if (period === "daily") {
    const end = new Date(base);
    end.setDate(end.getDate() + 1);
    return { startDate: toDateString(base), endDate: toDateString(end) };
  }

  if (period === "weekly") {
    const start = new Date(base);
    const diffToMonday = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - diffToMonday);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { startDate: toDateString(start), endDate: toDateString(end) };
  }

  // monthly
  const start = new Date(base);
  start.setDate(1);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return { startDate: toDateString(start), endDate: toDateString(end) };
}

export const Route = createFileRoute("/app/overview")({
  component: OverviewPage,
});

function OverviewPage() {
  const { organization } = Route.useRouteContext();
  const [period, setPeriod] = useState<DashboardPeriod>("daily");
  const [referenceDate, setReferenceDate] = useState<string>(currentDateInputValue);
  const [deliveryFilter, setDeliveryFilter] = useQueryState('delivery', {
    defaultValue: 'all'
  });
  const [selectedItem, setSelectedItem] = useQueryState('selectedItem')
  const [modal, setModal] = useQueryState('modal')

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ["dashboard", organization.id, "daily", period, referenceDate],
    queryFn: async () =>
      getDailyDashboard({ organizationId: organization.id, period, referenceDate }),
    enabled: !!organization.id,
    refetchInterval: 60_000,
  });

  console.log(data)

  const { startDate, endDate } = getPeriodBounds(period, referenceDate);

  const selectedItemContent = data?.itemsByDay
  .flatMap(day => day.items)
  .find(i => i.id === selectedItem) ?? null

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8">
      <PageHeader>
        <PageHeader.Info>
          <PageHeader.Title>Visão geral</PageHeader.Title>
          <PageHeader.Subtitle>
            {period === "daily"
              ? formatDayLabel(new Date(`${referenceDate}T00:00:00`))
              : `${dateRangeFormatter.format(new Date(`${startDate}T00:00:00`))} — ${dateRangeFormatter.format(new Date(new Date(`${endDate}T00:00:00`).getTime() - 1))}`}
          </PageHeader.Subtitle>
        </PageHeader.Info>
        <PageHeader.Controls>
          <PeriodFilter>
            <PeriodFilter.Select value={period} onChange={(v) => setPeriod(v as DashboardPeriod)} />
            <PeriodFilter.DateInput value={referenceDate} onChange={setReferenceDate} />
            <PeriodFilter.Refresh isFetching={isFetching} onClick={() => refetch()} />
          </PeriodFilter>
        </PageHeader.Controls>
      </PageHeader>

      {isLoading ? <LoadingState label="Carregando dados..." /> : null}
      {isError ? <p className="text-destructive text-sm">{error.message}</p> : null}

      {data ? (
        <div className="space-y-6">
          {/* Métricas financeiras */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Card size="sm">
              <CardContent className="flex flex-col gap-1">
                <CardDescription>Entradas</CardDescription>
                <CardTitle className="text-xl text-success">{currencyFormatter.format(data.metrics.entry)}</CardTitle>
              </CardContent>
            </Card>
            <Card size="sm">
              <CardContent className="flex flex-col gap-1">
                <CardDescription>Saídas</CardDescription>
                <CardTitle className="text-xl text-destructive">{currencyFormatter.format(data.metrics.exit)}</CardTitle>
              </CardContent>
            </Card>
            <Card size="sm">
              <CardContent className="flex flex-col gap-1">
                <CardDescription>Saldo</CardDescription>
                <CardTitle className={`text-xl ${data.metrics.balance >= 0 ? "text-success" : "text-destructive"}`}>
                  {currencyFormatter.format(data.metrics.balance)}
                </CardTitle>
              </CardContent>
            </Card>
          </section>

          {/* Métricas de pedidos */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card size="sm">
              <CardContent className="flex flex-col gap-1">
                <CardDescription>Total em pedidos</CardDescription>
                <CardTitle className="text-xl">{currencyFormatter.format(data.metrics.grossRevenue)}</CardTitle>
              </CardContent>
            </Card>
            <Card size="sm">
              <CardContent className="flex flex-col gap-1">
                <CardDescription>Pedidos</CardDescription>
                <CardTitle className="text-xl">{String(data.metrics.totalOrders)}</CardTitle>
              </CardContent>
            </Card>
            <Card size="sm">
              <CardContent className="flex flex-col gap-1">
                <CardDescription>Ticket médio</CardDescription>
                <CardTitle className="text-xl">{currencyFormatter.format(data.metrics.averageTicket)}</CardTitle>
              </CardContent>
            </Card>
            <Card size="sm">
              <CardContent className="flex flex-col gap-1">
                <CardDescription>Itens</CardDescription>
                <CardTitle className="text-xl">
                  {data.metrics.totalItems}
                </CardTitle>
              </CardContent>
            </Card>
          </section>

          {/* Entregas */}
          <section>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="font-semibold">Itens</h2>
              <ToggleGroup value={deliveryFilter} onChange={setDeliveryFilter}>
                <ToggleGroup.Item value="all">Todas</ToggleGroup.Item>
                <ToggleGroup.Item value="pending">A entregar</ToggleGroup.Item>
                <ToggleGroup.Item value="delivered">Entregues</ToggleGroup.Item>
              </ToggleGroup>
            </div>

            {data.itemsByDay && data.itemsByDay.map((itemByDay, itemByDayIndex) => (
              <div key={itemByDayIndex}>
                <p className="text-xs font-semibold opacity-50 uppercase tracking-wide mt-6">{formatDayLabel(new Date(itemByDay.date))}</p>
                {itemByDay.items.length === 0 ? (
                  <p className="text-xs opacity-40 italic">Nenhuma entrega.</p>
                ) : itemByDay.items.map((item) => (
                  <Item key={item.id} className="cursor-pointer" render={
                    <Link to="." search={(prev) => ({ ...prev, selectedItem: item.id })}>
                      <ItemMedia>
                        {timeFormatter.format(new Date(item.deliveredAt))}
                      </ItemMedia>
                      <ItemContent>
                        <ItemTitle>
                          <span className="text-primary shrink-0">{item.quantity}x</span>
                          {item.description} {item.note ? <> · {item.note}</> : null}
                        </ItemTitle>
                        <ItemDescription>
                          {item.order.customer ? <>{item.order.customer.name} · {item.order.customer.address}</> : null}<br />
                          Pedido feito em {dateFormatter.format(new Date(item.order.orderedAt))}
                        </ItemDescription>
                      </ItemContent>
                      <ItemActions>
                        <Badge className={item.isDelivered ? "bg-green-500/15 text-green-700 border-green-200" : ""} variant={item.isDelivered ? "default" : "outline"}>
                          {item.isDelivered ? "Entregue" : "A entregar"}
                        </Badge>
                        <Badge className={item.order.isPaid ? "bg-blue-500/15 text-blue-700 border-blue-200" : "bg-amber-400/20 text-amber-700 border-amber-300"}>
                          {item.order.isPaid ? "Pago" : "Pendente"}
                        </Badge>
                      </ItemActions>
                    </Link>
                  }/>
                ))}
              </div>
            ))}
          </section>
        </div>
      ) : null}

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
                  {/* Status badges */}
                  <div className="flex gap-2">
                    <Badge className={selectedItemContent.isDelivered ? "bg-green-500/15 text-green-700 border-green-200" : ""} variant={selectedItemContent.isDelivered ? "default" : "outline"}>
                      {selectedItemContent.isDelivered ? "Entregue" : "A entregar"}
                    </Badge>
                    <Badge className={selectedItemContent.order.isPaid ? "bg-blue-500/15 text-blue-700 border-blue-200" : "bg-amber-400/20 text-amber-700 border-amber-300"}>
                      {selectedItemContent.order.isPaid ? "Pago" : "Pagamento pendente"}
                    </Badge>
                  </div>

                  {/* Cliente */}
                  {selectedItemContent.order.customer ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Cliente</p>
                      <p className="font-medium">{selectedItemContent.order.customer.name}</p>
                      {selectedItemContent.order.customer.phone && <p className="text-sm text-muted-foreground mt-0.5">{selectedItemContent.order.customer.phone}</p>}
                      {selectedItemContent.order.customer.address && <p className="text-sm text-muted-foreground mt-0.5">{selectedItemContent.order.customer.address}</p>}
                      {selectedItemContent.order.customer.note && <p className="text-sm text-muted-foreground italic mt-0.5">{selectedItemContent.order.customer.note}</p>}
                    </div>
                  ) : null}
                </div>
              </div>

              <DrawerFooter>
                <Button type="button" variant="ghost" render={
                  <Link to="/app/order/$orderId" params={{ orderId: selectedItemContent.order.id }}>
                    Ver pedido completo
                  </Link>
                }/>
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

      {/* Confirm delivery dialog */}
      {/* <Dialog open={modal === 'confirmDelivery'} onOpenChange={() => setModal('confirmDelivery')}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar entrega</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja marcar <span className="font-medium text-foreground">{item.description}</span> como entregue?
            </DialogDescription>
          </DialogHeader>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <Checkbox
              checked={updateDate}
              onCheckedChange={(checked) => setUpdateDate(!!checked)}
            />
            <span className="text-sm">Atualizar data de entrega para agora</span>
          </label>
          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => setModal(null)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="button" size="sm" className="bg-success text-white hover:bg-success/80" onClick={handleConfirmDelivery} disabled={isPending}>
              {isPending ? <span className="animate-spin size-3 rounded-full border-2 border-current border-t-transparent" /> : null}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog> */}
    </main>
  );
}