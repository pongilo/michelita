import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FormModal } from "@/components/form-modal";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export const productQuickCreateSchema = z.object({
  name: z.string().trim().min(2, "Informe ao menos 2 caracteres para o nome do produto."),
});

export type ProductQuickCreateValues = z.infer<typeof productQuickCreateSchema>;

type ProductQuickCreateModalProps = {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: ProductQuickCreateValues) => Promise<void> | void;
};

export function ProductQuickCreateModal({ isOpen, isSubmitting, onClose, onSubmit }: ProductQuickCreateModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductQuickCreateValues>({
    resolver: zodResolver(productQuickCreateSchema),
    defaultValues: { name: "" },
  });

  useEffect(() => {
    if (!isOpen) return;
    reset({ name: "" });
  }, [isOpen, reset]);

  return (
    <FormModal isOpen={isOpen} title="Novo produto" onClose={onClose} maxWidthClassName="max-w-md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <FieldGroup>
          <Field>
            <FieldLabel>Nome</FieldLabel>
            <Input type="text" placeholder="Nome do produto" autoFocus {...register("name")} />
            <FieldError>{errors.name?.message}</FieldError>
          </Field>
        </FieldGroup>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Criando..." : "Criar produto"}
          </Button>
        </div>
      </form>
    </FormModal>
  );
}
