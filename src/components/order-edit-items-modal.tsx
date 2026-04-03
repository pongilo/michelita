import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Item, ItemContent } from "@/components/ui/item";
import { Label } from "@/components/ui/label";
import { useUpdateOrderItems } from "@/hooks/tanstack/order/use-update-order-items";
import { currencyFormatter } from "@/lib/utils/formatter";
import { Trash2Icon } from "lucide-react";
import { toast } from "sonner";

// ── Schema ────────────────────────────────────────────────────────────────────

const editItemsSchema = z.object({
  items: z
    .array(
      z.object({
        description: z.string().trim().min(1, "Descricao do item e obrigatoria."),
        unitPrice: z.number().min(0, "Preco unitario deve ser maior ou igual a zero."),
        quantity: z.number().int().min(1, "Quantidade minima: 1."),
        deliveredAt: z.string().trim().min(1, "Data de entrega do item e obrigatoria."),
        isDelivered: z.boolean(),
        note: z.string().trim().optional(),
      }),
    )
    .min(1, "Adicione pelo menos um item."),
});

type EditItemsValues = z.infer<typeof editItemsSchema>;

function localDatetimeNow() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function toLocalDatetimeInput(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return localDatetimeNow();
  return date.toISOString().slice(0, 16);
}

function emptyItem(): EditItemsValues["items"][number] {
  return { description: "", unitPrice: 0, quantity: 1, deliveredAt: localDatetimeNow(), isDelivered: false, note: "" };
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrderItem {
  description: string;
  unitPrice: number;
  quantity: number;
  deliveredAt: string | Date;
  isDelivered: boolean;
  note?: string | null;
}

interface OrderEditItemsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  organizationId: string;
  items: OrderItem[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function OrderEditItemsModal({ open, onOpenChange, orderId, organizationId, items }: OrderEditItemsModalProps) {
  const { mutateAsync, isPending } = useUpdateOrderItems({ organizationId });

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<EditItemsValues>({
    resolver: zodResolver(editItemsSchema),
    defaultValues: { items: [emptyItem()] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const watchedItems = watch("items");

  const subtotal = useMemo(
    () => watchedItems.reduce((sum, item) => sum + (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0), 0),
    [watchedItems],
  );

  useEffect(() => {
    if (open) {
      reset({
        items: items.length
          ? items.map((item) => ({
              description: item.description,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              deliveredAt: toLocalDatetimeInput(item.deliveredAt),
              isDelivered: item.isDelivered,
              note: item.note ?? "",
            }))
          : [emptyItem()],
      });
    }
  }, [open, items, reset]);

  async function handleSave(values: EditItemsValues) {
    try {
      await mutateAsync({
        id: orderId,
        organizationId,
        items: values.items.map((item) => ({
          description: item.description,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          deliveredAt: item.deliveredAt,
          isDelivered: item.isDelivered,
          note: item.note?.trim() ? item.note.trim() : undefined,
        })),
      });
      onOpenChange(false);
      toast.success("Itens do pedido atualizados.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar itens.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onOpenChange(false)}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar itens do pedido</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleSave)} className="space-y-4">
          <div className="space-y-4">
            {fields.map((field, index) => {
              const itemSubtotal =
                (Number(watchedItems[index]?.unitPrice) || 0) * (Number(watchedItems[index]?.quantity) || 0);

              return (
                <div key={field.id} className="space-y-2">
                  <div className="flex justify-between items-center h-8">
                    <p className="font-heading text-base font-medium">
                      Item {index + 1}{" "}
                      <span className="text-xs font-normal opacity-60">
                        {currencyFormatter.format(itemSubtotal)}
                      </span>
                    </p>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive"
                        onClick={() => remove(index)}
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
                          <Input type="text" {...register(`items.${index}.description`)} />
                          <FieldError>{errors.items?.[index]?.description?.message}</FieldError>
                        </Field>

                        <div className="flex gap-3">
                          <Field>
                            <FieldLabel>Valor (R$)</FieldLabel>
                            <Input type="number" min="0" step="0.01" {...register(`items.${index}.unitPrice`, { valueAsNumber: true })} />
                            <FieldError>{errors.items?.[index]?.unitPrice?.message}</FieldError>
                          </Field>
                          <Field>
                            <FieldLabel>Qtd</FieldLabel>
                            <Input type="number" min="1" step="1" {...register(`items.${index}.quantity`, { valueAsNumber: true })} />
                            <FieldError>{errors.items?.[index]?.quantity?.message}</FieldError>
                          </Field>
                        </div>

                        <Field orientation="horizontal">
                          <Controller
                            name={`items.${index}.isDelivered`}
                            control={control}
                            render={({ field: f }) => (
                              <Checkbox
                                id={`edit-isDelivered-${index}`}
                                checked={f.value}
                                onCheckedChange={f.onChange}
                              />
                            )}
                          />
                          <Label htmlFor={`edit-isDelivered-${index}`}>Marcar como entregue</Label>
                        </Field>

                        <Field>
                          <FieldLabel>Data da entrega</FieldLabel>
                          <Input type="datetime-local" {...register(`items.${index}.deliveredAt`)} />
                          <FieldError>{errors.items?.[index]?.deliveredAt?.message}</FieldError>
                        </Field>

                        <Field>
                          <FieldLabel>Observação</FieldLabel>
                          <Input type="text" {...register(`items.${index}.note`)} />
                        </Field>
                      </FieldGroup>
                    </ItemContent>
                  </Item>
                </div>
              );
            })}
          </div>

          <Button type="button" variant="outline" size="sm" onClick={() => append(emptyItem())}>
            Adicionar item
          </Button>

          <div className="rounded-2xl bg-muted px-4 py-3 text-sm flex justify-between">
            <span>Total dos itens</span>
            <span>{currencyFormatter.format(subtotal)}</span>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar itens"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
