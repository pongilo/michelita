import { createFileRoute } from "@tanstack/react-router";
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
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
};

const methodIcon: Record<string, string> = {
  pix: "⚡",
  cash: "💵",
  credit_card: "💳",
  debit_card: "💳",
};

function localDatetimeNow() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function toLocalDatetimeInput(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return localDatetimeNow();
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

  const { data: transactions = [], isLoading, isError, error, isFetching, refetch } = useGetTransactions({
    organizationId: organization.id,
    period,
    referenceDate,
  });
  const { data: customers = [] } = useGetCustomers({ organizationId: organization.id });
  const { data: orders = [] } = useGetOrders({ organizationId: organization.id, period, referenceDate });

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
    () => transactions.find((t) => t.id === editingTransactionId) ?? null,
    [editingTransactionId, transactions],
  );
  const isEditing = !!editingTransaction;
  const isSubmittingForm = isCreatingTransaction || isUpdatingTransaction;

  const summary = useMemo(() => {
    const entries = transactions.filter((t) => t.type === "entry").reduce((s, t) => s + t.amount, 0);
    const exits = transactions.filter((t) => t.type === "exit").reduce((s, t) => s + Math.abs(t.amount), 0);
    return { entries, exits, balance: entries - exits };
  }, [transactions]);

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

  async function handleDeleteTransaction(transactionId: string) {
    setActionError("");
    const confirmed = window.confirm("Deseja realmente excluir esta transacao? Esta acao nao pode ser desfeita.");
    if (!confirmed) return;

    try {
      await deleteTransaction({ id: transactionId, organizationId: organization.id });
      if (editingTransactionId === transactionId) handleCancelEdit();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Erro ao excluir transacao.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Transações</h1>
          <p className="text-sm opacity-60 mt-0.5">
            {dateRangeFormatter.format(start)} — {dateRangeFormatter.format(rangeEnd)}
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <label className="space-y-1">
            <span className="label text-xs">Período</span>
            <select
              className="select select-bordered select-sm"
              value={period}
              onChange={(e) => setPeriod(e.target.value as TransactionsPeriod)}
            >
              <option value="daily">Diário</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensal</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="label text-xs">Data de referência</span>
            <input
              type="date"
              className="input input-bordered input-sm"
              value={referenceDate}
              onChange={(e) => setReferenceDate(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? <span className="loading loading-spinner loading-xs" /> : null}
            {isFetching ? "Atualizando..." : "Atualizar"}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => { setEditingTransactionId(null); setFormError(""); setIsFormModalOpen(true); }}
          >
            + Nova transação
          </button>
        </div>
      </div>

      {formSuccess ? (
        <div className="alert alert-success mb-5">
          <span>{formSuccess}</span>
        </div>
      ) : null}

      {actionError ? (
        <div className="alert alert-error mb-5">
          <span>{actionError}</span>
        </div>
      ) : null}

      {/* Summary cards */}
      {!isLoading && !isError && transactions.length > 0 ? (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="rounded-box border border-base-300 bg-base-100 px-5 py-4">
            <p className="text-xs opacity-60 uppercase tracking-wide mb-1">Entradas</p>
            <p className="text-xl font-bold text-success">{currencyFormatter.format(summary.entries)}</p>
          </div>
          <div className="rounded-box border border-base-300 bg-base-100 px-5 py-4">
            <p className="text-xs opacity-60 uppercase tracking-wide mb-1">Saídas</p>
            <p className="text-xl font-bold text-error">{currencyFormatter.format(summary.exits)}</p>
          </div>
          <div className="rounded-box border border-base-300 bg-base-100 px-5 py-4">
            <p className="text-xs opacity-60 uppercase tracking-wide mb-1">Saldo</p>
            <p className={`text-xl font-bold ${summary.balance >= 0 ? "text-success" : "text-error"}`}>
              {currencyFormatter.format(summary.balance)}
            </p>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm opacity-60">
          <span className="loading loading-spinner loading-sm" />
          Carregando transações...
        </div>
      ) : null}

      {isError ? <p className="text-error text-sm">{error.message}</p> : null}

      {!isLoading && !isError && transactions.length === 0 ? (
        <div className="card border border-base-300 bg-base-100">
          <div className="card-body items-center text-center py-16">
            <div className="text-5xl mb-3">💰</div>
            <h3 className="font-semibold text-lg">Nenhuma transação neste período</h3>
            <p className="text-sm opacity-60 max-w-xs">Registre entradas e saídas para acompanhar o financeiro da confeitaria.</p>
            <button
              type="button"
              className="btn btn-primary btn-sm mt-4"
              onClick={() => { setEditingTransactionId(null); setFormError(""); setIsFormModalOpen(true); }}
            >
              + Nova transação
            </button>
          </div>
        </div>
      ) : null}

      {!isLoading && !isError && transactions.length > 0 ? (
        <div className="flex flex-col divide-y divide-base-300 rounded-box overflow-hidden">
          {transactions.map((transaction) => (
            <button
              key={transaction.id}
              type="button"
              className="flex items-center gap-4 px-4 py-3 bg-base-100 hover:bg-base-200/50 transition-colors text-left w-full"
              onClick={() => handleStartEdit(transaction)}
            >
              {/* Ícone do tipo */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-base ${
                  transaction.type === "entry"
                    ? "bg-success/15 text-success"
                    : "bg-error/15 text-error"
                }`}
              >
                {transaction.type === "entry" ? "↑" : "↓"}
              </div>

              {/* Info principal */}
              <div className="flex-1 min-w-0">
                <p className="font-medium leading-snug truncate">
                  {transaction.description || (transaction.type === "entry" ? "Entrada" : "Saída")}
                </p>
                <p className="text-sm opacity-50 truncate">
                  {methodIcon[transaction.method]} {methodLabel[transaction.method] ?? transaction.method}
                  {" · "}
                  {datetimeFormatter.format(new Date(transaction.madeAt))}
                  {transaction.linkedCustomers.length > 0 && (
                    <> · {transaction.linkedCustomers.map((c) => c.name).join(", ")}</>
                  )}
                  {transaction.linkedOrders.length > 0 && (
                    <> · {transaction.linkedOrders.map((o) => `#${o.id.slice(0, 8)}`).join(", ")}</>
                  )}
                </p>
              </div>

              {/* Valor */}
              <span
                className={`font-semibold tabular-nums shrink-0 ${
                  transaction.type === "entry" ? "text-success" : "text-error"
                }`}
              >
                {transaction.type === "entry" ? "+" : "−"}{currencyFormatter.format(Math.abs(transaction.amount))}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <TransactionFormModal
        isOpen={isFormModalOpen}
        mode={isEditing ? "edit" : "create"}
        isSubmitting={isSubmittingForm}
        customers={customers.map((c) => ({ id: c.id, name: c.name }))}
        orders={orders.map((o) => ({
          id: o.id,
          label: `#${o.id.slice(0, 8)}${o.customer ? ` – ${o.customer.name}` : ""} (${datetimeFormatter.format(new Date(o.orderedAt))})`,
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
        onDelete={editingTransaction ? () => handleDeleteTransaction(editingTransaction.id) : undefined}
        isDeleting={isDeletingTransaction}
      />
    </main>
  );
}
