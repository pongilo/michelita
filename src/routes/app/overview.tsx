import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { getDailyDashboard } from "@/lib/api/dashboard/get-daily-dashboard";
import { useGetProductionOrders } from "@/hooks/tanstack/order/use-get-production-orders";
import { useGetProductionOrdersRange } from "@/hooks/tanstack/order/use-get-production-orders-range";
import { useUpdateOrderItemDelivery } from "@/hooks/tanstack/order/use-update-order-item-delivery";
import { useGetOrder } from "@/hooks/tanstack/order/use-get-order";
import type { FlatProductionItem } from "@/lib/api/order/get-production-orders-range";
import { currencyFormatter, timeFormatter } from "@/lib/utils/formatter";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/loading-state";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Item, ItemGroup, ItemContent, ItemTitle, ItemDescription, ItemActions } from "@/components/ui/item";
import { PeriodFilter } from "@/components/ui/period-filter";
import { ToggleGroup } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer";

const dateRangeFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

const dayLabelFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "short",
});

type DashboardPeriod = "daily" | "weekly" | "monthly";
type DeliveryFilter = "all" | "pending" | "delivered";

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

function groupByDay(
  items: FlatProductionItem[],
  startDate: string,
  endDate: string,
): { date: Date; dateKey: string; items: FlatProductionItem[] }[] {
  const map = new Map<string, FlatProductionItem[]>();
  for (const item of items) {
    const d = new Date(item.deliveredAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }

  // Fill all days in the range
  const result: { date: Date; dateKey: string; items: FlatProductionItem[] }[] = [];
  const cursor = new Date(`${startDate}T00:00:00`);
  const rangeEnd = new Date(`${endDate}T00:00:00`);
  while (cursor < rangeEnd) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    result.push({ date: new Date(cursor), dateKey: key, items: map.get(key) ?? [] });
    cursor.setDate(cursor.getDate() + 1);
  }

  return result.sort(({ dateKey: a }, { dateKey: b }) => b.localeCompare(a));
}

export const Route = createFileRoute("/app/overview")({
  component: DashboardPage,
});

