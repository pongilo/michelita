import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { CustomerFormModal, type CustomerFormValues } from "@/components/customer-form-modal";
import { useCreateCustomer } from "@/hooks/tanstack/customer/use-create-customer";
import { useGetCustomers } from "@/hooks/tanstack/customer/use-get-customers";
import { useCreateOrder } from "@/hooks/tanstack/order/use-create-order";
import { useCreateTransaction } from "@/hooks/tanstack/transaction/use-create-transaction";

const transactionSchema = z.object({
  type: z.enum(["entry", "exit"]),
  amount: z.number().min(0.01, "O valor deve ser maior que zero."),
  method: z.enum(["pix", "cash", "credit_card", "debit_card"]),
  madeAt: z.string().trim().min(1, "Data/hora da transacao e obrigatoria."),
  description: z.string().trim().optional(),
});

const createOrderFormSchema = z.object({
  customerId: z.union([z.uuid(), z.literal("")]).optional(),
  orderedAt: z.string().trim().min(1, "Data/hora do pedido e obrigatoria."),
  isPaid: z.boolean(),
  note: z.string().trim().optional(),
  items: z
    .array(
      z.object({
        description: z.string().trim().min(1, "Descricao do item e obrigatoria."),
        unitPrice: z.number().min(0, "Preco unitario deve ser maior ou igual a zero."),
        quantity: z.number().int().min(1, "Quantidade minima: 1."),
        deliveredAt: z.string().trim().min(1, "Data de entrega do item e obrigatoria."),
        note: z.string().trim().optional(),
      })
    )
    .min(1, "Adicione pelo menos um item."),
  transactions: z.array(transactionSchema),
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
    type: "entry",
    amount: 0,
    method: "pix",
    madeAt: localDatetimeNow(),
    description: "",
  };
}

export const Route = createFileRoute("/app/order/form")({
  component: OrderFormRoute,
});

