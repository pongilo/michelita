import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryState } from "nuqs";
import { ChevronLeft, ChevronRight, ArrowDownCircleIcon, ArrowUpCircleIcon, EditIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { TransactionFormModal, TRANSACTION_TYPES, type TransactionFormValues } from "@/components/transaction-form-modal";
import { useAuth } from "@/contexts/auth-context";
import { useGetTransactions } from "@/hooks/tanstack/transaction/use-get-transactions";
import { useCreateTransaction } from "@/hooks/tanstack/transaction/use-create-transaction";
import { useUpdateTransaction } from "@/hooks/tanstack/transaction/use-update-transaction";
import { useDeleteTransaction } from "@/hooks/tanstack/transaction/use-delete-transaction";
import { useGetTransactionCategories } from "@/hooks/tanstack/transaction-category/use-get-transaction-categories";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Item, ItemGroup, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions } from "@/components/ui/item";
import { currencyFormatter, timeFormatter, toExactDatetime } from "@/lib/utils/formatter";
import { AppTitle } from "@/components/app-title";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";

export const Route = createFileRoute("/app/finance/")({
  component: FinancePage,
});

type PeriodType = "day" | "week" | "month";

const shortDayFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" });
const monthFmt = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
const groupDateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" });

const TRANSACTION_TYPE_LABELS = Object.fromEntries(TRANSACTION_TYPES.map((t) => [t.value, t.label]));

const PERIOD_LABELS: Record<PeriodType, string> = { day: "Hoje", week: "Semana", month: "Mês" };

function getPeriodRange(period: PeriodType, offset: number): { start: Date; end: Date; label: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  if (period === "day") {
    const start = new Date(Date.UTC(y, m, d + offset));
    const end = new Date(Date.UTC(y, m, d + offset + 1));
    const label = shortDayFmt.format(start);
    return { start, end, label: label.charAt(0).toUpperCase() + label.slice(1) };
  }

  if (period === "week") {
    const day = now.getDay();
    const daysToMon = day === 0 ? -6 : 1 - day;
    const monday = new Date(Date.UTC(y, m, d + daysToMon + offset * 7));
    const sunday = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + 6));
    const nextMonday = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + 7));
    return { start: monday, end: nextMonday, label: `${shortDayFmt.format(monday)} – ${shortDayFmt.format(sunday)}` };
  }

  const start = new Date(Date.UTC(y, m + offset, 1));
  const end = new Date(Date.UTC(y, m + offset + 1, 1));
  const label = monthFmt.format(start);
  return { start, end, label: label.charAt(0).toUpperCase() + label.slice(1) };
}

type Transaction = { id: string; description: string; amount: number; type: string; date: string; category: { id: string; name: string } | null };

function computeStats(transactions: Transaction[]) {
  let totalIncome = 0;
  let totalExpense = 0;
  const categoryMap = new Map<string, { id: string | null; name: string; income: number; expense: number }>();
  const paymentMap = new Map<string, { income: number; expense: number }>();

  for (const t of transactions) {
    const amount = t.amount;
    const catKey = t.category?.id ?? "__none__";

    if (!categoryMap.has(catKey)) {
      categoryMap.set(catKey, { id: t.category?.id ?? null, name: t.category?.name ?? "Sem categoria", income: 0, expense: 0 });
    }
    if (!paymentMap.has(t.type)) {
      paymentMap.set(t.type, { income: 0, expense: 0 });
    }

    const cat = categoryMap.get(catKey)!;
    const pay = paymentMap.get(t.type)!;

    if (amount >= 0) {
      totalIncome += amount;
      cat.income += amount;
      pay.income += amount;
    } else {
      totalExpense += Math.abs(amount);
      cat.expense += Math.abs(amount);
      pay.expense += Math.abs(amount);
    }
  }

  const categories = Array.from(categoryMap.values())
    .map((cat) => ({
      ...cat,
      percentOfIncome: totalIncome > 0 ? (cat.income / totalIncome) * 100 : 0,
      percentOfExpense: totalExpense > 0 ? (cat.expense / totalExpense) * 100 : 0,
    }))
    .sort((a, b) => b.expense - a.expense || b.income - a.income);

  const paymentMethods = Array.from(paymentMap.entries()).map(([type, totals]) => ({ type, ...totals }));

  return {
    income: totalIncome,
    expense: totalExpense,
    balance: totalIncome - totalExpense,
    spentPercent: totalIncome > 0 ? (totalExpense / totalIncome) * 100 : null,
    categories,
    paymentMethods,
  };
}

