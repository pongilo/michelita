import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Controller, FormProvider, useFieldArray, useForm } from "react-hook-form";
import { useGetCustomers } from "@/hooks/tanstack/customer/use-get-customers";
import { useCreateOrder } from "@/hooks/tanstack/order/use-create-order";
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
import { Item, ItemContent } from "@/components/ui/item";
import { Label } from "@/components/ui/label";
import { CreateOrderInput, CreateOrderOutput, createOrderSchema } from "@/lib/api/order/create-order";
import { currencyFormatter } from "@/lib/utils/formatter";
import { Separator } from "@/components/ui/separator";
import { EditIcon, Trash2Icon } from "lucide-react";
import { CustomerListModal } from "@/components/customer-list-modal";
import { OrderNoteModal } from "@/components/order-note-modal";
import { Switch } from "@/components/ui/switch";

function localDatetimeNow() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function emptyItem(): CreateOrderInput["items"][number] {
  return {
    description: "",
    unitPrice: 0,
    quantity: 1,
    deliveredAt: localDatetimeNow(),
    note: "",
    isDelivered: false,
  };
}

function emptyTransaction(): CreateOrderInput["transactions"][number] {
  return {
    amount: 0,
    method: "PIX",
    madeAt: localDatetimeNow(),
  };
}

export const Route = createFileRoute("/app/orders/form")({
  component: OrderFormRoute,
});

