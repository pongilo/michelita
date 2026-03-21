import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FormModal } from "@/components/form-modal";

const transactionFormSchema = z.object({
  type: z.enum(["entry", "exit"]),
  amount: z.number().min(0.01, "Informe um valor maior que zero."),
  method: z.enum(["pix", "cash", "credit_card", "debit_card"]),
  madeAt: z.string().trim().min(1, "Data/hora da transacao e obrigatoria."),
  linkedCustomerId: z.union([z.uuid(), z.literal("")]).optional(),
  linkedOrderId: z.union([z.uuid(), z.literal("")]).optional(),
  description: z.string().trim().max(500, "A descricao deve ter no maximo 500 caracteres.").optional(),
});

export type TransactionFormValues = z.infer<typeof transactionFormSchema>;

type CustomerOption = {
  id: string;
  name: string;
};

type OrderOption = {
  id: string;
  label: string;
};

type TransactionFormModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  isSubmitting: boolean;
  customers: CustomerOption[];
  orders?: OrderOption[];
  fixedLinkedCustomer?: CustomerOption;
  fixedLinkedOrder?: OrderOption;
  errorMessage: string;
  successMessage: string;
  initialValues?: Partial<TransactionFormValues>;
  onClose: () => void;
  onSubmit: (values: TransactionFormValues) => Promise<void> | void;
};

function localDatetimeNow() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function getDefaultValues(initialValues?: Partial<TransactionFormValues>): TransactionFormValues {
  return {
    type: initialValues?.type ?? "entry",
    amount: initialValues?.amount ?? 0,
    method: initialValues?.method ?? "pix",
    madeAt: initialValues?.madeAt ?? localDatetimeNow(),
    linkedCustomerId: initialValues?.linkedCustomerId ?? "",
    linkedOrderId: initialValues?.linkedOrderId ?? "",
    description: initialValues?.description ?? "",
  };
}

export function TransactionFormModal({
  isOpen,
  mode,
  isSubmitting,
  customers,
  orders,
  fixedLinkedCustomer,
  fixedLinkedOrder,
  errorMessage,
  successMessage,
  initialValues,
  onClose,
  onSubmit,
}: TransactionFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: getDefaultValues(initialValues),
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    reset(getDefaultValues(initialValues));
  }, [
    isOpen,
    initialValues?.amount,
    initialValues?.description,
    initialValues?.linkedCustomerId,
    initialValues?.linkedOrderId,
    initialValues?.madeAt,
    initialValues?.method,
    initialValues?.type,
    reset,
  ]);

  return (
    <FormModal
      isOpen={isOpen}
      title={mode === "create" ? "Nova transacao" : "Editar transacao"}
      onClose={onClose}
      maxWidthClassName="max-w-3xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1">
          <span className="label">Tipo</span>
          <select className="select select-bordered w-full" {...register("type")}>
            <option value="entry">Entrada</option>
            <option value="exit">Saida</option>
          </select>
        </label>

        <label className="space-y-1">
          <span className="label">Valor</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            className="input input-bordered w-full"
            {...register("amount", { valueAsNumber: true })}
          />
          {errors.amount ? <span className="text-error-content text-sm">{errors.amount.message}</span> : null}
        </label>

        <label className="space-y-1">
          <span className="label">Metodo</span>
          <select className="select select-bordered w-full" {...register("method")}>
            <option value="pix">PIX</option>
            <option value="cash">Dinheiro</option>
            <option value="credit_card">Cartao de credito</option>
            <option value="debit_card">Cartao de debito</option>
          </select>
        </label>

        <label className="space-y-1">
          <span className="label">Data/hora</span>
          <input type="datetime-local" className="input input-bordered w-full" {...register("madeAt")} />
          {errors.madeAt ? <span className="text-error-content text-sm">{errors.madeAt.message}</span> : null}
        </label>

        <label className="space-y-1 md:col-span-2">
          <span className="label">Descricao (opcional)</span>
          <input type="text" className="input input-bordered w-full" placeholder="Descricao" {...register("description")} />
          {errors.description ? <span className="text-error-content text-sm">{errors.description.message}</span> : null}
        </label>

        {fixedLinkedCustomer ? (
          <div className="space-y-1 md:col-span-2">
            <span className="label">Cliente vinculado</span>
            <input type="hidden" {...register("linkedCustomerId")} />
            <div className="input input-bordered flex w-full items-center bg-base-200/60">
              {fixedLinkedCustomer.name}
            </div>
          </div>
        ) : (
          <label className="space-y-1 md:col-span-2">
            <span className="label">Cliente vinculado (opcional)</span>
            <select className="select select-bordered w-full" {...register("linkedCustomerId")}>
              <option value="">Sem cliente vinculado</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {fixedLinkedOrder ? (
          <div className="space-y-1 md:col-span-2">
            <span className="label">Pedido vinculado</span>
            <input type="hidden" {...register("linkedOrderId")} value={fixedLinkedOrder.id} />
            <div className="input input-bordered flex w-full items-center bg-base-200/60">
              {fixedLinkedOrder.label}
            </div>
          </div>
        ) : orders && orders.length > 0 ? (
          <label className="space-y-1 md:col-span-2">
            <span className="label">Pedido vinculado (opcional)</span>
            <select className="select select-bordered w-full" {...register("linkedOrderId")}>
              <option value="">Sem pedido vinculado</option>
              {orders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {errorMessage ? (
          <div className="alert alert-error md:col-span-2">
            <span>{errorMessage}</span>
          </div>
        ) : null}

        {successMessage ? (
          <div className="alert alert-success md:col-span-2">
            <span>{successMessage}</span>
          </div>
        ) : null}

        <div className="md:col-span-2 flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting
              ? "Salvando..."
              : mode === "create"
                ? "Registrar transacao"
                : "Salvar alteracoes"}
          </button>
        </div>
      </form>
    </FormModal>
  );
}
