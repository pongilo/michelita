import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useGetDailyOrders } from "@/hooks/tanstack/order/use-get-daily-orders";
import { currencyFormatter, dateFormatter } from "@/lib/utils/formatter";

function currentDateInputValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export const Route = createFileRoute("/app/encomendas-do-dia")({
  component: DailyOrdersPage,
});

function DailyOrdersPage() {
  const { organization } = Route.useRouteContext();
  const [referenceDate, setReferenceDate] = useState<string>(currentDateInputValue);
  const { data, isLoading, isError, error, refetch, isFetching } = useGetDailyOrders({
    organizationId: organization.id,
    referenceDate,
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Entregas</h1>
          {data ? <p className="text-sm opacity-70">{new Date(data.referenceDate).toLocaleDateString("pt-BR")}</p> : null}
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <label className="space-y-1">
            <span className="label text-xs">Data</span>
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
        </div>
      </div>

      {isLoading ? <p>Carregando entregas...</p> : null}
      {isError ? <p className="text-error">{error.message}</p> : null}

      {data ? (
        <div className="space-y-4">
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Pedidos do dia" value={String(data.metrics.totalOrders)} />
            <MetricCard title="Itens do dia" value={String(data.metrics.totalItems)} />
            <MetricCard title="Valor das entregas" value={currencyFormatter.format(data.metrics.totalAmount)} />
            <MetricCard title="Valor aberto" value={currencyFormatter.format(data.metrics.openAmount)} />
          </section>

          <section className="card border border-base-300 bg-base-100 shadow-sm">
            <div className="card-body">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="card-title text-base">Pedidos com entrega no dia</h2>
                <Link to="/app/orders" className="btn btn-xs btn-outline">
                  Ver pedidos
                </Link>
              </div>

              {data.orders.length === 0 ? (
                <p className="text-sm opacity-70">Nenhuma entrega para esta data.</p>
              ) : (
                <div className="space-y-3">
                  {data.orders.map((order) => (
                    <div key={order.id} className="rounded-box border border-base-300 p-3">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-mono text-xs">{order.id}</p>
                          <p className="text-sm">
                            Cliente:{" "}
                            {order.customer ? (
                              <Link to="/app/customers/$customerId" params={{ customerId: order.customer.id }} className="link">
                                {order.customer.name}
                              </Link>
                            ) : (
                              "Sem cliente"
                            )}
                          </p>
                          <p className="text-xs opacity-70">Pedido: {dateFormatter.format(new Date(order.orderedAt))}</p>
                          <p className="text-xs opacity-70">Observacao: {order.note ?? "-"}</p>
                        </div>
                        <div className="text-right text-sm">
                          <p>Total do dia: {currencyFormatter.format(order.itemsTotal)}</p>
                          <span className={`badge ${order.isPaid ? "badge-info" : "badge-warning"}`}>
                            {order.isPaid ? "Pago" : "Pendente"}
                          </span>
                          <div className="mt-2">
                            <Link
                              to="/app/order/$orderId"
                              params={{ orderId: order.id }}
                              className="btn btn-xs btn-outline"
                            >
                              Ver pedido
                            </Link>
                          </div>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="table table-zebra">
                          <thead>
                            <tr>
                              <th>Item</th>
                              <th>Qtd.</th>
                              <th>Entrega</th>
                              <th>Total</th>
                              <th>Observacao</th>
                            </tr>
                          </thead>
                          <tbody>
                            {order.items.map((item) => (
                              <tr key={item.id}>
                                <td>{item.description}</td>
                                <td>{item.quantity}</td>
                                <td>{dateFormatter.format(new Date(item.deliveredAt))}</td>
                                <td>{currencyFormatter.format(item.total)}</td>
                                <td>{item.note ?? "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

type MetricCardProps = {
  title: string;
  value: string;
};

function MetricCard({ title, value }: MetricCardProps) {
  return (
    <div className="card border border-base-300 bg-base-100 shadow-sm">
      <div className="card-body gap-1 p-4">
        <p className="text-sm opacity-70">{title}</p>
        <p className="text-2xl font-semibold">{value}</p>
      </div>
    </div>
  );
}
