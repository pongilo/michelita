import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CustomerFormModal, type CustomerFormValues } from "@/components/customer-form-modal";
import { TransactionFormModal, type TransactionFormValues } from "@/components/transaction-form-modal";
import { useDeleteCustomer } from "@/hooks/tanstack/customer/use-delete-customer";
import { useGetCustomerDetails } from "@/hooks/tanstack/customer/use-get-customer-details";
import { useLinkCustomerTransaction } from "@/hooks/tanstack/customer/use-link-customer-transaction";
import { useUpdateCustomer } from "@/hooks/tanstack/customer/use-update-customer";
import { useCreateTransaction } from "@/hooks/tanstack/transaction/use-create-transaction";
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

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-8">

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {data && (
            <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0 text-base font-bold">
              {data.customer.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <h1 className="text-2xl font-semibold">{data?.customer.name ?? "Cliente"}</h1>
        </div>
        {data && (
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-sm btn-ghost text-error"
              disabled={isDeletingCustomer}
              onClick={handleDeleteCustomer}
            >
              Excluir
            </button>
            <button type="button" className="btn btn-sm btn-outline" onClick={handleStartEdit}>
              Editar
            </button>
            <button type="button" className="btn btn-sm btn-primary" onClick={handleOpenTransactionModal}>
              + Nova transação
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm opacity-60">
          <span className="loading loading-spinner loading-sm" />
          Carregando cliente...
        </div>
      ) : null}
      {isError ? <p className="text-error text-sm">{error.message}</p> : null}
      {actionError ? <div className="alert alert-error mb-5"><span>{actionError}</span></div> : null}
      {transactionFormSuccess ? <div className="alert alert-success mb-5"><span>{transactionFormSuccess}</span></div> : null}
      {formSuccess ? <div className="alert alert-success mb-5"><span>{formSuccess}</span></div> : null}

      {data ? (
        <div className="space-y-5">

          {/* Contato */}
          {(data.customer.phone || data.customer.address || data.customer.note) ? (
            <section className="flex flex-col divide-y divide-base-200 border border-base-300 rounded-box overflow-hidden">
              {data.customer.phone ? (
                <div className="flex items-center gap-3 px-4 py-3 bg-base-100">
                  <span className="text-xs opacity-50 w-20 shrink-0">Telefone</span>
                  <span className="text-sm">{data.customer.phone}</span>
                </div>
              ) : null}
              {data.customer.address ? (
                <div className="flex items-center gap-3 px-4 py-3 bg-base-100">
                  <span className="text-xs opacity-50 w-20 shrink-0">Endereço</span>
                  <span className="text-sm">{data.customer.address}</span>
                </div>
              ) : null}
              {data.customer.note ? (
                <div className="flex items-center gap-3 px-4 py-3 bg-base-100">
                  <span className="text-xs opacity-50 w-20 shrink-0">Observação</span>
                  <span className="text-sm">{data.customer.note}</span>
                </div>
              ) : null}
            </section>
          ) : null}

          {/* Métricas */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <div className="rounded-box border border-base-300 bg-base-100 px-4 py-4">
              <p className="text-xs opacity-60 uppercase tracking-wide mb-1">Pedidos</p>
              <p className="font-bold text-lg">{data.metrics.totalOrders}</p>
            </div>
            <div className="rounded-box border border-base-300 bg-base-100 px-4 py-4">
              <p className="text-xs opacity-60 uppercase tracking-wide mb-1">Último pedido</p>
              <p className="font-semibold text-sm">
                {data.metrics.lastOrderAt ? datetimeFormatter.format(new Date(data.metrics.lastOrderAt)) : "—"}
              </p>
            </div>
            <div className="rounded-box border border-base-300 bg-base-100 px-4 py-4">
              <p className="text-xs opacity-60 uppercase tracking-wide mb-1">Vendas</p>
              <p className="font-bold text-lg">{currencyFormatter.format(data.metrics.totalInvoiced)}</p>
            </div>
            <div className="rounded-box border border-base-300 bg-base-100 px-4 py-4">
              <p className="text-xs opacity-60 uppercase tracking-wide mb-1">Recebido</p>
              <p className="font-bold text-lg text-success">{currencyFormatter.format(data.metrics.totalReceived)}</p>
            </div>
            <div className="rounded-box border border-base-300 bg-base-100 px-4 py-4 col-span-2 sm:col-span-1">
              <p className="text-xs opacity-60 uppercase tracking-wide mb-1">Saldo</p>
              <p className={`font-bold text-lg ${data.metrics.balance >= 0 ? "text-success" : "text-error"}`}>
                {currencyFormatter.format(data.metrics.balance)}
              </p>
            </div>
          </section>

          {/* Pedidos */}
          <section>
            <h2 className="font-semibold mb-3">Pedidos</h2>
            {data.recentOrders.length === 0 ? (
              <div className="px-4 py-3 border border-dashed border-base-300 rounded-box text-sm opacity-50">
                Este cliente ainda não possui pedidos.
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-base-200 border border-base-300 rounded-box overflow-hidden">
                {data.recentOrders.map((order) => (
                  <Link
                    key={order.id}
                    to="/app/order/$orderId"
                    params={{ orderId: order.id }}
                    className="flex items-center gap-3 px-4 py-3 bg-base-100 hover:bg-base-200/50 transition-colors"
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${order.isPaid ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>
                      {order.isPaid ? "✓" : "!"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm leading-snug">
                        #{order.id.slice(0, 8)}
                        {order.note ? <span className="opacity-50 font-normal"> · {order.note}</span> : null}
                      </p>
                      <p className="text-xs opacity-50">
                        {datetimeFormatter.format(new Date(order.orderedAt))}
                        {" · "}
                        {order.itemCount} {order.itemCount === 1 ? "item" : "itens"}
                      </p>
                    </div>
                    <span className="text-sm font-semibold shrink-0">
                      {currencyFormatter.format(order.itemTotal)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Transações */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Transações</h2>
              <button
                type="button"
                className="btn btn-xs btn-outline"
                onClick={() => { setLinkError(""); setSelectedTransactionId(""); setIsLinkModalOpen(true); }}
              >
                Vincular
              </button>
            </div>
            {data.recentTransactions.length === 0 ? (
              <div className="px-4 py-3 border border-dashed border-base-300 rounded-box text-sm opacity-50">
                Sem transações vinculadas a este cliente.
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-base-200 border border-base-300 rounded-box overflow-hidden">
                {data.recentTransactions.map((transaction) => (
                  <button
                    key={transaction.id}
                    type="button"
                    className="flex items-center gap-3 px-4 py-3 bg-base-100 hover:bg-base-200/50 transition-colors text-left w-full"
                    disabled={isSubmittingTransactionForm || isDeletingCustomer}
                    onClick={() => handleStartTransactionEdit(transaction.id)}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-base ${transaction.type === "entry" ? "bg-success/15 text-success" : "bg-error/15 text-error"}`}>
                      {transaction.type === "entry" ? "↑" : "↓"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm leading-snug truncate">
                        {transaction.description || (transaction.type === "entry" ? "Entrada" : "Saída")}
                      </p>
                      <p className="text-xs opacity-50 truncate">
                        {transactionMethodLabel[transaction.method] ?? transaction.method}
                        {" · "}
                        {datetimeFormatter.format(new Date(transaction.madeAt))}
                      </p>
                    </div>
                    <span className={`text-sm font-semibold shrink-0 ${transaction.type === "entry" ? "text-success" : "text-error"}`}>
                      {transaction.type === "entry" ? "+" : "−"}{currencyFormatter.format(Math.abs(transaction.amount))}
                    </span>
                  </button>
                ))}
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

