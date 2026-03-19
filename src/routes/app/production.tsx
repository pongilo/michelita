import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useGetDailyOrders } from "@/hooks/tanstack/order/use-get-daily-orders";
import { dateFormatter } from "@/lib/utils/formatter";

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeStyle: "short",
});

function currentDateInputValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export const Route = createFileRoute("/app/production")({
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
          <h1 className="text-2xl font-semibold">Produção</h1>
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

      {data ? data?.orders.length === 0 ? (
        <p className="text-sm opacity-70">Nenhuma entrega para esta data.</p>
      ) : (
        <div className="space-y-3">
          {data.orders.map((order) => (
            <div key={order.id} className="card border border-base-300 bg-base-100 shadow-sm">
              <div className="card-body">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <Link
                      to="/app/order/$orderId"
                      params={{ orderId: order.id }}
                      className="link"
                    >
                      Pedido: {order.id.slice(0, 8)} - {dateFormatter.format(new Date(order.orderedAt))}
                    </Link>
                    <p>
                      Cliente:{" "}
                      {order.customer ? (
                        <Link to="/app/customers/$customerId" params={{ customerId: order.customer.id }} className="link">
                          {order.customer.name}
                        </Link>
                      ) : (
                        "Sem cliente"
                      )}
                    </p>
                    <p className="opacity-70">Observação: {order.note ?? "-"}</p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Qtd.</th>
                      <th>Entregar</th>
                      <th>Observação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.description}</td>
                        <td>{item.quantity}</td>
                        <td>{timeFormatter.format(new Date(item.deliveredAt))}</td>
                        <td>{item.note ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </main>
  );
}
