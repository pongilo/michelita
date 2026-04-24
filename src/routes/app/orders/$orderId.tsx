import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/auth-context";
import { useState } from "react";
import { OrderAction } from "@/components/order-action";
import { OrderEditInfoModal } from "@/components/order-edit-info-modal";
import { OrderEditItemsModal } from "@/components/order-edit-items-modal";
import { OrderDetailsItemEditModal, type EditableOrderItem } from "@/components/order-details-item-edit-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGetOrder } from "@/hooks/tanstack/order/use-get-order";
import { useBulkUpdateOrderItemsDelivery } from "@/hooks/tanstack/order/use-bulk-update-order-items-delivery";
import { currencyFormatter, formatFullDate } from "@/lib/utils/formatter";
import { MapPinIcon, MoreVerticalIcon, PhoneIcon, StickyNoteIcon } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

// ── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/app/orders/$orderId")({
  component: OrderDetailsPage,
});

function OrderDetailsPage() {
  const { organization } = useAuth();
  const { orderId } = Route.useParams();
  const navigate = useNavigate();

  const { data: order, isLoading, isError, error } = useGetOrder({
    organizationId: organization!.id,
    orderId,
  });

  const { mutate: bulkMarkDelivered, isPending: isBulkMarking } = useBulkUpdateOrderItemsDelivery({
    organizationId: organization!.id,
  });

  const handleMarkGroupDelivered = (itemIds: string[]) => {
    bulkMarkDelivered(
      { itemIds, isDelivered: true },
      {
        onSuccess: () => toast.success("Itens marcados como entregues."),
        onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Erro ao marcar como entregue."),
      },
    );
  };

  // ── Modal state ──────────────────────────────────────────────────────────
  const [isEditInfoModalOpen, setIsEditInfoModalOpen] = useState(false);
  const [isEditItemsModalOpen, setIsEditItemsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EditableOrderItem | null>(null);

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-4xl px-5 py-8">
        {isLoading && <LoadingState label="Carregando pedido..." />}
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
      <main className="mx-auto w-full max-w-4xl p-5">

        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-heading">
                Pedido #{order.id.slice(0, 8)}
              </h1>
              <Badge className={order.isPaid ? "bg-green-500/15 text-green-700 border-green-200" : "bg-amber-400/20 text-amber-700 border-amber-300"}>
                {order.isPaid ? "Pago" : "Pendente"}
              </Badge>
            </div>
            <p className="text-muted-foreground text-base">{formatFullDate(order.orderedAt)}</p>
          </div>
          <OrderAction orderId={orderId} organizationId={organization!.id} onDeleteOrderSuccess={() => navigate({ to: "/app/orders" })}>
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
              <OrderAction.DeleteOrder />
            </OrderAction.Content>
          </OrderAction>
        </div>


        <div className="space-y-5">
          <div>
            {(order.shippingFee || order.discount) && (
              <>
                <div className="py-1 flex justify-between flex-wrap">
                  <p className="text-base text-muted-foreground">Subtotal</p>
                  <p className="text-base text-muted-foreground">{currencyFormatter.format(order.itemTotal)}</p>
                </div>
                {order.shippingFee && (
                  <div className="py-1 flex justify-between flex-wrap">
                    <p className="text-base text-muted-foreground">Frete</p>
                    <p className="text-base text-muted-foreground">+ {currencyFormatter.format(order.shippingFee)}</p>
                  </div>
                )}
                {order.discount && (
                  <div className="py-1 flex justify-between flex-wrap">
                    <p className="text-base text-muted-foreground">Desconto</p>
                    <p className="text-base text-muted-foreground">- {currencyFormatter.format(order.discount)}</p>
                  </div>
                )}
              </>
            )}
            <div className="py-1 flex justify-between flex-wrap">
              <p className="font-heading text-base font-medium">Total</p>
              <p className="font-heading text-base font-medium">{currencyFormatter.format(order.total)}</p>
            </div>
          </div>
          {order.note && (
            <>
              <Separator />
              <div className="py-1">
                <p className="font-heading text-base font-medium">Observação</p>
                <p className="text-base text-muted-foreground">{order.note}</p>
              </div>
            </>
          )}

          <Separator />

          {order.customer ? (
            <div className="space-y-2">
              <p className="font-heading text-base font-medium">{order.customer.name}</p>
              {order.customer.phone && (
                <p className="text-base text-muted-foreground flex gap-2 items-center">
                  <PhoneIcon className="size-4 flex-none" />
                  {order.customer.phone}
                </p>
              )}
              {order.customer.address && (
                <p className="text-base text-muted-foreground flex gap-2 items-center">
                  <MapPinIcon className="size-4 flex-none" />
                  {order.customer.address}
                </p>
              )}
              {order.customer.note && (
                <p className="text-base text-muted-foreground flex gap-2 items-center">
                  <StickyNoteIcon className="size-4 flex-none" />
                  {order.customer.note}
                </p>
              )}
              <Button type="button" variant="outline" size="sm" nativeButton={false} render={<Link to="/app/customers/$customerId" params={{ customerId: order.customer.id }} />}>
                Ver cliente
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="font-heading text-base font-medium">Cliente (opcional)</p>
              <p className="text-base text-muted-foreground">Nenhum cliente selecionado para este pedido.</p>
              {/* <Button
                type="button"
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link to="." search={{ modal: "customer" }} resetScroll={false} />}
              >
                Selecionar
              </Button> */}
            </div>
          )}

          <Separator />

          {/* Itens */}
          <div className="space-y-2">
            <h2 className="font-heading text-base font-medium">Itens</h2>
            {order.item.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum item cadastrado.</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(
                  order.item.reduce<Record<string, typeof order.item>>((groups, item) => {
                    const key = new Date(item.deliveredAt).toISOString().slice(0, 10);
                    (groups[key] ??= []).push(item);
                    return groups;
                  }, {})
                )
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([dateKey, items]) => {
                    const allDelivered = items.every((i) => i.isDelivered);
                    return (
                      <div key={dateKey} className="block rounded-md bg-background shadow p-5 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-muted-foreground uppercase font-medium">
                            {formatFullDate(new Date(dateKey + "T12:00:00"))}
                          </p>
                          <DropdownMenu>
                            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                              <MoreVerticalIcon className="size-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {!allDelivered && (
                                <DropdownMenuItem
                                  disabled={isBulkMarking}
                                  onClick={() => handleMarkGroupDelivered(items.map((i) => i.id))}
                                >
                                  Marcar todos como entregue
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        {items.map((item) => (
                          <div key={item.id} className="flex items-start gap-3 py-1">
                            <div className="flex-1 min-w-0">
                              <p className="text-base text-foreground">
                                {item.quantity > 1 && (
                                  <span className="text-primary font-bold">{item.quantity}x </span>
                                )}
                                {item.description}
                                <span className="text-muted-foreground"> — {currencyFormatter.format(item.total)}</span>
                              </p>
                              {item.note && (
                                <p className="text-sm text-muted-foreground italic">
                                  Obs.: {item.note}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-none">
                              <Badge className={item.isDelivered ? "bg-green-500/15 text-green-700 border-green-200" : "bg-amber-400/20 text-amber-700 border-amber-300"}>
                                {item.isDelivered ? "Entregue" : "Pendente"}
                              </Badge>
                              <DropdownMenu>
                                <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                                  <MoreVerticalIcon className="size-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setEditingItem(item)}>
                                    Editar item
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        <OrderEditInfoModal
          open={isEditInfoModalOpen}
          onOpenChange={setIsEditInfoModalOpen}
          orderId={orderId}
          organizationId={organization!.id}
          order={order}
        />

        <OrderEditItemsModal
          open={isEditItemsModalOpen}
          onOpenChange={setIsEditItemsModalOpen}
          orderId={orderId}
          organizationId={organization!.id}
          items={order.item}
        />

        <OrderDetailsItemEditModal
          open={editingItem !== null}
          onOpenChange={(v) => { if (!v) setEditingItem(null); }}
          orderId={orderId}
          organizationId={organization!.id}
          item={editingItem}
        />
      </main>
    );
  }
}
