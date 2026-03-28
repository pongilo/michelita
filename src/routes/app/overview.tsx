import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { getDailyDashboard } from "@/lib/api/dashboard/get-daily-dashboard";
import { useGetProductionOrders } from "@/hooks/tanstack/order/use-get-production-orders";
import { useGetProductionOrdersRange } from "@/hooks/tanstack/order/use-get-production-orders-range";
import { useUpdateOrderItemDelivery } from "@/hooks/tanstack/order/use-update-order-item-delivery";
import { useGetOrder } from "@/hooks/tanstack/order/use-get-order";
import type { FlatProductionItem } from "@/lib/api/order/get-production-orders-range";
import { currencyFormatter, timeFormatter } from "@/lib/utils/formatter";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/loading-state";
import { MetricCard } from "@/components/ui/metric-card";
import { PeriodFilter } from "@/components/ui/period-filter";
import { ToggleGroup } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";

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
      {isError ? <p className="text-error text-sm">{error.message}</p> : null}

      {data ? (
        <div className="space-y-6">
          {/* Métricas financeiras */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MetricCard>
              <MetricCard.Label>Entradas</MetricCard.Label>
              <MetricCard.Value className="text-success">{currencyFormatter.format(data.metrics.entry)}</MetricCard.Value>
            </MetricCard>
            <MetricCard>
              <MetricCard.Label>Saídas</MetricCard.Label>
              <MetricCard.Value className="text-error">{currencyFormatter.format(data.metrics.exit)}</MetricCard.Value>
            </MetricCard>
            <MetricCard>
              <MetricCard.Label>Saldo</MetricCard.Label>
              <MetricCard.Value className={data.metrics.balance >= 0 ? "text-success" : "text-error"}>
                {currencyFormatter.format(data.metrics.balance)}
              </MetricCard.Value>
            </MetricCard>
          </section>

          {/* Métricas de pedidos */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard>
              <MetricCard.Label>Vendas</MetricCard.Label>
              <MetricCard.Value>{currencyFormatter.format(data.metrics.grossRevenue)}</MetricCard.Value>
            </MetricCard>
            <MetricCard>
              <MetricCard.Label>Pedidos</MetricCard.Label>
              <MetricCard.Value>{String(data.metrics.totalOrders)}</MetricCard.Value>
            </MetricCard>
            <MetricCard>
              <MetricCard.Label>Ticket médio</MetricCard.Label>
              <MetricCard.Value>{currencyFormatter.format(data.metrics.averageTicket)}</MetricCard.Value>
            </MetricCard>
            <MetricCard>
              <MetricCard.Label>Itens vendidos</MetricCard.Label>
              <MetricCard.Value>
                {productionIsLoading ? "..." : String(allItems.filter((i) => i.isDelivered).reduce((sum, i) => sum + i.quantity, 0))}
              </MetricCard.Value>
            </MetricCard>
          </section>

          {/* Entregas */}
          <section>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="font-semibold">Itens vendidos</h2>
              <ToggleGroup value={deliveryFilter} onChange={setDeliveryFilter}>
                <ToggleGroup.Item value="all">Todas</ToggleGroup.Item>
                <ToggleGroup.Item value="pending" activeVariant="btn-warning">A entregar</ToggleGroup.Item>
                <ToggleGroup.Item value="delivered" activeVariant="btn-success">Entregues</ToggleGroup.Item>
              </ToggleGroup>
            </div>

            {productionIsLoading ? <LoadingState label="Carregando entregas..." /> : null}

            {productionIsError ? (
              <p className="text-error text-sm">{productionError?.message}</p>
            ) : null}

            {!productionIsLoading && !productionIsError && filteredItems.length === 0 ? (
              <div className="rounded-box border border-dashed border-base-300 bg-base-100 px-4 py-6 text-sm opacity-60 text-center">
                Nenhuma entrega para este período.
              </div>
            ) : null}

            {/* Diário: lista simples */}
            {!productionIsLoading && !productionIsError && period === "daily" && filteredItems.length > 0 ? (
              <div className="flex flex-col divide-y divide-base-300 rounded-box overflow-hidden border border-base-300">
                {filteredItems.map((item) => (
                  <DeliveryItemRow key={item.id} item={item} organizationId={organization.id} />
                ))}
              </div>
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
                      <div className="flex flex-col divide-y divide-base-300 rounded-box overflow-hidden border border-base-300">
                        {items.map((item) => (
                          <DeliveryItemRow key={item.id} item={item} organizationId={organization.id} />
                        ))}
                      </div>
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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { mutate, isPending } = useUpdateOrderItemDelivery({ organizationId });

  const orderQuery = useGetOrder({ organizationId, orderId: order.id });
  const orderDetail = drawerOpen ? orderQuery.data : undefined;

  function openConfirmModal() {
    setUpdateDate(false);
    dialogRef.current?.showModal();
    (document.activeElement as HTMLElement | null)?.blur();
  }

  function handleConfirmDelivery() {
    const now = new Date().toISOString();
    mutate(
      { orderItemId: item.id, isDelivered: true, deliveredAt: updateDate ? now : undefined },
      { onSuccess: () => dialogRef.current?.close() },
    );
  }

  function handleUndoDelivery() {
    mutate({ orderItemId: item.id, isDelivered: false });
    (document.activeElement as HTMLElement | null)?.blur();
  }

  return (
    <>
      {/* Row */}
      <div className="flex items-center bg-base-100 hover:bg-base-200/50 transition-colors">
        <Button
          variant="ghost"
          className="flex flex-1 min-w-0 h-auto items-center gap-3 px-4 py-3 text-left rounded-none justify-start"
          onClick={() => setDrawerOpen(true)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-primary text-sm shrink-0">{item.quantity}x</span>
              <p className="font-medium text-sm leading-snug truncate">{item.description}</p>
            </div>
            <p className="text-xs opacity-50 mt-0.5 truncate">
              {timeFormatter.format(new Date(item.deliveredAt))}
              {order.customer ? <> · {order.customer.name}</> : null}
              {item.note ? <> · {item.note}</> : null}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`badge badge-sm ${item.isDelivered ? "badge-success" : "badge-ghost"}`}>
              {item.isDelivered ? "Entregue" : "A entregar"}
            </span>
            <span className={`badge badge-sm ${order.isPaid ? "badge-info" : "badge-warning"}`}>
              {order.isPaid ? "Pago" : "Pendente"}
            </span>
          </div>
        </Button>
      </div>

      {/* Drawer */}
      {drawerOpen ? (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Panel */}
          <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-base-100 shadow-2xl">
            {/* Drawer header */}
            <div className="flex items-center justify-between border-b border-base-200 px-5 py-4">
              <div className="min-w-0">
                <h2 className="font-semibold truncate">{item.description}</h2>
                <p className="text-xs opacity-50 mt-0.5">
                  {timeFormatter.format(new Date(item.deliveredAt))}
                  {order.customer ? <> · {order.customer.name}</> : null}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0 ml-2"
                onClick={() => setDrawerOpen(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </Button>
            </div>

            {/* Drawer body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {orderQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm opacity-50">
                  <span className="loading loading-spinner loading-sm" />
                  Carregando...
                </div>
              ) : orderQuery.isError ? (
                <p className="text-error text-sm">{orderQuery.error?.message}</p>
              ) : orderDetail ? (
                <div className="space-y-5">
                  {/* Status badges */}
                  <div className="flex gap-2">
                    <span className={`badge ${item.isDelivered ? "badge-success" : "badge-ghost"}`}>
                      {item.isDelivered ? "Entregue" : "A entregar"}
                    </span>
                    <span className={`badge ${order.isPaid ? "badge-info" : "badge-warning"}`}>
                      {order.isPaid ? "Pago" : "Pagamento pendente"}
                    </span>
                  </div>

                  {/* Cliente */}
                  {orderDetail.customer ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide opacity-40 mb-2">Cliente</p>
                      <p className="font-medium">{orderDetail.customer.name}</p>
                      {orderDetail.customer.phone ? (
                        <p className="text-sm opacity-60 mt-0.5">{orderDetail.customer.phone}</p>
                      ) : null}
                      {orderDetail.customer.address ? (
                        <p className="text-sm opacity-60 mt-0.5">{orderDetail.customer.address}</p>
                      ) : null}
                      {orderDetail.customer.note ? (
                        <p className="text-sm opacity-60 italic mt-0.5">{orderDetail.customer.note}</p>
                      ) : null}
                    </div>
                  ) : null}

                  {/* Itens do pedido */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide opacity-40 mb-2">Itens do pedido</p>
                    <p className="text-xs opacity-50 mb-2">
                      Realizado em {dateFormatter.format(new Date(orderDetail.orderedAt))}
                    </p>
                    {orderDetail.note ? (
                      <p className="text-sm opacity-60 italic mb-2">{orderDetail.note}</p>
                    ) : null}
                    <div className="space-y-2">
                      {orderDetail.item.map((oi) => (
                        <div key={oi.id} className="flex items-start justify-between gap-3">
                          <p className="text-sm min-w-0">
                            <span className="font-semibold text-primary">{oi.quantity}x</span>{" "}
                            {oi.description}
                            {oi.note ? <span className="block text-xs opacity-50 mt-0.5">{oi.note}</span> : null}
                          </p>
                          <p className="text-sm shrink-0 tabular-nums font-medium">{currencyFormatter.format(oi.total)}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-base-200 space-y-1">
                      {orderDetail.shippingFee ? (
                        <div className="flex justify-between items-center text-xs opacity-50">
                          <span>+ Frete</span>
                          <span>{currencyFormatter.format(orderDetail.shippingFee)}</span>
                        </div>
                      ) : null}
                      {orderDetail.discount ? (
                        <div className="flex justify-between items-center text-xs opacity-50">
                          <span>− Desconto</span>
                          <span>{currencyFormatter.format(orderDetail.discount)}</span>
                        </div>
                      ) : null}
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold opacity-50">Total</span>
                        <span className="font-bold">{currencyFormatter.format(orderDetail.total)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Transações */}
                  {orderDetail.transactions.length > 0 ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide opacity-40 mb-2">Transações</p>
                      <div className="space-y-2">
                        {orderDetail.transactions.map((tx) => (
                          <div key={tx.id} className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm truncate">
                                {methodLabel[tx.method] ?? tx.method}
                                {tx.description ? <span className="opacity-60"> · {tx.description}</span> : null}
                              </p>
                              <p className="text-xs opacity-50">{dateFormatter.format(new Date(tx.madeAt))}</p>
                            </div>
                            <p className={`text-sm font-semibold shrink-0 tabular-nums ${tx.type === "entry" ? "text-success" : "text-error"}`}>
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

            {/* Drawer footer */}
            <div className="border-t border-base-200 px-5 py-3 flex gap-2">
              <Link
                to="/app/order/$orderId"
                params={{ orderId: order.id }}
                className="btn btn-outline btn-sm flex-1"
                onClick={() => setDrawerOpen(false)}
              >
                Ver pedido completo
              </Link>
              {item.isDelivered ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { handleUndoDelivery(); setDrawerOpen(false); }}
                  disabled={isPending}
                >
                  Desfazer entrega
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  className="bg-success text-white hover:bg-success/80"
                  onClick={openConfirmModal}
                  disabled={isPending}
                >
                  Confirmar entrega
                </Button>
              )}
            </div>
          </div>
        </>
      ) : null}

      {/* Confirm delivery dialog */}
      <dialog ref={dialogRef} className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-1">Confirmar entrega</h3>
          <p className="text-sm opacity-70 mb-4">
            Tem certeza que deseja marcar <span className="font-medium opacity-100">{item.description}</span> como entregue?
          </p>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={updateDate}
              onChange={(e) => setUpdateDate(e.target.checked)}
            />
            <span className="text-sm">Atualizar data de entrega para agora</span>
          </label>
          <div className="modal-action mt-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => dialogRef.current?.close()}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-success text-white hover:bg-success/80"
              onClick={handleConfirmDelivery}
              disabled={isPending}
            >
              {isPending ? <span className="loading loading-spinner loading-xs" /> : null}
              Confirmar
            </Button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <Button type="submit">fechar</Button>
        </form>
      </dialog>
    </>
  );
}
