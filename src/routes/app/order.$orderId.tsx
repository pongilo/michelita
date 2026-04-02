import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Item, ItemGroup, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions } from "@/components/ui/item";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TransactionFormModal, type TransactionFormValues } from "@/components/transaction-form-modal";
import { useGetCustomers } from "@/hooks/tanstack/customer/use-get-customers";
import { useDeleteOrder } from "@/hooks/tanstack/order/use-delete-order";
import { useGetOrder } from "@/hooks/tanstack/order/use-get-order";
import { useLinkOrderTransaction } from "@/hooks/tanstack/order/use-link-order-transaction";
import { useUpdateOrder } from "@/hooks/tanstack/order/use-update-order";
import { useUpdateOrderItemDelivery } from "@/hooks/tanstack/order/use-update-order-item-delivery";
import { useCreateTransaction } from "@/hooks/tanstack/transaction/use-create-transaction";
import { useGetTransactions } from "@/hooks/tanstack/transaction/use-get-transactions";
import { currencyFormatter, dateFormatter as datetimeFormatter, formatFullDate } from "@/lib/utils/formatter";
import { toast } from "sonner";
import { ChevronRightIcon, MapPinIcon, PhoneIcon } from "lucide-react";

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
  return date.toISOString().slice(0, 16);
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
  const { mutate: updateItemDelivery, isPending: isUpdatingDelivery } = useUpdateOrderItemDelivery({ organizationId: organization.id });

  // ── Delivery dialog state ─────────────────────────────────────────────────
  const [isDeliveryDialogOpen, setIsDeliveryDialogOpen] = useState(false);
  const [pendingDeliveryItemId, setPendingDeliveryItemId] = useState<string | null>(null);
  const [updateDeliveryDate, setUpdateDeliveryDate] = useState(false);

  function openDeliveryDialog(itemId: string) {
    setPendingDeliveryItemId(itemId);
    setUpdateDeliveryDate(false);
    setIsDeliveryDialogOpen(true);
    (document.activeElement as HTMLElement | null)?.blur();
  }

  function handleConfirmDelivery() {
    if (!pendingDeliveryItemId) return;
    const now = new Date().toISOString();
    updateItemDelivery(
      { orderItemId: pendingDeliveryItemId, isDelivered: true, deliveredAt: updateDeliveryDate ? now : undefined },
      { onSuccess: () => { setIsDeliveryDialogOpen(false); setPendingDeliveryItemId(null); } },
    );
  }

  // ── Modal state ──────────────────────────────────────────────────────────
  const [isNewTransactionModalOpen, setIsNewTransactionModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isEditInfoModalOpen, setIsEditInfoModalOpen] = useState(false);
  const [isEditItemsModalOpen, setIsEditItemsModalOpen] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState("");

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
      toast.error(err instanceof Error ? err.message : "Erro ao deletar pedido.");
    }
  }

  async function handleSaveInfo(values: EditInfoValues) {
    if (!order) return;
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
      toast.success("Informações do pedido atualizadas.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar pedido.");
    }
  }

  async function handleSaveItems(values: EditItemsValues) {
    if (!order) return;
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
      toast.success("Itens do pedido atualizados.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar itens.");
    }
  }

  const linkedTransactionIds = useMemo(
    () => new Set(order?.transactions.map((t) => t.id) ?? []),
    [order?.transactions],
  );

  const availableToLink = allTransactions.filter((t) => !linkedTransactionIds.has(t.id));

  async function handleCreateTransaction(values: TransactionFormValues) {
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
      toast.success("Transacao criada e vinculada ao pedido.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar transacao.");
    }
  }

  async function handleLinkTransaction() {
    if (!selectedTransactionId) return;
    try {
      await link.mutateAsync({ organizationId: organization.id, orderId, transactionId: selectedTransactionId });
      setIsLinkModalOpen(false);
      setSelectedTransactionId("");
      toast.success("Transacao vinculada ao pedido.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao vincular transacao.");
    }
  }

  async function handleUnlinkTransaction(transactionId: string) {
    const confirmed = window.confirm("Deseja desvincular esta transacao do pedido?");
    if (!confirmed) return;
    try {
      await unlink.mutateAsync({ organizationId: organization.id, orderId, transactionId });
      toast.success("Transacao desvinculada do pedido.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao desvincular transacao.");
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
            <Badge className={order.isPaid ? "bg-green-500/15 text-green-700 border-green-200" : "bg-amber-400/20 text-amber-700 border-amber-300"}>
              {order.isPaid ? "Pago" : "Pendente"}
            </Badge>
          )}
        </div>
        {order ? (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-error"
              disabled={isDeletingOrder}
              onClick={handleDeleteOrder}
            >
              {isDeletingOrder ? "Deletando..." : "Deletar"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditItemsModalOpen(true)}
            >
              Editar itens
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setIsEditInfoModalOpen(true)}
            >
              Editar pedido
            </Button>
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm opacity-60">
          <span className="animate-spin size-4 rounded-full border-2 border-current border-t-transparent" />
          Carregando pedido...
        </div>
      ) : null}
      {isError ? <p className="text-destructive text-sm">{error.message}</p> : null}

      {order ? (
        <div className="space-y-5">
          {/* Info geral */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Card size="sm">
              <CardHeader>
                <CardDescription>Data</CardDescription>
                <CardTitle className="text-sm">{datetimeFormatter.format(new Date(order.orderedAt))}</CardTitle>
              </CardHeader>
            </Card>
            <Card size="sm">
              <CardHeader>
                <CardDescription>Total</CardDescription>
                <CardTitle className="text-lg">{currencyFormatter.format(order.total)}</CardTitle>
              </CardHeader>
              {(order.shippingFee || order.discount) ? (
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground">
                    Itens: {currencyFormatter.format(order.itemTotal)}
                    {order.shippingFee ? ` + Frete: ${currencyFormatter.format(order.shippingFee)}` : ""}
                    {order.discount ? ` − Desconto: ${currencyFormatter.format(order.discount)}` : ""}
                  </p>
                </CardContent>
              ) : null}
            </Card>
            {order.note ? (
              <Card size="sm" className="col-span-2 sm:col-span-1">
                <CardHeader>
                  <CardDescription>Observação</CardDescription>
                  <CardTitle className="text-sm">{order.note}</CardTitle>
                </CardHeader>
              </Card>
            ) : null}
          </section>

          {/* Cliente */}
          <div className="space-y-2">
            <h2 className="font-heading text-base font-medium">Cliente</h2>
            {order.customer ? (
              <Item variant="outline">
                <ItemContent>
                  <ItemTitle>{order.customer.name}</ItemTitle>
                  {order.customer.phone && (
                    <ItemDescription className="flex gap-2 items-center">
                      <PhoneIcon className="size-4 shrink-0" />
                      {order.customer.phone}
                    </ItemDescription>
                  )}
                  {order.customer.address && (
                    <ItemDescription className="flex gap-2 items-center">
                      <MapPinIcon className="size-4 shrink-0" /> 
                      {order.customer.address}
                    </ItemDescription>
                  )}
                  {order.customer.note && (
                    <ItemDescription><span className="text-primary">Observação:</span> {order.customer.note}</ItemDescription>
                  )}
                </ItemContent>
                <ItemActions>
                  <Button type="button" variant="ghost" size="icon-lg" render={<Link to="/app/customers/$customerId" params={{ customerId: order.customer.id }} />}>
                    <ChevronRightIcon />
                  </Button>
                </ItemActions>
              </Item>
            ) : (
              <p className="text-sm text-muted-foreground">Sem cliente vinculado</p>
            )}
          </div>

          {/* Itens */}
          <div className="space-y-2">
            <h2 className="font-heading text-base font-medium">Itens</h2>
            {order.item.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum item cadastrado.</p>
            ) : (
              <ItemGroup>
                {order.item.map((item) => (
                  <Item key={item.id} size="sm" variant="outline">
                    <ItemContent>
                      <ItemTitle>
                        <span className="text-primary font-bold">{item.quantity}x</span>
                        {item.description}
                      </ItemTitle>
                      <ItemDescription>
                        {formatFullDate(new Date(item.deliveredAt))}
                        {item.note ? ` · ${item.note}` : ""}
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{currencyFormatter.format(item.total)}</p>
                        <p className="text-xs text-muted-foreground">{currencyFormatter.format(item.unitPrice)} un.</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className={item.isDelivered ? "bg-green-500/15 text-green-700 border-green-200" : ""} variant={item.isDelivered ? "default" : "outline"}>
                          {item.isDelivered ? "Entregue" : "A entregar"}
                        </Badge>
                        {item.isDelivered ? (
                          <Button type="button" variant="ghost" size="xs" className="opacity-50" disabled={isUpdatingDelivery} onClick={() => updateItemDelivery({ orderItemId: item.id, isDelivered: false })}>
                            Desmarcar
                          </Button>
                        ) : (
                          <Button type="button" variant="ghost" size="xs" className="text-success" disabled={isUpdatingDelivery} onClick={() => openDeliveryDialog(item.id)}>
                            Marcar entregue
                          </Button>
                        )}
                      </div>
                    </ItemActions>
                  </Item>
                ))}
              </ItemGroup>
            )}
          </div>

          {/* Dialog de confirmação de entrega */}
          <Dialog open={isDeliveryDialogOpen} onOpenChange={setIsDeliveryDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirmar entrega</DialogTitle>
                <DialogDescription>Deseja marcar este item como entregue?</DialogDescription>
              </DialogHeader>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={updateDeliveryDate}
                  onCheckedChange={(checked) => setUpdateDeliveryDate(!!checked)}
                />
                <span className="text-sm">Atualizar data de entrega para agora</span>
              </label>
              <DialogFooter>
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsDeliveryDialogOpen(false)} disabled={isUpdatingDelivery}>
                  Cancelar
                </Button>
                <Button type="button" size="sm" className="bg-success text-white hover:bg-success/80" onClick={handleConfirmDelivery} disabled={isUpdatingDelivery}>
                  {isUpdatingDelivery ? <span className="animate-spin size-3 rounded-full border-2 border-current border-t-transparent" /> : null}
                  Confirmar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Transações */}
          <h2>Transações</h2>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="xs" onClick={() => { setSelectedTransactionId(""); setIsLinkModalOpen(true); }}>
              Vincular
            </Button>
            <Button type="button" size="xs" onClick={() => setIsNewTransactionModalOpen(true)}>
              + Nova
            </Button>
          </div>
          {order.transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma transação vinculada.</p>
          ) : (
            <ItemGroup>
              {order.transactions.map((transaction) => (
                <Item key={transaction.id} size="sm" variant="outline">
                  <ItemMedia className={`w-9 h-9 rounded-full flex items-center justify-center text-base ${transaction.type === "entry" ? "bg-success/15 text-success" : "bg-error/15 text-error"}`}>
                    {transaction.type === "entry" ? "↑" : "↓"}
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>
                      {transaction.description || (transaction.type === "entry" ? "Entrada" : "Saída")}
                    </ItemTitle>
                    <ItemDescription>
                      {methodLabel[transaction.method] ?? transaction.method}
                      {" · "}
                      {datetimeFormatter.format(new Date(transaction.madeAt))}
                      {transaction.linkedCustomers.length > 0 && (
                        <> · {transaction.linkedCustomers.map((c) => c.name).join(", ")}</>
                      )}
                    </ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <span className={`text-sm font-semibold ${transaction.type === "entry" ? "text-success" : "text-error"}`}>
                      {transaction.type === "entry" ? "+" : "−"}{currencyFormatter.format(Math.abs(transaction.amount))}
                    </span>
                    <Button type="button" variant="ghost" size="xs" className="text-destructive" disabled={unlink.isPending} onClick={() => handleUnlinkTransaction(transaction.id)}>
                      ×
                    </Button>
                  </ItemActions>
                </Item>
              ))}
            </ItemGroup>
          )}
        </div>
      ) : null}

      {/* ── Modal: Editar informações gerais ─────────────────────────────── */}
      <Dialog open={isEditInfoModalOpen} onOpenChange={(open) => !open && setIsEditInfoModalOpen(false)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar informações do pedido</DialogTitle>
          </DialogHeader>
            <form onSubmit={handleSubmitInfo(handleSaveInfo)} className="space-y-4">
              <FieldGroup>
                <Field>
                  <FieldLabel>Cliente (opcional)</FieldLabel>
                  <select className="flex h-9 w-full rounded-lg border border-input bg-input/30 px-3 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50" {...registerInfo("customerId")}>
                    <option value="">Sem cliente vinculado</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field>
                  <FieldLabel>Data/hora do pedido</FieldLabel>
                  <Input type="datetime-local" {...registerInfo("orderedAt")} />
                  {infoErrors.orderedAt ? (
                    <FieldError>{infoErrors.orderedAt.message}</FieldError>
                  ) : null}
                </Field>

                <Field>
                  <FieldLabel>Observação (opcional)</FieldLabel>
                  <textarea
                    className="w-full rounded-2xl border border-input bg-input/30 px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    rows={3}
                    placeholder="Observações gerais do pedido"
                    {...registerInfo("note")}
                  />
                </Field>

                <div className="grid gap-3 md:grid-cols-2">
                  <Field>
                    <FieldLabel>Frete / taxa adicional</FieldLabel>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0,00"
                      {...registerInfo("shippingFee", { valueAsNumber: true })}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Desconto</FieldLabel>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0,00"
                      {...registerInfo("discount", { valueAsNumber: true })}
                    />
                  </Field>
                </div>

                <label className="flex cursor-pointer items-center gap-3">
                  <Checkbox {...registerInfo("isPaid")} />
                  <div>
                    <span className="text-sm font-medium">Pedido pago</span>
                    <p className="text-sm opacity-70">Marque quando o pedido já estiver quitado.</p>
                  </div>
                </label>
              </FieldGroup>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsEditInfoModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isUpdatingOrder}>
                  {isUpdatingOrder ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Editar itens ───────────────────────────────────────────── */}
      <Dialog open={isEditItemsModalOpen} onOpenChange={(open) => !open && setIsEditItemsModalOpen(false)}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar itens do pedido</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitItems(handleSaveItems)} className="space-y-4">
            <div className="space-y-3">
              {itemFields.map((field, index) => {
                const itemSubtotal =
                  (Number(watchedItems[index]?.unitPrice) || 0) * (Number(watchedItems[index]?.quantity) || 0);

                return (
                  <div key={field.id} className="rounded-2xl border border-border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">Item {index + 1}</span>
                      {itemFields.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          className="text-destructive"
                          onClick={() => removeItem(index)}
                        >
                          Remover
                        </Button>
                      ) : null}
                    </div>

                    <FieldGroup>
                      <div className="grid gap-3 md:grid-cols-2">
                        <Field className="md:col-span-2">
                          <FieldLabel>Descrição</FieldLabel>
                          <Input type="text" {...registerItems(`items.${index}.description`)} />
                          {itemsErrors.items?.[index]?.description ? (
                            <FieldError>{itemsErrors.items[index]?.description?.message}</FieldError>
                          ) : null}
                        </Field>

                        <Field>
                          <FieldLabel>Preço unitário</FieldLabel>
                          <Input type="number" min="0" step="0.01" {...registerItems(`items.${index}.unitPrice`, { valueAsNumber: true })} />
                          {itemsErrors.items?.[index]?.unitPrice ? (
                            <FieldError>{itemsErrors.items[index]?.unitPrice?.message}</FieldError>
                          ) : null}
                        </Field>

                        <Field>
                          <FieldLabel>Quantidade</FieldLabel>
                          <Input type="number" min="1" step="1" {...registerItems(`items.${index}.quantity`, { valueAsNumber: true })} />
                          {itemsErrors.items?.[index]?.quantity ? (
                            <FieldError>{itemsErrors.items[index]?.quantity?.message}</FieldError>
                          ) : null}
                        </Field>

                        <Field>
                          <FieldLabel>Data/hora de entrega</FieldLabel>
                          <Input type="datetime-local" {...registerItems(`items.${index}.deliveredAt`)} />
                          {itemsErrors.items?.[index]?.deliveredAt ? (
                            <FieldError>{itemsErrors.items[index]?.deliveredAt?.message}</FieldError>
                          ) : null}
                        </Field>

                        <Field>
                          <FieldLabel>Observação</FieldLabel>
                          <Input type="text" {...registerItems(`items.${index}.note`)} />
                        </Field>
                      </div>
                    </FieldGroup>

                    <label className="flex cursor-pointer items-center gap-3">
                      <Checkbox {...registerItems(`items.${index}.isDelivered`)} />
                      <span className="text-sm font-medium">Item entregue</span>
                    </label>

                    <div className="text-sm opacity-70">Subtotal: R$ {itemSubtotal.toFixed(2)}</div>
                  </div>
                );
              })}
            </div>

            <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => appendItem(emptyItem())}>
              + Adicionar item
            </Button>

            <div className="rounded-2xl bg-muted px-4 py-3 text-sm flex justify-between">
              <span>Total dos itens</span>
              <span>R$ {itemsSubtotal.toFixed(2)}</span>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsEditItemsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isUpdatingOrder}>
                {isUpdatingOrder ? "Salvando..." : "Salvar itens"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Nova transação ─────────────────────────────────────────── */}
      {order ? (
        <TransactionFormModal
          isOpen={isNewTransactionModalOpen}
          mode="create"
          isSubmitting={isCreatingTransaction}
          customers={[]}
          fixedLinkedOrder={fixedLinkedOrder}
          fixedLinkedCustomer={fixedLinkedCustomer}
          errorMessage=""
          successMessage=""
          initialValues={{ madeAt: localDatetimeNow() }}
          onClose={() => setIsNewTransactionModalOpen(false)}
          onSubmit={handleCreateTransaction}
        />
      ) : null}

      {/* ── Modal: Vincular transação existente ──────────────────────────── */}
      <Dialog open={isLinkModalOpen} onOpenChange={(open) => { if (!open) { setIsLinkModalOpen(false); setSelectedTransactionId(""); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Vincular transação existente</DialogTitle>
          </DialogHeader>

          {availableToLink.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma transacao disponivel para vincular no periodo atual.</p>
          ) : (
            <div className="space-y-1">
              <p className="text-sm font-medium">Selecione a transacao</p>
              <Select value={selectedTransactionId} onValueChange={(v) => setSelectedTransactionId(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {availableToLink.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      #{t.id.slice(0, 8)} – {t.type === "entry" ? "Entrada" : "Saida"}{" "}
                      {currencyFormatter.format(Math.abs(t.amount))} –{" "}
                      {datetimeFormatter.format(new Date(t.madeAt))}
                      {t.description ? ` – ${t.description}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setIsLinkModalOpen(false); setSelectedTransactionId(""); }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!selectedTransactionId || link.isPending}
              onClick={handleLinkTransaction}
            >
              {link.isPending ? "Vinculando..." : "Vincular"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
