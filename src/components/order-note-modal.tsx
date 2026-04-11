import { useFormContext } from "react-hook-form";
import { useQueryState } from "nuqs";
import type { CreateOrderInput } from "@/lib/api/order/create-order";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function OrderNoteModal() {
  const [modal, setModal] = useQueryState("modal");
  const { register, setValue, watch, formState: { errors } } = useFormContext<CreateOrderInput>();

  const isOpen = modal === "note";

  const watchedNote = watch('note')

  function onClose() {
    setModal(null);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Observação do pedido</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field>
            <FieldLabel>Observação do pedido</FieldLabel>
            <Textarea rows={5} placeholder="Escreva uma observação..." {...register("note")} />
            <FieldError>{errors.note?.message}</FieldError>
          </Field>
          <div className="flex justify-between">
            <div>
              {watchedNote && (
                <Button type="button" variant="ghost" onClick={() => {setValue('note', ''); onClose()}}>
                  Limpar
                </Button>
              )}
            </div>
            <Button type="button" onClick={onClose}>
              Confirmar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
