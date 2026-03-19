import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useGetCustomerDetails } from "@/hooks/tanstack/customer/use-get-customer-details";
import { useUpdateCustomer } from "@/hooks/tanstack/customer/use-update-customer";
import { currencyFormatter, dateFormatter as datetimeFormatter } from "@/lib/utils/formatter";

const transactionMethodLabel: Record<string, string> = {
  PIX: "PIX",
  CASH: "Dinheiro",
  CREDIT_CARD: "Cartao de credito",
  DEBIT_CARD: "Cartao de debito",
};

export const Route = createFileRoute("/app/customers/$customerId")({
  component: CustomerDetailsPage,
});

function CustomerDetailsPage() {
  const { organization } = Route.useRouteContext();
  const { customerId } = Route.useParams();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const { data, isLoading, isError, error } = useGetCustomerDetails({
    organizationId: organization.id,
    customerId,
  });
  const { mutateAsync: updateCustomer, isPending: isUpdatingCustomer } = useUpdateCustomer({
    organizationId: organization.id,
  });

  function handleStartEdit() {
    if (!data) {
      return;
    }

    setName(data.customer.name);
    setPhone(data.customer.phone ?? "");
    setAddress(data.customer.address ?? "");
    setNote(data.customer.note ?? "");
    setFormError("");
    setFormSuccess("");
    setIsEditing(true);
  }

  async function handleSaveCustomer() {
    if (!data) {
      return;
    }

    setFormError("");
    setFormSuccess("");

    if (name.trim().length < 2) {
      setFormError("Informe ao menos 2 caracteres para o nome do cliente.");
      return;
    }

    try {
      await updateCustomer({
        id: data.customer.id,
        name: name.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        note: note.trim() || undefined,
      });

      setFormSuccess("Cliente atualizado com sucesso.");
      setIsEditing(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Erro ao atualizar cliente.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Perfil do cliente</h1>
        <Link to="/app/customers" className="btn btn-sm btn-outline">
          Voltar para clientes
        </Link>
      </div>

      {isLoading ? <p>Carregando cliente...</p> : null}
      {isError ? <p className="text-error">{error.message}</p> : null}

      {data ? (
        <div className="space-y-4">
          <section className="card border border-base-300 bg-base-100 shadow-sm">
            <div className="card-body">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="card-title">{data.customer.name}</h2>
                {!isEditing ? (
                  <button type="button" className="btn btn-sm btn-outline" onClick={handleStartEdit}>
                    Editar cliente
                  </button>
                ) : null}
              </div>

              {formSuccess && !isEditing ? (
                <div className="alert alert-success">
                  <span>{formSuccess}</span>
                </div>
              ) : null}

              {!isEditing ? (
                <>
                  <p className="text-sm">Telefone: {data.customer.phone ?? "-"}</p>
                  <p className="text-sm">Endereco: {data.customer.address ?? "-"}</p>
                  <p className="text-sm">Observacao: {data.customer.note ?? "-"}</p>
                </>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="input input-bordered w-full md:col-span-2"
                    placeholder="Nome"
                  />
                  <input
                    type="text"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className="input input-bordered w-full"
                    placeholder="Telefone (opcional)"
                  />
                  <input
                    type="text"
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    className="input input-bordered w-full"
                    placeholder="Endereco (opcional)"
                  />
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    className="textarea textarea-bordered w-full md:col-span-2"
                    rows={3}
                    placeholder="Observacao (opcional)"
                  />

                  {formError ? (
                    <div className="alert alert-error md:col-span-2">
                      <span>{formError}</span>
                    </div>
                  ) : null}

                  {formSuccess ? (
                    <div className="alert alert-success md:col-span-2">
                      <span>{formSuccess}</span>
                    </div>
                  ) : null}

                  <div className="md:col-span-2 flex justify-end gap-2">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => {
                        setIsEditing(false);
                        setFormError("");
                        setFormSuccess("");
                      }}
                    >
                      Cancelar
                    </button>
                    <button type="button" className="btn btn-primary" disabled={isUpdatingCustomer} onClick={handleSaveCustomer}>
                      {isUpdatingCustomer ? "Salvando..." : "Salvar alteracoes"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Pedidos totais" value={String(data.metrics.totalOrders)} />
            <MetricCard title="Pedidos ativos" value={String(data.metrics.activeOrders)} />
            <MetricCard title="Pedidos cancelados" value={String(data.metrics.canceledOrders)} />
            <MetricCard title="Faturado" value={currencyFormatter.format(data.metrics.totalInvoiced)} />
            <MetricCard title="Recebido" value={currencyFormatter.format(data.metrics.totalReceived)} />
            <MetricCard title="Saldo" value={currencyFormatter.format(data.metrics.balance)} />
            <MetricCard
              title="Ultimo pedido"
              value={data.metrics.lastOrderAt ? datetimeFormatter.format(new Date(data.metrics.lastOrderAt)) : "-"}
            />
          </section>

          <section className="card border border-base-300 bg-base-100 shadow-sm">
            <div className="card-body">
              <h2 className="card-title text-base">Pedidos recentes</h2>

              {data.recentOrders.length === 0 ? (
                <p className="text-sm opacity-70">Este cliente ainda nao possui pedidos.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Pedido</th>
                        <th>Data</th>
                        <th>Status</th>
                        <th>Pagamento</th>
                        <th>Observacao</th>
                        <th>Itens</th>
                        <th>Total itens</th>
                        <th>Total transacoes</th>
                        <th>Saldo</th>
                        <th className="text-right">Acoes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentOrders.map((order) => (
                        <tr key={order.id}>
                          <td className="font-mono text-xs">{order.id.slice(0, 8)}</td>
                          <td>{datetimeFormatter.format(new Date(order.orderedAt))}</td>
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
                          <td>{order.itemCount}</td>
                          <td>{currencyFormatter.format(order.itemTotal)}</td>
                          <td>{currencyFormatter.format(order.transactionTotal)}</td>
                          <td>{currencyFormatter.format(order.balance)}</td>
                          <td>
                            <div className="flex justify-end">
                              <Link
                                to="/app/order/$orderId"
                                params={{ orderId: order.id }}
                                className="btn btn-xs btn-outline"
                              >
                                Ver pedido
                              </Link>
                            </div>
                          </td>
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
              <h2 className="card-title text-base">Transacoes recentes do cliente</h2>

              {data.recentTransactions.length === 0 ? (
                <p className="text-sm opacity-70">Sem transacoes para este cliente.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Transacao</th>
                        <th>Data</th>
                        <th>Tipo</th>
                        <th>Metodo</th>
                        <th>Valor</th>
                        <th>Pedido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentTransactions.map((transaction) => (
                        <tr key={transaction.id}>
                          <td className="font-mono text-xs">{transaction.id.slice(0, 8)}</td>
                          <td>{datetimeFormatter.format(new Date(transaction.madeAt))}</td>
                          <td>
                            <span className={`badge ${transaction.type === "entry" ? "badge-success" : "badge-warning"}`}>
                              {transaction.type === "entry" ? "Entrada" : "Saida"}
                            </span>
                          </td>
                          <td>{transactionMethodLabel[transaction.method] ?? transaction.method}</td>
                          <td>{currencyFormatter.format(transaction.amount)}</td>
                          <td className="font-mono text-xs">{transaction.orderId.slice(0, 8)}</td>
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
