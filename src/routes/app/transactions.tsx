import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useGetCustomers } from "@/hooks/tanstack/customer/use-get-customers";
import { useCreateTransaction } from "@/hooks/tanstack/transaction/use-create-transaction";
import { useDeleteTransaction } from "@/hooks/tanstack/transaction/use-delete-transaction";
import { useGetTransactions } from "@/hooks/tanstack/transaction/use-get-transactions";
import { useUpdateTransaction } from "@/hooks/tanstack/transaction/use-update-transaction";
import { currencyFormatter, dateFormatter as datetimeFormatter } from "@/lib/utils/formatter";

const transactionFormSchema = z.object({
  type: z.enum(["entry", "exit"]),
  amount: z.number().min(0.01, "Informe um valor maior que zero."),
  method: z.enum(["pix", "cash", "credit_card", "debit_card"]),
  madeAt: z.string().trim().min(1, "Data/hora da transacao e obrigatoria."),
  customerId: z.union([z.uuid(), z.literal("")]).optional(),
  description: z.string().trim().max(500, "A descricao deve ter no maximo 500 caracteres.").optional(),
});

type TransactionFormValues = z.infer<typeof transactionFormSchema>;

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

function getDefaultTransactionFormValues(): TransactionFormValues {
  return {
    type: "entry",
    amount: 0,
    method: "pix",
    madeAt: localDatetimeNow(),
    customerId: "",
    description: "",
  };
}

export const Route = createFileRoute("/app/transactions")({
  component: TransactionsPage,
});

