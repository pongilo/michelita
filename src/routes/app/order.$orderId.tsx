import { createFileRoute, Link } from "@tanstack/react-router";
import { useGetOrder } from "@/hooks/tanstack/order/use-get-order";
import { currencyFormatter, dateFormatter as datetimeFormatter } from "@/lib/utils/formatter";

export const Route = createFileRoute("/app/order/$orderId")({
  component: OrderDetailsPage,
});

function OrderDetailsPage() {
  const { organization } = Route.useRouteContext();
  const { orderId } = Route.useParams();
  const { data: order, isLoading, isError, error } = useGetOrder({
    organizationId: organization.id,
    orderId,
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-2 items-center">
          <h1 className="text-2xl font-semibold">Pedido #{order?.id.slice(0, 8)}</h1>
          {order && (
            <span className={`badge ${order.isPaid ? "badge-info" : "badge-warning"}`}>
              {order.isPaid ? "Pago" : "Pendente"}
            </span>
          )}
        </div>
        {order ? (
          <Link to="/app/order/edit/$orderId" params={{ orderId: order.id }} className="btn btn-sm btn-primary">
            Editar pedido
          </Link>
        ) : null}
      </div>

      {isLoading ? <p>Carregando pedido...</p> : null}
      {isError ? <p className="text-error">{error.message}</p> : null}

      {order ? (
        <div className="space-y-4">
          <section className="card border border-base-300 bg-base-100 shadow-sm">
            <div className="card-body">
              <p>
                <strong>Data:</strong> {datetimeFormatter.format(new Date(order.orderedAt))}
              </p>
              <p>
                <strong>Total do pedido:</strong> {currencyFormatter.format(order.itemTotal)}
              </p>
            </div>
          </section>

          <section className="card border border-base-300 bg-base-100 shadow-sm">
            {order.customer ? (
              <>
                <div className="p-4 border-b border-base-300">
                  <h2 className="card-title text-base">Cliente</h2>
                </div>
                <div className="card-body">
                  <p>
                    <strong>Nome:</strong>{' '}
                    <Link to="/app/customers/$customerId" params={{ customerId: order.customer.id }} className="link">
                      {order.customer.name}
                    </Link>
                  </p>
                  <p><strong>Telefone:</strong> {order.customer?.phone ?? "-"}</p>
                  <p><strong>Endereço:</strong> {order.customer?.address ?? "-"}</p>
                  <p><strong>Observação:</strong> {order.note ?? "-"}</p>
                </div>
              </>
            ) : (
              <h2 className="p-4 card-title text-base">Sem cliente</h2>
            )}
          </section>

          <section className="card border border-base-300 bg-base-100 shadow-sm">
            <div className="p-4 border-b border-base-300">
              <h2 className="card-title text-base">Itens do pedido</h2>
            </div>

            {order.item.length === 0 ? (
              <p className="text-sm opacity-70 p-4">Nenhum item cadastrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Descrição</th>
                      <th>Qtd.</th>
                      <th>Preço</th>
                      <th>Total</th>
                      <th>Entrega</th>
                      <th>Observação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.item.map((item) => (
                      <tr key={item.id}>
                        <td>{item.description}</td>
                        <td>{item.quantity}</td>
                        <td>{currencyFormatter.format(item.unitPrice)}</td>
                        <td>{currencyFormatter.format(item.total)}</td>
                        <td>{datetimeFormatter.format(new Date(item.deliveredAt))}</td>
                        <td>{item.note ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

        </div>
      ) : null}
    </main>
  );
}
