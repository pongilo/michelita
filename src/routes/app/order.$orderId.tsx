import { createFileRoute, Link } from "@tanstack/react-router";
import { useGetOrder } from "@/hooks/tanstack/order/use-get-order";
import { currencyFormatter, dateFormatter as datetimeFormatter } from "@/lib/utils/formatter";

const transactionMethodLabel: Record<string, string> = {
  pix: "PIX",
  cash: "Dinheiro",
  credit_card: "Cartao de credito",
  debit_card: "Cartao de debito",
};

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
        <h1 className="text-2xl font-semibold">Pedido</h1>
        <div className="flex gap-2">
          <Link to="/app/orders" className="btn btn-sm btn-outline">
            Voltar para pedidos
          </Link>
          {order ? (
            <Link to="/app/order/edit/$orderId" params={{ orderId: order.id }} className="btn btn-sm btn-primary">
              Editar pedido
            </Link>
          ) : null}
        </div>
      </div>

      {isLoading ? <p>Carregando pedido...</p> : null}
      {isError ? <p className="text-error">{error.message}</p> : null}

      {order ? (
        <div className="space-y-4">
          <section className="card border border-base-300 bg-base-100 shadow-sm">
            <div className="card-body">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="card-title">Resumo do pedido</h2>
                  <p className="text-sm opacity-70">ID: {order.id}</p>
                </div>
                <div className="flex gap-2">
                  <span className={`badge ${order.isCanceled ? "badge-error" : "badge-success"}`}>
                    {order.isCanceled ? "Cancelado" : "Ativo"}
                  </span>
                  <span className={`badge ${order.isPaid ? "badge-info" : "badge-warning"}`}>
                    {order.isPaid ? "Pago" : "Pendente"}
                  </span>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <p className="text-sm">
                  <strong>Data/hora:</strong> {datetimeFormatter.format(new Date(order.orderedAt))}
                </p>
                <p className="text-sm">
                  <strong>Cliente:</strong>{" "}
                  {order.customer ? (
                    <Link to="/app/customers/$customerId" params={{ customerId: order.customer.id }} className="link">
                      {order.customer.name}
                    </Link>
                  ) : (
                    "Sem cliente"
                  )}
                </p>
                <p className="text-sm">
                  <strong>Telefone:</strong> {order.customer?.phone ?? "-"}
                </p>
                <p className="text-sm md:col-span-2">
                  <strong>Observacao:</strong> {order.note ?? "-"}
                </p>
              </div>

              <div className="rounded-box bg-base-200 p-4 text-sm">
                <div className="flex justify-between">
                  <span>Total dos itens</span>
                  <strong>{currencyFormatter.format(order.itemTotal)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Total em transacoes</span>
                  <strong>{currencyFormatter.format(order.transactionTotal)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Saldo</span>
                  <strong>{currencyFormatter.format(order.balance)}</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="card border border-base-300 bg-base-100 shadow-sm">
            <div className="card-body">
              <h2 className="card-title text-base">Itens do pedido</h2>

              {order.item.length === 0 ? (
                <p className="text-sm opacity-70">Nenhum item cadastrado.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Descricao</th>
                        <th>Qtd.</th>
                        <th>Unitario</th>
                        <th>Total</th>
                        <th>Entrega</th>
                        <th>Observacao</th>
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
            </div>
          </section>

          <section className="card border border-base-300 bg-base-100 shadow-sm">
            <div className="card-body">
              <h2 className="card-title text-base">Transacoes do pedido</h2>

              {order.transaction.length === 0 ? (
                <p className="text-sm opacity-70">Nenhuma transacao vinculada.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Transacao</th>
                        <th>Data</th>
                        <th>Metodo</th>
                        <th>Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.transaction.map((transaction) => (
                        <tr key={transaction.id}>
                          <td className="font-mono text-xs">{transaction.id.slice(0, 8)}</td>
                          <td>{datetimeFormatter.format(new Date(transaction.madeAt))}</td>
                          <td>{transactionMethodLabel[transaction.method] ?? transaction.method}</td>
                          <td>{currencyFormatter.format(transaction.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
