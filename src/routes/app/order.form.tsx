import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { createOrder, createOrderSchema } from "@/lib/api/order/create-order";

const ORDER_STATUS_OPTIONS = [
  { value: "pending", label: "Pendente" },
  { value: "confirmed", label: "Confirmado" },
  { value: "preparing", label: "Preparando" },
  { value: "ready", label: "Pronto" },
  { value: "delivered", label: "Entregue" },
  { value: "cancelled", label: "Cancelado" },
] as const;

const TRANSACTION_METHOD_OPTIONS = [
  { value: "pix", label: "PIX" },
  { value: "cash", label: "Dinheiro" },
  { value: "credit_card", label: "Cartao de credito" },
  { value: "debit_card", label: "Cartao de debito" },
  { value: "transfer", label: "Transferencia" },
] as const;

const createOrderFormSchema = createOrderSchema.omit({
  organizationId: true,
});

type CreateOrderFormValues = z.infer<typeof createOrderFormSchema>;

function localDatetimeNow() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function emptyItem(): CreateOrderFormValues["items"][number] {
  return {
    description: "",
    unitPrice: 0,
    quantity: 1,
    deliveredAt: localDatetimeNow(),
    note: "",
  };
}

function emptyTransaction(): CreateOrderFormValues["transactions"][number] {
  return {
    amount: 0,
    method: "pix",
    madeAt: localDatetimeNow(),
  };
}

export const Route = createFileRoute("/app/order/form")({
  component: OrderFormRoute,
  beforeLoad: ({ context }) => {
    return context
  }
});