function DashboardPage() {
  const { organization } = Route.useRouteContext();
  const [period, setPeriod] = useState<DashboardPeriod>("daily");
  const [referenceDate, setReferenceDate] = useState<string>(currentDateInputValue);
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryFilter>("all");

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ["dashboard", organization.id, "daily", period, referenceDate],
    queryFn: async () =>
      getDailyDashboard({ organizationId: organization.id, period, referenceDate }),
    enabled: !!organization.id,
    refetchInterval: 60_000,
  });

  const { startDate, endDate } = getPeriodBounds(period, referenceDate);

  const singleDayQuery = useGetProductionOrders({
    organizationId: organization.id,
    productionDate: period === "daily" ? referenceDate : undefined,
  });

  const rangeQuery = useGetProductionOrdersRange({
    organizationId: organization.id,
    startDate,
    endDate,
    enabled: period !== "daily",
  });

  const productionIsLoading = period === "daily" ? singleDayQuery.isLoading : rangeQuery.isLoading;
  const productionIsError = period === "daily" ? singleDayQuery.isError : rangeQuery.isError;
  const productionError = period === "daily" ? singleDayQuery.error : rangeQuery.error;

  const singleDayItems: FlatProductionItem[] = useMemo(() => {
    if (period !== "daily") return [];
    const orders = singleDayQuery.data?.orders ?? [];
    return orders
      .flatMap((order) =>
        order.items.map((item) => ({
          ...item,
          order: {
            id: order.id,
            isPaid: order.isPaid,
            orderedAt: order.orderedAt,
            note: order.note,
            customer: order.customer,
          },
        }))
      )
      .sort((a, b) => new Date(a.deliveredAt).getTime() - new Date(b.deliveredAt).getTime());
  }, [period, singleDayQuery.data]);

  const rangeItems: FlatProductionItem[] = useMemo(
    () => (period !== "daily" ? (rangeQuery.data?.items ?? []) : []),
    [period, rangeQuery.data]
  );

  const allItems = period === "daily" ? singleDayItems : rangeItems;

  const filteredItems = useMemo(() => {
    if (deliveryFilter === "pending") return allItems.filter((i) => !i.isDelivered);
    if (deliveryFilter === "delivered") return allItems.filter((i) => i.isDelivered);
    return allItems;
  }, [allItems, deliveryFilter]);

  const filteredGroupedDays = useMemo(
    () => groupByDay(filteredItems, startDate, endDate),
    [filteredItems, startDate, endDate],
  );


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
                <CardDescription>Vendas</CardDescription>
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
                <CardDescription>Itens vendidos</CardDescription>
                <CardTitle className="text-xl">
                  {productionIsLoading ? "..." : String(allItems.filter((i) => i.isDelivered).reduce((sum, i) => sum + i.quantity, 0))}
                </CardTitle>
              </CardContent>
            </Card>
          </section>

          {/* Entregas */}
          <section>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="font-semibold">Itens vendidos</h2>
              <ToggleGroup value={deliveryFilter} onChange={setDeliveryFilter}>
                <ToggleGroup.Item value="all">Todas</ToggleGroup.Item>
                <ToggleGroup.Item value="pending" activeClassName="bg-amber-100 text-amber-800">A entregar</ToggleGroup.Item>
                <ToggleGroup.Item value="delivered" activeClassName="bg-green-100 text-green-800">Entregues</ToggleGroup.Item>
              </ToggleGroup>
            </div>

            {productionIsLoading ? <LoadingState label="Carregando entregas..." /> : null}

            {productionIsError ? (
              <p className="text-destructive text-sm">{productionError?.message}</p>
            ) : null}

            {!productionIsLoading && !productionIsError && filteredItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-6 text-sm opacity-60 text-center">
                Nenhuma entrega para este período.
              </div>
            ) : null}

            {/* Diário: lista simples */}
            {!productionIsLoading && !productionIsError && period === "daily" && filteredItems.length > 0 ? (
              <ItemGroup>
                {filteredItems.map((item) => (
                  <DeliveryItemRow key={item.id} item={item} organizationId={organization.id} />
                ))}
              </ItemGroup>
            ) : null}

            {/* Semanal / Mensal: agrupado por dia */}
            {!productionIsLoading && !productionIsError && period !== "daily" && filteredGroupedDays.length > 0 ? (
              <div className="space-y-4">
                {filteredGroupedDays.map(({ date, dateKey, items }) => (
                  <div key={dateKey}>
                    <p className="text-xs font-semibold opacity-50 uppercase tracking-wide mb-2">
                      {formatDayLabel(date)}
                    </p>
                    {items.length === 0 ? (
                      <p className="text-xs opacity-40 italic">Nenhuma entrega.</p>
                    ) : (
                      <ItemGroup>
                        {items.map((item) => (
                          <DeliveryItemRow key={item.id} item={item} organizationId={organization.id} />
                        ))}
                      </ItemGroup>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
          </section>

        </div>
      ) : null}
    </main>
  );
}


type DeliveryItemRowProps = {
  item: FlatProductionItem;
  organizationId: string;
};

const methodLabel: Record<string, string> = {
  PIX: "Pix",
  CASH: "Dinheiro",
  CREDIT_CARD: "Cartão de crédito",
  DEBIT_CARD: "Cartão de débito",
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

function DeliveryItemRow({ item, organizationId }: DeliveryItemRowProps) {
  const { order } = item;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [updateDate, setUpdateDate] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const { mutate, isPending } = useUpdateOrderItemDelivery({ organizationId });

  const orderQuery = useGetOrder({ organizationId, orderId: order.id });
  const orderDetail = drawerOpen ? orderQuery.data : undefined;

  function openConfirmModal() {
    setUpdateDate(false);
    setIsConfirmOpen(true);
    (document.activeElement as HTMLElement | null)?.blur();
  }

  function handleConfirmDelivery() {
    const now = new Date().toISOString();
    mutate(
      { orderItemId: item.id, isDelivered: true, deliveredAt: updateDate ? now : undefined },
      { onSuccess: () => setIsConfirmOpen(false) },
    );
  }

  function handleUndoDelivery() {
    mutate({ orderItemId: item.id, isDelivered: false });
    (document.activeElement as HTMLElement | null)?.blur();
  }

  return (
    <>
      {/* Row */}
      <Item variant="outline" className="cursor-pointer" onClick={() => setDrawerOpen(true)}>
        <ItemContent>
          <ItemTitle>
            <span className="text-primary shrink-0">{item.quantity}x</span>
            {item.description}
          </ItemTitle>
          <ItemDescription>
            {timeFormatter.format(new Date(item.deliveredAt))}
            {order.customer ? <> · {order.customer.name}</> : null}
            {item.note ? <> · {item.note}</> : null}
          </ItemDescription>
        </ItemContent>
        <ItemActions>
          <Badge className={item.isDelivered ? "bg-green-500/15 text-green-700 border-green-200" : ""} variant={item.isDelivered ? "default" : "outline"}>
            {item.isDelivered ? "Entregue" : "A entregar"}
          </Badge>
          <Badge className={order.isPaid ? "bg-blue-500/15 text-blue-700 border-blue-200" : "bg-amber-400/20 text-amber-700 border-amber-300"}>
            {order.isPaid ? "Pago" : "Pendente"}
          </Badge>
        </ItemActions>
      </Item>

      {/* Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} direction="right">
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="truncate">{item.description}</DrawerTitle>
            <DrawerDescription>
              {timeFormatter.format(new Date(item.deliveredAt))}
              {order.customer ? <> · {order.customer.name}</> : null}
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto px-4 py-2">
            {orderQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : orderQuery.isError ? (
              <p className="text-destructive text-sm">{orderQuery.error?.message}</p>
            ) : orderDetail ? (
              <div className="space-y-5">
                {/* Status badges */}
                <div className="flex gap-2">
                  <Badge className={item.isDelivered ? "bg-green-500/15 text-green-700 border-green-200" : ""} variant={item.isDelivered ? "default" : "outline"}>
                    {item.isDelivered ? "Entregue" : "A entregar"}
                  </Badge>
                  <Badge className={order.isPaid ? "bg-blue-500/15 text-blue-700 border-blue-200" : "bg-amber-400/20 text-amber-700 border-amber-300"}>
                    {order.isPaid ? "Pago" : "Pagamento pendente"}
                  </Badge>
                </div>

                {/* Cliente */}
                {orderDetail.customer ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Cliente</p>
                    <p className="font-medium">{orderDetail.customer.name}</p>
                    {orderDetail.customer.phone ? <p className="text-sm text-muted-foreground mt-0.5">{orderDetail.customer.phone}</p> : null}
                    {orderDetail.customer.address ? <p className="text-sm text-muted-foreground mt-0.5">{orderDetail.customer.address}</p> : null}
                    {orderDetail.customer.note ? <p className="text-sm text-muted-foreground italic mt-0.5">{orderDetail.customer.note}</p> : null}
                  </div>
                ) : null}

                {/* Itens do pedido */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Itens do pedido</p>
                  <p className="text-xs text-muted-foreground mb-2">Realizado em {dateFormatter.format(new Date(orderDetail.orderedAt))}</p>
                  {orderDetail.note ? <p className="text-sm text-muted-foreground italic mb-2">{orderDetail.note}</p> : null}
                  <div className="space-y-2">
                    {orderDetail.item.map((oi) => (
                      <div key={oi.id} className="flex items-start justify-between gap-3">
                        <p className="text-sm min-w-0">
                          <span className="font-semibold text-primary">{oi.quantity}x</span>{" "}{oi.description}
                          {oi.note ? <span className="block text-xs text-muted-foreground mt-0.5">{oi.note}</span> : null}
                        </p>
                        <p className="text-sm shrink-0 tabular-nums font-medium">{currencyFormatter.format(oi.total)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t space-y-1">
                    {orderDetail.shippingFee ? (
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>+ Frete</span><span>{currencyFormatter.format(orderDetail.shippingFee)}</span>
                      </div>
                    ) : null}
                    {orderDetail.discount ? (
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>− Desconto</span><span>{currencyFormatter.format(orderDetail.discount)}</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-muted-foreground">Total</span>
                      <span className="font-bold">{currencyFormatter.format(orderDetail.total)}</span>
                    </div>
                  </div>
                </div>

                {/* Transações */}
                {orderDetail.transactions.length > 0 ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Transações</p>
                    <div className="space-y-2">
                      {orderDetail.transactions.map((tx) => (
                        <div key={tx.id} className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm truncate">
                              {methodLabel[tx.method] ?? tx.method}
                              {tx.description ? <span className="text-muted-foreground"> · {tx.description}</span> : null}
                            </p>
                            <p className="text-xs text-muted-foreground">{dateFormatter.format(new Date(tx.madeAt))}</p>
                          </div>
                          <p className={`text-sm font-semibold shrink-0 tabular-nums ${tx.type === "entry" ? "text-success" : "text-destructive"}`}>
                            {tx.type === "entry" ? "+" : ""}{currencyFormatter.format(tx.amount)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <DrawerFooter>
            <DrawerClose asChild>
              <Link to="/app/order/$orderId" params={{ orderId: order.id }} className="flex-1 inline-flex items-center justify-center rounded-lg border border-border px-3 h-8 text-sm font-medium hover:bg-muted transition-colors">
                Ver pedido completo
              </Link>
            </DrawerClose>
            {item.isDelivered ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => { handleUndoDelivery(); setDrawerOpen(false); }} disabled={isPending}>
                Desfazer entrega
              </Button>
            ) : (
              <Button type="button" size="sm" className="bg-success text-white hover:bg-success/80" onClick={openConfirmModal} disabled={isPending}>
                Confirmar entrega
              </Button>
            )}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Confirm delivery dialog */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
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
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsConfirmOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="button" size="sm" className="bg-success text-white hover:bg-success/80" onClick={handleConfirmDelivery} disabled={isPending}>
              {isPending ? <span className="animate-spin size-3 rounded-full border-2 border-current border-t-transparent" /> : null}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