function FinancePage() {
  const { organization } = useAuth();
  const isMobile = useIsMobile();
  const [period, setPeriod] = useState<PeriodType>("day");
  const [offset, setOffset] = useState(0);
  const [modal, setModal] = useQueryState("modal");
  const [transactionId, setTransactionId] = useQueryState("transactionId");

  const { start, end, label } = getPeriodRange(period, offset);

  const { data: transactions = [], isLoading, isError, error } = useGetTransactions({
    organizationId: organization!.id,
    startAt: start,
    endAt: end,
  });

  const { data: categories = [] } = useGetTransactionCategories({ organizationId: organization!.id });

  const { mutateAsync: createTransaction, isPending: isCreating } = useCreateTransaction();
  const { mutateAsync: updateTransaction, isPending: isUpdating } = useUpdateTransaction({ organizationId: organization!.id });
  const { mutateAsync: deleteTransaction, isPending: isDeleting } = useDeleteTransaction({ organizationId: organization!.id });

  const stats = useMemo(() => computeStats(transactions), [transactions]);

  const editingTransaction = transactions.find((t) => t.id === transactionId) ?? null;
  const isSubmitting = isCreating || isUpdating;

  const initialValues = editingTransaction
    ? {
        description: editingTransaction.description,
        amount: editingTransaction.amount,
        type: editingTransaction.type as TransactionFormValues["type"],
        categoryId: editingTransaction.category?.id ?? null,
        date: editingTransaction.date.slice(0, 16),
      }
    : undefined;

  function handlePeriodChange(newPeriod: PeriodType) {
    setPeriod(newPeriod);
    setOffset(0);
  }

  function handleOpenCreate() {
    setTransactionId(null);
    setModal("transaction");
  }

  function handleStartEdit(id: string) {
    setTransactionId(id);
    setModal("transaction");
  }

  async function handleDelete(id: string, description: string) {
    if (!window.confirm(`Deseja realmente excluir a transação "${description}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await deleteTransaction({ id, organizationId: organization!.id });
      toast.success("Transação excluída com sucesso.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir transação.");
    }
  }

  async function onSubmit(signedAmount: number, values: Omit<TransactionFormValues, "direction" | "amount">) {
    try {
      if (editingTransaction) {
        await updateTransaction({
          id: editingTransaction.id,
          organizationId: organization!.id,
          description: values.description,
          amount: signedAmount,
          type: values.type,
          categoryId: values.categoryId ?? null,
          date: values.date,
        });
        toast.success("Transação atualizada com sucesso.");
      } else {
        await createTransaction({
          organizationId: organization!.id,
          description: values.description,
          amount: signedAmount,
          type: values.type,
          categoryId: values.categoryId ?? null,
          date: values.date,
        });
        toast.success("Transação criada com sucesso.");
      }
      setModal(null);
      setTransactionId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar transação.");
    }
  }

  const atCurrent = offset === 0;
  const isTransactionModalOpen = modal === "transaction";

  return (
    <>
      <TransactionFormModal
        isSubmitting={isSubmitting}
        initialValues={initialValues}
        categories={categories}
        organizationId={organization!.id}
        onSubmit={onSubmit}
      />

      {(!isMobile || !isTransactionModalOpen) && (
        <main className="mx-auto w-full max-w-4xl p-5 space-y-6">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <AppTitle>Financeiro</AppTitle>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-lg border border-border bg-muted p-1">
                {(["day", "week", "month"] as PeriodType[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handlePeriodChange(p)}
                    className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                      period === p ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {PERIOD_LABELS[p]}
                  </button>
                ))}
              </div>
              <Button size="icon-sm" onClick={handleOpenCreate}>
                <PlusIcon />
              </Button>
            </div>
          </header>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setOffset((o) => o - 1)} aria-label="Período anterior">
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm font-medium capitalize min-w-32 text-center">{label}</span>
            <Button variant="ghost" size="icon" onClick={() => setOffset((o) => o + 1)} disabled={atCurrent} aria-label="Próximo período">
              <ChevronRight className="size-4" />
            </Button>
          </div>

          {isLoading && <LoadingState label="Carregando..." />}
          {isError && <p className="text-destructive text-sm">{error.message}</p>}

          {!isLoading && !isError && (
            <>
              <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card size="sm">
                  <CardHeader>
                    <CardDescription>Entradas</CardDescription>
                    <CardTitle className="text-2xl text-green-600">{currencyFormatter.format(stats.income)}</CardTitle>
                  </CardHeader>
                </Card>

                <Card size="sm">
                  <CardHeader>
                    <CardDescription>Saídas</CardDescription>
                    <CardTitle className="text-2xl text-destructive">{currencyFormatter.format(stats.expense)}</CardTitle>
                    {stats.spentPercent !== null && (
                      <p className="text-xs text-muted-foreground">{stats.spentPercent.toFixed(1)}% das entradas</p>
                    )}
                  </CardHeader>
                </Card>

                <Card size="sm">
                  <CardHeader>
                    <CardDescription>Resultado</CardDescription>
                    <CardTitle className={`text-2xl ${stats.balance >= 0 ? "text-green-600" : "text-destructive"}`}>
                      {currencyFormatter.format(stats.balance)}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </section>

              {stats.categories.length > 0 && (
                <Card size="sm">
                  <CardHeader>
                    <CardDescription>Por categoria</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ul className="divide-y divide-border">
                      {stats.categories.map((cat) => (
                        <li key={cat.id ?? "__none__"} className="py-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-medium">{cat.name}</span>
                            <div className="flex flex-col items-end gap-0.5 text-sm tabular-nums">
                              {cat.income > 0 && (
                                <span className="text-green-600">
                                  +{currencyFormatter.format(cat.income)}
                                  {stats.income > 0 && (
                                    <span className="text-xs text-green-600/70 ml-1">({cat.percentOfIncome.toFixed(1)}% das entradas)</span>
                                  )}
                                </span>
                              )}
                              {cat.expense > 0 && (
                                <span className="text-destructive">
                                  -{currencyFormatter.format(cat.expense)}
                                  {stats.expense > 0 && (
                                    <span className="text-xs text-destructive/70 ml-1">({cat.percentOfExpense.toFixed(1)}% das saídas)</span>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                          {(cat.income > 0 || cat.expense > 0) && (
                            <div className="space-y-1">
                              {cat.income > 0 && stats.income > 0 && (
                                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                  <div className="h-full rounded-full bg-green-500/70" style={{ width: `${cat.percentOfIncome}%` }} />
                                </div>
                              )}
                              {cat.expense > 0 && stats.expense > 0 && (
                                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                  <div className="h-full rounded-full bg-destructive/60" style={{ width: `${cat.percentOfExpense}%` }} />
                                </div>
                              )}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {stats.paymentMethods.length > 0 && (
                <Card size="sm">
                  <CardHeader>
                    <CardDescription>Por método de pagamento</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="divide-y divide-border">
                      <div className="grid grid-cols-3 pb-2 text-xs font-medium text-muted-foreground">
                        <span>Método</span>
                        <span className="text-center">Entradas</span>
                        <span className="text-center">Saídas</span>
                      </div>
                      {TRANSACTION_TYPES.filter((t) => stats.paymentMethods.some((p) => p.type === t.value)).map((t) => {
                        const row = stats.paymentMethods.find((p) => p.type === t.value)!;
                        return (
                          <div key={t.value} className="grid grid-cols-3 items-center py-3 text-sm">
                            <span className="font-medium">{t.label}</span>
                            <span className="text-center text-green-600 tabular-nums">{row.income > 0 ? currencyFormatter.format(row.income) : "—"}</span>
                            <span className="text-center text-destructive tabular-nums">{row.expense > 0 ? currencyFormatter.format(row.expense) : "—"}</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div>
                <h2 className="mb-4 text-base font-semibold">Transações</h2>

                {transactions.length === 0 ? (
                  <EmptyState>
                    <EmptyState.Icon>💸</EmptyState.Icon>
                    <EmptyState.Title>Nenhuma transação neste período</EmptyState.Title>
                    <EmptyState.Description>Registre suas transações financeiras aqui.</EmptyState.Description>
                    <EmptyState.Action>
                      <Button size="sm" onClick={handleOpenCreate}>Nova transação</Button>
                    </EmptyState.Action>
                  </EmptyState>
                ) : (
                  Array.from(
                    transactions.reduce((groups, transaction) => {
                      const dateKey = transaction.date.slice(0, 10);
                      if (!groups.has(dateKey)) groups.set(dateKey, []);
                      groups.get(dateKey)!.push(transaction);
                      return groups;
                    }, new Map<string, typeof transactions>()),
                  ).map(([dateKey, group]) => (
                    <div key={dateKey} className="mb-6">
                      <h3 className="mb-2 text-sm font-medium capitalize text-muted-foreground">
                        {groupDateFormatter.format(toExactDatetime(dateKey))}
                      </h3>
                      <ItemGroup>
                        {group.map((transaction) => (
                          <Item key={transaction.id} variant="outline">
                            <ItemMedia variant="icon">
                              {transaction.amount > 0 ? (
                                <ArrowUpCircleIcon className="size-5 text-green-500" />
                              ) : (
                                <ArrowDownCircleIcon className="size-5 text-red-500" />
                              )}
                            </ItemMedia>
                            <ItemContent>
                              <ItemTitle>{transaction.description}</ItemTitle>
                              <ItemDescription>
                                {currencyFormatter.format(transaction.amount)}
                                {" · "}
                                {TRANSACTION_TYPE_LABELS[transaction.type] ?? transaction.type}
                                {transaction.category ? ` · ${transaction.category.name}` : ""}
                                {" · "}
                                {timeFormatter.format(toExactDatetime(transaction.date))}
                              </ItemDescription>
                            </ItemContent>
                            <ItemActions>
                              <Button size="icon-sm" variant="ghost" onClick={() => handleStartEdit(transaction.id)} disabled={isDeleting}>
                                <EditIcon />
                              </Button>
                              <Button size="icon-sm" variant="ghost" onClick={() => handleDelete(transaction.id, transaction.description)} disabled={isDeleting}>
                                <Trash2Icon />
                              </Button>
                            </ItemActions>
                          </Item>
                        ))}
                      </ItemGroup>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </main>
      )}
    </>
  );
}
