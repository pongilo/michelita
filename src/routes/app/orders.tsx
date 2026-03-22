import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useDeleteOrder } from "@/hooks/tanstack/order/use-delete-order";
import { useGetOrders } from "@/hooks/tanstack/order/use-get-orders";
import { useUpdateOrder } from "@/hooks/tanstack/order/use-update-order";
import { currencyFormatter, dateFormatter } from "@/lib/utils/formatter";

const dateRangeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
});

const timeFormatter = new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" });
const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

function formatDelivery(deliveredAt: Date | string | null, orderedAt: Date | string) {
  if (!deliveredAt) return null;
  const d = new Date(deliveredAt);
  const o = new Date(orderedAt);
  if (d.getTime() === o.getTime()) return null;
  const sameDay =
    d.getFullYear() === o.getFullYear() &&
    d.getMonth() === o.getMonth() &&
    d.getDate() === o.getDate();
  return sameDay
    ? timeFormatter.format(d)
    : `${shortDateFormatter.format(d)} ${timeFormatter.format(d)}`;
}

type OrdersPeriod = "daily" | "weekly" | "monthly";

function currentDateInputValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function parseOrdersReferenceDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function getOrdersPeriodBounds(period: OrdersPeriod, baseDate: Date) {
  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);

  if (period === "daily") {
    end.setDate(end.getDate() + 1);
    return {
      start,
      end,
    };
  }

  if (period === "weekly") {
    const weekDay = start.getDay();
    const diffToMonday = (weekDay + 6) % 7;
    start.setDate(start.getDate() - diffToMonday);

    end.setTime(start.getTime());
    end.setDate(end.getDate() + 7);

    return {
      start,
      end,
    };
  }

  start.setDate(1);
  end.setTime(start.getTime());
  end.setMonth(end.getMonth() + 1);

  return {
    start,
    end,
  };
}

export const Route = createFileRoute("/app/orders")({
  component: OrdersPage,
});

