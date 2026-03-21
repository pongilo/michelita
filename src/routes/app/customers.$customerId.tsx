import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CustomerFormModal, type CustomerFormValues } from "@/components/customer-form-modal";
import { TransactionFormModal, type TransactionFormValues } from "@/components/transaction-form-modal";
import { useDeleteCustomer } from "@/hooks/tanstack/customer/use-delete-customer";
import { useGetCustomerDetails } from "@/hooks/tanstack/customer/use-get-customer-details";
import { useLinkCustomerTransaction } from "@/hooks/tanstack/customer/use-link-customer-transaction";
import { useUpdateCustomer } from "@/hooks/tanstack/customer/use-update-customer";
import { useCreateTransaction } from "@/hooks/tanstack/transaction/use-create-transaction";
import { useDeleteTransaction } from "@/hooks/tanstack/transaction/use-delete-transaction";
import { useGetTransactions } from "@/hooks/tanstack/transaction/use-get-transactions";
import { useUpdateTransaction } from "@/hooks/tanstack/transaction/use-update-transaction";
import { currencyFormatter, dateFormatter as datetimeFormatter } from "@/lib/utils/formatter";

function currentDateInputValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

const transactionMethodLabel: Record<string, string> = {
  PIX: "PIX",
  CASH: "Dinheiro",
  CREDIT_CARD: "Cartao de credito",
  DEBIT_CARD: "Cartao de debito",
};

const transactionMethodFormValue: Record<string, TransactionFormValues["method"]> = {
  PIX: "pix",
  CASH: "cash",
  CREDIT_CARD: "credit_card",
  DEBIT_CARD: "debit_card",
};

function localDatetimeNow() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function toLocalDatetimeInput(value: string | Date) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return localDatetimeNow();
  }

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export const Route = createFileRoute("/app/customers/$customerId")({
  component: CustomerDetailsPage,
});

