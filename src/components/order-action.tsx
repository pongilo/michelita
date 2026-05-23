import * as React from "react";
import { EllipsisVerticalIcon } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDeleteOrder } from "@/hooks/tanstack/order/use-delete-order";
import { useGetOrder } from "@/hooks/tanstack/order/use-get-order";
import { useUpdateOrder } from "@/hooks/tanstack/order/use-update-order";
import { useUpdateOrderItemDelivery } from "@/hooks/tanstack/order/use-update-order-item-delivery";
import { useMarkAllItemsDelivered } from "@/hooks/tanstack/order/use-mark-all-items-delivered";

// ── Context ───────────────────────────────────────────────────────────────────

interface OrderActionContextValue {
  orderId: string;
  itemId: string | undefined;
  organizationId: string;
  openDeleteOrderDialog: () => void;
}

const OrderActionContext = React.createContext<OrderActionContextValue | null>(null);

function useOrderActionContext() {
  const ctx = React.useContext(OrderActionContext);
  if (!ctx) throw new Error("OrderAction sub-components must be used inside <OrderAction>");
  return ctx;
}

// ── Root ──────────────────────────────────────────────────────────────────────

interface OrderActionProps {
  orderId: string;
  itemId?: string;
  organizationId: string;
  onDeleteOrderSuccess?: () => void;
  children: React.ReactNode;
}

