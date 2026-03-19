import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useDeleteOrder } from "@/hooks/tanstack/order/use-delete-order";
import { useGetOrders } from "@/hooks/tanstack/order/use-get-orders";
import { useUpdateOrder } from "@/hooks/tanstack/order/use-update-order";
import { currencyFormatter, dateFormatter } from "@/lib/utils/formatter";

export const Route = createFileRoute("/app/orders")({
  component: OrdersPage,
});

function OrdersPage() {
  const { organization } = Route.useRouteContext();
  const { data: orders = [], isLoading, isError, error } = useGetOrders({
    organizationId: organization.id,
  });
  const { mutateAsync: updateOrder, isPending: isUpdatingOrder } = useUpdateOrder({
    organizationId: organization.id,
  });
  const { mutateAsync: deleteOrder, isPending: isDeletingOrder } = useDeleteOrder({
    organizationId: organization.id,
  });
  const [actionError, setActionError] = useState("");

  async function handleToggleCanceled(orderId: string, currentCanceled: boolean) {
    setActionError("");

    try {
      await updateOrder({
        id: orderId,
        organizationId: organization.id,
        isCanceled: !currentCanceled,
      });
    } catch (actionError) {
      setActionError(actionError instanceof Error ? actionError.message : "Nao foi possivel atualizar o pedido.");
    }
  }

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
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Pedidos</h1>
        <Link to="/app/order/form" className="btn btn-primary">
          Novo pedido
        </Link>
      </div>

      {actionError ? (
        <div className="alert alert-error mb-4">
          <span>{actionError}</span>
        </div>
      ) : null}

      <div className="card border border-base-300 bg-base-100 shadow-sm">
        <div className="card-body">
          {isLoading ? <p>Carregando pedidos...</p> : null}
          {isError ? <p className="text-error">{error.message}</p> : null}

          {!isLoading && !isError && orders.length === 0 ? (
            <p className="opacity-70">Nenhum pedido encontrado.</p>
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
                    <th>Total transacoes</th>
                    <th>Saldo</th>
                    <th>Status</th>
                    <th>Pagamento</th>
                    <th>Observacao</th>
                    <th className="text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td className="font-mono text-xs">{order.id.slice(0, 8)}</td>
                      <td>{order.customer?.name ?? "Sem cliente"}</td>
                      <td>{dateFormatter.format(new Date(order.orderedAt))}</td>
                      <td>{order.item.length}</td>
                      <td>{currencyFormatter.format(order.itemTotal)}</td>
                      <td>{currencyFormatter.format(order.transactionTotal)}</td>
                      <td>{currencyFormatter.format(order.balance)}</td>
                      <td>
                        <span className={`badge ${order.isCanceled ? "badge-error" : "badge-success"}`}>
                          {order.isCanceled ? "Cancelado" : "Ativo"}
                        </span>
                      </td>
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
                                  onClick={() => handleToggleCanceled(order.id, order.isCanceled)}
                                >
                                  {order.isCanceled ? "Reativar pedido" : "Cancelar pedido"}
                                </button>
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
      </div>
    </main>
  );
}