function OrderFormRoute() {
  const { organization } = Route.useRouteContext();

  const { data: customers = [] } = useGetCustomers({
    organizationId: organization.id,
  });
  const { mutateAsync: createOrder, isPending: isCreatingOrder } = useCreateOrder();

  const methods = useForm<CreateOrderInput, unknown, CreateOrderOutput>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      organizationId: organization.id,
      customerId: "",
      orderedAt: localDatetimeNow(),
      isPaid: false,
      note: "",
      shippingFee: 0,
      discount: 0,
      items: [emptyItem()],
      transactions: [],
    },
  });

  const { control, register, handleSubmit, reset, setValue, watch, formState: { errors } } = methods;

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

  const items = watch("items");
  const transactions = watch("transactions");
  const shippingFee = watch("shippingFee");
  const discount = watch("discount");
  const watchedNote = watch('note')

  const subtotal = items.reduce(
    (acc, item) => acc + (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0),
    0
  );
  const total = subtotal + (Number(shippingFee) || 0) - (Number(discount) || 0);
  const totalPaid = transactions.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  const balance = total - totalPaid;

  async function onCreateOrder(values: CreateOrderOutput) {
    await createOrder({
      organizationId: values.organizationId,
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
        deliveredAt: item.deliveredAt,
        isDelivered: !!item.isDelivered,
        note: item.note?.trim() ? item.note.trim() : undefined,
      })),
      transactions: values.transactions.map((t) => ({
        amount: t.amount,
        method: t.method,
        madeAt: t.madeAt,
      })),
    }, {
      onSuccess: (data) => {          
        toast.success(`Pedido criado com sucesso. ID: ${data.id}`);
        const newOrderedAt = localDatetimeNow();
        reset({
          organizationId: organization.id,
          customerId: "",
          orderedAt: newOrderedAt,
          isPaid: false,
          note: "",
          shippingFee: 0,
          discount: 0,
          items: [emptyItem()],
          transactions: [],
        });
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Erro ao registrar pedido.");
      },
    });
  }

  const customersOptions = customers.map((customer) => ({
    value: customer.id,
    label: [customer.name, customer.phone, customer.address].filter(Boolean).join(" · "),
  }));

  const selectedCustomer = customers.find(c => c.id === watch("customerId"));

  customersOptions.unshift({
    value: "",
    label: "Sem cliente vinculado",
  });

  return (
    <FormProvider {...methods}>
      <CustomerListModal organizationId={organization.id} />
      <OrderNoteModal />
      <main className="mx-auto w-full max-w-5xl p-5">
        <form onSubmit={handleSubmit(onCreateOrder)} className="space-y-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-heading">Novo pedido</h1>
            <Field orientation="horizontal" className="w-auto">
              <Controller
                name="isPaid"
                control={control}
                render={({ field }) => (
                  <Switch id="isPaid" 
                    checked={field.value}
                    onCheckedChange={field.onChange} 
                  />
                )}
              />
              <Label htmlFor="isPaid">Pago</Label>
            </Field>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-base text-muted-foreground">{watchedNote || 'Nenhuma observação no pedido'}</p>
            <Button type="button" variant={watchedNote ? "ghost" : "outline"} size={watchedNote ? "icon-sm" : "sm"} nativeButton={false} render={<Link to="." search={{ modal: "note" }} />}>
              {watchedNote ? <EditIcon /> : 'Adicionar'}
            </Button>
          </div>

          <FieldGroup>
            <Field>
              <FieldLabel>Quando o pedido será entregue?</FieldLabel>
              <Input
                type="datetime-local"
                defaultValue={localDatetimeNow()}
                onChange={(e) => {
                  const newDate = e.target.value;
                  items.forEach((_, index) => {
                    setValue(`items.${index}.deliveredAt`, newDate, { shouldValidate: true });
                  });
                }}
              />
              <FieldError>{errors.orderedAt?.message}</FieldError>
            </Field>
          </FieldGroup>

          <Separator />

          {selectedCustomer ? (
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <p className="font-heading text-base font-medium">{selectedCustomer.name}</p>
                {selectedCustomer.phone && (
                  <p className="text-base text-muted-foreground">{selectedCustomer.phone}</p>
                )}
                {selectedCustomer.address && (
                  <p className="text-base text-muted-foreground">{selectedCustomer.address}</p>
                )}
              </div>
              <Button size="icon" variant="ghost" onClick={() => setValue("customerId", "", { shouldValidate: true })} title="Remover cliente vinculado">
                <Trash2Icon className="text-destructive" />
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="font-heading text-base font-medium">Cliente (opcional)</p>
              <p className="text-base text-muted-foreground">Nenhum cliente selecionado para este pedido</p>
              <Button type="button" variant="outline" size="sm" nativeButton={false} render={<Link to="." search={{ modal: "customer" }} />}>
                Selecionar
              </Button>
            </div>
          )}
          <FieldError>{errors.customerId?.message}</FieldError>

          <Separator />
          
          <div className="space-y-4">
            {itemFields.map((field, index) => (
              <div key={field.id} className="space-y-2">
                <div className="flex justify-between items-center h-8">
                  <p className="font-heading text-base font-medium">
                    Item {index + 1}{" "}
                    <span className="text-xs font-normal opacity-60">
                      {currencyFormatter.format((Number(items[index]?.unitPrice) || 0) * (Number(items[index]?.quantity) || 0))}
                    </span>
                  </p>
                  {itemFields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2Icon />
                    </Button>
                  )}
                </div>
                <Item size="xs" variant="outline">
                  <ItemContent>
                    <FieldGroup className="grid gap-3 md:grid-cols-3">
                      <Field className="md:col-span-2">
                        <FieldLabel>Nome do item</FieldLabel>
                        <Input
                          type="text"
                          {...register(`items.${index}.description`)}
                        />
                        <FieldError>{errors.items?.[index]?.description?.message}</FieldError>
                      </Field>

                      <div className="flex gap-3">
                        <Field>
                          <FieldLabel>Valor (R$)</FieldLabel>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            {...register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                          />
                          <FieldError>{errors.items?.[index]?.unitPrice?.message}</FieldError>
                        </Field>
                        <Field>
                          <FieldLabel>Qtd</FieldLabel>
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                          />
                          <FieldError>{errors.items?.[index]?.quantity?.message}</FieldError>
                        </Field>
                      </div>

                      <Field orientation="horizontal">
                        <Controller
                          name={`items.${index}.isDelivered`}
                          control={control}
                          render={({ field }) => (
                            <Checkbox
                              id={`isDelivered-${index}`}
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          )}
                        />
                        <Label htmlFor={`isDelivered-${index}`}>Marcar como entregue</Label>
                      </Field>

                      <Field>
                        <FieldLabel>Data da entrega</FieldLabel>
                        <Input
                          type="datetime-local"
                          {...register(`items.${index}.deliveredAt`)}
                        />
                        <FieldError>{errors.items?.[index]?.deliveredAt?.message}</FieldError>
                      </Field>

                      <Field>
                        <FieldLabel>Observação</FieldLabel>
                        <Input
                          type="text"
                          {...register(`items.${index}.note`)}
                        />
                      </Field>
                    </FieldGroup>
                  </ItemContent>
                </Item>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => appendItem(emptyItem())}>
              Adicionar item
            </Button>
          </div>

          <Separator />

          <div className="space-y-4">
            {transactionFields.length === 0 && (
              <>
                <p className="font-heading text-base font-medium">Pagamentos</p>
                <p className="text-base text-muted-foreground">Nenhuma transação registrada para este pedido.</p>
              </>
            )}
            {transactionFields.map((field, index) => (
              <div key={field.id} className="space-y-2">
                <div className="flex justify-between items-center">
                  <p className="font-heading text-base font-medium">
                    Transação {index + 1}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeTransaction(index)}
                    className="text-destructive"
                  >
                    <Trash2Icon />
                  </Button>
                </div>
                <Item size="xs" variant="outline">
                  <ItemContent>
                    <FieldGroup className="grid gap-3 md:grid-cols-2">
                      <div className="flex gap-3">  
                        <Field>
                          <FieldLabel>Método</FieldLabel>
                          <Controller
                            name={`transactions.${index}.method`}
                            control={control}
                            render={({ field: selectField }) => (
                              <Select value={selectField.value} onValueChange={selectField.onChange}>
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="PIX">PIX</SelectItem>
                                  <SelectItem value="CASH">Dinheiro</SelectItem>
                                  <SelectItem value="CREDIT_CARD">Cartao de credito</SelectItem>
                                  <SelectItem value="DEBIT_CARD">Cartao de debito</SelectItem>
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
                      </div>
                      <Field>
                        <FieldLabel>Data e hora do pagamento</FieldLabel>
                        <Input
                          type="datetime-local"
                          {...register(`transactions.${index}.madeAt`)}
                        />
                        <FieldError>{errors.transactions?.[index]?.madeAt?.message}</FieldError>
                      </Field>
                    </FieldGroup>
                  </ItemContent>
                </Item>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => appendTransaction(emptyTransaction())}>
              Adicionar transação
            </Button>
          </div>

          <Separator />

          <FieldGroup className="grid grid-cols-2 gap-3">
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
          </FieldGroup>

          <Separator />

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="opacity-70">Subtotal dos itens</dt>
            <dd className="text-right font-medium">{currencyFormatter.format(subtotal)}</dd>
            <dt className="opacity-70">Total do pedido</dt>
            <dd className="text-right font-medium">{currencyFormatter.format(total)}</dd>
            <dt className="opacity-70">Total pago</dt>
            <dd className="text-right font-medium">{currencyFormatter.format(totalPaid)}</dd>
            <dt className="opacity-70">Saldo restante</dt>
            <dd className="text-right font-semibold">{currencyFormatter.format(balance)}</dd>
          </dl>

          <Separator />

          <Button type="submit" disabled={isCreatingOrder} className="w-full" variant="default" size="lg">
            {isCreatingOrder ? "Salvando..." : "Salvar pedido"}
          </Button>
        </form>
      </main>
    </FormProvider>
  );
}
