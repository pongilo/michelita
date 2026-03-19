import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { useCreateCustomer } from "@/hooks/tanstack/customer/use-create-customer";
import { useGetCustomers } from "@/hooks/tanstack/customer/use-get-customers";
import { useGetOrder } from "@/hooks/tanstack/order/use-get-order";
import { useUpdateOrder } from "@/hooks/tanstack/order/use-update-order";

const updateOrderFormSchema = z.object({
  customerId: z.union([z.uuid(), z.literal("")]).optional(),
  orderedAt: z.string().trim().min(1, "Data/hora do pedido e obrigatoria."),
  isCanceled: z.boolean(),
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
});

type UpdateOrderFormValues = z.infer<typeof updateOrderFormSchema>;

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

function emptyItem(): UpdateOrderFormValues["items"][number] {
  return {
    description: "",
    unitPrice: 0,
    quantity: 1,
    deliveredAt: localDatetimeNow(),
    note: "",
  };
}

export const Route = createFileRoute("/app/order/edit/$orderId")({
  component: EditOrderRoute,
});

function EditOrderRoute() {
  const { organization } = Route.useRouteContext();
  const { orderId } = Route.useParams();
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [quickCustomerName, setQuickCustomerName] = useState("");
  const [quickCustomerPhone, setQuickCustomerPhone] = useState("");
  const [quickCustomerError, setQuickCustomerError] = useState("");
  const [quickCustomerSuccess, setQuickCustomerSuccess] = useState("");

  const { data: customers = [], isLoading: isLoadingCustomers } = useGetCustomers({
    organizationId: organization.id,
  });
  const {
    data: order,
    isLoading: isLoadingOrder,
    isError: isOrderError,
    error: orderError,
  } = useGetOrder({
    organizationId: organization.id,
    orderId,
  });
  const { mutateAsync: createCustomer, isPending: isCreatingCustomer } = useCreateCustomer();
  const { mutateAsync: updateOrder, isPending: isUpdatingOrder } = useUpdateOrder({
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
  } = useForm<UpdateOrderFormValues>({
    resolver: zodResolver(updateOrderFormSchema),
    defaultValues: {
      customerId: "",
      orderedAt: localDatetimeNow(),
      isCanceled: false,
      isPaid: false,
      note: "",
      items: [emptyItem()],
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

  const watchedItems = watch("items");

  const subtotal = useMemo(() => {
    return watchedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }, [watchedItems]);

  useEffect(() => {
    if (!order) {
      return;
    }

    reset({
      customerId: order.customerId ?? "",
      orderedAt: toLocalDatetimeInput(order.orderedAt),
      isCanceled: order.isCanceled,
      isPaid: order.isPaid,
      note: order.note ?? "",
      items: order.item.length
        ? order.item.map((item) => ({
            description: item.description,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            deliveredAt: toLocalDatetimeInput(item.deliveredAt),
            note: item.note ?? "",
          }))
        : [emptyItem()],
    });
  }, [order, reset]);

  async function handleQuickCreateCustomer() {
    setQuickCustomerError("");
    setQuickCustomerSuccess("");

    if (quickCustomerName.trim().length < 2) {
      setQuickCustomerError("Informe ao menos 2 caracteres para o nome do cliente.");
      return;
    }

    try {
      const customer = await createCustomer({
        organizationId: organization.id,
        name: quickCustomerName.trim(),
        phone: quickCustomerPhone.trim() || undefined,
      });

      setValue("customerId", customer.id, {
        shouldValidate: true,
      });
      setQuickCustomerName("");
      setQuickCustomerPhone("");
      setQuickCustomerSuccess(`Cliente ${customer.name} criado e vinculado ao pedido.`);
    } catch (error) {
      setQuickCustomerError(error instanceof Error ? error.message : "Erro ao criar cliente.");
    }
  }

  async function onSubmit(values: UpdateOrderFormValues) {
    if (!order) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    try {
      await updateOrder({
        id: order.id,
        organizationId: organization.id,
        customerId: values.customerId ? values.customerId : null,
        orderedAt: values.orderedAt,
        isCanceled: values.isCanceled,
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

      setSuccessMessage("Pedido atualizado com sucesso.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Erro ao atualizar pedido.");
    }
  }

  if (isLoadingOrder) {
    return (
      <main className="mx-auto w-full max-w-5xl px-5 py-8">
        <p>Carregando pedido...</p>
      </main>
    );
  }

  if (isOrderError) {
    return (
      <main className="mx-auto w-full max-w-5xl px-5 py-8">
        <div className="alert alert-error">
          <span>{orderError.message}</span>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="mx-auto w-full max-w-5xl px-5 py-8">
        <div className="alert alert-warning">
          <span>Pedido nao encontrado.</span>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Editar pedido</h1>
        <Link to="/app/orders" className="btn btn-sm btn-outline">
          Voltar para pedidos
        </Link>
      </div>

      <div className="card border border-base-300 bg-base-100 shadow-sm">
        <div className="card-body gap-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <section className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1">
                <span className="label">Cliente (opcional)</span>
                <select className="select select-bordered w-full" {...register("customerId")}>
                  <option value="">Sem cliente vinculado</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
                {isLoadingCustomers ? (
                  <span className="text-xs opacity-70">Carregando clientes...</span>
                ) : null}
              </label>

              <label className="space-y-1">
                <span className="label">Data/hora do pedido</span>
                <input type="datetime-local" className="input input-bordered w-full" {...register("orderedAt")} />
                {errors.orderedAt ? (
                  <span className="text-error-content text-sm">{errors.orderedAt.message}</span>
                ) : null}
              </label>
            </section>

            <section className="rounded-box border border-base-300 p-4">
              <h2 className="text-base font-medium">Cadastro rapido de cliente</h2>
              <p className="mt-1 text-sm opacity-70">Crie e vincule o cliente sem sair da edicao.</p>

              <div className="mt-3 grid gap-3 md:grid-cols-[1fr_220px_auto]">
                <input
                  type="text"
                  value={quickCustomerName}
                  onChange={(event) => setQuickCustomerName(event.target.value)}
                  placeholder="Nome do cliente"
                  className="input input-bordered w-full"
                />
                <input
                  type="text"
                  value={quickCustomerPhone}
                  onChange={(event) => setQuickCustomerPhone(event.target.value)}
                  placeholder="Telefone (opcional)"
                  className="input input-bordered w-full"
                />
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={isCreatingCustomer}
                  onClick={handleQuickCreateCustomer}
                >
                  {isCreatingCustomer ? "Criando..." : "Criar cliente"}
                </button>
              </div>

              {quickCustomerError ? <p className="mt-2 text-sm text-error">{quickCustomerError}</p> : null}
              {quickCustomerSuccess ? <p className="mt-2 text-sm text-success">{quickCustomerSuccess}</p> : null}
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <div className="rounded-box border border-base-300 p-4">
                <label className="label cursor-pointer justify-start gap-3">
                  <input type="checkbox" className="checkbox" {...register("isCanceled")} />
                  <span className="label-text">Pedido cancelado</span>
                </label>
                <label className="label cursor-pointer justify-start gap-3">
                  <input type="checkbox" className="checkbox" {...register("isPaid")} />
                  <span className="label-text">Pedido pago</span>
                </label>
              </div>

              <label className="space-y-1">
                <span className="label">Observacao do pedido</span>
                <textarea
                  className="textarea textarea-bordered w-full"
                  rows={3}
                  placeholder="Observacoes gerais do pedido (opcional)"
                  {...register("note")}
                />
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
              <button type="submit" disabled={isUpdatingOrder} className="btn btn-primary">
                {isUpdatingOrder ? "Salvando..." : "Salvar alteracoes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
