import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateOrderItem } from "@/hooks/tanstack/order/use-update-order-item";
import { currencyFormatter, localDatetime } from "@/lib/utils/formatter";
import { MinusIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  description: z.string().trim().min(1, "Informe uma descrição."),
  unitPrice: z.number().min(0, "O valor deve ser maior ou igual a zero."),
  quantity: z.number().int().min(1, "Quantidade mínima é 1."),
  deliveredAt: z.string().trim().min(1, "Data de entrega é obrigatória."),
  isDelivered: z.boolean(),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function toLocalDatetimeInput(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return localDatetime();
  return date.toISOString().slice(0, 16);
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EditableOrderItem {
  id: string;
  description: string;
  unitPrice: number;
  quantity: number;
  deliveredAt: string | Date;
  isDelivered: boolean;
  note?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  organizationId: string;
  item: EditableOrderItem | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function OrderDetailsItemEditModal({ open, onOpenChange, orderId, organizationId, item }: Props) {
  const { mutateAsync, isPending } = useUpdateOrderItem({ organizationId, orderId });

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { description: "", unitPrice: 0, quantity: 1, deliveredAt: localDatetime(), isDelivered: false, note: "" },
  });

  const qty = watch("quantity") || 1;
  const unitPrice = watch("unitPrice") || 0;
  const itemTotal = unitPrice * qty;

  useEffect(() => {
    if (open && item) {
      reset({
        description: item.description,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        deliveredAt: toLocalDatetimeInput(item.deliveredAt),
        isDelivered: item.isDelivered,
        note: item.note ?? "",
      });
    }
  }, [open, item, reset]);

  async function onSubmit(values: FormValues) {
    if (!item) return;
    try {
      await mutateAsync({
        orderItemId: item.id,
        organizationId,
        description: values.description,
        unitPrice: values.unitPrice,
        quantity: values.quantity,
        deliveredAt: values.deliveredAt,
        isDelivered: values.isDelivered,
        note: values.note?.trim() || undefined,
      });
      onOpenChange(false);
      toast.success("Item atualizado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar item.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onOpenChange(false)}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar item</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field>
            <FieldLabel>Descrição</FieldLabel>
            <Input placeholder="Ex: Bolo de chocolate" {...register("description")} />
            <FieldError>{errors.description?.message}</FieldError>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>Quantidade</FieldLabel>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setValue("quantity", Math.max(1, qty - 1))}
                >
                  <MinusIcon />
                </Button>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  {...register("quantity", { valueAsNumber: true })}
                  className="text-center"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setValue("quantity", qty + 1)}
                >
                  <PlusIcon />
                </Button>
              </div>
              <FieldError>{errors.quantity?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel>Valor unitário</FieldLabel>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                {...register("unitPrice", { valueAsNumber: true })}
              />
              <FieldError>{errors.unitPrice?.message}</FieldError>
            </Field>
          </div>

          <Field>
            <FieldLabel>Data da entrega</FieldLabel>
            <Input type="datetime-local" {...register("deliveredAt")} />
            <FieldError>{errors.deliveredAt?.message}</FieldError>
          </Field>

          <Field>
            <FieldLabel>Observação (opcional)</FieldLabel>
            <Textarea rows={3} placeholder="Escreva uma observação..." {...register("note")} />
          </Field>

          <Field orientation="horizontal">
            <Controller
              name="isDelivered"
              control={control}
              render={({ field: f }) => (
                <Checkbox
                  id="details-edit-item-isDelivered"
                  checked={f.value}
                  onCheckedChange={f.onChange}
                />
              )}
            />
            <Label htmlFor="details-edit-item-isDelivered">Marcar como entregue</Label>
          </Field>

          <div className="flex items-center py-4 border-t">
            <p className="flex-1 text-base font-heading text-foreground">
              Total: {currencyFormatter.format(itemTotal)}
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
