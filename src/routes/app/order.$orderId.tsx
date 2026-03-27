import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { TransactionFormModal, type TransactionFormValues } from "@/components/transaction-form-modal";
import { useGetCustomers } from "@/hooks/tanstack/customer/use-get-customers";
import { useDeleteOrder } from "@/hooks/tanstack/order/use-delete-order";
import { useGetOrder } from "@/hooks/tanstack/order/use-get-order";
import { useLinkOrderTransaction } from "@/hooks/tanstack/order/use-link-order-transaction";
import { useUpdateOrder } from "@/hooks/tanstack/order/use-update-order";
import { useUpdateOrderItemDelivery } from "@/hooks/tanstack/order/use-update-order-item-delivery";
import { useCreateTransaction } from "@/hooks/tanstack/transaction/use-create-transaction";
import { useGetTransactions } from "@/hooks/tanstack/transaction/use-get-transactions";
import { currencyFormatter, dateFormatter as datetimeFormatter } from "@/lib/utils/formatter";
import { toast } from "sonner";

const methodLabel: Record<string, string> = {
  PIX: "PIX",
  CASH: "Dinheiro",
  CREDIT_CARD: "Cartao de credito",
  DEBIT_CARD: "Cartao de debito",
};

function localDatetimeNow() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function currentDateInputValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function toLocalDatetimeInput(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return localDatetimeNow();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

// ── Schemas ──────────────────────────────────────────────────────────────────

const editInfoSchema = z.object({
  customerId: z.union([z.uuid(), z.literal("")]).optional(),
  orderedAt: z.string().trim().min(1, "Data/hora do pedido e obrigatoria."),
  isPaid: z.boolean(),
  note: z.string().trim().optional(),
  shippingFee: z.number().min(0).optional(),
  discount: z.number().min(0).optional(),
});

const editItemsSchema = z.object({
  items: z
    .array(
      z.object({
        description: z.string().trim().min(1, "Descricao do item e obrigatoria."),
        unitPrice: z.number().min(0, "Preco unitario deve ser maior ou igual a zero."),
        quantity: z.number().int().min(1, "Quantidade minima: 1."),
        deliveredAt: z.string().trim().min(1, "Data de entrega do item e obrigatoria."),
        isDelivered: z.boolean(),
        note: z.string().trim().optional(),
      }),
    )
    .min(1, "Adicione pelo menos um item."),
});

type EditInfoValues = z.infer<typeof editInfoSchema>;
type EditItemsValues = z.infer<typeof editItemsSchema>;

function emptyItem(): EditItemsValues["items"][number] {
  return { description: "", unitPrice: 0, quantity: 1, deliveredAt: localDatetimeNow(), isDelivered: false, note: "" };
}

// ── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/app/order/$orderId")({
  component: OrderDetailsPage,
});

