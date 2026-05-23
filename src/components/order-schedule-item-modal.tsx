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

export function OrderScheduleItemContent({ deliveryDate, onClose }: { deliveryDate: string; onClose: () => void }) {
  const [itemIndex] = useQueryState("itemIndex", parseAsInteger);
  const { register, watch, setValue, formState: { errors } } = useFormContext<CreateOrderInput>();

  const watchedDeliveredAt = watch(`items.${itemIndex!}.deliveredAt`);

  return (
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
        <div>
          {watchedDeliveredAt !== deliveryDate && (
            <Button type="button" variant="ghost" onClick={() => { setValue(`items.${itemIndex!}.deliveredAt`, deliveryDate); onClose(); }}>
              Remover agendamento
            </Button>
          )}
        </div>
        <Button type="button" onClick={onClose}>
          Confirmar
        </Button>
      </div>
    </div>
  );
}

export function OrderScheduleItemModal({ deliveryDate }: { deliveryDate: string }) {
  const [modal, setModal] = useQueryState("modal");
  const [, setItemIndex] = useQueryState("itemIndex", parseAsInteger);
  const isOpen = modal === "scheduleItem";

  function onClose() {
    setModal(null);
    setItemIndex(null);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Para quando o item será entregue?</DialogTitle>
        </DialogHeader>
        <OrderScheduleItemContent deliveryDate={deliveryDate} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}
