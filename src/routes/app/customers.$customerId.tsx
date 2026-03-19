import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { CustomerFormModal, type CustomerFormValues } from "@/components/customer-form-modal";
import { useDeleteCustomer } from "@/hooks/tanstack/customer/use-delete-customer";
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
  const navigate = useNavigate();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [actionError, setActionError] = useState("");

  const { data, isLoading, isError, error } = useGetCustomerDetails({
    organizationId: organization.id,
    customerId,
  });
  const { mutateAsync: updateCustomer, isPending: isUpdatingCustomer } = useUpdateCustomer({
    organizationId: organization.id,
  });
  const { mutateAsync: deleteCustomer, isPending: isDeletingCustomer } = useDeleteCustomer({
    organizationId: organization.id,
  });

  function handleStartEdit() {
    setFormError("");
    setIsEditModalOpen(true);
  }

  function handleCloseEditModal() {
    setFormError("");
    setIsEditModalOpen(false);
  }

  async function onSubmit(values: CustomerFormValues) {
    if (!data) {
      return;
    }

    setFormError("");
    setFormSuccess("");

    try {
      await updateCustomer({
        id: data.customer.id,
        name: values.name.trim(),
        phone: values.phone?.trim() || undefined,
        address: values.address?.trim() || undefined,
        note: values.note?.trim() || undefined,
      });

      setFormSuccess("Cliente atualizado com sucesso.");
      setIsEditModalOpen(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Erro ao atualizar cliente.");
    }
  }

  async function handleDeleteCustomer() {
    if (!data) {
      return;
    }

    setActionError("");

    const confirmed = window.confirm(
      "Deseja realmente excluir este cliente? Esta acao nao pode ser desfeita.",
    );
    if (!confirmed) {
      return;
    }

    try {
      await deleteCustomer({
        id: data.customer.id,
        organizationId: organization.id,
      });

      await navigate({
        to: "/app/customers",
      });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Erro ao excluir cliente.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8">
      {data && (
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{data.customer.name}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn btn-sm btn-outline" onClick={handleStartEdit}>
              Editar cliente
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline btn-error"
              disabled={isDeletingCustomer}
              onClick={handleDeleteCustomer}
            >
              Excluir cliente
            </button>
          </div>
        </div>
      )}

      {isLoading ? <p>Carregando cliente...</p> : null}
      {isError ? <p className="text-error">{error.message}</p> : null}
      {actionError ? (
        <div className="alert alert-error mb-4">
          <span>{actionError}</span>
        </div>
      ) : null}

      {data ? (
        <div className="space-y-4">
          <section className="card border border-base-300 bg-base-100 shadow-sm">
            <div className="card-body">
              {formSuccess ? (
                <div className="alert alert-success">
                  <span>{formSuccess}</span>
                </div>
              ) : null}

              <p className="text-sm">Telefone: {data.customer.phone ?? "-"}</p>
              <p className="text-sm">Endereco: {data.customer.address ?? "-"}</p>
              <p className="text-sm">Observacao: {data.customer.note ?? "-"}</p>
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-2">
            <MetricCard title="Total de pedidos" value={String(data.metrics.totalOrders)} />
            <MetricCard title="Ultimo pedido" value={data.metrics.lastOrderAt ? datetimeFormatter.format(new Date(data.metrics.lastOrderAt)) : "-"} />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 md:col-span-2">
              <MetricCard title="Vendas" value={currencyFormatter.format(data.metrics.totalInvoiced)} />
              <MetricCard title="Recebido" value={currencyFormatter.format(data.metrics.totalReceived)} />
              <MetricCard title="Saldo" value={currencyFormatter.format(data.metrics.balance)} />
            </div>
          </section>

          <section className="card border border-base-300 bg-base-100 shadow-sm">
            <div className="p-4 border-b border-base-300">
              <h2 className="card-title text-base">Pedidos</h2>
            </div>
              {data.recentOrders.length === 0 ? (
                <p className="text-sm opacity-70">Este cliente ainda nao possui pedidos.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Pedido</th>
                        <th>Data</th>
                        <th>Pagamento</th>
                        <th>Observacao</th>
                        <th>Itens</th>
                        <th>Total itens</th>
                        <th className="text-right">Acoes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentOrders.map((order) => (
                        <tr key={order.id}>
                          <td className="font-mono text-xs">{order.id.slice(0, 8)}</td>
                          <td>{datetimeFormatter.format(new Date(order.orderedAt))}</td>
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
          </section>

          <section className="card border border-base-300 bg-base-100 shadow-sm">
            <div className="p-4 border-b border-base-300">
              <h2 className="card-title text-base">Transações</h2>
            </div>

              {data.recentTransactions.length === 0 ? (
                <p className="text-sm opacity-70">Sem transações para este cliente.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Transação</th>
                        <th>Data</th>
                        <th>Tipo</th>
                        <th>Método</th>
                        <th>Descrição</th>
                        <th>Valor</th>
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
                          <td>{transaction.description ?? "-"}</td>
                          <td>{currencyFormatter.format(transaction.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </section>
        </div>
      ) : null}

      <CustomerFormModal
        isOpen={isEditModalOpen}
        mode="edit"
        isSubmitting={isUpdatingCustomer}
        errorMessage={formError}
        successMessage=""
        initialValues={
          data
            ? {
                name: data.customer.name,
                phone: data.customer.phone ?? "",
                address: data.customer.address ?? "",
                note: data.customer.note ?? "",
              }
            : undefined
        }
        onClose={handleCloseEditModal}
        onSubmit={onSubmit}
      />
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
