import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Controller, FormProvider, useFieldArray, useForm } from "react-hook-form";
import { useGetCustomers } from "@/hooks/tanstack/customer/use-get-customers";
import { useCreateOrder } from "@/hooks/tanstack/order/use-create-order";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Item, ItemContent } from "@/components/ui/item";
import { Label } from "@/components/ui/label";
import { CreateOrderInput, CreateOrderOutput, createOrderSchema } from "@/lib/api/order/create-order";
import { currencyFormatter } from "@/lib/utils/formatter";
import { Separator } from "@/components/ui/separator";
import { EditIcon, Trash2Icon } from "lucide-react";
import { CustomerListModal } from "@/components/customer-list-modal";
import { ProductListModal } from "@/components/product-list-modal";
import { OrderNoteModal } from "@/components/order-note-modal";
import { Switch } from "@/components/ui/switch";
import { OrderScheduleItemModal } from "@/components/order-schedule-item-modal";
import { useState } from "react";
import { OrderItemNoteModal } from "@/components/order-item-note-modal";

function localDatetimeNow() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export const Route = createFileRoute("/app/orders/form")({
  component: OrderFormRoute,
});

function OrderFormRoute() {
  const { organization } = Route.useRouteContext();
  const [deliveryDate, setDeliveryDate] = useState(() => {
    return localDatetimeNow()
  })

  function emptyItem(): CreateOrderInput["items"][number] {
    return {
      description: "",
      unitPrice: 0,
      quantity: 1,
      deliveredAt: deliveryDate,
      note: "",
      isDelivered: false,
    };
  }

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
      items: [],
    },
  });

  const { control, register, handleSubmit, reset, setValue, watch, formState: { errors } } = methods;

  const {
    fields,
    append: appendItem,
    remove: removeItem,
  } = useFieldArray({
    control,
    name: "items",
  });

  const items = watch("items", fields);
  const shippingFee = watch("shippingFee");
  const discount = watch("discount");
  const watchedNote = watch('note');

  const subtotal = items.reduce(
    (acc, item) => acc + (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0),
    0
  );
  const total = subtotal + (Number(shippingFee) || 0) - (Number(discount) || 0);

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
        });
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Erro ao registrar pedido.");
      },
    });
  }

  const selectedCustomer = customers.find(c => c.id === watch("customerId"));

  return (
    <FormProvider {...methods}>
      <CustomerListModal organizationId={organization.id} />
      <ProductListModal organizationId={organization.id} deliveryDate={deliveryDate} />
      <OrderScheduleItemModal />
      <OrderNoteModal />
      <OrderItemNoteModal />
      <main className="mx-auto w-full max-w-5xl p-5">
        <form onSubmit={handleSubmit(onCreateOrder)} className="space-y-8">
          <div className="flex items-center mb-4 gap-3">
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
          {watchedNote ? (
            <div className="flex items-center">
              <p className="text-base text-muted-foreground">Observação: {watchedNote}</p>
              <Button type="button" variant="ghost" size="icon-sm" nativeButton={false} render={<Link to="." search={{ modal: "note" }} />}>
                <EditIcon />
              </Button>
            </div>
          ) : (
            <Button type="button" variant="outline" size="sm" nativeButton={false} render={<Link to="." search={{ modal: "note" }} />}>
              Adicionar observação
            </Button>
          )}

          <Separator />

          <Field className="max-w-60">
            <FieldLabel className="font-heading text-base font-medium">Quando o pedido será entregue?</FieldLabel>
            <Input
              type="datetime-local"
              defaultValue={deliveryDate}
              onChange={(e) => {
                const newDate = e.target.value;
                setDeliveryDate(newDate)
                items.forEach((_, index) => {
                  setValue(`items.${index}.deliveredAt`, newDate, { shouldValidate: true });
                });
              }}
            />
            <FieldError>{errors.orderedAt?.message}</FieldError>
          </Field>

          <Separator />

          {selectedCustomer ? (
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <p className="font-heading text-base font-medium">{selectedCustomer.name}</p>
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
            <p className="font-heading text-base font-medium">Produtos</p>
            {items.length === 0 ? (
              <div>
                <p className="text-base text-muted-foreground data-[error=true]:text-destructive" data-error={!!errors.items?.message}>{errors.items?.message || 'Nenhum item adicionado para este pedido'}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((_, index) => (
                  <div key={fields[index]?.id ?? index} className="space-y-2">
                    <div className="flex justify-between items-center gap-2">
                      <p>
                        Item {index + 1}{" "}
                        <span className="text-xs font-normal opacity-60">
                          {currencyFormatter.format((Number(items[index]?.unitPrice) || 0) * (Number(items[index]?.quantity) || 0))}
                        </span>
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2Icon />
                      </Button>
                    </div>
                    <Item size="sm" variant="muted">
                      <ItemContent>
                        <FieldGroup className="grid gap-3 md:grid-cols-3">
                          <Field className="md:col-span-2">
                            <FieldLabel>Descrição</FieldLabel>
                            <Input
                              type="text"
                              {...register(`items.${index}.description`)}
                              className="bg-white"
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
                                className="bg-white"
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
                                className="bg-white"
                              />
                              <FieldError>{errors.items?.[index]?.quantity?.message}</FieldError>
                            </Field>
                          </div>
  
                          <div className="md:col-span-3 space-y-2">
                            <Field orientation="horizontal" className="w-auto">
                              <Controller
                                name={`items.${index}.isDelivered`}
                                control={control}
                                render={({ field }) => (
                                  <Switch 
                                    id={`isDelivered-${index}`}
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                )}
                              />
                              <Label htmlFor={`isDelivered-${index}`}>Entregue</Label>
                            </Field>
                            {deliveryDate === watch(`items.${index}.deliveredAt`) ? (
                              <Button type="button" variant="ghost" size="sm" nativeButton={false} render={<Link to="." search={{ modal: "scheduleItem", itemIndex: index }} />}>
                                Agendar entrega
                              </Button>
                            ) : (
                              <div className="flex gap-1 items-center">
                                <span>Entregar:</span>
                                <span>{deliveryDate !== watch(`items.${index}.deliveredAt`) && watch(`items.${index}.deliveredAt`)}</span>
                                <Button type="button" variant="ghost" size="sm" nativeButton={false} render={<Link to="." search={{ modal: "scheduleItem", itemIndex: index }} />}>
                                  Editar
                                </Button>
                              </div>
                            )}
                            {!watch(`items.${index}.note`) ? (
                              <Button type="button" variant="ghost" size="sm" nativeButton={false} render={<Link to="." search={{ modal: "itemNote", itemIndex: index }} />}>
                                Adicionar observação
                              </Button>
                            ) : (
                              <div className="flex gap-1 items-center">
                                <span>Observação:</span>
                                <span>{watch(`items.${index}.note`)}</span>
                                <Button type="button" variant="ghost" size="sm" nativeButton={false} render={<Link to="." search={{ modal: "itemNote", itemIndex: index }} />}>
                                  Editar
                                </Button>
                              </div>
                            )}
                          </div>
                        </FieldGroup>
                      </ItemContent>
                    </Item>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" nativeButton={false} render={<Link to="." search={{ modal: "product" }} />}>
                Catalogo de produtos
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => appendItem(emptyItem())}>
                Adicionar
              </Button>
            </div>
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
