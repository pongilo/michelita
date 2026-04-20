import { useFieldArray, useFormContext } from "react-hook-form";
import { parseAsInteger, useQueryState } from "nuqs";
import type { CreateOrderInput } from "@/lib/api/order/create-order";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MinusIcon, PlusIcon, Trash2Icon } from "lucide-react";

export function OrderEditItemContent({ onClose }: { onClose: () => void }) {
  const [itemIndex] = useQueryState("itemIndex", parseAsInteger);
  const { register, watch, setValue, control, formState: { errors } } = useFormContext<CreateOrderInput>();
  const { remove } = useFieldArray({ control, name: "items" });

  const idx = itemIndex ?? 0;
  const watchedItem = watch(`items.${idx}`);
  const itemErrors = errors.items?.[idx];

  if (!watchedItem) return null;

  return (
    <div className="space-y-4 p-5 md:pt-0">
      <Field>
        <FieldLabel>Descrição</FieldLabel>
        <Input
          placeholder="Ex: Bolo de chocolate"
          {...register(`items.${idx}.description`)}
        />
        <FieldError>{itemErrors?.description?.message}</FieldError>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel>Quantidade</FieldLabel>
          <div className="flex items-center gap-1">
            {watchedItem.quantity === 1 ? (
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => { remove(idx); onClose(); }}
              >
                <Trash2Icon />
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => setValue(`items.${idx}.quantity`, watchedItem.quantity - 1)}
              >
                <MinusIcon />
              </Button>
            )}
            <Input
              type="number"
              min="1"
              step="1"
              placeholder="0"
              {...register(`items.${idx}.quantity`, { valueAsNumber: true })}
              className="text-center"
            />
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => setValue(`items.${idx}.quantity`, watchedItem.quantity + 1)}
            >
              <PlusIcon />
            </Button>
          </div>
          <FieldError>{itemErrors?.quantity?.message}</FieldError>
        </Field>
        <Field>
          <FieldLabel>Valor unitário</FieldLabel>
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="0,00"
            {...register(`items.${idx}.unitPrice`, { valueAsNumber: true })}
          />
          <FieldError>{itemErrors?.unitPrice?.message}</FieldError>
        </Field>
      </div>

      <Field>
        <FieldLabel>Data de entrega</FieldLabel>
        <Input
          type="datetime-local"
          {...register(`items.${idx}.deliveredAt`)}
        />
        <FieldError>{itemErrors?.deliveredAt?.message}</FieldError>
      </Field>

      <Field>
        <FieldLabel>Observação (opcional)</FieldLabel>
        <Textarea rows={3} placeholder="Escreva uma observação..." {...register(`items.${idx}.note`)} />
        <FieldError>{itemErrors?.note?.message}</FieldError>
      </Field>

      <div className="flex justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={() => { remove(idx); onClose(); }}
        >
          Remover
        </Button>
        <Button type="button" onClick={onClose}>
          Confirmar
        </Button>
      </div>
    </div>
  );
}

export function OrderEditItemModal() {
  const [modal, setModal] = useQueryState("modal");
  const [, setItemIndex] = useQueryState("itemIndex", parseAsInteger);
  const isOpen = modal === "editItem";

  function onClose() {
    setModal(null);
    setItemIndex(null);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex flex-col gap-0 p-0">
        <DialogHeader className="mb-0 p-5">
          <DialogTitle>Editar item</DialogTitle>
        </DialogHeader>
        <OrderEditItemContent onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}
