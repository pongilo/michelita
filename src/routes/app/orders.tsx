import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useDeleteOrder } from "@/hooks/tanstack/order/use-delete-order";
import { useGetOrders } from "@/hooks/tanstack/order/use-get-orders";
import { useUpdateOrder } from "@/hooks/tanstack/order/use-update-order";
import { currencyFormatter, dateFormatter } from "@/lib/utils/formatter";

const dateRangeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
});

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
  const { start, end } = getOrdersPeriodBounds(period, parseOrdersReferenceDate(referenceDate));
  const rangeEnd = new Date(end.getTime() - 1);
  const periodLabel = period === "daily" ? "Diario" : period === "weekly" ? "Semanal" : "Mensal";

  const { data: orders = [], isLoading, isError, error, isFetching, refetch } = useGetOrders({
    organizationId: organization.id,
    period,
    referenceDate,
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
          <button type="button" className="btn btn-outline btn-sm" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? "Atualizando..." : "Atualizar"}
          </button>
          <Link to="/app/order/form" className="btn btn-primary btn-sm">
            Novo pedido
          </Link>
        </div>
      </div>

      {actionError ? (
        <div className="alert alert-error mb-4">
          <span>{actionError}</span>
        </div>
      ) : null}

      <div className="card border border-base-300 bg-base-100 shadow-sm">
          {isLoading ? <p>Carregando pedidos...</p> : null}
          {isError ? <p className="text-error">{error.message}</p> : null}

          {!isLoading && !isError && orders.length === 0 ? (
            <p className="opacity-70">Nenhum pedido encontrado no periodo.</p>
          ) : null}

          {!isLoading && !isError && orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Cliente</th>
                    <th>Data</th>
                    <th>Itens</th>
                    <th>Total itens</th>
                    <th>Pagamento</th>
                    <th>Observacao</th>
                    <th className="text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td className="font-mono text-xs">
                        <Link to="/app/order/$orderId" params={{ orderId: order.id }} className="link">
                          {order.id.slice(0, 8)}
                        </Link>
                      </td>
                      <td>
                        {order.customer?.name ? (
                          <Link to="/app/customers/$customerId" params={{ customerId: order.customer.id }} className="link">
                            {order.customer.name}
                          </Link>
                        ) : "Sem cliente"}
                      </td>
                      <td>{dateFormatter.format(new Date(order.orderedAt))}</td>
                      <td>{order.item.length}</td>
                      <td>{currencyFormatter.format(order.itemTotal)}</td>
                      <td>
                        <span className={`badge ${order.isPaid ? "badge-info" : "badge-warning"}`}>
                          {order.isPaid ? "Pago" : "Pendente"}
                        </span>
                      </td>
                      <td className="max-w-44 truncate" title={order.note ?? ""}>
                        {order.note ?? "-"}
                      </td>
                      <td>
                        <div className="flex justify-end">
                          <div className="dropdown dropdown-end">
                            <label tabIndex={0} className="btn btn-xs btn-outline">
                              Acoes
                            </label>
                            <ul
                              tabIndex={0}
                              className="menu dropdown-content z-[1] mt-1 w-52 rounded-box border border-base-300 bg-base-100 p-2 shadow"
                            >
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
      </div>
    </main>
  );
}
