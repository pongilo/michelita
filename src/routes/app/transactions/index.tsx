import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import { ArrowDownCircleIcon, ArrowUpCircleIcon, EditIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { TransactionFormModal, TRANSACTION_TYPES, type TransactionFormValues } from "@/components/transaction-form-modal";
import { useGetTransactions } from "@/hooks/tanstack/transaction/use-get-transactions";
import { useCreateTransaction } from "@/hooks/tanstack/transaction/use-create-transaction";
import { useUpdateTransaction } from "@/hooks/tanstack/transaction/use-update-transaction";
import { useDeleteTransaction } from "@/hooks/tanstack/transaction/use-delete-transaction";
import { useGetTransactionCategories } from "@/hooks/tanstack/transaction-category/use-get-transaction-categories";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Item, ItemGroup, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions } from "@/components/ui/item";
import { LoadingState } from "@/components/ui/loading-state";

export const Route = createFileRoute("/app/transactions/")({
  component: TransactionsPage,
});

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const groupDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "full",
  timeZone: "UTC",
});

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeStyle: "short",
  timeZone: "UTC",
});

const TRANSACTION_TYPE_LABELS = Object.fromEntries(
  TRANSACTION_TYPES.map((t) => [t.value, t.label]),
);

function TransactionsPage() {
  const { organization } = useAuth();
  const { data: transactions = [], isLoading, isError, error } = useGetTransactions({
    organizationId: organization!.id,
  });
  const { data: categories = [] } = useGetTransactionCategories({
    organizationId: organization!.id,
  });
  const { mutateAsync: createTransaction, isPending: isCreating } = useCreateTransaction();
  const { mutateAsync: updateTransaction, isPending: isUpdating } = useUpdateTransaction({
    organizationId: organization!.id,
  });
  const { mutateAsync: deleteTransaction, isPending: isDeleting } = useDeleteTransaction({
    organizationId: organization!.id,
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);

  const editingTransaction = transactions.find((t) => t.id === editingTransactionId) ?? null;
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
      setIsFormOpen(false);
      setEditingTransactionId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar transação.");
    }
  }

  function handleStartEdit(transactionId: string) {
    setEditingTransactionId(transactionId);
    setIsFormOpen(true);
  }

  function handleClose() {
    setIsFormOpen(false);
    setEditingTransactionId(null);
  }

  async function handleDelete(transactionId: string, description: string) {
    const confirmed = window.confirm(
      `Deseja realmente excluir a transação "${description}"? Esta ação não pode ser desfeita.`,
    );
    if (!confirmed) return;

    try {
      await deleteTransaction({ id: transactionId, organizationId: organization!.id });
      toast.success("Transação excluída com sucesso.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir transação.");
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-4xl px-5 py-8">
        <LoadingState label="Carregando transações..." />
      </main>
    );
  }

  if (isError) {
    return (
      <main className="mx-auto w-full max-w-4xl px-5 py-8">
        <p className="text-destructive">Erro ao carregar transações: {error.message}</p>
      </main>
    );
  }

  if (transactions.length === 0) {
    return (
      <>
        <EmptyState>
          <EmptyState.Icon>💸</EmptyState.Icon>
          <EmptyState.Title>Nenhuma transação ainda</EmptyState.Title>
          <EmptyState.Description>
            Registre suas transações financeiras aqui.
          </EmptyState.Description>
          <EmptyState.Action>
            <Button size="sm" onClick={() => setIsFormOpen(true)}>
              Nova transação
            </Button>
          </EmptyState.Action>
        </EmptyState>

        <TransactionFormModal
          isOpen={isFormOpen}
          mode="create"
          isSubmitting={isSubmitting}
          categories={categories}
          organizationId={organization!.id}
          onClose={handleClose}
          onSubmit={onSubmit}
        />
      </>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl p-5">
      <header className="mb-6 flex items-start justify-between">
        <div className="flex items-baseline gap-2">
          <h1 className="text-2xl font-heading">Transações</h1>
          <p className="text-sm text-muted-foreground">
            ({transactions.length}{" "}
            {transactions.length === 1 ? "transação" : "transações"})
          </p>
        </div>
        <Button
          size="icon-sm"
          onClick={() => {
            setEditingTransactionId(null);
            setIsFormOpen(true);
          }}
        >
          <PlusIcon />
        </Button>
      </header>

      {Array.from(
        transactions.reduce((groups, transaction) => {
          const dateKey = transaction.date.slice(0, 10);
          if (!groups.has(dateKey)) groups.set(dateKey, []);
          groups.get(dateKey)!.push(transaction);
          return groups;
        }, new Map<string, typeof transactions>()),
      ).map(([dateKey, group]) => (
        <div key={dateKey} className="mb-6">
          <h2 className="mb-2 text-sm font-medium capitalize text-muted-foreground">
            {groupDateFormatter.format(new Date(`${dateKey}T00:00:00Z`))}
          </h2>
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
                    {timeFormatter.format(new Date(transaction.date))}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => handleStartEdit(transaction.id)}
                    disabled={isDeleting}
                  >
                    <EditIcon />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => handleDelete(transaction.id, transaction.description)}
                    disabled={isDeleting}
                  >
                    <Trash2Icon />
                  </Button>
                </ItemActions>
              </Item>
            ))}
          </ItemGroup>
        </div>
      ))}

      <TransactionFormModal
        isOpen={isFormOpen}
        mode={editingTransaction ? "edit" : "create"}
        isSubmitting={isSubmitting}
        initialValues={initialValues}
        categories={categories}
        organizationId={organization!.id}
        onClose={handleClose}
        onSubmit={onSubmit}
      />
    </main>
  );
}
