import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { FormModal } from "@/components/form-modal";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { unitCostFormatter } from "@/lib/utils/formatter";
import { UNIT_OPTIONS } from "@/lib/constants/units";

export const supplyFormSchema = z.object({
  name: z.string().trim().min(2, "Informe ao menos 2 caracteres para o nome do insumo."),
  unit: z.string().min(1, "Selecione a unidade de medida."),
  purchasePrice: z.number({ error: "Informe um preço válido." }).positive("O preço deve ser maior que zero."),
  purchaseQuantity: z
    .number({ error: "Informe uma quantidade válida." })
    .positive("A quantidade deve ser maior que zero."),
});

export type SupplyFormValues = z.infer<typeof supplyFormSchema>;

type SupplyFormModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  isSubmitting: boolean;
  initialValues?: Partial<SupplyFormValues>;
  onClose: () => void;
  onSubmit: (values: SupplyFormValues) => Promise<void> | void;
};

function getDefaultValues(initialValues?: Partial<SupplyFormValues>): SupplyFormValues {
  return {
    name: initialValues?.name ?? "",
    unit: initialValues?.unit ?? "",
    purchasePrice: initialValues?.purchasePrice ?? 0,
    purchaseQuantity: initialValues?.purchaseQuantity ?? 0,
  };
}

export function SupplyFormModal({
  isOpen,
  mode,
  isSubmitting,
  initialValues,
  onClose,
  onSubmit,
}: SupplyFormModalProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<SupplyFormValues>({
    resolver: zodResolver(supplyFormSchema),
    defaultValues: getDefaultValues(initialValues),
  });

  useEffect(() => {
    if (!isOpen) return;
    reset(getDefaultValues(initialValues));
  }, [
    isOpen,
    initialValues?.name,
    initialValues?.unit,
    initialValues?.purchasePrice,
    initialValues?.purchaseQuantity,
    reset,
  ]);

  const purchasePrice = watch("purchasePrice");
  const purchaseQuantity = watch("purchaseQuantity");
  const unit = watch("unit");
  const costPerUnit =
    purchasePrice > 0 && purchaseQuantity > 0 ? purchasePrice / purchaseQuantity : null;

  return (
    <FormModal
      isOpen={isOpen}
      title={mode === "create" ? "Novo insumo" : "Editar insumo"}
      onClose={onClose}
      maxWidthClassName="max-w-md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <FieldGroup>
          <Field>
            <FieldLabel>Nome</FieldLabel>
            <Input type="text" placeholder="Ex: Farinha de trigo" {...register("name")} />
            <FieldError>{errors.name?.message}</FieldError>
          </Field>

          <Field>
            <FieldLabel>Unidade de medida</FieldLabel>
            <Controller
              name="unit"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={(value) => field.onChange(value ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione a unidade" />
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
            <FieldError>{errors.unit?.message}</FieldError>
          </Field>

          <div className="grid gap-3 grid-cols-2">
            <Field>
              <FieldLabel>Preço da compra (R$)</FieldLabel>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                {...register("purchasePrice", { valueAsNumber: true })}
              />
              <FieldError>{errors.purchasePrice?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel>Quantidade comprada</FieldLabel>
              <Input
                type="number"
                step="0.001"
                min="0"
                placeholder="0"
                {...register("purchaseQuantity", { valueAsNumber: true })}
              />
              <FieldError>{errors.purchaseQuantity?.message}</FieldError>
            </Field>
          </div>

          <Field>
            <FieldLabel>Custo por unidade</FieldLabel>
            <div className="rounded-2xl border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              {costPerUnit !== null
                ? `${unitCostFormatter.format(costPerUnit)} / ${unit?.trim() || "unidade"}`
                : "Informe o preço e a quantidade da compra"}
            </div>
            <FieldDescription>Calculado automaticamente a partir do preço e da quantidade comprada.</FieldDescription>
          </Field>
        </FieldGroup>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : mode === "create" ? "Salvar insumo" : "Salvar alterações"}
          </Button>
        </div>
      </form>
    </FormModal>
  );
}
