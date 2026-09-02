import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { FormModal } from "@/components/form-modal";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UNIT_OPTIONS } from "@/lib/constants/units";

export const recipeFormSchema = z.object({
  name: z.string().trim().min(2, "Informe ao menos 2 caracteres para o nome da receita."),
  yieldQuantity: z
    .number({ error: "Informe uma quantidade válida." })
    .positive("A quantidade deve ser maior que zero."),
  yieldUnit: z.string().min(1, "Selecione a unidade de medida."),
});

export type RecipeFormValues = z.infer<typeof recipeFormSchema>;

type RecipeFormModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  isSubmitting: boolean;
  initialValues?: Partial<RecipeFormValues>;
  onClose: () => void;
  onSubmit: (values: RecipeFormValues) => Promise<void> | void;
};

function getDefaultValues(initialValues?: Partial<RecipeFormValues>): RecipeFormValues {
  return {
    name: initialValues?.name ?? "",
    yieldQuantity: initialValues?.yieldQuantity ?? 0,
    yieldUnit: initialValues?.yieldUnit ?? "",
  };
}

export function RecipeFormModal({
  isOpen,
  mode,
  isSubmitting,
  initialValues,
  onClose,
  onSubmit,
}: RecipeFormModalProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<RecipeFormValues>({
    resolver: zodResolver(recipeFormSchema),
    defaultValues: getDefaultValues(initialValues),
  });

  useEffect(() => {
    if (!isOpen) return;
    reset(getDefaultValues(initialValues));
  }, [isOpen, initialValues?.name, initialValues?.yieldQuantity, initialValues?.yieldUnit, reset]);

  return (
    <FormModal
      isOpen={isOpen}
      title={mode === "create" ? "Nova receita" : "Editar receita"}
      onClose={onClose}
      maxWidthClassName="max-w-md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <FieldGroup>
          <Field>
            <FieldLabel>Nome</FieldLabel>
            <Input type="text" placeholder="Ex: Massa de cenoura" {...register("name")} />
            <FieldError>{errors.name?.message}</FieldError>
          </Field>

          <div className="grid gap-3 grid-cols-2">
            <Field>
              <FieldLabel>Rendimento</FieldLabel>
              <Input
                type="number"
                step="0.001"
                min="0"
                placeholder="0"
                {...register("yieldQuantity", { valueAsNumber: true })}
              />
              <FieldError>{errors.yieldQuantity?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel>Unidade</FieldLabel>
              <Controller
                name="yieldUnit"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(value) => field.onChange(value ?? "")}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError>{errors.yieldUnit?.message}</FieldError>
            </Field>
          </div>
        </FieldGroup>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : mode === "create" ? "Salvar receita" : "Salvar alterações"}
          </Button>
        </div>
      </form>
    </FormModal>
  );
}