function OrdersPage() {
  const { organization } = Route.useRouteContext();
  const [period, setPeriod] = useState<OrdersPeriod>("daily");
  const [referenceDate, setReferenceDate] = useState<string>(currentDateInputValue);
  const [paymentFilter, setPaymentFilter] = useState<"all" | "paid" | "pending">("all");
  const { start, end } = getOrdersPeriodBounds(period, parseOrdersReferenceDate(referenceDate));
  const rangeEnd = new Date(end.getTime() - 1);
  const periodLabel = period === "daily" ? "Diario" : period === "weekly" ? "Semanal" : "Mensal";

  const isPaidFilter = paymentFilter === "all" ? undefined : paymentFilter === "paid";
  const { data: orders = [], isLoading, isError, error, isFetching, refetch } = useGetOrders({
    organizationId: organization.id,
    period,
    referenceDate,
    isPaid: isPaidFilter,
  });
  const { mutateAsync: updateOrder, isPending: isUpdatingOrder } = useUpdateOrder({
    organizationId: organization.id,
  });
  const { mutateAsync: deleteOrder, isPending: isDeletingOrder } = useDeleteOrder({
    organizationId: organization.id,
  });
  const [actionError, setActionError] = useState("");

  async function handleTogglePaid(orderId: string, currentPaid: boolean) {
    setActionError("");

    try {
      await updateOrder({
        id: orderId,
        organizationId: organization.id,
        isPaid: !currentPaid,
      });
    } catch (actionError) {
      setActionError(actionError instanceof Error ? actionError.message : "Nao foi possivel atualizar o pagamento.");
    }
  }

  async function handleDeleteOrder(orderId: string) {
    setActionError("");

    const confirmed = window.confirm("Deseja realmente excluir este pedido? Esta acao nao pode ser desfeita.");
    if (!confirmed) {
      return;
    }

    try {
      await deleteOrder({
        id: orderId,
        organizationId: organization.id,
      });
    } catch (actionError) {
      setActionError(actionError instanceof Error ? actionError.message : "Nao foi possivel excluir o pedido.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Pedidos</h1>
          <p className="text-sm opacity-70">
            {periodLabel}: {dateRangeFormatter.format(start)} ate {dateRangeFormatter.format(rangeEnd)}
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <label className="space-y-1">
            <span className="label text-xs">Periodo</span>
            <select
              className="select select-bordered select-sm"
              value={period}
              onChange={(event) => setPeriod(event.target.value as OrdersPeriod)}
            >
              <option value="daily">Diario</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensal</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="label text-xs">Data de referencia</span>
            <input
              type="date"
              className="input input-bordered input-sm"
              value={referenceDate}
              onChange={(event) => setReferenceDate(event.target.value)}
            />
          </label>
          <label className="space-y-1">
            <span className="label text-xs">Pagamento</span>
            <select
              className="select select-bordered select-sm"
              value={paymentFilter}
              onChange={(event) => setPaymentFilter(event.target.value as "all" | "paid" | "pending")}
            >
              <option value="all">Todos</option>
              <option value="paid">Pagos</option>
              <option value="pending">Pendentes</option>
            </select>
          </label>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? "Atualizando..." : "Atualizar"}
          </button>
        </div>
      </div>

      {actionError ? (
        <div className="alert alert-error mb-4">
          <span>{actionError}</span>
        </div>
      ) : null}

      {isLoading ? <p>Carregando pedidos...</p> : null}
      {isError ? <p className="text-error">{error.message}</p> : null}

      {!isLoading && !isError && orders.length === 0 ? (
        <p className="text-sm opacity-70">Nenhum pedido encontrado no periodo.</p>
      ) : null}

      {!isLoading && !isError && orders.length > 0 ? (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="card border border-base-300 bg-base-100 shadow-sm"
            >
              <div className="card-body gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link to="/app/order/$orderId" params={{ orderId: order.id }} className="min-w-0">
                    {order.customer?.name ? (
                      <p className="font-semibold leading-tight">{order.customer.name}</p>
                    ) : (
                      <p className="text-sm opacity-40">Sem cliente</p>
                    )}
                    <p className="mt-0.5 text-xs opacity-50">{dateFormatter.format(new Date(order.orderedAt))}</p>
                  </Link>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`badge badge-sm ${order.isPaid ? "badge-info" : "badge-warning"}`}>
                      {order.isPaid ? "Pago" : "Pendente"}
                    </span>
                    <div className="dropdown dropdown-end">
                      <label tabIndex={0} className="btn btn-xs btn-outline">
                        Ações
                      </label>
                      <ul
                        tabIndex={0}
                        className="menu dropdown-content z-1 mt-1 w-52 rounded-box border border-base-300 bg-base-100 p-2 shadow"
                      >
                        <li>
                          <Link to="/app/order/$orderId" params={{ orderId: order.id }}>
                            Ver pedido
                          </Link>
                        </li>
                        <li>
                          <Link to="/app/order/edit/$orderId" params={{ orderId: order.id }}>
                            Editar pedido
                          </Link>
                        </li>
                        <li>
                          <button
                            type="button"
                            disabled={isUpdatingOrder || isDeletingOrder}
                            onClick={() => handleTogglePaid(order.id, order.isPaid)}
                          >
                            {order.isPaid ? "Marcar pendente" : "Marcar pago"}
                          </button>
                        </li>
                        <li>
                          <button
                            type="button"
                            className="text-error"
                            disabled={isUpdatingOrder || isDeletingOrder}
                            onClick={() => handleDeleteOrder(order.id)}
                          >
                            Excluir pedido
                          </button>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <ul className="space-y-2">
                  {order.item.map((item) => (
                    <li key={item.id} className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-sm">
                          <span className="font-bold text-primary">{item.quantity}x</span>{" "}
                          {item.description}
                          {formatDelivery(item.deliveredAt, order.orderedAt) && (
                            <span className="ml-1.5 text-xs opacity-50">
                              · {formatDelivery(item.deliveredAt, order.orderedAt)}
                            </span>
                          )}
                        </span>
                        {item.note && (
                          <p className="mt-0.5 text-xs opacity-50">{item.note}</p>
                        )}
                      </div>
                      <span className="mt-0.5 shrink-0 text-xs opacity-60">{currencyFormatter.format(item.total)}</span>
                    </li>
                  ))}
                </ul>

                <div className="flex items-center justify-between gap-2 border-t border-base-300 pt-2">
                  {order.note
                    ? <p className="text-xs italic opacity-50">{order.note}</p>
                    : <span />
                  }
                  <span className="text-sm font-bold">{currencyFormatter.format(order.itemTotal)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </main>
  );
}
