import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { CustomerFormModal, type CustomerFormValues } from "@/components/customer-form-modal";
import { useCreateCustomer } from "@/hooks/tanstack/customer/use-create-customer";
import { useGetCustomers } from "@/hooks/tanstack/customer/use-get-customers";
import { useCreateOrder } from "@/hooks/tanstack/order/use-create-order";
import { useCreateTransaction } from "@/hooks/tanstack/transaction/use-create-transaction";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  shippingFee: z.number().min(0).optional(),
  discount: z.number().min(0).optional(),
  items: z
    .array(
      z.object({
        isOrder: z.boolean(),
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

function emptyItem(orderedAt?: string, isOrder = false): CreateOrderFormValues["items"][number] {
  return {
    isOrder,
    description: "",
    unitPrice: 0,
    quantity: 1,
    deliveredAt: orderedAt ?? localDatetimeNow(),
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
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
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
      shippingFee: 0,
      discount: 0,
      items: [emptyItem(localDatetimeNow())],
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

  const [showNote, setShowNote] = useState<Record<string, boolean>>({});
  const [showOrderNote, setShowOrderNote] = useState(false);
  const [orderisOrder, setOrderisOrder] = useState(false);
  const [orderDeliveredAt, setOrderDeliveredAt] = useState("");

  const watchedItems = watch("items");
  const watchedCustomerId = watch("customerId");
  const watchedOrderedAt = watch("orderedAt");
  const watchedShippingFee = watch("shippingFee");
  const watchedDiscount = watch("discount");

  useEffect(() => {
    watchedItems.forEach((item, index) => {
      if (!item.isOrder) {
        setValue(`items.${index}.deliveredAt`, watchedOrderedAt, { shouldValidate: false });
      }
    });
  }, [watchedOrderedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const subtotal = useMemo(() => {
    return watchedItems.reduce((sum, item) => {
      const price = Number(item.unitPrice) || 0;
      const qty = Number(item.quantity) || 0;
      return sum + price * qty;
    }, 0);
  }, [watchedItems]);

  const total = useMemo(() => {
    const fee = Number(watchedShippingFee) || 0;
    const disc = Number(watchedDiscount) || 0;
    return subtotal + fee - disc;
  }, [subtotal, watchedShippingFee, watchedDiscount]);

  async function handleCreateCustomer(values: CustomerFormValues) {
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
      toast.error(error instanceof Error ? error.message : "Erro ao criar cliente.");
    }
  }

  async function onSubmit(values: CreateOrderFormValues) {

    try {
      const order = await createOrder({
        organizationId: organization.id,
        customerId: values.customerId ? values.customerId : undefined,
        orderedAt: values.orderedAt,
        isPaid: values.isPaid,
        note: values.note,
        shippingFee: values.shippingFee || undefined,
        discount: values.discount || undefined,
        items: values.items.map((item) => ({
          description: item.description,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          deliveredAt: item.isOrder ? item.deliveredAt : values.orderedAt,
          isDelivered: !item.isOrder,
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

      toast.success(`Pedido criado com sucesso. ID: ${order.id}`);
      const newOrderedAt = localDatetimeNow();
      reset({
        customerId: "",
        orderedAt: newOrderedAt,
        isPaid: false,
        note: "",
        shippingFee: 0,
        discount: 0,
        items: [emptyItem(newOrderedAt)],
        transactions: [],
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao registrar pedido.");
    }
  }

  const isPending = isCreatingOrder || isCreatingTransaction;

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Novo pedido</h1>
      </div>

      <div className="bg-base-100">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <section className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel>Cliente (opcional)</FieldLabel>
              <div className="flex gap-2">
                <Controller
                  name="customerId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sem cliente vinculado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Sem cliente vinculado</SelectItem>
                        {customers.map((customer) => {
                          const details = [customer.phone, customer.address].filter(Boolean).join(" · ");
                          return (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name}{details ? ` — ${details}` : ""}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  )}
                />
                <Button
                  variant="outline"
                  size="icon"
                  title="Cadastrar novo cliente"
                  onClick={() => setIsCustomerModalOpen(true)}
                >
                  +
                </Button>
              </div>
              {isLoadingCustomers ? (
                <span className="text-xs opacity-70">Carregando clientes...</span>
              ) : null}
            </Field>

            <Field>
              <FieldLabel>Data/hora do pedido</FieldLabel>
              <Input type="datetime-local" {...register("orderedAt")} />
              <FieldError>{errors.orderedAt?.message}</FieldError>
            </Field>
          </section>

          {showOrderNote ? (
            <Field>
              <div className="flex items-center justify-between">
                <FieldLabel>Observação do pedido</FieldLabel>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="text-error opacity-60"
                  onClick={() => {
                    setValue("note", "");
                    setShowOrderNote(false);
                  }}
                >
                  Remover
                </Button>
              </div>
              <textarea
                className="w-full rounded-2xl border border-input bg-input/30 px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
                rows={3}
                autoFocus
                {...register("note")}
              />
            </Field>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="w-full justify-start opacity-50"
              onClick={() => setShowOrderNote(true)}
            >
              + Adicionar observação do pedido
            </Button>
          )}

          <div>
            <label className="flex cursor-pointer items-center gap-3">
              <Controller
                name="isPaid"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <div>
                <span className="text-sm font-medium">Pedido pago</span>
                <p className="text-sm opacity-70">Marque quando o pedido ja estiver quitado.</p>
              </div>
            </label>
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Itens do pedido</h2>
              <Button type="button" variant="outline" size="sm" onClick={() => appendItem(emptyItem(orderisOrder && orderDeliveredAt ? orderDeliveredAt : watchedOrderedAt, orderisOrder))}>
                Adicionar item
              </Button>
            </div>

            <label className="flex cursor-pointer items-center gap-3">
              <Checkbox
                checked={orderisOrder}
                onCheckedChange={(checked) => {
                  setOrderisOrder(!!checked);
                  if (checked) {
                    setOrderDeliveredAt(watchedOrderedAt);
                  } else {
                    setOrderDeliveredAt("");
                  }
                  itemFields.forEach((_, i) => {
                    setValue(`items.${i}.isOrder`, !!checked);
                    if (!checked) {
                      setValue(`items.${i}.deliveredAt`, watchedOrderedAt, { shouldValidate: true });
                    }
                  });
                }}
              />
              <div>
                <span className="text-sm font-medium">Encomenda (todos os itens)</span>
              </div>
            </label>

            {orderisOrder ? (
              <Field>
                <FieldLabel>Data/hora de entrega (todos os itens)</FieldLabel>
                <Input
                  type="datetime-local"
                  value={orderDeliveredAt}
                  onChange={(e) => {
                    const val = e.target.value;
                    setOrderDeliveredAt(val);
                    if (val) {
                      itemFields.forEach((_, i) => {
                        setValue(`items.${i}.deliveredAt`, val, { shouldValidate: true });
                      });
                    }
                  }}
                />
                <p className="text-xs opacity-50">Cada item pode ter sua data ajustada individualmente abaixo.</p>
              </Field>
            ) : null}

            {itemFields.map((field, index) => {
              const itemSubtotal = watchedItems[index]
                ? (Number(watchedItems[index].unitPrice) || 0) * (Number(watchedItems[index].quantity) || 0)
                : 0;
              const isOrder = watchedItems[index]?.isOrder ?? false;

              return (
                <div key={field.id} className="card border border-base-300 bg-base-100">
                  <div className="card-body gap-3 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Item {index + 1}</span>
                      {itemFields.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          className="text-error"
                          onClick={() => removeItem(index)}
                        >
                          Remover
                        </Button>
                      ) : null}
                    </div>

                    <label className="flex cursor-pointer items-center gap-3">
                      <Controller
                        name={`items.${index}.isOrder`}
                        control={control}
                        render={({ field: checkField }) => (
                          <Checkbox
                            checked={checkField.value}
                            onCheckedChange={(checked) => {
                              checkField.onChange(checked);
                              if (!checked) {
                                setValue(`items.${index}.deliveredAt`, watchedOrderedAt, { shouldValidate: true });
                              }
                            }}
                          />
                        )}
                      />
                      <div>
                        <span className="text-sm font-medium">Encomenda</span>
                      </div>
                    </label>

                    <FieldGroup>
                      <div className="grid gap-3 md:grid-cols-3">
                        <Field>
                          <FieldLabel>Descricao</FieldLabel>
                          <Input
                            type="text"
                            {...register(`items.${index}.description`)}
                          />
                          <FieldError>{errors.items?.[index]?.description?.message}</FieldError>
                        </Field>

                        <Field>
                          <FieldLabel>Preço unitário</FieldLabel>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            {...register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                          />
                          <FieldError>{errors.items?.[index]?.unitPrice?.message}</FieldError>
                        </Field>

                        <Field>
                          <FieldLabel>Quantidade</FieldLabel>
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                          />
                          <FieldError>{errors.items?.[index]?.quantity?.message}</FieldError>
                        </Field>

                        {isOrder ? (
                          <Field>
                            <FieldLabel>Data/hora de entrega</FieldLabel>
                            <Input
                              type="datetime-local"
                              {...register(`items.${index}.deliveredAt`)}
                            />
                            <FieldError>{errors.items?.[index]?.deliveredAt?.message}</FieldError>
                          </Field>
                        ) : null}

                        <div className={`flex flex-col justify-end ${isOrder ? "md:col-span-2" : "md:col-span-3"}`}>
                          {showNote[field.id] ? (
                            <Field>
                              <div className="flex items-center justify-between">
                                <FieldLabel>Observação</FieldLabel>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="xs"
                                  className="text-error opacity-60"
                                  onClick={() => {
                                    setValue(`items.${index}.note`, "");
                                    setShowNote((prev) => ({ ...prev, [field.id]: false }));
                                  }}
                                >
                                  Remover
                                </Button>
                              </div>
                              <Input
                                type="text"
                                autoFocus
                                {...register(`items.${index}.note`)}
                              />
                            </Field>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              className="w-full justify-start opacity-50"
                              onClick={() => setShowNote((prev) => ({ ...prev, [field.id]: true }))}
                            >
                              + Adicionar observação
                            </Button>
                          )}
                        </div>
                      </div>
                    </FieldGroup>

                    <div className="text-sm opacity-70">Subtotal do item: R$ {itemSubtotal.toFixed(2)}</div>
                  </div>
                </div>
              );
            })}
          </section>

          <section className="rounded-box bg-base-200 p-4 text-sm space-y-3">
            <FieldGroup>
              <div className="grid gap-3 md:grid-cols-2">
                <Field>
                  <FieldLabel>Frete / taxa adicional</FieldLabel>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    {...register("shippingFee", { valueAsNumber: true })}
                  />
                </Field>
                <Field>
                  <FieldLabel>Desconto</FieldLabel>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    {...register("discount", { valueAsNumber: true })}
                  />
                </Field>
              </div>
            </FieldGroup>
            <div className="divider my-0" />
            <div className="flex justify-between text-opacity-70">
              <span>Subtotal dos itens</span>
              <span>R$ {subtotal.toFixed(2)}</span>
            </div>
            {(Number(watchedShippingFee) || 0) > 0 ? (
              <div className="flex justify-between text-opacity-70">
                <span>+ Frete</span>
                <span>R$ {(Number(watchedShippingFee) || 0).toFixed(2)}</span>
              </div>
            ) : null}
            {(Number(watchedDiscount) || 0) > 0 ? (
              <div className="flex justify-between text-opacity-70">
                <span>− Desconto</span>
                <span>R$ {(Number(watchedDiscount) || 0).toFixed(2)}</span>
              </div>
            ) : null}
            <div className="flex justify-between font-semibold text-base">
              <span>Total</span>
              <span>R$ {total.toFixed(2)}</span>
            </div>
          </section>

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
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendTransaction(emptyTransaction())}
              >
                Adicionar transação
              </Button>
            </div>

            {transactionFields.map((field, index) => (
              <div key={field.id} className="card border border-base-300 bg-base-100">
                <div className="card-body gap-3 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Transação {index + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      className="text-error"
                      onClick={() => removeTransaction(index)}
                    >
                      Remover
                    </Button>
                  </div>

                  <FieldGroup>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Field>
                        <FieldLabel>Tipo</FieldLabel>
                        <Controller
                          name={`transactions.${index}.type`}
                          control={control}
                          render={({ field: selectField }) => (
                            <Select value={selectField.value} onValueChange={selectField.onChange}>
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="entry">Entrada</SelectItem>
                                <SelectItem value="exit">Saida</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </Field>

                      <Field>
                        <FieldLabel>Valor</FieldLabel>
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          {...register(`transactions.${index}.amount`, { valueAsNumber: true })}
                        />
                        <FieldError>{errors.transactions?.[index]?.amount?.message}</FieldError>
                      </Field>

                      <Field>
                        <FieldLabel>Metodo</FieldLabel>
                        <Controller
                          name={`transactions.${index}.method`}
                          control={control}
                          render={({ field: selectField }) => (
                            <Select value={selectField.value} onValueChange={selectField.onChange}>
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pix">PIX</SelectItem>
                                <SelectItem value="cash">Dinheiro</SelectItem>
                                <SelectItem value="credit_card">Cartao de credito</SelectItem>
                                <SelectItem value="debit_card">Cartao de debito</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </Field>

                      <Field>
                        <FieldLabel>Data/hora</FieldLabel>
                        <Input
                          type="datetime-local"
                          {...register(`transactions.${index}.madeAt`)}
                        />
                        <FieldError>{errors.transactions?.[index]?.madeAt?.message}</FieldError>
                      </Field>

                      <Field className="md:col-span-2">
                        <FieldLabel>Descricao (opcional)</FieldLabel>
                        <Input
                          type="text"
                          placeholder="Descricao da transacao"
                          {...register(`transactions.${index}.description`)}
                        />
                      </Field>
                    </div>
                  </FieldGroup>
                </div>
              </div>
            ))}
          </section>

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Registrar pedido"}
            </Button>
          </div>
        </form>
      </div>
      <CustomerFormModal
        isOpen={isCustomerModalOpen}
        mode="create"
        isSubmitting={isCreatingCustomer}
        errorMessage=""
        successMessage=""
        onClose={() => setIsCustomerModalOpen(false)}
        onSubmit={handleCreateCustomer}
      />
    </main>
  );
}
