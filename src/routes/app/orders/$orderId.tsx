import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/auth-context";
import { useState } from "react";
import { OrderAction } from "@/components/order-action";
import { OrderEditInfoModal } from "@/components/order-edit-info-modal";
import { OrderEditItemsModal } from "@/components/order-edit-items-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Item, ItemGroup, ItemContent, ItemTitle, ItemDescription, ItemActions } from "@/components/ui/item";
import { useGetOrder } from "@/hooks/tanstack/order/use-get-order";
import { currencyFormatter, formatFullDate } from "@/lib/utils/formatter";
import { ChevronRightIcon, MapPinIcon, PhoneIcon } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import { Separator } from "@/components/ui/separator";

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

  // ── Modal state ──────────────────────────────────────────────────────────
  const [isEditInfoModalOpen, setIsEditInfoModalOpen] = useState(false);
  const [isEditItemsModalOpen, setIsEditItemsModalOpen] = useState(false);

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
                  <Button type="button" variant="ghost" size="icon-lg" nativeButton={false} render={<Link to="/app/customers/$customerId" params={{ customerId: order.customer.id }} />}>
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
              <div className="space-y-4">
                {Object.entries(
                  order.item.reduce<Record<string, typeof order.item>>((groups, item) => {
                    const key = new Date(item.deliveredAt).toISOString().slice(0, 10);
                    (groups[key] ??= []).push(item);
                    return groups;
                  }, {})
                )
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([dateKey, items]) => (
                    <div key={dateKey} className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        {formatFullDate(new Date(dateKey + "T12:00:00"))}
                      </p>
                      <ItemGroup>
                        {items.map((item) => (
                          <Item key={item.id} size="sm" variant="outline">
                            <ItemContent>
                              <ItemTitle>
                                <span className="text-primary font-bold">{item.quantity}x</span>
                                {item.description}
                              </ItemTitle>
                              {item.note && (
                                <ItemDescription>{item.note}</ItemDescription>
                              )}
                            </ItemContent>
                            <ItemActions>
                              <div className="text-right">
                                <p className="text-sm font-semibold">{currencyFormatter.format(item.total)}</p>
                                <p className="text-xs text-muted-foreground">{currencyFormatter.format(item.unitPrice)} un.</p>
                              </div>
                              <Badge className={item.isDelivered ? "bg-green-500/15 text-green-700 border-green-200" : ""} variant={item.isDelivered ? "default" : "outline"}>
                                {item.isDelivered ? "Entregue" : "A entregar"}
                              </Badge>
                              <OrderAction orderId={orderId} itemId={item.id} organizationId={organization!.id}>
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
                    </div>
                  ))}
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
      </main>
    );
  }
}
