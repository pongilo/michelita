import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FormModal } from "@/components/form-modal";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const categoryFormSchema = z.object({
  name: z.string().trim().min(2, "Informe ao menos 2 caracteres para o nome da categoria."),
  description: z.string().trim().optional(),
  displayLimit: z.number().int("Informe um número inteiro.").min(1, "O limite deve ser maior que zero.").optional(),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

type CategoryFormModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  isSubmitting: boolean;
  initialValues?: Partial<CategoryFormValues>;
  onClose: () => void;
  onSubmit: (values: CategoryFormValues) => Promise<void> | void;
};

function getDefaultValues(initialValues?: Partial<CategoryFormValues>): CategoryFormValues {
  return {
    name: initialValues?.name ?? "",
    description: initialValues?.description ?? "",
    displayLimit: initialValues?.displayLimit,
  };
}

export function CategoryFormModal({
  isOpen,
  mode,
  isSubmitting,
  initialValues,
  onClose,
  onSubmit,
}: CategoryFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: getDefaultValues(initialValues),
  });

  useEffect(() => {
    if (!isOpen) return;
    reset(getDefaultValues(initialValues));
  }, [isOpen, initialValues?.name, initialValues?.description, initialValues?.displayLimit, reset]);

  return (
    <FormModal
      isOpen={isOpen}
      title={mode === "create" ? "Nova categoria" : "Editar categoria"}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <FieldGroup>
          <Field>
            <FieldLabel>Nome</FieldLabel>
            <Input type="text" placeholder="Nome da categoria" {...register("name")} />
            <FieldError>{errors.name?.message}</FieldError>
          </Field>

          <Field>
            <FieldLabel>Descrição</FieldLabel>
            <Textarea placeholder="Descrição da categoria (opcional)" {...register("description")} />
            <FieldError>{errors.description?.message}</FieldError>
          </Field>

          <Field>
            <FieldLabel>Limite de produtos no cardápio</FieldLabel>
            <Input
              type="number"
              step="1"
              min="1"
              placeholder="Sempre mostra todos"
              {...register("displayLimit", {
                setValueAs: (value) => (value === "" ? undefined : Number(value)),
              })}
            />
            <FieldDescription>
              Deixe em branco para mostrar todos os produtos. Se preencher, ex: 4, o cardápio mostra esse
              número de produtos com um botão para ver os demais da categoria.
            </FieldDescription>
            <FieldError>{errors.displayLimit?.message}</FieldError>
          </Field>
        </FieldGroup>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Salvando..."
              : mode === "create"
                ? "Salvar categoria"
                : "Salvar alterações"}
          </Button>
        </div>
      </form>
    </FormModal>
  );
}
