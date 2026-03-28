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

import { toast } from "sonner";
import { TransactionFormModal, type TransactionFormValues } from "@/components/transaction-form-modal";
import { useGetCustomers } from "@/hooks/tanstack/customer/use-get-customers";
import { useGetOrders } from "@/hooks/tanstack/order/use-get-orders";
import { useCreateTransaction } from "@/hooks/tanstack/transaction/use-create-transaction";
import { useDeleteTransaction } from "@/hooks/tanstack/transaction/use-delete-transaction";
import { useGetTransactions } from "@/hooks/tanstack/transaction/use-get-transactions";
import { useUpdateTransaction } from "@/hooks/tanstack/transaction/use-update-transaction";
import { currencyFormatter, dateFormatter as datetimeFormatter } from "@/lib/utils/formatter";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { PeriodFilter } from "@/components/ui/period-filter";
import { ListContainer } from "@/components/ui/list-container";
import { Button } from "@/components/ui/button";

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
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);

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

  const byMethod = useMemo(() => {
    const result = { pix: 0, cash: 0, credit_card: 0, debit_card: 0 };
    for (const t of transactions) {
      if (t.type === "entry" && t.method in result) {
        result[t.method as keyof typeof result] += t.amount;
      }
    }
    return result;
  }, [transactions]);

  async function onSubmit(values: TransactionFormValues) {
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
        toast.success("Transação atualizada com sucesso.");
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
        toast.success(`Transação ${transaction.id.slice(0, 8)} registrada com sucesso.`);
      }

      setEditingTransactionId(null);
      setIsFormModalOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : editingTransactionId
            ? "Erro ao atualizar transação."
            : "Erro ao registrar transação.",
      );
    }
  }

  function handleStartEdit(transaction: (typeof transactions)[number]) {
    setEditingTransactionId(transaction.id);
    setIsFormModalOpen(true);
  }

  function handleCancelEdit() {
    setIsFormModalOpen(false);
    setEditingTransactionId(null);
  }

  async function handleDeleteTransaction(transactionId: string) {
    const confirmed = window.confirm("Deseja realmente excluir esta transação? Esta ação não pode ser desfeita.");
    if (!confirmed) return;

    try {
      await deleteTransaction({ id: transactionId, organizationId: organization.id });
      if (editingTransactionId === transactionId) handleCancelEdit();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir transação.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8">
      <PageHeader>
        <PageHeader.Info>
          <PageHeader.Title>Transações</PageHeader.Title>
          <PageHeader.Subtitle>
            {dateRangeFormatter.format(start)} — {dateRangeFormatter.format(rangeEnd)}
          </PageHeader.Subtitle>
        </PageHeader.Info>
        <PageHeader.Controls>
          <PeriodFilter>
            <PeriodFilter.Select value={period} onChange={(v) => setPeriod(v as TransactionsPeriod)} />
            <PeriodFilter.DateInput value={referenceDate} onChange={setReferenceDate} />
            <PeriodFilter.Refresh isFetching={isFetching} onClick={() => refetch()} />
          </PeriodFilter>
          <Button
            size="sm"
            onClick={() => { setEditingTransactionId(null); setIsFormModalOpen(true); }}
          >
            + Nova transação
          </Button>
        </PageHeader.Controls>
      </PageHeader>

      {isLoading ? <LoadingState label="Carregando transações..." /> : null}

      {isError ? <p className="text-error text-sm">{error.message}</p> : null}

      {!isLoading && !isError && transactions.length === 0 ? (
        <EmptyState>
          <EmptyState.Icon>💰</EmptyState.Icon>
          <EmptyState.Title>Nenhuma transação neste período</EmptyState.Title>
          <EmptyState.Description>
            Registre entradas e saídas para acompanhar o financeiro da confeitaria.
          </EmptyState.Description>
          <EmptyState.Action>
            <Button
              size="sm"
              onClick={() => { setEditingTransactionId(null); setIsFormModalOpen(true); }}
            >
              + Nova transação
            </Button>
          </EmptyState.Action>
        </EmptyState>
      ) : null}

      {!isLoading && !isError && transactions.length > 0 ? (
        <div className="flex flex-col-reverse gap-6 lg:flex-row lg:items-start">
          {/* Histórico */}
          <div className="flex-1 min-w-0">
            <ListContainer>
              {transactions.map((transaction) => (
                <Button
                  key={transaction.id}
                  variant="ghost"
                  className="h-auto w-full justify-start rounded-none px-4 py-3 text-left"
                  onClick={() => handleStartEdit(transaction)}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-base ${
                      transaction.type === "entry"
                        ? "bg-success/15 text-success"
                        : "bg-error/15 text-error"
                    }`}
                  >
                    {transaction.type === "entry" ? "↑" : "↓"}
                  </div>

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

                  <span
                    className={`font-semibold tabular-nums shrink-0 ${
                      transaction.type === "entry" ? "text-success" : "text-error"
                    }`}
                  >
                    {transaction.type === "entry" ? "+" : "−"}{currencyFormatter.format(Math.abs(transaction.amount))}
                  </span>
                </Button>
              ))}
            </ListContainer>
          </div>

          {/* Sidebar: resumo + por método */}
          <div className="flex flex-col gap-4 lg:w-72 shrink-0">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
              <MetricCard>
                <MetricCard.Label>Entradas</MetricCard.Label>
                <MetricCard.Value className="text-success">{currencyFormatter.format(summary.entries)}</MetricCard.Value>
              </MetricCard>
              <MetricCard>
                <MetricCard.Label>Saídas</MetricCard.Label>
                <MetricCard.Value className="text-error">{currencyFormatter.format(summary.exits)}</MetricCard.Value>
              </MetricCard>
              <MetricCard>
                <MetricCard.Label>Saldo</MetricCard.Label>
                <MetricCard.Value className={summary.balance >= 0 ? "text-success" : "text-error"}>
                  {currencyFormatter.format(summary.balance)}
                </MetricCard.Value>
              </MetricCard>
            </div>

            {/* Por método de pagamento */}
            <div>
              <h2 className="font-semibold mb-2 text-sm">Por método de pagamento</h2>
              <div className="flex flex-col divide-y divide-base-200 border border-base-300 rounded-box overflow-hidden">
                {[
                  { key: "pix", label: "PIX", icon: "⚡", value: byMethod.pix },
                  { key: "cash", label: "Dinheiro", icon: "💵", value: byMethod.cash },
                  { key: "credit_card", label: "Cartão de crédito", icon: "💳", value: byMethod.credit_card },
                  { key: "debit_card", label: "Cartão de débito", icon: "💳", value: byMethod.debit_card },
                ].map(({ key, label, icon, value }) => (
                  <div key={key} className="flex items-center gap-3 px-3 py-2.5 bg-base-100">
                    <div className="w-8 h-8 rounded-full bg-base-200 flex items-center justify-center shrink-0 text-sm">
                      {icon}
                    </div>
                    <span className="flex-1 text-sm">{label}</span>
                    <span className={`text-sm font-semibold tabular-nums ${value > 0 ? "" : "opacity-40"}`}>
                      {currencyFormatter.format(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
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
        errorMessage=""
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
