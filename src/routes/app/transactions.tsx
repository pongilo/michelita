import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import type { TransactionsPeriod } from "@/lib/api/transaction/get-transactions";

const dateRangeFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

function currentDateInputValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function getTransactionsPeriodBounds(period: TransactionsPeriod, referenceDate: string) {
  const base = new Date(`${referenceDate}T00:00:00`);
  const start = new Date(base);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);

  if (period === "daily") {
    end.setDate(end.getDate() + 1);
    return { start, end };
  }

  if (period === "weekly") {
    const diffToMonday = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - diffToMonday);
    end.setTime(start.getTime());
    end.setDate(end.getDate() + 7);
    return { start, end };
  }

  start.setDate(1);
  end.setTime(start.getTime());
  end.setMonth(end.getMonth() + 1);
  return { start, end };
}
import { TransactionFormModal, type TransactionFormValues } from "@/components/transaction-form-modal";
import { useGetCustomers } from "@/hooks/tanstack/customer/use-get-customers";
import { useGetOrders } from "@/hooks/tanstack/order/use-get-orders";
import { useCreateTransaction } from "@/hooks/tanstack/transaction/use-create-transaction";
import { useDeleteTransaction } from "@/hooks/tanstack/transaction/use-delete-transaction";
import { useGetTransactions } from "@/hooks/tanstack/transaction/use-get-transactions";
import { useUpdateTransaction } from "@/hooks/tanstack/transaction/use-update-transaction";
import { currencyFormatter, dateFormatter as datetimeFormatter } from "@/lib/utils/formatter";

