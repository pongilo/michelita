import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { useQueryState } from "nuqs";
import type { CreateOrderInput } from "@/lib/api/order/create-order";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface OrderDeliveryContentProps {
  deliveryDate: string;
  setDeliveryDate: (date: string) => void;
  onClose: () => void;
}

export function OrderDeliveryContent({ deliveryDate, setDeliveryDate, onClose }: OrderDeliveryContentProps) {
  const { setValue, watch, getValues } = useFormContext<CreateOrderInput>();
  const items = watch("items");
  const orderedAt = getValues("orderedAt");

  const [localDate, setLocalDate] = useState(deliveryDate);
  const [isDelivered, setIsDelivered] = useState(true);

  useEffect(() => {
    setIsDelivered(localDate === orderedAt);
  }, [localDate, orderedAt]);

  function onConfirm() {
    setDeliveryDate(localDate);
    items.forEach((_, index) => {
      setValue(`items.${index}.deliveredAt`, localDate, { shouldValidate: true });
      setValue(`items.${index}.isDelivered`, isDelivered, { shouldValidate: true });
    });
    onClose();
  }

  function onRemove() {
    setDeliveryDate(orderedAt);
    items.forEach((_, index) => {
      setValue(`items.${index}.deliveredAt`, orderedAt, { shouldValidate: true });
      setValue(`items.${index}.isDelivered`, true, { shouldValidate: true });
    });
    onClose();
  }

  return (
    <div className="space-y-4 p-5">
      <Field>
        <FieldLabel>Quando o pedido será entregue?</FieldLabel>
        <Input
          type="datetime-local"
          value={localDate}
          onChange={(e) => setLocalDate(e.target.value)}
        />
      </Field>
      <Field orientation="horizontal" className="w-auto">
        <Switch
          id="isDeliveredModal"
          checked={isDelivered}
          onCheckedChange={setIsDelivered}
        />
        <Label htmlFor="isDeliveredModal">Marcar como entregue</Label>
      </Field>
      <div className="flex justify-between">
        <div>
          {orderedAt !== deliveryDate && (
            <Button type="button" variant="ghost" onClick={onRemove}>
              Remover agendamento
            </Button>
          )}
        </div>
        <Button type="button" onClick={onConfirm}>
          Confirmar
        </Button>
      </div>
    </div>
  );
}

interface OrderDeliveryModalProps {
  deliveryDate: string;
  setDeliveryDate: (date: string) => void;
}

export function OrderDeliveryModal({ deliveryDate, setDeliveryDate }: OrderDeliveryModalProps) {
  const [modal, setModal] = useQueryState("modal");
  const isOpen = modal === "delivery";
  const onClose = () => setModal(null);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex flex-col gap-0 p-0">
        <DialogHeader className="mb-0 p-5">
          <DialogTitle>Entrega do pedido</DialogTitle>
        </DialogHeader>
        <OrderDeliveryContent deliveryDate={deliveryDate} setDeliveryDate={setDeliveryDate} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}