function CustomerDetailsPage() {
  const { organization } = Route.useRouteContext();
  const { customerId } = Route.useParams();
  const navigate = useNavigate();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState("");
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [transactionFormError, setTransactionFormError] = useState("");
  const [transactionFormSuccess, setTransactionFormSuccess] = useState("");
  const [actionError, setActionError] = useState("");
  const [linkError, setLinkError] = useState("");

  const { data, isLoading, isError, error } = useGetCustomerDetails({
    organizationId: organization.id,
    customerId,
  });
  const { mutateAsync: updateCustomer, isPending: isUpdatingCustomer } = useUpdateCustomer({
    organizationId: organization.id,
  });
  const { mutateAsync: createTransaction, isPending: isCreatingTransaction } = useCreateTransaction({
    organizationId: organization.id,
  });
  const { mutateAsync: updateTransaction, isPending: isUpdatingTransaction } = useUpdateTransaction({
    organizationId: organization.id,
  });
  const { mutateAsync: deleteTransaction, isPending: isDeletingTransaction } = useDeleteTransaction({
    organizationId: organization.id,
  });
  const { mutateAsync: deleteCustomer, isPending: isDeletingCustomer } = useDeleteCustomer({
    organizationId: organization.id,
  });
  const { mutateAsync: linkTransaction, isPending: isLinking } = useLinkCustomerTransaction({
    organizationId: organization.id,
    customerId,
  });
  const { data: allTransactions = [] } = useGetTransactions({
    organizationId: organization.id,
    period: "monthly",
    referenceDate: currentDateInputValue(),
  });

  const linkedTransactionIds = useMemo(
    () => new Set(data?.recentTransactions.map((t) => t.id) ?? []),
    [data?.recentTransactions],
  );
  const availableToLink = allTransactions.filter((t) => !linkedTransactionIds.has(t.id));

  const editingTransaction = data?.recentTransactions.find((transaction) => transaction.id === editingTransactionId) ?? null;
  const isEditingTransaction = !!editingTransaction;
  const isSubmittingTransactionForm = isCreatingTransaction || isUpdatingTransaction;

  function handleStartEdit() {
    setFormError("");
    setIsEditModalOpen(true);
  }

  function handleCloseEditModal() {
    setFormError("");
    setIsEditModalOpen(false);
  }

  function handleOpenTransactionModal() {
    setTransactionFormError("");
    setTransactionFormSuccess("");
    setEditingTransactionId(null);
    setIsTransactionModalOpen(true);
  }

  function handleStartTransactionEdit(transactionId: string) {
    setTransactionFormError("");
    setTransactionFormSuccess("");
    setEditingTransactionId(transactionId);
    setIsTransactionModalOpen(true);
  }

  function handleCloseTransactionModal() {
    setTransactionFormError("");
    setEditingTransactionId(null);
    setIsTransactionModalOpen(false);
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

  async function handleSubmitCustomerTransaction(values: TransactionFormValues) {
    if (!data) {
      return;
    }

    setTransactionFormError("");
    setTransactionFormSuccess("");

    try {
      if (editingTransaction) {
        await updateTransaction({
          id: editingTransaction.id,
          organizationId: organization.id,
          type: values.type,
          amount: values.amount,
          method: values.method,
          madeAt: values.madeAt,
          linkedCustomerId: data.customer.id,
          description: values.description,
        });

        setTransactionFormSuccess("Transação atualizada com sucesso.");
      } else {
        const transaction = await createTransaction({
          organizationId: organization.id,
          type: values.type,
          amount: values.amount,
          method: values.method,
          madeAt: values.madeAt,
          linkedCustomerId: data.customer.id,
          description: values.description,
        });

        setTransactionFormSuccess(`Transação ${transaction.id.slice(0, 8)} registrada com sucesso.`);
      }

      setEditingTransactionId(null);
      setIsTransactionModalOpen(false);
    } catch (error) {
      setTransactionFormError(
        error instanceof Error
          ? error.message
          : editingTransaction
            ? "Erro ao atualizar transacao."
            : "Erro ao registrar transacao.",
      );
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

  async function handleLinkTransaction() {
    if (!selectedTransactionId) return;
    setLinkError("");
    try {
      await linkTransaction({
        organizationId: organization.id,
        customerId,
        transactionId: selectedTransactionId,
      });
      setIsLinkModalOpen(false);
      setSelectedTransactionId("");
      setTransactionFormSuccess("Transacao vinculada ao cliente.");
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : "Erro ao vincular transacao.");
    }
  }

  async function handleDeleteTransaction(transactionId: string) {
    setActionError("");

    const confirmed = window.confirm(
      "Deseja realmente excluir esta transacao? Esta acao nao pode ser desfeita.",
    );
    if (!confirmed) {
      return;
    }

    try {
      await deleteTransaction({
        id: transactionId,
        organizationId: organization.id,
      });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Erro ao excluir transacao.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8">
      {data && (
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{data.customer.name}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn btn-sm btn-primary" onClick={handleOpenTransactionModal}>
              Nova transação
            </button>
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
      {transactionFormSuccess ? (
        <div className="alert alert-success mb-4">
          <span>{transactionFormSuccess}</span>
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
              <p className="text-sm">Endereço: {data.customer.address ?? "-"}</p>
              <p className="text-sm">Observação: {data.customer.note ?? "-"}</p>
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
                <p className="text-sm opacity-70 p-4">Este cliente ainda nao possui pedidos.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Pedido</th>
                        <th>Data</th>
                        <th>Pagamento</th>
                        <th>Observação</th>
                        <th>Itens</th>
                        <th>Total itens</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentOrders.map((order) => (
                        <tr key={order.id}>
                          <td>
                            <Link
                              to="/app/order/$orderId"
                              params={{ orderId: order.id }}
                              className="link"
                            >
                              {order.id.slice(0, 8)}
                            </Link>
                          </td>
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </section>

          <section className="card border border-base-300 bg-base-100 shadow-sm">
            <div className="p-4 border-b border-base-300 flex items-center justify-between gap-2">
              <h2 className="card-title text-base">Transações</h2>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => {
                  setLinkError("");
                  setSelectedTransactionId("");
                  setIsLinkModalOpen(true);
                }}
              >
                Vincular existente
              </button>
            </div>

              {data.recentTransactions.length === 0 ? (
                <p className="text-sm opacity-70 p-4">Sem transações a este cliente.</p>
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
                        <th className="text-right">Ações</th>
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
                          <td>
                            <div className="flex justify-end">
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  className="btn btn-xs btn-outline"
                                  disabled={isSubmittingTransactionForm || isDeletingTransaction || isDeletingCustomer}
                                  onClick={() => handleStartTransactionEdit(transaction.id)}
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-xs btn-outline btn-error"
                                  disabled={isSubmittingTransactionForm || isDeletingTransaction || isDeletingCustomer}
                                  onClick={() => handleDeleteTransaction(transaction.id)}
                                >
                                  Excluir
                                </button>
                              </div>
                            </div>
                          </td>
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

      {isLinkModalOpen ? (
        <div className="modal modal-open">
          <div className="modal-box max-w-lg">
            <h3 className="font-bold text-lg mb-4">Vincular transação existente</h3>

            {availableToLink.length === 0 ? (
              <p className="text-sm opacity-70">Nenhuma transacao disponivel para vincular no periodo atual.</p>
            ) : (
              <label className="space-y-1">
                <span className="label">Selecione a transacao</span>
                <select
                  className="select select-bordered w-full"
                  value={selectedTransactionId}
                  onChange={(e) => setSelectedTransactionId(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {availableToLink.map((t) => (
                    <option key={t.id} value={t.id}>
                      #{t.id.slice(0, 8)} – {t.type === "entry" ? "Entrada" : "Saida"} {currencyFormatter.format(Math.abs(t.amount))} – {datetimeFormatter.format(new Date(t.madeAt))}{t.description ? ` – ${t.description}` : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {linkError ? (
              <div className="alert alert-error mt-3">
                <span>{linkError}</span>
              </div>
            ) : null}

            <div className="modal-action">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setIsLinkModalOpen(false);
                  setSelectedTransactionId("");
                  setLinkError("");
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!selectedTransactionId || isLinking}
                onClick={handleLinkTransaction}
              >
                {isLinking ? "Vinculando..." : "Vincular"}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setIsLinkModalOpen(false)} />
        </div>
      ) : null}

      <TransactionFormModal
        isOpen={isTransactionModalOpen}
        mode={isEditingTransaction ? "edit" : "create"}
        isSubmitting={isSubmittingTransactionForm}
        customers={[]}
        fixedLinkedCustomer={
          data
            ? {
                id: data.customer.id,
                name: data.customer.name,
              }
            : undefined
        }
        errorMessage={transactionFormError}
        successMessage=""
        initialValues={
          data
            ? {
                type: editingTransaction?.type as TransactionFormValues["type"] | undefined,
                amount: editingTransaction ? Math.abs(editingTransaction.amount) : undefined,
                method: editingTransaction
                  ? transactionMethodFormValue[editingTransaction.method] ?? "pix"
                  : undefined,
                madeAt: editingTransaction ? toLocalDatetimeInput(editingTransaction.madeAt) : undefined,
                linkedCustomerId: data.customer.id,
                description: editingTransaction?.description ?? "",
              }
            : undefined
        }
        onClose={handleCloseTransactionModal}
        onSubmit={handleSubmitCustomerTransaction}
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
