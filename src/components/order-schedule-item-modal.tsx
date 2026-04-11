import { useFormContext } from "react-hook-form";
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

export function OrderScheduleItemModal() {
  const [modal, setModal] = useQueryState("modal");
  const [itemIndex, setItemIndex] = useQueryState("itemIndex", parseAsInteger);
  const { register, formState: { errors } } = useFormContext<CreateOrderInput>();

  const isOpen = modal === "scheduleItem";


  function onClose() {
    setModal(null);
    setItemIndex(null)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quando o pedido será entregue?</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field>
            <FieldLabel>Data da entrega</FieldLabel>
            <Input
              type="datetime-local"
              {...register(`items.${itemIndex!}.deliveredAt`)}
            />
            <FieldError>{errors.items?.[itemIndex!]?.deliveredAt?.message}</FieldError>
          </Field>
          <div className="flex justify-between">
            <Button type="button" onClick={onClose}>
              Confirmar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
