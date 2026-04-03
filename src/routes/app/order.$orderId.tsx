import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { OrderAction } from "@/components/order-action";
import { OrderEditInfoModal } from "@/components/order-edit-info-modal";
import { OrderEditItemsModal } from "@/components/order-edit-items-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Item, ItemGroup, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions } from "@/components/ui/item";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TransactionFormModal, type TransactionFormValues } from "@/components/transaction-form-modal";
import { useGetOrder } from "@/hooks/tanstack/order/use-get-order";
import { useLinkOrderTransaction } from "@/hooks/tanstack/order/use-link-order-transaction";
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

  const { data: allTransactions = [] } = useGetTransactions({
    organizationId: organization.id,
    period: "monthly",
    referenceDate: currentDateInputValue(),
  });

  const { mutateAsync: createTransaction, isPending: isCreatingTransaction } = useCreateTransaction({
    organizationId: organization.id,
  });
  const { link, unlink } = useLinkOrderTransaction({ organizationId: organization.id, orderId });

  // ── Modal state ──────────────────────────────────────────────────────────
  const [isNewTransactionModalOpen, setIsNewTransactionModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isEditInfoModalOpen, setIsEditInfoModalOpen] = useState(false);
  const [isEditItemsModalOpen, setIsEditItemsModalOpen] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState("");

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

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-4xl px-5 py-8">
        <div className="flex items-center gap-2 text-sm opacity-60">
          <span className="animate-spin size-4 rounded-full border-2 border-current border-t-transparent" />
          Carregando pedido...
        </div>
      </main>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">Erro ao carregar pedido: {error.message}</p>
        <Button type="button" variant="outline" onClick={() => navigate({ to: "/app/orders" })}>
          Voltar para lista de pedidos
        </Button>
      </div>
    );
  }

  if (order) {
    return (
      <main className="mx-auto w-full max-w-4xl px-5 py-8">

        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">
                Pedido #{order.id.slice(0, 8)}
              </h1>
              <Badge className={order.isPaid ? "bg-green-500/15 text-green-700 border-green-200" : "bg-amber-400/20 text-amber-700 border-amber-300"}>
                {order.isPaid ? "Pago" : "Pendente"}
              </Badge>
            </div>
            <p className="text-muted-foreground text-base">{formatFullDate(new Date(order.orderedAt))}</p>
          </div>
          <OrderAction orderId={orderId} organizationId={organization.id}>
            <OrderAction.Trigger />
            <OrderAction.Content>
              <OrderAction.EditOrder onEdit={() => setIsEditInfoModalOpen(true)} />
              <OrderAction.EditItem onEdit={() => setIsEditItemsModalOpen(true)} />
              <OrderAction.Separator />
              {order.isPaid ? (
                <OrderAction.UnmarkAsPaid />
              ) : (
                <OrderAction.MarkAsPaid />
              )}
              <OrderAction.MarkAllDelivered />
              <OrderAction.Separator />
              <OrderAction.DeleteOrder onSuccess={() => navigate({ to: "/app/orders" })} />
            </OrderAction.Content>
          </OrderAction>
        </div>

        <div className="space-y-5">
          <ItemGroup>
            <Item variant="outline">
              <ItemContent>
                <ItemTitle>Total</ItemTitle>
                <ItemDescription>{currencyFormatter.format(order.total)}</ItemDescription>
                {(order.shippingFee || order.discount) && (
                  <ItemDescription>
                    Itens: {currencyFormatter.format(order.itemTotal)}
                    {order.shippingFee ? ` + Frete: ${currencyFormatter.format(order.shippingFee)}` : ""}
                    {order.discount ? ` − Desconto: ${currencyFormatter.format(order.discount)}` : ""}
                  </ItemDescription>
                )}
              </ItemContent>
            </Item>
            {order.note && (
              <Item variant="outline">
                <ItemContent>
                  <ItemTitle>Observação</ItemTitle>
                  <ItemDescription>{order.note}</ItemDescription>
                </ItemContent>
              </Item>
            )}
          </ItemGroup>

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
                      <Badge className={item.isDelivered ? "bg-green-500/15 text-green-700 border-green-200" : ""} variant={item.isDelivered ? "default" : "outline"}>
                        {item.isDelivered ? "Entregue" : "A entregar"}
                      </Badge>
                      <OrderAction orderId={orderId} itemId={item.id} organizationId={organization.id}>
                        <OrderAction.Trigger />
                        <OrderAction.Content>
                          <OrderAction.EditItem onEdit={() => setIsEditItemsModalOpen(true)} />
                          <OrderAction.Separator />
                          {item.isDelivered ? (
                            <OrderAction.UnmarkAsDelivered />
                          ) : (
                            <OrderAction.MarkAsDelivered />
                          )}
                          <OrderAction.Separator />
                          <OrderAction.DeleteItem />
                        </OrderAction.Content>
                      </OrderAction>
                    </ItemActions>
                  </Item>
                ))}
              </ItemGroup>
            )}
          </div>

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

        <OrderEditInfoModal
          open={isEditInfoModalOpen}
          onOpenChange={setIsEditInfoModalOpen}
          orderId={orderId}
          organizationId={organization.id}
          order={order}
        />

        <OrderEditItemsModal
          open={isEditItemsModalOpen}
          onOpenChange={setIsEditItemsModalOpen}
          orderId={orderId}
          organizationId={organization.id}
          items={order.item}
        />

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
}