function OrderDetailsPage() {
  const { organization } = Route.useRouteContext();
  const { orderId } = Route.useParams();
  const navigate = useNavigate();

  const { data: order, isLoading, isError, error } = useGetOrder({
    organizationId: organization.id,
    orderId,
  });

  const { data: customers = [] } = useGetCustomers({ organizationId: organization.id });

  const { data: allTransactions = [] } = useGetTransactions({
    organizationId: organization.id,
    period: "monthly",
    referenceDate: currentDateInputValue(),
  });

  const { mutateAsync: createTransaction, isPending: isCreatingTransaction } = useCreateTransaction({
    organizationId: organization.id,
  });
  const { link, unlink } = useLinkOrderTransaction({ organizationId: organization.id, orderId });
  const { mutateAsync: deleteOrder, isPending: isDeletingOrder } = useDeleteOrder({ organizationId: organization.id });
  const { mutateAsync: updateOrder, isPending: isUpdatingOrder } = useUpdateOrder({ organizationId: organization.id });
  const { mutate: updateItemDelivery, mutateAsync: updateItemDeliveryAsync, isPending: isUpdatingDelivery } = useUpdateOrderItemDelivery({ organizationId: organization.id });

  // ── Delivery dialog state ─────────────────────────────────────────────────
  const deliveryDialogRef = useRef<HTMLDialogElement>(null);
  const [pendingDeliveryItemId, setPendingDeliveryItemId] = useState<string | null>(null);
  const [updateDeliveryDate, setUpdateDeliveryDate] = useState(false);

  function openDeliveryDialog(itemId: string) {
    setPendingDeliveryItemId(itemId);
    setUpdateDeliveryDate(false);
    deliveryDialogRef.current?.showModal();
    (document.activeElement as HTMLElement | null)?.blur();
  }

  function handleConfirmDelivery() {
    if (!pendingDeliveryItemId) return;
    const now = new Date().toISOString();
    updateItemDelivery(
      { orderItemId: pendingDeliveryItemId, isDelivered: true, deliveredAt: updateDeliveryDate ? now : undefined },
      { onSuccess: () => { deliveryDialogRef.current?.close(); setPendingDeliveryItemId(null); } },
    );
  }

  async function handleMarkAllDelivered() {
    if (!order) return;
    const undelivered = order.item.filter((i) => !i.isDelivered);
    await Promise.all(undelivered.map((i) => updateItemDeliveryAsync({ orderItemId: i.id, isDelivered: true })));
  }

  // ── Modal state ──────────────────────────────────────────────────────────
  const [isNewTransactionModalOpen, setIsNewTransactionModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isEditInfoModalOpen, setIsEditInfoModalOpen] = useState(false);
  const [isEditItemsModalOpen, setIsEditItemsModalOpen] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState("");
  const [formError, setFormError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // ── Edit info form ───────────────────────────────────────────────────────
  const {
    register: registerInfo,
    handleSubmit: handleSubmitInfo,
    reset: resetInfo,
    formState: { errors: infoErrors },
  } = useForm<EditInfoValues>({
    resolver: zodResolver(editInfoSchema),
    defaultValues: { customerId: "", orderedAt: localDatetimeNow(), isPaid: false, note: "", shippingFee: 0, discount: 0 },
  });

  useEffect(() => {
    if (order && isEditInfoModalOpen) {
      resetInfo({
        customerId: order.customerId ?? "",
        orderedAt: toLocalDatetimeInput(order.orderedAt),
        isPaid: order.isPaid,
        note: order.note ?? "",
        shippingFee: order.shippingFee ?? 0,
        discount: order.discount ?? 0,
      });
    }
  }, [order, isEditInfoModalOpen, resetInfo]);

  // ── Edit items form ──────────────────────────────────────────────────────
  const {
    control: itemsControl,
    register: registerItems,
    handleSubmit: handleSubmitItems,
    reset: resetItems,
    watch: watchItems,
    formState: { errors: itemsErrors },
  } = useForm<EditItemsValues>({
    resolver: zodResolver(editItemsSchema),
    defaultValues: { items: [emptyItem()] },
  });

  const { fields: itemFields, append: appendItem, remove: removeItem } = useFieldArray({
    control: itemsControl,
    name: "items",
  });

  const watchedItems = watchItems("items");

  const itemsSubtotal = useMemo(
    () => watchedItems.reduce((sum, item) => sum + (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0), 0),
    [watchedItems],
  );

  useEffect(() => {
    if (order && isEditItemsModalOpen) {
      resetItems({
        items: order.item.length
          ? order.item.map((item) => ({
              description: item.description,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              deliveredAt: toLocalDatetimeInput(item.deliveredAt),
              isDelivered: item.isDelivered,
              note: item.note ?? "",
            }))
          : [emptyItem()],
      });
    }
  }, [order, isEditItemsModalOpen, resetItems]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  async function handleDeleteOrder() {
    const confirmed = window.confirm("Tem certeza que deseja deletar este pedido? Esta ação não pode ser desfeita.");
    if (!confirmed) return;
    try {
      await deleteOrder({ id: orderId, organizationId: organization.id });
      navigate({ to: "/app/orders" });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erro ao deletar pedido.");
    }
  }

  async function handleSaveInfo(values: EditInfoValues) {
    if (!order) return;
    setFormError("");
    try {
      await updateOrder({
        id: order.id,
        organizationId: organization.id,
        customerId: values.customerId ? values.customerId : null,
        orderedAt: values.orderedAt,
        isPaid: values.isPaid,
        note: values.note,
        shippingFee: values.shippingFee ?? null,
        discount: values.discount ?? null,
      });
      setIsEditInfoModalOpen(false);
      setActionSuccess("Informações do pedido atualizadas.");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao atualizar pedido.");
    }
  }

  async function handleSaveItems(values: EditItemsValues) {
    if (!order) return;
    setFormError("");
    try {
      await updateOrder({
        id: order.id,
        organizationId: organization.id,
        items: values.items.map((item) => ({
          description: item.description,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          deliveredAt: item.deliveredAt,
          isDelivered: item.isDelivered,
          note: item.note?.trim() ? item.note.trim() : undefined,
        })),
      });
      setIsEditItemsModalOpen(false);
      setActionSuccess("Itens do pedido atualizados.");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao atualizar itens.");
    }
  }

  const linkedTransactionIds = useMemo(
    () => new Set(order?.transactions.map((t) => t.id) ?? []),
    [order?.transactions],
  );

  const availableToLink = allTransactions.filter((t) => !linkedTransactionIds.has(t.id));

  async function handleCreateTransaction(values: TransactionFormValues) {
    setFormError("");
    try {
      await createTransaction({
        organizationId: organization.id,
        type: values.type,
        amount: values.amount,
        method: values.method,
        madeAt: values.madeAt,
        linkedOrderId: orderId,
        linkedCustomerId: values.linkedCustomerId || undefined,
        description: values.description,
      });
      setIsNewTransactionModalOpen(false);
      setActionSuccess("Transacao criada e vinculada ao pedido.");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao criar transacao.");
    }
  }

  async function handleLinkTransaction() {
    if (!selectedTransactionId) return;
    setActionError("");
    try {
      await link.mutateAsync({ organizationId: organization.id, orderId, transactionId: selectedTransactionId });
      setIsLinkModalOpen(false);
      setSelectedTransactionId("");
      setActionSuccess("Transacao vinculada ao pedido.");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erro ao vincular transacao.");
    }
  }

  async function handleUnlinkTransaction(transactionId: string) {
    setActionError("");
    const confirmed = window.confirm("Deseja desvincular esta transacao do pedido?");
    if (!confirmed) return;
    try {
      await unlink.mutateAsync({ organizationId: organization.id, orderId, transactionId });
      setActionSuccess("Transacao desvinculada do pedido.");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erro ao desvincular transacao.");
    }
  }

  const fixedLinkedOrder = order
    ? { id: order.id, label: `#${order.id.slice(0, 8)}${order.customer ? ` – ${order.customer.name}` : ""}` }
    : undefined;

  const fixedLinkedCustomer = order?.customer
    ? { id: order.customer.id, name: order.customer.name }
    : undefined;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-8">

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">
            Pedido #{order?.id.slice(0, 8)}
          </h1>
          {order && (
            <span className={`badge ${order.isPaid ? "badge-success" : "badge-warning"}`}>
              {order.isPaid ? "Pago" : "Pendente"}
            </span>
          )}
        </div>
        {order ? (
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-sm btn-ghost text-error"
              disabled={isDeletingOrder}
              onClick={handleDeleteOrder}
            >
              {isDeletingOrder ? "Deletando..." : "Deletar"}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => { setFormError(""); setIsEditItemsModalOpen(true); }}
            >
              Editar itens
            </button>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => { setFormError(""); setIsEditInfoModalOpen(true); }}
            >
              Editar pedido
            </button>
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm opacity-60">
          <span className="loading loading-spinner loading-sm" />
          Carregando pedido...
        </div>
      ) : null}
      {isError ? <p className="text-error text-sm">{error.message}</p> : null}

      {order ? (
        <div className="space-y-5">
          {actionSuccess ? (
            <div className="alert alert-success"><span>{actionSuccess}</span></div>
          ) : null}
          {actionError ? (
            <div className="alert alert-error"><span>{actionError}</span></div>
          ) : null}

          {/* Info geral */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-box border border-base-300 bg-base-100 px-4 py-4">
              <p className="text-xs opacity-60 uppercase tracking-wide mb-1">Data</p>
              <p className="font-semibold text-sm">{datetimeFormatter.format(new Date(order.orderedAt))}</p>
            </div>
            <div className="rounded-box border border-base-300 bg-base-100 px-4 py-4">
              <p className="text-xs opacity-60 uppercase tracking-wide mb-1">Total</p>
              <p className="font-bold text-lg">{currencyFormatter.format(order.total)}</p>
              {(order.shippingFee || order.discount) ? (
                <p className="text-xs opacity-50 mt-1">
                  Itens: {currencyFormatter.format(order.itemTotal)}
                  {order.shippingFee ? ` + Frete: ${currencyFormatter.format(order.shippingFee)}` : ""}
                  {order.discount ? ` − Desconto: ${currencyFormatter.format(order.discount)}` : ""}
                </p>
              ) : null}
            </div>
            {order.note ? (
              <div className="rounded-box border border-base-300 bg-base-100 px-4 py-4 col-span-2 sm:col-span-1">
                <p className="text-xs opacity-60 uppercase tracking-wide mb-1">Observação</p>
                <p className="text-sm">{order.note}</p>
              </div>
            ) : null}
          </section>

          {/* Cliente */}
          <section>
            <h2 className="font-semibold mb-3">Cliente</h2>
            {order.customer ? (
              <div className="bg-base-100 border border-base-300 rounded-box overflow-hidden">
                <Link
                  to="/app/customers/$customerId"
                  params={{ customerId: order.customer.id }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-base-200/50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0 text-sm font-bold">
                    {order.customer.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium leading-snug truncate">{order.customer.name}</p>
                  </div>
                  <span className="text-xs opacity-40">Ver perfil →</span>
                </Link>
                {(order.customer.phone || order.customer.address || order.customer.note) ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-base-200 border-t border-base-200">
                    {order.customer.phone ? (
                      <div className="px-4 py-3">
                        <p className="text-xs opacity-50 uppercase tracking-wide mb-1">Telefone</p>
                        <p className="text-sm">{order.customer.phone}</p>
                      </div>
                    ) : null}
                    {order.customer.address ? (
                      <div className="px-4 py-3">
                        <p className="text-xs opacity-50 uppercase tracking-wide mb-1">Endereço</p>
                        <p className="text-sm">{order.customer.address}</p>
                      </div>
                    ) : null}
                    {order.customer.note ? (
                      <div className="px-4 py-3">
                        <p className="text-xs opacity-50 uppercase tracking-wide mb-1">Observação</p>
                        <p className="text-sm">{order.customer.note}</p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="px-4 py-3 border border-dashed border-base-300 rounded-box text-sm opacity-50">
                Sem cliente vinculado
              </div>
            )}
          </section>

          {/* Itens */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Itens</h2>
              {order.item.some((i) => !i.isDelivered) ? (
                <button
                  type="button"
                  className="btn btn-xs btn-outline"
                  disabled={isUpdatingDelivery}
                  onClick={handleMarkAllDelivered}
                >
                  Marcar todos como entregues
                </button>
              ) : null}
            </div>
            {order.item.length === 0 ? (
              <div className="px-4 py-3 border border-dashed border-base-300 rounded-box text-sm opacity-50">
                Nenhum item cadastrado.
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-base-200 border border-base-300 rounded-box overflow-hidden">
                {order.item.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3 bg-base-100">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-primary text-sm shrink-0">{item.quantity}x</span>
                        <p className="font-medium text-sm leading-snug truncate">{item.description}</p>
                      </div>
                      <p className="text-xs opacity-50 truncate">
                        {datetimeFormatter.format(new Date(item.deliveredAt))}
                        {item.note ? ` · ${item.note}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-semibold">{currencyFormatter.format(item.total)}</p>
                        <p className="text-xs opacity-40">{currencyFormatter.format(item.unitPrice)} un.</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`badge badge-sm ${item.isDelivered ? "badge-success" : "badge-ghost"}`}>
                          {item.isDelivered ? "Entregue" : "A entregar"}
                        </span>
                        {item.isDelivered ? (
                          <button
                            type="button"
                            className="btn btn-xs btn-ghost opacity-50"
                            disabled={isUpdatingDelivery}
                            onClick={() => updateItemDelivery({ orderItemId: item.id, isDelivered: false })}
                          >
                            Desmarcar
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-xs btn-ghost text-success"
                            disabled={isUpdatingDelivery}
                            onClick={() => openDeliveryDialog(item.id)}
                          >
                            Marcar entregue
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Dialog de confirmação de entrega */}
          <dialog ref={deliveryDialogRef} className="modal">
            <div className="modal-box">
              <h3 className="font-bold text-lg mb-1">Confirmar entrega</h3>
              <p className="text-sm opacity-70 mb-4">
                Deseja marcar este item como entregue?
              </p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={updateDeliveryDate}
                  onChange={(e) => setUpdateDeliveryDate(e.target.checked)}
                />
                <span className="text-sm">Atualizar data de entrega para agora</span>
              </label>
              <div className="modal-action mt-4">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => deliveryDialogRef.current?.close()}
                  disabled={isUpdatingDelivery}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-success btn-sm"
                  onClick={handleConfirmDelivery}
                  disabled={isUpdatingDelivery}
                >
                  {isUpdatingDelivery ? <span className="loading loading-spinner loading-xs" /> : null}
                  Confirmar
                </button>
              </div>
            </div>
            <form method="dialog" className="modal-backdrop">
              <button type="submit">fechar</button>
            </form>
          </dialog>

          {/* Transações */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Transações</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-xs btn-outline"
                  onClick={() => { setActionError(""); setActionSuccess(""); setSelectedTransactionId(""); setIsLinkModalOpen(true); }}
                >
                  Vincular
                </button>
                <button
                  type="button"
                  className="btn btn-xs btn-primary"
                  onClick={() => { setFormError(""); setActionSuccess(""); setIsNewTransactionModalOpen(true); }}
                >
                  + Nova
                </button>
              </div>
            </div>

            {order.transactions.length === 0 ? (
              <div className="px-4 py-3 border border-dashed border-base-300 rounded-box text-sm opacity-50">
                Nenhuma transação vinculada.
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-base-200 border border-base-300 rounded-box overflow-hidden">
                {order.transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center gap-3 px-4 py-3 bg-base-100">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-base ${transaction.type === "entry" ? "bg-success/15 text-success" : "bg-error/15 text-error"}`}>
                      {transaction.type === "entry" ? "↑" : "↓"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm leading-snug truncate">
                        {transaction.description || (transaction.type === "entry" ? "Entrada" : "Saída")}
                      </p>
                      <p className="text-xs opacity-50 truncate">
                        {methodLabel[transaction.method] ?? transaction.method}
                        {" · "}
                        {datetimeFormatter.format(new Date(transaction.madeAt))}
                        {transaction.linkedCustomers.length > 0 && (
                          <> · {transaction.linkedCustomers.map((c) => c.name).join(", ")}</>
                        )}
                      </p>
                    </div>
                    <span className={`text-sm font-semibold shrink-0 ${transaction.type === "entry" ? "text-success" : "text-error"}`}>
                      {transaction.type === "entry" ? "+" : "−"}{currencyFormatter.format(Math.abs(transaction.amount))}
                    </span>
                    <button
                      type="button"
                      className="btn btn-xs btn-ghost text-error shrink-0"
                      disabled={unlink.isPending}
                      onClick={() => handleUnlinkTransaction(transaction.id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}

      {/* ── Modal: Editar informações gerais ─────────────────────────────── */}
      {isEditInfoModalOpen ? (
        <div className="modal modal-open">
          <div className="modal-box max-w-lg">
            <h3 className="font-bold text-lg mb-4">Editar informações do pedido</h3>

            <form onSubmit={handleSubmitInfo(handleSaveInfo)} className="space-y-4">
              <label className="space-y-1 block">
                <span className="label">Cliente (opcional)</span>
                <select className="select select-bordered w-full" {...registerInfo("customerId")}>
                  <option value="">Sem cliente vinculado</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 block">
                <span className="label">Data/hora do pedido</span>
                <input type="datetime-local" className="input input-bordered w-full" {...registerInfo("orderedAt")} />
                {infoErrors.orderedAt ? (
                  <span className="text-error-content text-sm">{infoErrors.orderedAt.message}</span>
                ) : null}
              </label>

              <label className="space-y-1 block">
                <span className="label">Observação (opcional)</span>
                <textarea
                  className="textarea textarea-bordered w-full"
                  rows={3}
                  placeholder="Observações gerais do pedido"
                  {...registerInfo("note")}
                />
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1 block">
                  <span className="label">Frete / taxa adicional</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="input input-bordered w-full"
                    placeholder="0,00"
                    {...registerInfo("shippingFee", { valueAsNumber: true })}
                  />
                </label>
                <label className="space-y-1 block">
                  <span className="label">Desconto</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="input input-bordered w-full"
                    placeholder="0,00"
                    {...registerInfo("discount", { valueAsNumber: true })}
                  />
                </label>
              </div>

              <label className="label cursor-pointer justify-start gap-3">
                <input type="checkbox" className="checkbox" {...registerInfo("isPaid")} />
                <div>
                  <span className="label-text">Pedido pago</span>
                  <p className="text-sm opacity-70">Marque quando o pedido já estiver quitado.</p>
                </div>
              </label>

              {formError ? (
                <div className="alert alert-error">
                  <span>{formError}</span>
                </div>
              ) : null}

              <div className="modal-action">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setIsEditInfoModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isUpdatingOrder}>
                  {isUpdatingOrder ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={() => setIsEditInfoModalOpen(false)} />
        </div>
      ) : null}

      {/* ── Modal: Editar itens ───────────────────────────────────────────── */}
      {isEditItemsModalOpen ? (
        <div className="modal modal-open">
          <div className="modal-box max-w-3xl">
            <h3 className="font-bold text-lg mb-4">Editar itens do pedido</h3>

            <form onSubmit={handleSubmitItems(handleSaveItems)} className="space-y-4">
              <div className="space-y-3">
                {itemFields.map((field, index) => {
                  const itemSubtotal =
                    (Number(watchedItems[index]?.unitPrice) || 0) * (Number(watchedItems[index]?.quantity) || 0);

                  return (
                    <div key={field.id} className="rounded-box border border-base-300 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">Item {index + 1}</span>
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
                        <label className="space-y-1 md:col-span-2">
                          <span className="label">Descrição</span>
                          <input
                            type="text"
                            className="input input-bordered w-full"
                            {...registerItems(`items.${index}.description`)}
                          />
                          {itemsErrors.items?.[index]?.description ? (
                            <span className="text-error-content text-sm">
                              {itemsErrors.items[index]?.description?.message}
                            </span>
                          ) : null}
                        </label>

                        <label className="space-y-1">
                          <span className="label">Preço unitário</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="input input-bordered w-full"
                            {...registerItems(`items.${index}.unitPrice`, { valueAsNumber: true })}
                          />
                          {itemsErrors.items?.[index]?.unitPrice ? (
                            <span className="text-error-content text-sm">
                              {itemsErrors.items[index]?.unitPrice?.message}
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
                            {...registerItems(`items.${index}.quantity`, { valueAsNumber: true })}
                          />
                          {itemsErrors.items?.[index]?.quantity ? (
                            <span className="text-error-content text-sm">
                              {itemsErrors.items[index]?.quantity?.message}
                            </span>
                          ) : null}
                        </label>

                        <label className="space-y-1">
                          <span className="label">Data/hora de entrega</span>
                          <input
                            type="datetime-local"
                            className="input input-bordered w-full"
                            {...registerItems(`items.${index}.deliveredAt`)}
                          />
                          {itemsErrors.items?.[index]?.deliveredAt ? (
                            <span className="text-error-content text-sm">
                              {itemsErrors.items[index]?.deliveredAt?.message}
                            </span>
                          ) : null}
                        </label>

                        <label className="space-y-1">
                          <span className="label">Observação</span>
                          <input
                            type="text"
                            className="input input-bordered w-full"
                            {...registerItems(`items.${index}.note`)}
                          />
                        </label>
                      </div>

                      <label className="label cursor-pointer justify-start gap-3">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-sm"
                          {...registerItems(`items.${index}.isDelivered`)}
                        />
                        <span className="label-text">Item entregue</span>
                      </label>

                      <div className="text-sm opacity-70">Subtotal: R$ {itemSubtotal.toFixed(2)}</div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                className="btn btn-sm btn-outline w-full"
                onClick={() => appendItem(emptyItem())}
              >
                + Adicionar item
              </button>

              <div className="rounded-box bg-base-200 px-4 py-3 text-sm flex justify-between">
                <span>Total dos itens</span>
                <span>R$ {itemsSubtotal.toFixed(2)}</span>
              </div>

              {formError ? (
                <div className="alert alert-error">
                  <span>{formError}</span>
                </div>
              ) : null}

              <div className="modal-action">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setIsEditItemsModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isUpdatingOrder}>
                  {isUpdatingOrder ? "Salvando..." : "Salvar itens"}
                </button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={() => setIsEditItemsModalOpen(false)} />
        </div>
      ) : null}

      {/* ── Modal: Nova transação ─────────────────────────────────────────── */}
      {order ? (
        <TransactionFormModal
          isOpen={isNewTransactionModalOpen}
          mode="create"
          isSubmitting={isCreatingTransaction}
          customers={[]}
          fixedLinkedOrder={fixedLinkedOrder}
          fixedLinkedCustomer={fixedLinkedCustomer}
          errorMessage={formError}
          successMessage=""
          initialValues={{ madeAt: localDatetimeNow() }}
          onClose={() => setIsNewTransactionModalOpen(false)}
          onSubmit={handleCreateTransaction}
        />
      ) : null}

      {/* ── Modal: Vincular transação existente ──────────────────────────── */}
      {isLinkModalOpen ? (
        <div className="modal modal-open">
          <div className="modal-box max-w-lg">
            <h3 className="font-bold text-lg mb-4">Vincular transação existente</h3>

            {availableToLink.length === 0 ? (
              <p className="text-sm opacity-70">Nenhuma transacao disponivel para vincular no periodo atual.</p>
            ) : (
              <label className="space-y-1">
                <span className="label">Selecione a transacao</span>
                <select
                  className="select select-bordered w-full"
                  value={selectedTransactionId}
                  onChange={(e) => setSelectedTransactionId(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {availableToLink.map((t) => (
                    <option key={t.id} value={t.id}>
                      #{t.id.slice(0, 8)} – {t.type === "entry" ? "Entrada" : "Saida"}{" "}
                      {currencyFormatter.format(Math.abs(t.amount))} –{" "}
                      {datetimeFormatter.format(new Date(t.madeAt))}
                      {t.description ? ` – ${t.description}` : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {actionError ? (
              <div className="alert alert-error mt-3">
                <span>{actionError}</span>
              </div>
            ) : null}

            <div className="modal-action">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setIsLinkModalOpen(false);
                  setSelectedTransactionId("");
                  setActionError("");
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!selectedTransactionId || link.isPending}
                onClick={handleLinkTransaction}
              >
                {link.isPending ? "Vinculando..." : "Vincular"}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setIsLinkModalOpen(false)} />
        </div>
      ) : null}
    </main>
  );
}
