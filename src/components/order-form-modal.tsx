import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { useCreateOrder } from "@/hooks/tanstack/order/use-create-order";
import { useUpdateOrder } from "@/hooks/tanstack/order/use-update-order";
import type { Database } from "@/lib/database.types";
import type {
  DeliveryType,
  OrderStatus,
  OrderType,
  OrderWithDetails,
  PaymentMethod,
  PaymentStatus,
} from "@/lib/api/order/types";

const orderSchema = z.object({
  customerId: z.string().min(1, "Selecione um cliente."),
  type: z.enum(["sale", "order"]),
  status: z.enum(["pending", "confirmed", "preparing", "ready", "delivered", "cancelled"]),
  deliveryFee: z.number().min(0, "Taxa de entrega deve ser maior ou igual a zero."),
  deliveryDatetime: z.string().optional(),
  deliveryAddress: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, "Selecione um produto."),
        quantity: z.number().int().min(1, "Quantidade minima: 1."),
        note: z.string().optional(),
        deliveryType: z.enum(["pickup", "delivery"]),
        customizationsText: z.string().optional(),
      })
    )
    .min(1, "Adicione pelo menos um item."),
  payments: z
    .array(
      z.object({
        method: z.enum(["pix", "cash", "credit_card", "debit_card", "transfer"]),
        amount: z.number().min(0, "Valor deve ser maior ou igual a zero."),
        status: z.enum(["pending", "paid", "failed", "refunded"]),
        paidAt: z.string().optional(),
        note: z.string().optional(),
      })
    )
    .min(1, "Adicione pelo menos um pagamento."),
});

type OrderFormValues = z.infer<typeof orderSchema>;
type Customer = Database["public"]["Tables"]["customer"]["Row"];
type Product = Database["public"]["Tables"]["product"]["Row"];

const ORDER_TYPE_OPTIONS: { value: OrderType; label: string }[] = [
  { value: "sale", label: "Venda" },
  { value: "order", label: "Pedido" },
];

const ORDER_STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "pending", label: "Pendente" },
  { value: "confirmed", label: "Confirmado" },
  { value: "preparing", label: "Preparando" },
  { value: "ready", label: "Pronto" },
  { value: "delivered", label: "Entregue" },
  { value: "cancelled", label: "Cancelado" },
];

const DELIVERY_TYPE_OPTIONS: { value: DeliveryType; label: string }[] = [
  { value: "pickup", label: "Retirada" },
  { value: "delivery", label: "Entrega" },
];

const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "pix", label: "PIX" },
  { value: "cash", label: "Dinheiro" },
  { value: "credit_card", label: "Cartao de credito" },
  { value: "debit_card", label: "Cartao de debito" },
  { value: "transfer", label: "Transferencia" },
];

const PAYMENT_STATUS_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: "pending", label: "Pendente" },
  { value: "paid", label: "Pago" },
  { value: "failed", label: "Falhou" },
  { value: "refunded", label: "Estornado" },
];

function emptyItem(): OrderFormValues["items"][number] {
  return {
    productId: "",
    quantity: 1,
    note: "",
    deliveryType: "pickup",
    customizationsText: "",
  };
}

function emptyPayment(): OrderFormValues["payments"][number] {
  return {
    method: "pix",
    amount: 0,
    status: "pending",
    paidAt: "",
    note: "",
  };
}

