import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/auth-context";
import { useState } from "react";
import { OrderAction } from "@/components/order-action";
import { OrderEditInfoModal } from "@/components/order-edit-info-modal";
import { OrderEditItemsModal } from "@/components/order-edit-items-modal";
import { OrderDetailsItemEditModal, type EditableOrderItem } from "@/components/order-details-item-edit-modal";
import { CustomerListContent } from "@/components/customer-list-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useGetOrder } from "@/hooks/tanstack/order/use-get-order";
import { useUpdateOrder } from "@/hooks/tanstack/order/use-update-order";
import { currencyFormatter, formatFullDate, fullDateFormatter, toDateOnly, toExactDatetime } from "@/lib/utils/formatter";
import { EditIcon, MapPinIcon, PhoneIcon, StickyNoteIcon } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import { Separator } from "@/components/ui/separator";
import { AppTitle } from "@/components/app-title";
import { toast } from "sonner";

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

  const [isEditInfoModalOpen, setIsEditInfoModalOpen] = useState(false);
  const [isEditItemsModalOpen, setIsEditItemsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EditableOrderItem | null>(null);
  const [isSelectCustomerOpen, setIsSelectCustomerOpen] = useState(false);
  const [isRemoveCustomerOpen, setIsRemoveCustomerOpen] = useState(false);

  const { mutateAsync: updateOrder, isPending: isUpdatingCustomer } = useUpdateOrder({ organizationId: organization!.id });

  async function handleSelectCustomer(customerId: string) {
    await updateOrder({ id: orderId, organizationId: organization!.id, customerId }, {
      onSuccess: () => { setIsSelectCustomerOpen(false); toast.success("Cliente vinculado com sucesso."); },
      onError: (e) => { toast.error(e instanceof Error ? e.message : "Erro ao vincular cliente."); },
    });
  }

  async function handleRemoveCustomer() {
    await updateOrder({ id: orderId, organizationId: organization!.id, customerId: null }, {
      onSuccess: () => { setIsRemoveCustomerOpen(false); toast.success("Cliente removido com sucesso."); },
      onError: (e) => { toast.error(e instanceof Error ? e.message : "Erro ao remover cliente."); },
    });
  }

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
      <main className="mx-auto w-full max-w-4xl px-5 pb-5">

        {/* Header */}
        <div className="sticky top-0 z-20 flex flex-nowrap items-start justify-between gap-3 bg-background pt-[calc(env(safe-area-inset-top)+1.25rem)] mb-6 md:static md:top-auto md:z-auto md:bg-transparent">
          <div>
            <div className="flex items-center gap-2">
              <AppTitle>Pedido #{order.id.slice(0, 8)}</AppTitle>
              <Badge className={order.isPaid ? "bg-green-500/15 text-green-700 border-green-200" : "bg-amber-400/20 text-amber-700 border-amber-300"}>
                {order.isPaid ? "Pago" : "Pendente"}
              </Badge>
            </div>
            <p className="text-muted-foreground text-base">Feito em {formatFullDate(toExactDatetime(order.orderedAt))}</p>
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
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" nativeButton={false} render={<Link to="/app/customers/$customerId" params={{ customerId: order.customer.id }} />}>
                  Ver cliente
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setIsRemoveCustomerOpen(true)}>
                  Remover
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="font-heading text-base font-medium">Cliente (opcional)</p>
              <p className="text-base text-muted-foreground">Nenhum cliente selecionado para este pedido.</p>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsSelectCustomerOpen(true)}>
                Selecionar cliente
              </Button>
            </div>
          )}

          <Separator />

          {/* Itens */}
          {order.item.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum item cadastrado.</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(
                order.item.reduce<Record<string, typeof order.item>>((groups, item) => {
                  const key = toDateOnly(item.deliveredAt);
                  (groups[key] ??= []).push(item);
                  return groups;
                }, {})
              )
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([dateKey, items]) => {
                  return (
                    <div key={dateKey} className="space-y-2">
                      <p className="text-xs uppercase font-medium text-blue-900">
                        {fullDateFormatter.format(toExactDatetime(items[0].deliveredAt))}
                      </p>
                      {items.map((item) => (
                        <div key={item.id} className="flex items-start gap-3 py-1">
                          <div className="flex-1">
                            <p className="text-base text-foreground">
                              {item.quantity > 1 && (
                                <span className="text-primary font-bold">{item.quantity}x </span>
                              )}
                              {item.description}
                            </p>
                            {item.note && (
                              <p className="text-sm text-muted-foreground italic">
                                Obs.: {item.note}
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground">
                              {currencyFormatter.format(item.total)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-none">
                            <Badge className={item.isDelivered ? "bg-green-500/15 text-green-700 border-green-200" : "bg-amber-400/20 text-amber-700 border-amber-300"}>
                              {item.isDelivered ? "Entregue" : "A entregar"}
                            </Badge>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => setEditingItem(item)}
                            >
                              <EditIcon />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
            </div>
          )}

          <Separator />
          
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

        <Dialog open={isSelectCustomerOpen} onOpenChange={setIsSelectCustomerOpen}>
          <DialogContent className="max-h-[80vh] flex flex-col gap-0 p-0">
            <DialogHeader className="mb-0 p-5">
              <DialogTitle>Selecionar cliente</DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto flex-1">
              <CustomerListContent
                organizationId={organization!.id}
                onClose={() => setIsSelectCustomerOpen(false)}
                onSelectCustomer={(id) => handleSelectCustomer(id)}
              />
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isRemoveCustomerOpen} onOpenChange={setIsRemoveCustomerOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remover cliente</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja remover o cliente "{order.customer?.name}" deste pedido?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRemoveCustomerOpen(false)} disabled={isUpdatingCustomer}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleRemoveCustomer} disabled={isUpdatingCustomer}>
                {isUpdatingCustomer ? "Removendo..." : "Remover"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    );
  }
}
