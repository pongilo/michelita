import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Controller, FormProvider, useFieldArray, useForm } from "react-hook-form";
import { useGetCustomers } from "@/hooks/tanstack/customer/use-get-customers";
import { useCreateOrder } from "@/hooks/tanstack/order/use-create-order";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "@/components/ui/item";
import { Label } from "@/components/ui/label";
import { CreateOrderInput, CreateOrderOutput, createOrderSchema } from "@/lib/api/order/create-order";
import { currencyFormatter } from "@/lib/utils/formatter";
import { Separator } from "@/components/ui/separator";
import { EllipsisVerticalIcon, MinusIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { CustomerListModal } from "@/components/customer-list-modal";
import { ProductListModal } from "@/components/product-list-modal";
import { OrderNoteModal } from "@/components/order-note-modal";
import { Switch } from "@/components/ui/switch";
import { OrderScheduleItemModal } from "@/components/order-schedule-item-modal";
import { useState } from "react";
import { OrderItemNoteModal } from "@/components/order-item-note-modal";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/app/orders/form")({
  component: OrderFormRoute,
});

function OrderFormRoute() {
  const { organization } = Route.useRouteContext();
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  })

  const { data: customers = [] } = useGetCustomers({
    organizationId: organization.id,
  });
  const { mutateAsync: createOrder, isPending: isCreatingOrder } = useCreateOrder();

  const methods = useForm<CreateOrderInput, unknown, CreateOrderOutput>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      organizationId: organization.id,
      customerId: "",
      orderedAt: deliveryDate,
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
    remove: removeItem,
  } = useFieldArray({
    control,
    name: "items",
  });

  const items = watch("items", fields);
  const shippingFee = watch("shippingFee");
  const discount = watch("discount");
  const watchedNote = watch('note');

  const total = items.reduce(
    (acc, item) => acc + (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0),
    0
  ) + (Number(shippingFee) || 0) - (Number(discount) || 0);
  const totalItems = items.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);

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
        reset({
          organizationId: organization.id,
          customerId: "",
          orderedAt: deliveryDate,
          isPaid: false,
          note: "",
          shippingFee: 0,
          discount: 0,
          items: [],
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
      <OrderScheduleItemModal deliveryDate={deliveryDate} />
      <OrderNoteModal />
      <OrderItemNoteModal />
      <main className="mx-auto w-full max-w-5xl p-5">
        <form onSubmit={handleSubmit(onCreateOrder)} className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-2xl font-heading">Novo pedido</h1>
            {items.length === 0 ? (
              <div>
                <p className="text-base text-muted-foreground data-[error=true]:text-destructive" data-error={!!errors.items?.message}>{errors.items?.message || 'Adicione os itens do pedido'}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <Item size="sm" variant="muted">
                      <ItemContent>
                        <ItemTitle>{item.description}</ItemTitle>
                        <ItemDescription>{currencyFormatter.format((Number(item.unitPrice || 0)))}</ItemDescription>
                        {item.note && <ItemDescription>Observação: {item.note}</ItemDescription>}
                        {deliveryDate !== item.deliveredAt && <ItemDescription>Entregar: {item.deliveredAt}</ItemDescription>}
                      </ItemContent>
                      <ItemActions>
                        <div className="flex items-center gap-1">
                          {item.quantity === 1 ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              onClick={() => removeItem(index)}
                            >
                              <Trash2Icon />
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              onClick={() => setValue(`items.${index}.quantity`, item.quantity - 1)}
                            >
                              <MinusIcon />
                            </Button>
                          )}
                          <span className="w-6 text-center text-sm font-medium tabular-nums">
                            {item.quantity}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            onClick={() => setValue(`items.${index}.quantity`, item.quantity + 1)}
                          >
                            <PlusIcon />
                          </Button>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                            <EllipsisVerticalIcon />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem render={<Link to="." search={{ modal: "scheduleItem", itemIndex: index }} resetScroll={false} />}>
                              {deliveryDate !== item.deliveredAt ? 'Editar entrega' : 'Agendar entrega'}
                            </DropdownMenuItem>
                            <DropdownMenuItem render={<Link to="." search={{ modal: "itemNote", itemIndex: index }} resetScroll={false} />}>
                              {item.note ? 'Editar observação' : 'Adicionar observação'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => removeItem(index)} className="text-destructive focus:text-destructive">
                              Remover
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </ItemActions>
                    </Item>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" nativeButton={false} render={<Link to="." search={{ modal: "product" }} resetScroll={false} />}>
                Catalogo de produtos
              </Button>
            </div>
          </div>

          <Separator />

          <FieldGroup>
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
            <Field orientation="horizontal" className="w-auto">
              <Switch 
                id="isDelivered"
                onCheckedChange={(value) => {
                  items.forEach((_, index) => {
                    setValue(`items.${index}.isDelivered`, value, { shouldValidate: true });
                  });
                }}
              />
              <Label htmlFor="isDelivered">Marcar como entregue</Label>
            </Field>
          </FieldGroup>

          <Separator />

          <div className="space-y-4">
            <p className="font-heading text-base font-medium">Cliente (opcional)</p>
            <p className="text-base text-muted-foreground">
              {selectedCustomer?.name ?? "Nenhum cliente selecionado para este pedido"}
            </p>
            {selectedCustomer ? (
              <Button size="sm" variant="outline" onClick={() => setValue("customerId", "", { shouldValidate: true })}>
                Remover
              </Button>
            ) : (
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                nativeButton={false} 
                render={<Link to="." search={{ modal: "customer" }} resetScroll={false} />}
              >
                Selecionar
              </Button>
            )}
          </div>
          <FieldError>{errors.customerId?.message}</FieldError>

          <Separator />

          <div className="space-y-4">
            <p className="font-heading text-base font-medium">Observação (opcional)</p>
            <p className="text-base text-muted-foreground">{watchedNote || "Nenhuma observação para este pedido"}</p>
            <Button type="button" variant="outline" size="sm" nativeButton={false} render={<Link to="." search={{ modal: "note" }} resetScroll={false} />}>
              {watchedNote ? "Editar" : "Adicionar"}
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
            <Field orientation="horizontal" className="col-span-2 mt-4">
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
              <Label htmlFor="isPaid">Marcar como pago</Label>
            </Field>
          </FieldGroup>

          <div className="flex items-center">
            <div className="flex-1 space-y-1">
              <p className="text-base font-heading text-foreground">Total: {currencyFormatter.format(total)}</p>
              <p className="text-sm font-heading text-muted-foreground">{totalItems} {totalItems === 1 ? 'item' : 'itens'}</p>
            </div>
            <div className="flex-none">
              <Button type="submit" disabled={isCreatingOrder} className="w-40" variant="default" size="lg">
                {isCreatingOrder ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </form>
      </main>
    </FormProvider>
  );
}