function OrderAction({ orderId, itemId, organizationId, onDeleteOrderSuccess, children }: OrderActionProps) {
  const [deleteOrderOpen, setDeleteOrderOpen] = React.useState(false);
  const { mutate, isPending } = useDeleteOrder({ organizationId });

  function handleDeleteConfirm() {
    mutate(
      { id: orderId, organizationId },
      {
        onSuccess: () => {
          toast.success("Pedido deletado.");
          setDeleteOrderOpen(false);
          onDeleteOrderSuccess?.();
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Erro ao deletar pedido."),
      },
    );
  }

  return (
    <OrderActionContext.Provider value={{ orderId, itemId, organizationId, openDeleteOrderDialog: () => setDeleteOrderOpen(true) }}>
      <DropdownMenu>{children}</DropdownMenu>
      <Dialog open={deleteOrderOpen} onOpenChange={setDeleteOrderOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Deletar pedido</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja deletar este pedido? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOrderOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isPending}>
              {isPending ? "Deletando..." : "Deletar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OrderActionContext.Provider>
  );
}

// ── Trigger ───────────────────────────────────────────────────────────────────

function OrderActionTrigger() {
  return (
    <DropdownMenuTrigger className={buttonVariants({ variant: "ghost", size: "icon" })}>
      <EllipsisVerticalIcon className="size-4" />
      <span className="sr-only">Ações</span>
    </DropdownMenuTrigger>
  );
}

// ── Content ───────────────────────────────────────────────────────────────────

function OrderActionContent({ children }: { children: React.ReactNode }) {
  return <DropdownMenuContent align="end">{children}</DropdownMenuContent>;
}

// ── Separator ─────────────────────────────────────────────────────────────────

function OrderActionSeparator() {
  return <DropdownMenuSeparator />;
}

// ── Edit Order ────────────────────────────────────────────────────────────────

function OrderActionEditOrder({ onEdit }: { onEdit: () => void }) {
  return <DropdownMenuItem onClick={onEdit}>Editar pedido</DropdownMenuItem>;
}

// ── Edit Item ─────────────────────────────────────────────────────────────────

function OrderActionEditItem({ onEdit }: { onEdit: () => void }) {
  return <DropdownMenuItem onClick={onEdit}>Editar item</DropdownMenuItem>;
}

// ── Mark As Paid ──────────────────────────────────────────────────────────────

function OrderActionMarkAsPaid() {
  const { orderId, organizationId } = useOrderActionContext();
  const { mutate, isPending } = useUpdateOrder({ organizationId });

  function handleSelect() {
    mutate(
      { id: orderId, organizationId, isPaid: true },
      {
        onSuccess: () => toast.success("Pedido marcado como pago."),
        onError: (err) => toast.error(err instanceof Error ? err.message : "Erro ao atualizar pedido."),
      },
    );
  }

  return (
    <DropdownMenuItem onClick={handleSelect} disabled={isPending}>
      Marcar como pago
    </DropdownMenuItem>
  );
}

// ── Unmark As Paid ────────────────────────────────────────────────────────────

function OrderActionUnmarkAsPaid() {
  const { orderId, organizationId } = useOrderActionContext();
  const { mutate, isPending } = useUpdateOrder({ organizationId });

  function handleSelect() {
    mutate(
      { id: orderId, organizationId, isPaid: false },
      {
        onSuccess: () => toast.success("Pedido desmarcado como pago."),
        onError: (err) => toast.error(err instanceof Error ? err.message : "Erro ao atualizar pedido."),
      },
    );
  }

  return (
    <DropdownMenuItem onClick={handleSelect} disabled={isPending}>
      Desmarcar como pago
    </DropdownMenuItem>
  );
}

// ── Mark As Delivered ─────────────────────────────────────────────────────────

function OrderActionMarkAsDelivered() {
  const { itemId, organizationId } = useOrderActionContext();
  const { mutate, isPending } = useUpdateOrderItemDelivery({ organizationId });

  function handleSelect() {
    if (!itemId) return;
    mutate(
      { orderItemId: itemId, isDelivered: true },
      {
        onSuccess: () => toast.success("Item marcado como entregue."),
        onError: (err) => toast.error(err instanceof Error ? err.message : "Erro ao atualizar item."),
      },
    );
  }

  return (
    <DropdownMenuItem onClick={handleSelect} disabled={isPending || !itemId}>
      Marcar como entregue
    </DropdownMenuItem>
  );
}

// ── Unmark As Delivered ───────────────────────────────────────────────────────

function OrderActionUnmarkAsDelivered() {
  const { itemId, organizationId } = useOrderActionContext();
  const { mutate, isPending } = useUpdateOrderItemDelivery({ organizationId });

  function handleSelect() {
    if (!itemId) return;
    mutate(
      { orderItemId: itemId, isDelivered: false },
      {
        onSuccess: () => toast.success("Item desmarcado como entregue."),
        onError: (err) => toast.error(err instanceof Error ? err.message : "Erro ao atualizar item."),
      },
    );
  }

  return (
    <DropdownMenuItem onClick={handleSelect} disabled={isPending || !itemId}>
      Desmarcar como entregue
    </DropdownMenuItem>
  );
}

// ── Delete Item ───────────────────────────────────────────────────────────────

function OrderActionDeleteItem() {
  const { orderId, itemId, organizationId } = useOrderActionContext();
  const { data: order } = useGetOrder({ organizationId, orderId });
  const { mutate, isPending } = useUpdateOrder({ organizationId });

  function handleSelect() {
    if (!itemId || !order) return;

    const remainingItems = order.item
      .filter((item) => item.id !== itemId)
      .map((item) => ({
        description: item.description,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        deliveredAt: new Date(item.deliveredAt).toISOString(),
        isDelivered: item.isDelivered,
        note: item.note ?? undefined,
      }));

    if (remainingItems.length === 0) {
      toast.error("O pedido deve ter pelo menos um item.");
      return;
    }

    // Defer confirm so Base UI can finish closing the menu before the dialog blocks the thread
    setTimeout(() => {
      if (!window.confirm("Tem certeza que deseja deletar este item?")) return;
      mutate(
        { id: orderId, organizationId, items: remainingItems },
        {
          onSuccess: () => toast.success("Item removido do pedido."),
          onError: (err) => toast.error(err instanceof Error ? err.message : "Erro ao remover item."),
        },
      );
    }, 0);
  }

  return (
    <DropdownMenuItem variant="destructive" onClick={handleSelect} disabled={isPending || !itemId}>
      Deletar item
    </DropdownMenuItem>
  );
}

// ── Mark All As Delivered ─────────────────────────────────────────────────────

function OrderActionMarkAllDelivered() {
  const { orderId, organizationId } = useOrderActionContext();
  const { mutate, isPending } = useMarkAllItemsDelivered({ organizationId });

  function handleSelect() {
    mutate(
      { orderId },
      {
        onSuccess: () => toast.success("Todos os itens marcados como entregues."),
        onError: (err) => toast.error(err instanceof Error ? err.message : "Erro ao atualizar itens."),
      },
    );
  }

  return (
    <DropdownMenuItem onClick={handleSelect} disabled={isPending}>
      Marcar todos como entregue
    </DropdownMenuItem>
  );
}

// ── View Order ────────────────────────────────────────────────────────────────

function OrderActionViewOrder() {
  const { orderId } = useOrderActionContext();
  const navigate = useNavigate();

  return (
    <DropdownMenuItem onClick={() => navigate({ to: "/app/orders/$orderId", params: { orderId } })}>
      Ver pedido
    </DropdownMenuItem>
  );
}

// ── Delete Order ──────────────────────────────────────────────────────────────

function OrderActionDeleteOrder() {
  const { openDeleteOrderDialog } = useOrderActionContext();

  return (
    <DropdownMenuItem variant="destructive" onClick={openDeleteOrderDialog}>
      Deletar pedido
    </DropdownMenuItem>
  );
}

// ── Compose ───────────────────────────────────────────────────────────────────

OrderAction.Trigger = OrderActionTrigger;
OrderAction.Content = OrderActionContent;
OrderAction.Separator = OrderActionSeparator;
OrderAction.EditOrder = OrderActionEditOrder;
OrderAction.EditItem = OrderActionEditItem;
OrderAction.MarkAsPaid = OrderActionMarkAsPaid;
OrderAction.UnmarkAsPaid = OrderActionUnmarkAsPaid;
OrderAction.MarkAsDelivered = OrderActionMarkAsDelivered;
OrderAction.UnmarkAsDelivered = OrderActionUnmarkAsDelivered;
OrderAction.DeleteItem = OrderActionDeleteItem;
OrderAction.DeleteOrder = OrderActionDeleteOrder;
OrderAction.MarkAllDelivered = OrderActionMarkAllDelivered;
OrderAction.ViewOrder = OrderActionViewOrder;

export { OrderAction };