function OrderFormRoute() {
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerModalError, setCustomerModalError] = useState("");
  const { organization } = Route.useRouteContext();

  const { data: customers = [], isLoading: isLoadingCustomers } = useGetCustomers({
    organizationId: organization.id,
  });
  const { mutateAsync: createCustomer, isPending: isCreatingCustomer } = useCreateCustomer();
  const { mutateAsync: createOrder, isPending: isCreatingOrder } = useCreateOrder();
  const { mutateAsync: createTransaction, isPending: isCreatingTransaction } = useCreateTransaction({
    organizationId: organization.id,
  });

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateOrderFormValues>({
    resolver: zodResolver(createOrderFormSchema),
    defaultValues: {
      customerId: "",
      orderedAt: localDatetimeNow(),
      isPaid: false,
      note: "",
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
  const watchedCustomerId = watch("customerId");

  const subtotal = useMemo(() => {
    return watchedItems.reduce((sum, item) => {
      const price = Number(item.unitPrice) || 0;
      const qty = Number(item.quantity) || 0;
      return sum + price * qty;
    }, 0);
  }, [watchedItems]);

  async function handleCreateCustomer(values: CustomerFormValues) {
    setCustomerModalError("");

    try {
      const customer = await createCustomer({
        organizationId: organization.id,
        name: values.name.trim(),
        phone: values.phone?.trim() || undefined,
        address: values.address?.trim() || undefined,
        note: values.note?.trim() || undefined,
      });

      setValue("customerId", customer.id, { shouldValidate: true });
      setIsCustomerModalOpen(false);
    } catch (error) {
      setCustomerModalError(error instanceof Error ? error.message : "Erro ao criar cliente.");
    }
  }

  async function onSubmit(values: CreateOrderFormValues) {
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const order = await createOrder({
        organizationId: organization.id,
        customerId: values.customerId ? values.customerId : undefined,
        orderedAt: values.orderedAt,
        isPaid: values.isPaid,
        note: values.note,
        items: values.items.map((item) => ({
          description: item.description,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          deliveredAt: item.deliveredAt,
          note: item.note?.trim() ? item.note.trim() : undefined,
        })),
      });

      for (const t of values.transactions) {
        await createTransaction({
          organizationId: organization.id,
          type: t.type,
          amount: t.amount,
          method: t.method,
          madeAt: t.madeAt,
          description: t.description || undefined,
          linkedOrderId: order.id,
          linkedCustomerId: values.customerId || undefined,
        });
      }

      setSuccessMessage(`Pedido criado com sucesso. ID: ${order.id}`);
      reset({
        customerId: "",
        orderedAt: localDatetimeNow(),
        isPaid: false,
        note: "",
        items: [emptyItem()],
        transactions: [],
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Erro ao registrar pedido.");
    }
  }

  const isPending = isCreatingOrder || isCreatingTransaction;

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Novo pedido</h1>
      </div>

      <div className="card border border-base-300 bg-base-100 shadow-sm">
        <div className="card-body gap-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <section className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <span className="label">Cliente (opcional)</span>
                <div className="flex gap-2">
                  <select className="select select-bordered w-full" {...register("customerId")}>
                    <option value="">Sem cliente vinculado</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-outline btn-square"
                    title="Cadastrar novo cliente"
                    onClick={() => { setCustomerModalError(""); setIsCustomerModalOpen(true); }}
                  >
                    +
                  </button>
                </div>
                {isLoadingCustomers ? (
                  <span className="text-xs opacity-70">Carregando clientes...</span>
                ) : null}
              </div>

              <label className="space-y-1">
                <span className="label">Data/hora do pedido</span>
                <input type="datetime-local" className="input input-bordered w-full" {...register("orderedAt")} />
                {errors.orderedAt ? (
                  <span className="text-error-content text-sm">{errors.orderedAt.message}</span>
                ) : null}
              </label>
            </section>

            <label className="space-y-1 block">
              <span className="label">Observacao do pedido</span>
              <textarea
                className="textarea textarea-bordered w-full"
                rows={3}
                placeholder="Observacoes gerais do pedido (opcional)"
                {...register("note")}
              />
            </label>

            <div>
              <label className="label cursor-pointer justify-start gap-3">
                <input type="checkbox" className="checkbox" {...register("isPaid")} />
                <div>
                  <span className="label-text">Pedido pago</span>
                  <p className="text-sm opacity-70">Marque quando o pedido ja estiver quitado.</p>
                </div>
              </label>
            </div>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium">Itens do pedido</h2>
                <button type="button" className="btn btn-sm btn-outline" onClick={() => appendItem(emptyItem())}>
                  Adicionar item
                </button>
              </div>

              {itemFields.map((field, index) => {
                const itemSubtotal = watchedItems[index]
                  ? (Number(watchedItems[index].unitPrice) || 0) * (Number(watchedItems[index].quantity) || 0)
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

                      <div className="grid gap-3 md:grid-cols-3">
                        <label className="space-y-1">
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

                        <label className="space-y-1 md:col-span-2">
                          <span className="label">Observacao</span>
                          <input type="text" className="input input-bordered w-full" {...register(`items.${index}.note`)} />
                        </label>
                      </div>

                      <div className="text-sm opacity-70">Subtotal do item: R$ {itemSubtotal.toFixed(2)}</div>
                    </div>
                  </div>
                );
              })}
            </section>

            <section className="rounded-box bg-base-200 p-4 text-sm">
              <div className="flex justify-between">
                <span>Total dos itens</span>
                <span>R$ {subtotal.toFixed(2)}</span>
              </div>
            </section>

            {/* Seção de transações */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium">Transações</h2>
                  {watchedCustomerId ? (
                    <p className="text-sm opacity-70">Vinculadas ao pedido e ao cliente selecionado.</p>
                  ) : (
                    <p className="text-sm opacity-70">Vinculadas ao pedido.</p>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => appendTransaction(emptyTransaction())}
                >
                  Adicionar transação
                </button>
              </div>

              {transactionFields.map((field, index) => (
                <div key={field.id} className="card border border-base-300 bg-base-100">
                  <div className="card-body gap-3 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Transação {index + 1}</span>
                      <button
                        type="button"
                        className="btn btn-xs btn-ghost text-error"
                        onClick={() => removeTransaction(index)}
                      >
                        Remover
                      </button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="space-y-1">
                        <span className="label">Tipo</span>
                        <select className="select select-bordered w-full" {...register(`transactions.${index}.type`)}>
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
                          {...register(`transactions.${index}.amount`, { valueAsNumber: true })}
                        />
                        {errors.transactions?.[index]?.amount ? (
                          <span className="text-error-content text-sm">{errors.transactions[index]?.amount?.message}</span>
                        ) : null}
                      </label>

                      <label className="space-y-1">
                        <span className="label">Metodo</span>
                        <select className="select select-bordered w-full" {...register(`transactions.${index}.method`)}>
                          <option value="pix">PIX</option>
                          <option value="cash">Dinheiro</option>
                          <option value="credit_card">Cartao de credito</option>
                          <option value="debit_card">Cartao de debito</option>
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
                          <span className="text-error-content text-sm">{errors.transactions[index]?.madeAt?.message}</span>
                        ) : null}
                      </label>

                      <label className="space-y-1 md:col-span-2">
                        <span className="label">Descricao (opcional)</span>
                        <input
                          type="text"
                          className="input input-bordered w-full"
                          placeholder="Descricao da transacao"
                          {...register(`transactions.${index}.description`)}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              ))}
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
              <button type="submit" disabled={isPending} className="btn btn-primary">
                {isPending ? "Salvando..." : "Registrar pedido"}
              </button>
            </div>
          </form>
        </div>
      </div>
      <CustomerFormModal
        isOpen={isCustomerModalOpen}
        mode="create"
        isSubmitting={isCreatingCustomer}
        errorMessage={customerModalError}
        successMessage=""
        onClose={() => setIsCustomerModalOpen(false)}
        onSubmit={handleCreateCustomer}
      />
    </main>
  );
}
