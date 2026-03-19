import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useGetOrders } from "@/hooks/tanstack/order/use-get-orders";
import { useCreateTransaction } from "@/hooks/tanstack/transaction/use-create-transaction";
import { useGetTransactions } from "@/hooks/tanstack/transaction/use-get-transactions";
import { useUpdateTransaction } from "@/hooks/tanstack/transaction/use-update-transaction";
import { currencyFormatter, dateFormatter as datetimeFormatter } from "@/lib/utils/formatter";

const transactionFormSchema = z.object({
  type: z.enum(["entry", "exit"]),
  amount: z.number().min(0.01, "Informe um valor maior que zero."),
  method: z.enum(["pix", "cash", "credit_card", "debit_card"]),
  madeAt: z.string().trim().min(1, "Data/hora da transacao e obrigatoria."),
  orderId: z.union([z.uuid(), z.literal("")]).optional(),
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

export const Route = createFileRoute("/app/transactions")({
  component: TransactionsPage,
});

function TransactionsPage() {
  const { organization } = Route.useRouteContext();
  const { data: transactions = [], isLoading, isError, error } = useGetTransactions({
    organizationId: organization.id,
  });
  const { data: orders = [] } = useGetOrders({
    organizationId: organization.id,
  });
  const { mutateAsync: createTransaction, isPending: isCreatingTransaction } = useCreateTransaction({
    organizationId: organization.id,
  });
  const { mutateAsync: updateTransaction, isPending: isUpdatingTransaction } = useUpdateTransaction({
    organizationId: organization.id,
  });
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [editFormError, setEditFormError] = useState("");
  const [editFormSuccess, setEditFormSuccess] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      type: "entry",
      amount: 0,
      method: "pix",
      madeAt: localDatetimeNow(),
      orderId: "",
    },
  });

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      type: "entry",
      amount: 0,
      method: "pix",
      madeAt: localDatetimeNow(),
      orderId: "",
    },
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
      const transaction = await createTransaction({
        organizationId: organization.id,
        type: values.type,
        amount: values.amount,
        method: values.method,
        madeAt: values.madeAt,
        orderId: values.orderId ? values.orderId : undefined,
      });

      setFormSuccess(`Transacao ${transaction.id.slice(0, 8)} registrada com sucesso.`);
      reset({
        type: "entry",
        amount: 0,
        method: "pix",
        madeAt: localDatetimeNow(),
        orderId: "",
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Erro ao registrar transacao.");
    }
  }

  function handleStartEdit(transaction: (typeof transactions)[number]) {
    setEditingTransactionId(transaction.id);
    setEditFormError("");
    setEditFormSuccess("");

    resetEdit({
      type: transaction.type,
      amount: Math.abs(transaction.amount),
      method: transaction.method,
      madeAt: toLocalDatetimeInput(transaction.madeAt),
      orderId: transaction.orderId ?? "",
    });
  }

  async function onSubmitEdit(values: TransactionFormValues) {
    if (!editingTransactionId) {
      return;
    }

    setEditFormError("");
    setEditFormSuccess("");

    try {
      await updateTransaction({
        id: editingTransactionId,
        organizationId: organization.id,
        type: values.type,
        amount: values.amount,
        method: values.method,
        madeAt: values.madeAt,
        orderId: values.orderId ? values.orderId : null,
      });

      setEditFormSuccess("Transacao atualizada com sucesso.");
    } catch (error) {
      setEditFormError(error instanceof Error ? error.message : "Erro ao atualizar transacao.");
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
          <h2 className="card-title text-base">Nova transacao</h2>
          <p className="text-sm opacity-70">Cadastre entradas e saidas, com ou sem pedido vinculado.</p>

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
              <span className="label">Pedido vinculado (opcional)</span>
              <select className="select select-bordered w-full" {...register("orderId")}>
                <option value="">Sem pedido vinculado</option>
                {orders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.id.slice(0, 8)} - {order.customer?.name ?? "Sem cliente"}
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
              <button type="submit" className="btn btn-primary" disabled={isCreatingTransaction}>
                {isCreatingTransaction ? "Salvando..." : "Registrar transacao"}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="card border border-base-300 bg-base-100 shadow-sm mt-4">
        <div className="card-body">
          <h2 className="card-title text-base">Historico de transacoes</h2>

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
                    <th>Valor</th>
                    <th>Pedido</th>
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
                      <td>{currencyFormatter.format(transaction.amount)}</td>
                      <td className="font-mono text-xs">{transaction.orderId ? transaction.orderId.slice(0, 8) : "-"}</td>
                      <td>{transaction.order?.customer?.name ?? "-"}</td>
                      <td>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            className="btn btn-xs btn-outline"
                            onClick={() => handleStartEdit(transaction)}
                          >
                            Editar
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

      {editingTransactionId ? (
        <section className="card border border-base-300 bg-base-100 shadow-sm mt-4">
          <div className="card-body">
            <h2 className="card-title text-base">Editar transacao</h2>

            <form onSubmit={handleSubmitEdit(onSubmitEdit)} className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1">
                <span className="label">Tipo</span>
                <select className="select select-bordered w-full" {...registerEdit("type")}>
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
                  {...registerEdit("amount", { valueAsNumber: true })}
                />
                {editErrors.amount ? (
                  <span className="text-error-content text-sm">{editErrors.amount.message}</span>
                ) : null}
              </label>

              <label className="space-y-1">
                <span className="label">Metodo</span>
                <select className="select select-bordered w-full" {...registerEdit("method")}>
                  <option value="pix">PIX</option>
                  <option value="cash">Dinheiro</option>
                  <option value="credit_card">Cartao de credito</option>
                  <option value="debit_card">Cartao de debito</option>
                </select>
              </label>

              <label className="space-y-1">
                <span className="label">Data/hora</span>
                <input type="datetime-local" className="input input-bordered w-full" {...registerEdit("madeAt")} />
                {editErrors.madeAt ? (
                  <span className="text-error-content text-sm">{editErrors.madeAt.message}</span>
                ) : null}
              </label>

              <label className="space-y-1 md:col-span-2">
                <span className="label">Pedido vinculado (opcional)</span>
                <select className="select select-bordered w-full" {...registerEdit("orderId")}>
                  <option value="">Sem pedido vinculado</option>
                  {orders.map((order) => (
                    <option key={order.id} value={order.id}>
                      {order.id.slice(0, 8)} - {order.customer?.name ?? "Sem cliente"}
                    </option>
                  ))}
                </select>
              </label>

              {editFormError ? (
                <div className="alert alert-error md:col-span-2">
                  <span>{editFormError}</span>
                </div>
              ) : null}

              {editFormSuccess ? (
                <div className="alert alert-success md:col-span-2">
                  <span>{editFormSuccess}</span>
                </div>
              ) : null}

              <div className="md:col-span-2 flex justify-end gap-2">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setEditingTransactionId(null);
                    setEditFormError("");
                    setEditFormSuccess("");
                  }}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isUpdatingTransaction}>
                  {isUpdatingTransaction ? "Salvando..." : "Salvar alteracoes"}
                </button>
              </div>
            </form>
          </div>
        </section>
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
