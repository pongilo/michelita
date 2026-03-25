import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { getDailyDashboard } from "@/lib/api/dashboard/get-daily-dashboard";
import { useGetProductionOrders } from "@/hooks/tanstack/order/use-get-production-orders";
import { useGetProductionOrdersRange } from "@/hooks/tanstack/order/use-get-production-orders-range";
import { useUpdateOrderItemDelivery } from "@/hooks/tanstack/order/use-update-order-item-delivery";
import type { FlatProductionItem } from "@/lib/api/order/get-production-orders-range";
import { currencyFormatter, timeFormatter } from "@/lib/utils/formatter";

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
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Visão geral</h1>
          {period === "daily" ? (
            <p className="text-xs opacity-60 mt-0.5">{formatDayLabel(new Date(`${referenceDate}T00:00:00`))}</p>
          ) : (
            <p className="text-xs opacity-60 mt-0.5">
              {dateRangeFormatter.format(new Date(`${startDate}T00:00:00`))} —{" "}
              {dateRangeFormatter.format(new Date(new Date(`${endDate}T00:00:00`).getTime() - 1))}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="space-y-1">
            <span className="label text-xs">Período</span>
            <select
              className="select select-bordered select-sm"
              value={period}
              onChange={(e) => setPeriod(e.target.value as DashboardPeriod)}
            >
              <option value="daily">Diário</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensal</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="label text-xs">Data de referência</span>
            <input
              type="date"
              className="input input-bordered input-sm"
              value={referenceDate}
              onChange={(e) => setReferenceDate(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? <span className="loading loading-spinner loading-xs" /> : null}
            {isFetching ? "Atualizando..." : "Atualizar"}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm opacity-60">
          <span className="loading loading-spinner loading-sm" />
          Carregando dados...
        </div>
      ) : null}
      {isError ? <p className="text-error text-sm">{error.message}</p> : null}

      {data ? (
        <div className="space-y-6">

          {/* Métricas financeiras */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard
              label="Vendas"
              value={currencyFormatter.format(data.metrics.grossRevenue)}
            />
            <MetricCard
              label="Entradas"
              value={currencyFormatter.format(data.metrics.entry)}
              valueClassName="text-success"
            />
            <MetricCard
              label="Saídas"
              value={currencyFormatter.format(data.metrics.exit)}
              valueClassName="text-error"
            />
            <MetricCard
              label="Saldo"
              value={currencyFormatter.format(data.metrics.balance)}
              valueClassName={data.metrics.balance >= 0 ? "text-success" : "text-error"}
            />
          </section>

          {/* Métricas de pedidos */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard label="Pedidos" value={String(data.metrics.totalOrders)} />
            <MetricCard
              label="Pendentes"
              value={String(data.metrics.pendingOrders)}
              valueClassName={data.metrics.pendingOrders > 0 ? "text-warning" : undefined}
            />
            <MetricCard
              label="Ticket médio"
              value={currencyFormatter.format(data.metrics.averageTicket)}
            />
            <MetricCard
              label="Entregas"
              value={productionIsLoading ? "..." : String(allItems.length)}
            />
          </section>

          {/* Entregas */}
          <section>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="font-semibold">Entregas</h2>
              <div className="join">
                <button
                  type="button"
                  className={`join-item btn btn-xs ${deliveryFilter === "all" ? "btn-primary" : "btn-ghost border border-base-300"}`}
                  onClick={() => setDeliveryFilter("all")}
                >
                  Todas
                </button>
                <button
                  type="button"
                  className={`join-item btn btn-xs ${deliveryFilter === "pending" ? "btn-warning" : "btn-ghost border border-base-300"}`}
                  onClick={() => setDeliveryFilter("pending")}
                >
                  A entregar
                </button>
                <button
                  type="button"
                  className={`join-item btn btn-xs ${deliveryFilter === "delivered" ? "btn-success" : "btn-ghost border border-base-300"}`}
                  onClick={() => setDeliveryFilter("delivered")}
                >
                  Entregues
                </button>
              </div>
            </div>

            {productionIsLoading ? (
              <div className="flex items-center gap-2 text-sm opacity-60">
                <span className="loading loading-spinner loading-sm" />
                Carregando entregas...
              </div>
            ) : null}

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

type MetricCardProps = {
  label: string;
  value: string;
  valueClassName?: string;
};

function MetricCard({ label, value, valueClassName }: MetricCardProps) {
  return (
    <div className="rounded-box border border-base-300 bg-base-100 px-4 py-4">
      <p className="text-xs opacity-60 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-xl font-bold ${valueClassName ?? ""}`}>{value}</p>
    </div>
  );
}

type DeliveryItemRowProps = {
  item: FlatProductionItem;
  organizationId: string;
};

function DeliveryItemRow({ item, organizationId }: DeliveryItemRowProps) {
  const { order } = item;
  const [updateDate, setUpdateDate] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { mutate, isPending } = useUpdateOrderItemDelivery({ organizationId });

  function openConfirmModal() {
    setUpdateDate(false);
    dialogRef.current?.showModal();
    // close dropdown
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
    <div className="flex items-center bg-base-100 hover:bg-base-200/50 transition-colors">
      <Link
        to="/app/order/$orderId"
        params={{ orderId: order.id }}
        className="flex flex-1 min-w-0 items-center gap-3 px-4 py-3"
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
      </Link>

      <div className="dropdown dropdown-end pr-2">
        <div tabIndex={0} role="button" className="btn btn-ghost btn-xs btn-circle">
          <svg xmlns="http://www.w3.org/2000/svg" className="size-4" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="19" r="1.5" />
          </svg>
        </div>
        <ul tabIndex={0} className="dropdown-content z-10 menu menu-sm p-1.5 shadow bg-base-100 rounded-box border border-base-200 w-44">
          {item.isDelivered ? (
            <li>
              <button type="button" onClick={handleUndoDelivery} disabled={isPending}>
                Desfazer entrega
              </button>
            </li>
          ) : (
            <li>
              <button type="button" onClick={openConfirmModal} disabled={isPending}>
                Confirmar entrega
              </button>
            </li>
          )}
        </ul>
      </div>

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
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => dialogRef.current?.close()}
              disabled={isPending}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-success btn-sm"
              onClick={handleConfirmDelivery}
              disabled={isPending}
            >
              {isPending ? <span className="loading loading-spinner loading-xs" /> : null}
              Confirmar
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button type="submit">fechar</button>
        </form>
      </dialog>
    </div>
  );
}