function TransactionsPage() {
  const { organization } = Route.useRouteContext();
  const { data: transactions = [], isLoading, isError, error } = useGetTransactions({
    organizationId: organization.id,
  });
  const { data: customers = [] } = useGetCustomers({
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
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const isEditing = !!editingTransactionId;
  const isSubmittingForm = isCreatingTransaction || isUpdatingTransaction;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: getDefaultTransactionFormValues(),
  });

  const totals = useMemo(() => {
    const entry = transactions
      .filter((transaction) => transaction.amount >= 0)
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const exit = transactions
      .filter((transaction) => transaction.amount < 0)
      .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);

    return {
      entry: Number(entry.toFixed(2)),
      exit: Number(exit.toFixed(2)),
      balance: Number((entry - exit).toFixed(2)),
    };
  }, [transactions]);

  async function onSubmit(values: TransactionFormValues) {
    setFormError("");
    setFormSuccess("");

    try {
      if (editingTransactionId) {
        await updateTransaction({
          id: editingTransactionId,
          organizationId: organization.id,
          type: values.type,
          amount: values.amount,
          method: values.method,
          madeAt: values.madeAt,
          customerId: values.customerId ? values.customerId : null,
          description: values.description,
        });

        setFormSuccess("Transacao atualizada com sucesso.");
        setEditingTransactionId(null);
      } else {
        const transaction = await createTransaction({
          organizationId: organization.id,
          type: values.type,
          amount: values.amount,
          method: values.method,
          madeAt: values.madeAt,
          customerId: values.customerId ? values.customerId : undefined,
          description: values.description,
        });

        setFormSuccess(`Transacao ${transaction.id.slice(0, 8)} registrada com sucesso.`);
      }

      reset(getDefaultTransactionFormValues());
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
    setFormSuccess("");

    reset({
      type: transaction.type as TransactionFormValues["type"],
      amount: Math.abs(transaction.amount),
      method: transaction.method as TransactionFormValues["method"],
      madeAt: toLocalDatetimeInput(transaction.madeAt),
      customerId: transaction.customerId ?? "",
      description: transaction.description ?? "",
    });
  }

  function handleCancelEdit() {
    setEditingTransactionId(null);
    setFormError("");
    setFormSuccess("");
    reset(getDefaultTransactionFormValues());
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
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Transacoes</h1>
      </div>

      <section className="grid gap-3 md:grid-cols-3">
        <MetricCard title="Entradas" value={currencyFormatter.format(totals.entry)} />
        <MetricCard title="Saidas" value={currencyFormatter.format(totals.exit)} />
        <MetricCard title="Saldo" value={currencyFormatter.format(totals.balance)} />
      </section>

      <section className="card border border-base-300 bg-base-100 shadow-sm mt-4">
        <div className="card-body">
          <h2 className="card-title text-base">{isEditing ? "Editar transacao" : "Nova transacao"}</h2>
          <p className="text-sm opacity-70">
            {isEditing
              ? "Atualize os dados da transacao selecionada."
              : "Cadastre entradas e saidas, com ou sem cliente vinculado."}
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <span className="label">Tipo</span>
              <select className="select select-bordered w-full" {...register("type")}>
                <option value="entry">Entrada</option>
                <option value="exit">Saida</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="label">Valor</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                className="input input-bordered w-full"
                {...register("amount", { valueAsNumber: true })}
              />
              {errors.amount ? <span className="text-error-content text-sm">{errors.amount.message}</span> : null}
            </label>

            <label className="space-y-1">
              <span className="label">Metodo</span>
              <select className="select select-bordered w-full" {...register("method")}>
                <option value="pix">PIX</option>
                <option value="cash">Dinheiro</option>
                <option value="credit_card">Cartao de credito</option>
                <option value="debit_card">Cartao de debito</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="label">Data/hora</span>
              <input type="datetime-local" className="input input-bordered w-full" {...register("madeAt")} />
              {errors.madeAt ? <span className="text-error-content text-sm">{errors.madeAt.message}</span> : null}
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="label">Descricao (opcional)</span>
              <input type="text" className="input input-bordered w-full" placeholder="Descricao" {...register("description")} />
              {errors.description ? (
                <span className="text-error-content text-sm">{errors.description.message}</span>
              ) : null}
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="label">Cliente vinculado (opcional)</span>
              <select className="select select-bordered w-full" {...register("customerId")}>
                <option value="">Sem cliente vinculado</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </label>

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

            <div className="md:col-span-2 flex justify-end">
              {isEditing ? (
                <button type="button" className="btn btn-ghost" onClick={handleCancelEdit}>
                  Cancelar edicao
                </button>
              ) : null}
              <button type="submit" className="btn btn-primary" disabled={isSubmittingForm}>
                {isSubmittingForm
                  ? "Salvando..."
                  : isEditing
                    ? "Salvar alteracoes"
                    : "Registrar transacao"}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="card border border-base-300 bg-base-100 shadow-sm mt-4">
        <div className="card-body">
          <h2 className="card-title text-base">Historico de transacoes</h2>

          {actionError ? (
            <div className="alert alert-error">
              <span>{actionError}</span>
            </div>
          ) : null}

          {isLoading ? <p>Carregando transacoes...</p> : null}
          {isError ? <p className="text-error">{error.message}</p> : null}

          {!isLoading && !isError && transactions.length === 0 ? (
            <p className="text-sm opacity-70">Nenhuma transacao registrada.</p>
          ) : null}

          {!isLoading && !isError && transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Transacao</th>
                    <th>Data</th>
                    <th>Tipo</th>
                    <th>Metodo</th>
                    <th>Descricao</th>
                    <th>Valor</th>
                    <th>Cliente</th>
                    <th className="text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="font-mono text-xs">{transaction.id.slice(0, 8)}</td>
                      <td>{datetimeFormatter.format(new Date(transaction.madeAt))}</td>
                      <td>
                        <span className={`badge ${transaction.type === "entry" ? "badge-success" : "badge-warning"}`}>
                          {transaction.type === "entry" ? "Entrada" : "Saida"}
                        </span>
                      </td>
                      <td>{methodLabel[transaction.method] ?? transaction.method}</td>
                      <td>{transaction.description || "-"}</td>
                      <td>{currencyFormatter.format(transaction.amount)}</td>
                      <td>{transaction.customer?.name ?? "-"}</td>
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
        </div>
      </section>

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