function OrderFormRoute() {
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { organization } = Route.useRouteContext();

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateOrderFormValues>({
    resolver: zodResolver(createOrderFormSchema),
    defaultValues: {
      status: "pending",
      orderedAt: localDatetimeNow(),
      items: [emptyItem()],
      transactions: [],
    },
  });

  const {
    fields: itemFields,
    append: appendItem,
    remove: removeItem,
  } = useFieldArray({
    control,
    name: "items",
  });

  const {
    fields: transactionFields,
    append: appendTransaction,
    remove: removeTransaction,
  } = useFieldArray({
    control,
    name: "transactions",
  });

  const watchedItems = watch("items");
  const watchedTransactions = watch("transactions");

  const subtotal = useMemo(() => {
    return watchedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }, [watchedItems]);

  const transactionTotal = useMemo(() => {
    return watchedTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  }, [watchedTransactions]);

  async function onSubmit(values: CreateOrderFormValues) {
    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const order = await createOrder({
        ...values,
        organizationId: organization.id,
      });

      setSuccessMessage(`Pedido criado com sucesso. ID: ${order.id}`);
      reset({
        status: "pending",
        orderedAt: localDatetimeNow(),
        items: [emptyItem()],
        transactions: [],
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Erro ao registrar pedido.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-10">
      <div className="card border border-base-300 bg-base-100 shadow-sm">
        <div className="card-body gap-6">
          <h1 className="card-title text-2xl">Novo pedido</h1>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <section className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1">
                <span className="label">Status</span>
                <select className="select select-bordered w-full" {...register("status")}>
                  {ORDER_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="label">Data/hora do pedido</span>
                <input type="datetime-local" className="input input-bordered w-full" {...register("orderedAt")} />
                {errors.orderedAt ? (
                  <span className="text-error-content text-sm">{errors.orderedAt.message}</span>
                ) : null}
              </label>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium">Itens do pedido</h2>
                <button type="button" className="btn btn-sm btn-outline" onClick={() => appendItem(emptyItem())}>
                  Adicionar item
                </button>
              </div>

              {itemFields.map((field, index) => {
                const itemSubtotal = watchedItems[index]
                  ? watchedItems[index].unitPrice * watchedItems[index].quantity
                  : 0;

                return (
                  <div key={field.id} className="card border border-base-300 bg-base-100">
                    <div className="card-body gap-3 p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Item {index + 1}</span>
                        {itemFields.length > 1 ? (
                          <button
                            type="button"
                            className="btn btn-xs btn-ghost text-error"
                            onClick={() => removeItem(index)}
                          >
                            Remover
                          </button>
                        ) : null}
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="space-y-1 md:col-span-2">
                          <span className="label">Descricao</span>
                          <input
                            type="text"
                            className="input input-bordered w-full"
                            {...register(`items.${index}.description`)}
                          />
                          {errors.items?.[index]?.description ? (
                            <span className="text-error-content text-sm">
                              {errors.items[index]?.description?.message}
                            </span>
                          ) : null}
                        </label>

                        <label className="space-y-1">
                          <span className="label">Preco unitario</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="input input-bordered w-full"
                            {...register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                          />
                          {errors.items?.[index]?.unitPrice ? (
                            <span className="text-error-content text-sm">
                              {errors.items[index]?.unitPrice?.message}
                            </span>
                          ) : null}
                        </label>

                        <label className="space-y-1">
                          <span className="label">Quantidade</span>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            className="input input-bordered w-full"
                            {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                          />
                          {errors.items?.[index]?.quantity ? (
                            <span className="text-error-content text-sm">
                              {errors.items[index]?.quantity?.message}
                            </span>
                          ) : null}
                        </label>

                        <label className="space-y-1">
                          <span className="label">Data/hora de entrega do item</span>
                          <input
                            type="datetime-local"
                            className="input input-bordered w-full"
                            {...register(`items.${index}.deliveredAt`)}
                          />
                          {errors.items?.[index]?.deliveredAt ? (
                            <span className="text-error-content text-sm">
                              {errors.items[index]?.deliveredAt?.message}
                            </span>
                          ) : null}
                        </label>

                        <label className="space-y-1">
                          <span className="label">Observacao</span>
                          <input
                            type="text"
                            className="input input-bordered w-full"
                            {...register(`items.${index}.note`)}
                          />
                          {errors.items?.[index]?.note ? (
                            <span className="text-error-content text-sm">{errors.items[index]?.note?.message}</span>
                          ) : null}
                        </label>
                      </div>

                      <div className="text-sm opacity-70">Subtotal do item: R$ {itemSubtotal.toFixed(2)}</div>
                    </div>
                  </div>
                );
              })}
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium">Transacoes (opcional)</h2>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => appendTransaction(emptyTransaction())}
                >
                  Adicionar transacao
                </button>
              </div>

              {transactionFields.length === 0 ? (
                <p className="text-sm opacity-70">Nenhuma transacao adicionada.</p>
              ) : null}

              {transactionFields.map((field, index) => (
                <div key={field.id} className="card border border-base-300 bg-base-100">
                  <div className="card-body gap-3 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Transacao {index + 1}</span>
                      <button
                        type="button"
                        className="btn btn-xs btn-ghost text-error"
                        onClick={() => removeTransaction(index)}
                      >
                        Remover
                      </button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <label className="space-y-1">
                        <span className="label">Valor</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="input input-bordered w-full"
                          {...register(`transactions.${index}.amount`, { valueAsNumber: true })}
                        />
                        {errors.transactions?.[index]?.amount ? (
                          <span className="text-error-content text-sm">
                            {errors.transactions[index]?.amount?.message}
                          </span>
                        ) : null}
                      </label>

                      <label className="space-y-1">
                        <span className="label">Metodo</span>
                        <select className="select select-bordered w-full" {...register(`transactions.${index}.method`)}>
                          {TRANSACTION_METHOD_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="space-y-1">
                        <span className="label">Data/hora</span>
                        <input
                          type="datetime-local"
                          className="input input-bordered w-full"
                          {...register(`transactions.${index}.madeAt`)}
                        />
                        {errors.transactions?.[index]?.madeAt ? (
                          <span className="text-error-content text-sm">
                            {errors.transactions[index]?.madeAt?.message}
                          </span>
                        ) : null}
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </section>

            <section className="rounded-box bg-base-200 p-4 text-sm">
              <div className="flex justify-between">
                <span>Total dos itens</span>
                <span>R$ {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total em transacoes</span>
                <span>R$ {transactionTotal.toFixed(2)}</span>
              </div>
            </section>

            {errorMessage ? (
              <div className="alert alert-error">
                <span>{errorMessage}</span>
              </div>
            ) : null}

            {successMessage ? (
              <div className="alert alert-success">
                <span>{successMessage}</span>
              </div>
            ) : null}

            <div className="flex justify-end">
              <button type="submit" disabled={isSubmitting} className="btn btn-primary">
                {isSubmitting ? "Salvando..." : "Registrar pedido"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
