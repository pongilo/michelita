import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { useQueryState } from "nuqs";
import { ChevronLeft, PlusIcon, XIcon, CheckIcon } from "lucide-react";
import { FormModal } from "@/components/form-modal";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateTransactionCategory } from "@/hooks/tanstack/transaction-category/use-create-transaction-category";
import { useIsMobile } from "@/hooks/use-mobile";
import { localDatetime } from "@/lib/utils/formatter";

export const TRANSACTION_TYPES = [
  { value: "PIX", label: "Pix" },
  { value: "CREDIT", label: "Crédito" },
  { value: "DEBIT", label: "Débito" },
  { value: "CASH", label: "Dinheiro" },
] as const;

export const transactionFormSchema = z.object({
  description: z.string().trim().min(2, "Informe ao menos 2 caracteres para a descrição."),
  amount: z.number({ error: "Informe um valor válido." }).min(0, "O valor deve ser maior ou igual a zero."),
  direction: z.enum(["INCOME", "EXPENSE"]),
  type: z.enum(["PIX", "CREDIT", "DEBIT", "CASH"]),
  categoryId: z.string().nullable().optional(),
  date: z.string().min(1, "Informe uma data e hora."),
});

export type TransactionFormValues = z.infer<typeof transactionFormSchema>;

type TransactionFormContentProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  isSubmitting: boolean;
  initialValues?: Partial<Omit<TransactionFormValues, "direction"> & { amount: number }>;
  categories: { id: string; name: string }[];
  organizationId: string;
  onClose: () => void;
  onSubmit: (signedAmount: number, values: Omit<TransactionFormValues, "direction" | "amount">) => Promise<void> | void;
};



function getDefaultValues(
  initialValues?: TransactionFormContentProps["initialValues"],
): TransactionFormValues {
  const rawAmount = initialValues?.amount ?? 0;
  return {
    description: initialValues?.description ?? "",
    amount: Math.abs(rawAmount),
    direction: rawAmount < 0 ? "EXPENSE" : "INCOME",
    type: initialValues?.type ?? "PIX",
    categoryId: initialValues?.categoryId ?? null,
    date: initialValues?.date ?? localDatetime(),
  };
}