function toLocalDatetimeInput(isoDatetime: string | null) {
  if (!isoDatetime) {
    return "";
  }

  const date = new Date(isoDatetime);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

function toIsoDatetime(localDatetime: string | undefined) {
  if (!localDatetime) {
    return null;
  }

  const date = new Date(localDatetime);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

type OrderFormModalProps = {
  isOpen: boolean;
  organizationId: string;
  customers: Customer[];
  products: Product[];
  orderToEdit: OrderWithDetails | null;
  onSuccess: (message: string) => void;
  onClose: () => void;
};

export function OrderFormModal({
  isOpen,
  organizationId,
  customers,
  products,
  orderToEdit,
  onSuccess,
  onClose,
}: OrderFormModalProps) {
  const [errorMessage, setErrorMessage] = useState("");
  const isEditing = !!orderToEdit;
  const { mutateAsync: createOrder, isPending: isCreating } = useCreateOrder();
  const { mutateAsync: updateOrder, isPending: isUpdating } = useUpdateOrder({ organizationId });
  const isSubmitting = isCreating || isUpdating;
  const productsById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customerId: "",
      type: "order",
      status: "pending",
      deliveryFee: 0,
      deliveryDatetime: "",
      deliveryAddress: "",
      items: [emptyItem()],
      payments: [emptyPayment()],
    },
  });

  const {
    fields: itemFields,
    append: appendItem,
    remove: removeItem,
  } = useFieldArray({
    control,
    name: "items",
  });

  const {
    fields: paymentFields,
    append: appendPayment,
    remove: removePayment,
  } = useFieldArray({
    control,
    name: "payments",
  });

  const watchedItems = watch("items");
  const watchedDeliveryFee = watch("deliveryFee");

  const subtotalPreview = watchedItems.reduce((sum, item) => {
    const product = productsById.get(item.productId);
    const unitPrice = product ? Number(product.price) : 0;
    const quantity = Number.isFinite(item.quantity) ? item.quantity : 0;
    return sum + unitPrice * quantity;
  }, 0);

  const totalPreview = subtotalPreview + (Number.isFinite(watchedDeliveryFee) ? watchedDeliveryFee : 0);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setErrorMessage("");

    if (orderToEdit) {
      reset({
        customerId: orderToEdit.customer_id,
        type: orderToEdit.type,
        status: orderToEdit.status,
        deliveryFee: Number(orderToEdit.delivery_fee),
        deliveryDatetime: toLocalDatetimeInput(orderToEdit.delivery_datetime),
        deliveryAddress: orderToEdit.delivery_address ?? "",
        items: orderToEdit.items.length
          ? orderToEdit.items.map((item) => ({
              productId: item.product_id,
              quantity: item.quantity,
              note: item.note ?? "",
              deliveryType: item.delivery_type,
              customizationsText: item.customizations
                .map((customization) => `${customization.name}: ${customization.value}`)
                .join("\n"),
            }))
          : [emptyItem()],
        payments: orderToEdit.payments.length
          ? orderToEdit.payments.map((payment) => ({
              method: payment.method,
              amount: Number(payment.amount),
              status: payment.status,
              paidAt: toLocalDatetimeInput(payment.paid_at),
              note: payment.note ?? "",
            }))
          : [emptyPayment()],
      });
      return;
    }

    reset({
      customerId: "",
      type: "order",
      status: "pending",
      deliveryFee: 0,
      deliveryDatetime: "",
      deliveryAddress: "",
      items: [emptyItem()],
      payments: [emptyPayment()],
    });
  }, [isOpen, orderToEdit, reset]);

  async function onSubmit(values: OrderFormValues) {
    if (!organizationId) {
      setErrorMessage("Organizacao nao encontrada.");
      return;
    }

    if (customers.length === 0) {
      setErrorMessage("Cadastre ao menos um cliente antes de criar pedidos.");
      return;
    }

    if (products.length === 0) {
      setErrorMessage("Cadastre ao menos um produto antes de criar pedidos.");
      return;
    }

    setErrorMessage("");

    const payload = {
      organizationId,
      customerId: values.customerId,
      type: values.type,
      status: values.status,
      deliveryFee: values.deliveryFee,
      deliveryDatetime: toIsoDatetime(values.deliveryDatetime),
      deliveryAddress: values.deliveryAddress,
      items: values.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        note: item.note,
        deliveryType: item.deliveryType,
        customizations: (item.customizationsText ?? "")
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const [name, ...valueParts] = line.split(":");
            return {
              name: (name ?? "").trim(),
              value: valueParts.join(":").trim(),
            };
          })
          .filter((customization) => customization.name && customization.value),
      })),
      payments: values.payments.map((payment) => ({
        method: payment.method,
        amount: payment.amount,
        status: payment.status,
        paidAt: toIsoDatetime(payment.paidAt),
        note: payment.note,
      })),
    };

    try {
      if (orderToEdit) {
        await updateOrder({
          id: orderToEdit.id,
          ...payload,
        });
        onSuccess("Pedido atualizado com sucesso.");
      } else {
        await createOrder(payload);
        onSuccess("Pedido criado com sucesso.");
      }

      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Erro ao salvar pedido.");
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal modal-open" role="dialog" aria-modal="true">
      <div className="modal-box max-w-5xl">
        <h2 className="text-lg font-semibold">{isEditing ? "Editar pedido" : "Novo pedido"}</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-6">
          <section className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1">
              <span className="label">Cliente</span>
              <select className="select select-bordered w-full" {...register("customerId")}>
                <option value="">Selecione</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
              {errors.customerId ? (
                <span className="text-error-content text-sm">{errors.customerId.message}</span>
              ) : null}
            </label>

            <label className="space-y-1">
              <span className="label">Tipo</span>
              <select className="select select-bordered w-full" {...register("type")}>
                {ORDER_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="label">Status</span>
              <select className="select select-bordered w-full" {...register("status")}>
                {ORDER_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="label">Data/hora da entrega</span>
              <input type="datetime-local" className="input input-bordered w-full" {...register("deliveryDatetime")} />
            </label>

            <label className="space-y-1">
              <span className="label">Taxa de entrega</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input input-bordered w-full"
                {...register("deliveryFee", { valueAsNumber: true })}
              />
              {errors.deliveryFee ? (
                <span className="text-error-content text-sm">{errors.deliveryFee.message}</span>
              ) : null}
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="label">Endereco de entrega</span>
              <textarea
                rows={2}
                className="textarea textarea-bordered w-full"
                {...register("deliveryAddress")}
              />
            </label>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Itens</h3>
              <button type="button" className="btn btn-sm btn-outline" onClick={() => appendItem(emptyItem())}>
                Adicionar item
              </button>
            </div>

            {itemFields.map((field, index) => (
              <div key={field.id} className="card border border-base-300 bg-base-100">
                <div className="card-body p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Item {index + 1}</span>
                    {itemFields.length > 1 ? (
                      <button
                        type="button"
                        className="btn btn-xs btn-ghost text-error"
                        onClick={() => removeItem(index)}
                      >
                        Remover
                      </button>
                    ) : null}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="space-y-1">
                      <span className="label">Produto</span>
                      <select className="select select-bordered w-full" {...register(`items.${index}.productId`)}>
                        <option value="">Selecione</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} ({currencyFormatter.format(product.price)})
                          </option>
                        ))}
                      </select>
                      {errors.items?.[index]?.productId ? (
                        <span className="text-error-content text-sm">
                          {errors.items[index]?.productId?.message}
                        </span>
                      ) : null}
                    </label>

                    <label className="space-y-1">
                      <span className="label">Quantidade</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        className="input input-bordered w-full"
                        {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                      />
                      {errors.items?.[index]?.quantity ? (
                        <span className="text-error-content text-sm">{errors.items[index]?.quantity?.message}</span>
                      ) : null}
                    </label>

                    <label className="space-y-1">
                      <span className="label">Tipo de entrega</span>
                      <select className="select select-bordered w-full" {...register(`items.${index}.deliveryType`)}>
                        {DELIVERY_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1">
                      <span className="label">Observacao do item</span>
                      <input type="text" className="input input-bordered w-full" {...register(`items.${index}.note`)} />
                    </label>

                    <label className="space-y-1 md:col-span-2">
                      <span className="label">Personalizacoes (uma por linha: nome: valor)</span>
                      <textarea
                        rows={2}
                        className="textarea textarea-bordered w-full"
                        {...register(`items.${index}.customizationsText`)}
                      />
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Pagamentos</h3>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => appendPayment(emptyPayment())}
              >
                Adicionar pagamento
              </button>
            </div>

            {paymentFields.map((field, index) => (
              <div key={field.id} className="card border border-base-300 bg-base-100">
                <div className="card-body p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Pagamento {index + 1}</span>
                    {paymentFields.length > 1 ? (
                      <button
                        type="button"
                        className="btn btn-xs btn-ghost text-error"
                        onClick={() => removePayment(index)}
                      >
                        Remover
                      </button>
                    ) : null}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="space-y-1">
                      <span className="label">Metodo</span>
                      <select className="select select-bordered w-full" {...register(`payments.${index}.method`)}>
                        {PAYMENT_METHOD_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1">
                      <span className="label">Status do pagamento</span>
                      <select className="select select-bordered w-full" {...register(`payments.${index}.status`)}>
                        {PAYMENT_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1">
                      <span className="label">Valor</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="input input-bordered w-full"
                        {...register(`payments.${index}.amount`, { valueAsNumber: true })}
                      />
                      {errors.payments?.[index]?.amount ? (
                        <span className="text-error-content text-sm">{errors.payments[index]?.amount?.message}</span>
                      ) : null}
                    </label>

                    <label className="space-y-1">
                      <span className="label">Pago em</span>
                      <input
                        type="datetime-local"
                        className="input input-bordered w-full"
                        {...register(`payments.${index}.paidAt`)}
                      />
                    </label>

                    <label className="space-y-1 md:col-span-2">
                      <span className="label">Observacao</span>
                      <input type="text" className="input input-bordered w-full" {...register(`payments.${index}.note`)} />
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </section>

          <section className="rounded-box bg-base-200 p-4 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{currencyFormatter.format(subtotalPreview)}</span>
            </div>
            <div className="flex justify-between">
              <span>Taxa de entrega</span>
              <span>{currencyFormatter.format(Number.isFinite(watchedDeliveryFee) ? watchedDeliveryFee : 0)}</span>
            </div>
            <div className="mt-1 flex justify-between font-semibold">
              <span>Total</span>
              <span>{currencyFormatter.format(totalPreview)}</span>
            </div>
          </section>

          {errorMessage ? (
            <div className="alert alert-error">
              <span>{errorMessage}</span>
            </div>
          ) : null}

          <div className="modal-action mt-2">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || customers.length === 0 || products.length === 0}
              className="btn btn-primary"
            >
              {isSubmitting ? "Salvando..." : isEditing ? "Salvar alteracoes" : "Criar pedido"}
            </button>
          </div>
        </form>
      </div>
      <button type="button" aria-label="fechar" className="modal-backdrop" onClick={onClose}>
        fechar
      </button>
    </div>
  );
}
