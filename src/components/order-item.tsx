import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { MapPinIcon, MoreVerticalIcon, StickyNoteIcon, User2Icon } from "lucide-react";
import { useListOrders } from "@/hooks/tanstack/order/use-list-orders";
import { timeFormatter, currencyFormatter, toExactDatetime } from "@/lib/utils/formatter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useBulkUpdateOrderItemsDelivery } from "@/hooks/tanstack/order/use-bulk-update-order-items-delivery";
import { useUpdateOrder } from "@/hooks/tanstack/order/use-update-order";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { Separator } from "@/components/ui/separator";

type Group = NonNullable<ReturnType<typeof useListOrders>["data"]>["days"][number]["groups"][number];

export function OrderItem({ group, organizationId }: { group: Group; organizationId: string }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { mutate: markDelivered, isPending: isMarkingDelivered } = useBulkUpdateOrderItemsDelivery({ organizationId });
  const { mutate: markPaid, isPending: isMarkingPaid } = useUpdateOrder({ organizationId });

  const allDelivered = group.items.every((i) => i.isDelivered);

  const handleMarkDelivered = () => {
    markDelivered(
      { itemIds: group.items.map((i) => i.id), isDelivered: true },
      {
        onSuccess: () => {
          toast.success("Itens marcados como entregues.");
          queryClient.invalidateQueries({ queryKey: ["orders", organizationId] });
          setDrawerOpen(false);
        },
        onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Erro ao marcar como entregue."),
      },
    );
  };

  const handleMarkPaid = () => {
    markPaid(
      { id: group.order.id, organizationId, isPaid: true },
      {
        onSuccess: () => {
          toast.success("Pedido marcado como pago.");
          setDrawerOpen(false);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Erro ao atualizar pedido."),
      },
    );
  };

  const handleViewOrder = () => {
    navigate({ to: "/app/orders/$orderId", params: { orderId: group.order.id } });
  };

  const handleViewCustomer = () => {
    if (!group.order.customer?.id) return;
    navigate({ to: "/app/customers/$customerId", params: { customerId: group.order.customer.id! } });
  };

  const handleCopyAddress = () => {
    if (!group.order.customer?.address) return;
    navigator.clipboard.writeText(group.order.customer.address);
    toast.success("Endereço copiado.");
    setDrawerOpen(false);
  };

  return (
    <div className="relative md:rounded-md bg-background md:shadow p-5 space-y-3">
      <div className="absolute top-3 right-3">
        {isMobile ? (
          <Drawer direction="bottom" open={drawerOpen} onOpenChange={setDrawerOpen}>
            <DrawerTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <MoreVerticalIcon />
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <div className="py-4 space-y-2">
                {!allDelivered && (
                  <Button variant="ghost" className="w-full justify-start" size="lg" onClick={handleMarkDelivered} disabled={isMarkingDelivered}>
                    Marcar como entregue
                  </Button>
                )}
                {!group.order.isPaid && (
                  <Button variant="ghost" className="w-full justify-start" size="lg" onClick={handleMarkPaid} disabled={isMarkingPaid}>
                    Marcar como pago
                  </Button>
                )}
                {(!allDelivered || !group.order.isPaid) && (
                  <div className="px-4 py-2">
                    <Separator />
                  </div>
                )}
                <Button variant="ghost" className="w-full justify-start" size="lg" onClick={handleViewOrder}>
                  Ver pedido
                </Button>
                <Button variant="ghost" className="w-full justify-start" size="lg" onClick={handleViewCustomer}>
                  Ver cliente
                </Button>
                {group.order.customer?.address && (
                  <Button variant="ghost" className="w-full justify-start" size="lg" onClick={handleCopyAddress}>
                    Copiar endereço
                  </Button>
                )}
              </div>
            </DrawerContent>
          </Drawer>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
              <MoreVerticalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!allDelivered && (
                <DropdownMenuItem onClick={handleMarkDelivered} disabled={isMarkingDelivered}>
                  Marcar como entregue
                </DropdownMenuItem>
              )}
              {!group.order.isPaid && (
                <DropdownMenuItem onClick={handleMarkPaid} disabled={isMarkingPaid}>
                  Marcar como pago
                </DropdownMenuItem>
              )}
              {(!allDelivered || !group.order.isPaid) && (
                <DropdownMenuSeparator />
              )}
              <DropdownMenuItem onClick={handleViewOrder}>Ver pedido</DropdownMenuItem>
              <DropdownMenuItem onClick={handleViewCustomer}>Ver cliente</DropdownMenuItem>
              {group.order.customer?.address && (
                <DropdownMenuItem onClick={handleCopyAddress}>Copiar endereço</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="space-y-0.5">
        <p className="text-xs uppercase font-medium text-blue-900 flex items-center gap-1.5">
          <span>
            {allDelivered ? "Entregue às " : "Entregar às "}
            {timeFormatter.format(toExactDatetime(group.deliveredAt))}
          </span>
          <span className="size-1 rounded-full bg-blue-900"></span>
          <span>{currencyFormatter.format(group.order.total)}</span>
          {group.order.isPaid ? (
            <>
              <span className="size-1.5 rounded-full bg-green-600"></span>
              <span className="text-green-700">Pago</span>
            </> 
          ) : (
            <>
              <span className="size-1.5 rounded-full bg-yellow-600"></span>
              <span className="text-yellow-700">Pendente</span>
            </>
          )}
        </p>
        {group.order.note && (
          <p className="text-sm text-muted-foreground italic">Obs.: {group.order.note}</p>
        )}
      </div>

      <div className="space-y-0.5">
        {group.items.map((item) => (
          <div key={item.id}>
            <p className="text-base text-foreground">
              {item.quantity > 1 && (
                <span className="text-primary font-bold">{item.quantity}x </span>
              )}
              {item.description}
            </p>
            {item.note && (
              <p className="text-base text-muted-foreground italic">Obs.: {item.note}</p>
            )}
          </div>
        ))}
      </div>

      {Object.keys(group.order.customer || {}).length > 0 && (
        <div className="space-y-1 text-sm text-muted-foreground">
          {group.order.customer?.name && (
            <p className="flex items-center gap-1">
              <User2Icon className="size-4 flex-none" />
              {group.order.customer.name}
            </p>
          )}
          {group.order.customer?.address && (
            <p className="flex items-center gap-1">
              <MapPinIcon className="size-4 flex-none" />
              {group.order.customer.address}
            </p>
          )}
          {group.order.customer?.note && (
            <p className="flex items-center gap-1">
              <StickyNoteIcon className="size-4 flex-none" />
              {group.order.customer.note}
            </p>
          )}
        </div>
      )}
    </div>
  );
}