function TransactionFormContent({
  isOpen,
  mode,
  isSubmitting,
  initialValues,
  categories,
  organizationId,
  onClose,
  onSubmit,
}: TransactionFormContentProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: getDefaultValues(initialValues),
  });

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const { mutateAsync: createCategory, isPending: isCreatingCategory } = useCreateTransactionCategory();

  useEffect(() => {
    if (!isOpen) return;
    reset(getDefaultValues(initialValues));
    setIsAddingCategory(false);
    setNewCategoryName("");
  }, [isOpen, initialValues?.description, initialValues?.amount, initialValues?.type, initialValues?.categoryId, initialValues?.date, reset]);

  async function handleCreateCategory() {
    const name = newCategoryName.trim();
    if (name.length < 2) return;
    const created = await createCategory({ organizationId, name });
    setValue("categoryId", created.id);
    setNewCategoryName("");
    setIsAddingCategory(false);
  }

  function handleFormSubmit(values: TransactionFormValues) {
    const signedAmount = values.direction === "EXPENSE" ? -Math.abs(values.amount) : Math.abs(values.amount);
    const { direction: _, amount: __, ...rest } = values;
    return onSubmit(signedAmount, rest);
  }

  const categoryOptions = [
    { value: "", label: "Sem categoria" },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-3">
      <FieldGroup>
        <Field>
          <FieldLabel>Descrição</FieldLabel>
          <Input type="text" placeholder="Ex: Venda de bolo, compra de ingredientes" {...register("description")} />
          <FieldError>{errors.description?.message}</FieldError>
        </Field>

        <Controller
          name="direction"
          control={control}
          render={({ field }) => (
            <div className="grid grid-cols-2 overflow-hidden rounded-lg border">
              <button
                type="button"
                onClick={() => field.onChange("INCOME")}
                className={`py-2 text-sm font-medium transition-colors ${
                  field.value === "INCOME"
                    ? "bg-green-500 text-white"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                Entrada
              </button>
              <button
                type="button"
                onClick={() => field.onChange("EXPENSE")}
                className={`py-2 text-sm font-medium transition-colors ${
                  field.value === "EXPENSE"
                    ? "bg-destructive text-destructive-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                Saída
              </button>
            </div>
          )}
        />

        <div className="grid md:grid-cols-2 gap-3">
          <Field>
            <FieldLabel>Valor (R$)</FieldLabel>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              {...register("amount", { valueAsNumber: true })}
            />
            <FieldError>{errors.amount?.message}</FieldError>
          </Field>

          <Field>
            <FieldLabel>Data e hora</FieldLabel>
            <Input type="datetime-local" {...register("date")} />
            <FieldError>{errors.date?.message}</FieldError>
          </Field>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <Field>
            <FieldLabel>Forma de pagamento</FieldLabel>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select items={TRANSACTION_TYPES} value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSACTION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError>{errors.type?.message}</FieldError>
          </Field>

          <Field>
            <div className="flex items-center justify-between">
              <FieldLabel>Categoria</FieldLabel>
              {!isAddingCategory && (
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(true)}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                >
                  <PlusIcon className="size-3" />
                  Nova
                </button>
              )}
            </div>
            {isAddingCategory ? (
              <div className="flex gap-1.5">
                <Input
                  autoFocus
                  type="text"
                  placeholder="Nome da categoria"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); handleCreateCategory(); }
                    if (e.key === "Escape") { setIsAddingCategory(false); setNewCategoryName(""); }
                  }}
                  disabled={isCreatingCategory}
                />
                <Button
                  type="button"
                  size="icon-sm"
                  onClick={handleCreateCategory}
                  disabled={isCreatingCategory || newCategoryName.trim().length < 2}
                >
                  <CheckIcon />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => { setIsAddingCategory(false); setNewCategoryName(""); }}
                  disabled={isCreatingCategory}
                >
                  <XIcon />
                </Button>
              </div>
            ) : (
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <Select
                    items={categoryOptions}
                    value={field.value ?? ""}
                    onValueChange={(v) => field.onChange(v || null)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sem categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
          </Field>
        </div>
      </FieldGroup>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? "Salvando..."
            : mode === "create"
              ? "Salvar transação"
              : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}

type TransactionFormModalProps = {
  isSubmitting: boolean;
  initialValues?: Partial<Omit<TransactionFormValues, "direction"> & { amount: number }>;
  categories: { id: string; name: string }[];
  organizationId: string;
  onSubmit: (signedAmount: number, values: Omit<TransactionFormValues, "direction" | "amount">) => Promise<void> | void;
};

export function TransactionFormModal({
  isSubmitting,
  initialValues,
  categories,
  organizationId,
  onSubmit,
}: TransactionFormModalProps) {
  const [modal, setModal] = useQueryState("modal");
  const [, setTransactionId] = useQueryState("transactionId");
  const isMobile = useIsMobile();

  const isOpen = modal === "transaction";
  const mode = initialValues !== undefined ? "edit" : "create";
  const title = mode === "create" ? "Nova transação" : "Editar transação";

  function onClose() {
    setModal(null);
    setTransactionId(null);
  }

  const contentProps: TransactionFormContentProps = {
    isOpen,
    mode,
    isSubmitting,
    initialValues,
    categories,
    organizationId,
    onClose,
    onSubmit,
  };

  if (isMobile && isOpen) {
    return (
      <main className="flex flex-col">
        <div className="flex-none flex items-center gap-1 sticky top-0 bg-white z-20 p-3 border-b">
          <Button type="button" variant="ghost" size="icon-lg" onClick={onClose}>
            <ChevronLeft />
          </Button>
          <h2 className="text-xl font-heading">{title}</h2>
        </div>
        <div className="p-5">
          <TransactionFormContent {...contentProps} />
        </div>
      </main>
    );
  }

  return (
    <FormModal isOpen={isOpen} title={title} onClose={onClose}>
      <TransactionFormContent {...contentProps} />
    </FormModal>
  );
}