const methodLabel: Record<string, string> = {
  pix: "PIX",
  cash: "Dinheiro",
  credit_card: "Cartao de credito",
  debit_card: "Cartao de debito",
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

export const Route = createFileRoute("/app/transactions")({
  component: TransactionsPage,
});

function TransactionsPage() {
  const { organization } = Route.useRouteContext();
  const [period, setPeriod] = useState<TransactionsPeriod>("monthly");
  const [referenceDate, setReferenceDate] = useState<string>(currentDateInputValue);
  const { start, end } = getTransactionsPeriodBounds(period, referenceDate);
  const rangeEnd = new Date(end.getTime() - 1);
  const periodLabel = period === "daily" ? "Diario" : period === "weekly" ? "Semanal" : "Mensal";

  const { data: transactions = [], isLoading, isError, error, isFetching, refetch } = useGetTransactions({
    organizationId: organization.id,
    period,
    referenceDate,
  });
  const { data: customers = [] } = useGetCustomers({
    organizationId: organization.id,
  });
  const { data: orders = [] } = useGetOrders({
    organizationId: organization.id,
    period,
    referenceDate,
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
const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const editingTransaction = useMemo(
    () => transactions.find((transaction) => transaction.id === editingTransactionId) ?? null,
    [editingTransactionId, transactions],
  );
  const isEditing = !!editingTransaction;
  const isSubmittingForm = isCreatingTransaction || isUpdatingTransaction;

  async function onSubmit(values: TransactionFormValues) {
    setFormError("");
    setFormSuccess("");

    try {
      if (editingTransaction) {
        await updateTransaction({
          id: editingTransaction.id,
          organizationId: organization.id,
          type: values.type,
          amount: values.amount,
          method: values.method,
          madeAt: values.madeAt,
          linkedCustomerId: values.linkedCustomerId ? values.linkedCustomerId : null,
          linkedOrderId: values.linkedOrderId ? values.linkedOrderId : null,
          description: values.description,
        });

        setFormSuccess("Transacao atualizada com sucesso.");
      } else {
        const transaction = await createTransaction({
          organizationId: organization.id,
          type: values.type,
          amount: values.amount,
          method: values.method,
          madeAt: values.madeAt,
          linkedCustomerId: values.linkedCustomerId ? values.linkedCustomerId : undefined,
          linkedOrderId: values.linkedOrderId ? values.linkedOrderId : undefined,
          description: values.description,
        });

        setFormSuccess(`Transacao ${transaction.id.slice(0, 8)} registrada com sucesso.`);
      }

      setEditingTransactionId(null);
      setIsFormModalOpen(false);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : editingTransactionId
            ? "Erro ao atualizar transacao."
            : "Erro ao registrar transacao.",
      );
    }
  }

  function handleStartEdit(transaction: (typeof transactions)[number]) {
    setEditingTransactionId(transaction.id);
    setFormError("");
    setIsFormModalOpen(true);
  }

  function handleCancelEdit() {
    setIsFormModalOpen(false);
    setEditingTransactionId(null);
    setFormError("");
  }

  function handleOpenCreateModal() {
    setEditingTransactionId(null);
    setFormError("");
    setIsFormModalOpen(true);
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

      if (editingTransactionId === transactionId) {
        handleCancelEdit();
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Erro ao excluir transacao.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Transações</h1>
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
              onChange={(event) => setPeriod(event.target.value as TransactionsPeriod)}
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
          <button type="button" className="btn btn-primary btn-sm" onClick={handleOpenCreateModal}>
            Nova transação
          </button>
        </div>
      </div>

      {formSuccess ? (
        <div className="alert alert-success mb-4">
          <span>{formSuccess}</span>
        </div>
      ) : null}

<section className="card border border-base-300 bg-base-100 shadow-sm mt-4">
          {actionError ? (
            <div className="alert alert-error">
              <span>{actionError}</span>
            </div>
          ) : null}

          {isLoading ? <p>Carregando transações...</p> : null}
          {isError ? <p className="text-error">{error.message}</p> : null}

          {!isLoading && !isError && transactions.length === 0 ? (
            <p className="text-sm opacity-70">Nenhuma transacao registrada.</p>
          ) : null}

          {!isLoading && !isError && transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Data</th>
                    <th>Tipo</th>
                    <th>Método</th>
                    <th>Descrição</th>
                    <th>Valor</th>
                    <th>Clientes vinculados</th>
                    <th>Pedidos vinculados</th>
                    <th className="text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="font-mono text-xs opacity-60">{transaction.id.slice(0, 8)}</td>
                      <td>{datetimeFormatter.format(new Date(transaction.madeAt))}</td>
                      <td>
                        <span className={`badge ${transaction.type === "entry" ? "badge-success" : "badge-warning"}`}>
                          {transaction.type === "entry" ? "Entrada" : "Saida"}
                        </span>
                      </td>
                      <td>{methodLabel[transaction.method] ?? transaction.method}</td>
                      <td>{transaction.description || "-"}</td>
                      <td>{currencyFormatter.format(transaction.amount)}</td>
                      <td>
                        {transaction.linkedCustomers.length === 0 ? (
                          "-"
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {transaction.linkedCustomers.map((customer) => (
                              <Link
                                key={customer.id}
                                to="/app/customers/$customerId"
                                params={{ customerId: customer.id }}
                                className="link"
                              >
                                {customer.name}
                              </Link>
                            ))}
                          </div>
                        )}
                      </td>
                      <td>
                        {transaction.linkedOrders.length === 0 ? (
                          "-"
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {transaction.linkedOrders.map((order) => (
                              <Link
                                key={order.id}
                                to="/app/order/$orderId"
                                params={{ orderId: order.id }}
                                className="link"
                              >
                                #{order.id.slice(0, 8)}
                              </Link>
                            ))}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className="btn btn-xs btn-outline"
                            disabled={isSubmittingForm || isDeletingTransaction}
                            onClick={() => handleStartEdit(transaction)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="btn btn-xs btn-outline btn-error"
                            disabled={isSubmittingForm || isDeletingTransaction}
                            onClick={() => handleDeleteTransaction(transaction.id)}
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

      </section>

      <TransactionFormModal
        isOpen={isFormModalOpen}
        mode={isEditing ? "edit" : "create"}
        isSubmitting={isSubmittingForm}
        customers={customers.map((customer) => ({
          id: customer.id,
          name: customer.name,
        }))}
        orders={orders.map((order) => ({
          id: order.id,
          label: `#${order.id.slice(0, 8)}${order.customer ? ` – ${order.customer.name}` : ""} (${datetimeFormatter.format(new Date(order.orderedAt))})`,
        }))}
        errorMessage={formError}
        successMessage=""
        initialValues={
          editingTransaction
            ? {
                type: editingTransaction.type as TransactionFormValues["type"],
                amount: Math.abs(editingTransaction.amount),
                method: editingTransaction.method as TransactionFormValues["method"],
                madeAt: toLocalDatetimeInput(editingTransaction.madeAt),
                linkedCustomerId: editingTransaction.linkedCustomerId ?? "",
                linkedOrderId: editingTransaction.linkedOrderId ?? "",
                description: editingTransaction.description ?? "",
              }
            : undefined
        }
        onClose={handleCancelEdit}
        onSubmit={onSubmit}
      />
    </main>
  );
}
