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

  const items = watch("items");
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

          <Field className="max-w-60">
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
            {itemFields.map((field, index) => (
              <div key={field.id} className="space-y-2">
                <div className="flex justify-between items-center h-8">
                  <div className="flex gap-3">
                    <p className="font-heading text-base font-medium">
                      Item {index + 1}{" "}
                      <span className="text-xs font-normal opacity-60">
                        {currencyFormatter.format((Number(items[index]?.unitPrice) || 0) * (Number(items[index]?.quantity) || 0))}
                      </span>
                    </p>
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
                  </div>
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

                      <Field>
                        <FieldLabel>Data da entrega</FieldLabel>
                        <Input
                          type="datetime-local"
                          {...register(`items.${index}.deliveredAt`)}
                        />
                        <FieldError>{errors.items?.[index]?.deliveredAt?.message}</FieldError>
                      </Field>

                      <Field className="md:col-span-2">
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
