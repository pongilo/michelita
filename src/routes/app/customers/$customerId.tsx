import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/auth-context";
import { useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Item, ItemContent, ItemMedia, ItemTitle, ItemDescription, ItemSeparator } from "@/components/ui/item";
import { CustomerFormModal, type CustomerFormValues } from "@/components/customer-form-modal";
import { useBulkUpdateOrdersPaid } from "@/hooks/tanstack/order/use-bulk-update-orders-paid";
import { useDeleteCustomer } from "@/hooks/tanstack/customer/use-delete-customer";
import { useGetCustomerDetails } from "@/hooks/tanstack/customer/use-get-customer-details";
import { useUpdateCustomer } from "@/hooks/tanstack/customer/use-update-customer";
import { currencyFormatter, formatFullDate, toExactDatetime } from "@/lib/utils/formatter";
import { EllipsisVerticalIcon } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import { Badge } from "@/components/ui/badge";
import { AppTitle } from "@/components/app-title";

export const Route = createFileRoute("/app/customers/$customerId")({
  component: CustomerDetailsPage,
});

function CustomerDetailsPage() {
  const { organization } = useAuth();
  const { customerId } = Route.useParams();
  const navigate = useNavigate();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetCustomerDetails({
    organizationId: organization!.id,
    customerId,
  });

  const customer = data?.pages[0]?.customer;
  const metrics = data?.pages[0]?.metrics;
  const orders = data?.pages.flatMap((page) => page.orders) ?? [];

  const { mutateAsync: updateCustomer, isPending: isUpdatingCustomer } = useUpdateCustomer({
    organizationId: organization!.id,
  });
  const { mutateAsync: deleteCustomer, isPending: isDeletingCustomer } = useDeleteCustomer({
    organizationId: organization!.id,
  });
  const { mutateAsync: bulkMarkOrdersPaid, isPending: isMarkingOrdersPaid } = useBulkUpdateOrdersPaid({
    organizationId: organization!.id,
  });

  function toggleOrderSelection(orderId: string, checked: boolean) {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(orderId);
      } else {
        next.delete(orderId);
      }
      return next;
    });
  }

  async function handleMarkSelectedAsPaid() {
    if (selectedOrderIds.size === 0) return;
    try {
      await bulkMarkOrdersPaid({
        organizationId: organization!.id,
        orderIds: Array.from(selectedOrderIds),
        isPaid: true,
      });
      toast.success(
        selectedOrderIds.size === 1
          ? "Pedido marcado como pago."
          : `${selectedOrderIds.size} pedidos marcados como pagos.`,
      );
      setSelectedOrderIds(new Set());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao marcar pedidos como pagos.");
    }
  }

  async function onSubmit(values: CustomerFormValues) {
    if (!customer) return;
    try {
      await updateCustomer({
        id: customer.id,
        name: values.name.trim(),
        phone: values.phone?.trim() || undefined,
        address: values.address?.trim() || undefined,
        note: values.note?.trim() || undefined,
      });
      toast.success("Cliente atualizado com sucesso.");
      setIsEditModalOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar cliente.");
    }
  }

  async function handleDeleteCustomer() {
    if (!customer) return;
    const confirmed = window.confirm("Deseja realmente excluir este cliente? Esta ação não pode ser desfeita.");
    if (!confirmed) return;
    try {
      await deleteCustomer({ id: customer.id, organizationId: organization!.id });
      await navigate({ to: "/app/customers" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir cliente.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-5 pb-5">

      {/* Header */}
      <div className="sticky top-0 z-20 flex flex-nowrap items-center justify-between gap-3 bg-background pt-[calc(env(safe-area-inset-top)+1.25rem)] mb-6 md:static md:top-auto md:z-auto md:bg-transparent">
        <AppTitle>{customer?.name ?? "Cliente"}</AppTitle>
        {customer && (
          <DropdownMenu>
            <DropdownMenuTrigger className={buttonVariants({ variant: "ghost", size: "icon" })}>
              <EllipsisVerticalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditModalOpen(true)}>
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                disabled={isDeletingCustomer}
                onClick={handleDeleteCustomer}
              >
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {isLoading && <LoadingState label="Carregando clientes..." />}

      {isError ? <p className="text-destructive text-sm">{error.message}</p> : null}

      {customer && metrics && (
        <div className={`space-y-8 ${selectedOrderIds.size > 0 ? "pb-24" : ""}`}>
          <div className="divide-y md:border md:py-1 md:px-5 md:rounded-2xl md:card">
            {customer.phone && (
              <div className="max-md:space-y-1 py-4 md:flex md:justify-between md:flex-wrap">
                <p className="font-heading text-base font-medium">Telefone</p>
                <p className="text-base text-muted-foreground">
                  {customer.phone}
                </p>
              </div>
            )}
            {customer.address && (
              <div className="max-md:space-y-1 py-4 md:flex md:justify-between md:flex-wrap">
                <p className="font-heading text-base font-medium">Endereço</p>
                <p className="text-base text-muted-foreground">
                  {customer.address}
                </p>
              </div>
            )}
            {customer.note && (
              <div className="max-md:space-y-1 py-4 md:flex md:justify-between md:flex-wrap">
                <p className="font-heading text-base font-medium">Observação</p>
                <p className="text-base text-muted-foreground">
                  {customer.note}
                </p>
              </div>
            )}
          </div>

          {/* Resumo financeiro */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border p-4 space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total faturado</p>
              <p className="font-heading text-lg font-semibold">{currencyFormatter.format(metrics.totalInvoiced)}</p>
            </div>
            <div className="rounded-2xl border p-4 space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total pago</p>
              <p className="font-heading text-lg font-semibold text-green-700">{currencyFormatter.format(metrics.totalPaid)}</p>
            </div>
            <div className={`rounded-2xl border p-4 space-y-1 ${metrics.totalPending > 0 ? "border-amber-300 bg-amber-400/10" : ""}`}>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">A receber</p>
              <p className={`font-heading text-lg font-semibold ${metrics.totalPending > 0 ? "text-amber-700" : ""}`}>
                {currencyFormatter.format(metrics.totalPending)}
              </p>
            </div>
          </div>

          {/* Pedidos */}
          <div className="space-y-2">
            <h2 className="font-heading text-base font-medium">Pedidos ({metrics.totalOrders})</h2>
            {orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">Este cliente ainda não possui pedidos.</p>
            ) : (
              <div className="space-y-2">
                {orders.map((order) => (
                  <Item key={order.id} variant="outline" className="items-start">
                    {!order.isPaid && (
                      <ItemMedia className="pt-0.5">
                        <Checkbox
                          checked={selectedOrderIds.has(order.id)}
                          onCheckedChange={(checked) => toggleOrderSelection(order.id, checked === true)}
                          aria-label="Selecionar pedido"
                        />
                      </ItemMedia>
                    )}
                    <Link to="/app/orders/$orderId" params={{ orderId: order.id }} className="contents">
                      <ItemContent>
                        <div className="flex justify-between items-center">
                          <ItemTitle>{formatFullDate(toExactDatetime(order.orderedAt))}</ItemTitle>
                          <div className="flex gap-1 items-center">
                            {currencyFormatter.format(order.itemTotal)}
                            <Badge className={order.isPaid ? "bg-green-500/15 text-green-700 border-green-200" : "bg-amber-400/20 text-amber-700 border-amber-300"}>
                              {order.isPaid ? "Pago" : "Pendente"}
                            </Badge>
                          </div>
                        </div>
                        {order.note && <ItemDescription>{order.note}</ItemDescription>}
                        <ItemSeparator />
                        {order.items.map((item) => (
                          <ItemDescription key={item.id}>
                            <span className="text-foreground">{item.quantity}x</span> {[item.description, item.note].filter(i => !!i).join(' • ')}
                          </ItemDescription>
                        ))}
                      </ItemContent>
                    </Link>
                  </Item>
                ))}
                {hasNextPage && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={isFetchingNextPage}
                    onClick={() => fetchNextPage()}
                  >
                    {isFetchingNextPage ? "Carregando..." : "Carregar mais"}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedOrderIds.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3">
            <p className="text-sm font-medium">
              {selectedOrderIds.size} {selectedOrderIds.size === 1 ? "pedido selecionado" : "pedidos selecionados"}
            </p>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedOrderIds(new Set())}>
                Cancelar
              </Button>
              <Button type="button" size="sm" disabled={isMarkingOrdersPaid} onClick={handleMarkSelectedAsPaid}>
                Marcar como pago
              </Button>
            </div>
          </div>
        </div>
      )}

      <CustomerFormModal
        isOpen={isEditModalOpen}
        mode="edit"
        isSubmitting={isUpdatingCustomer}
        errorMessage=""
        successMessage=""
        initialValues={
          customer
            ? {
                name: customer.name,
                phone: customer.phone ?? "",
                address: customer.address ?? "",
                note: customer.note ?? "",
              }
            : undefined
        }
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={onSubmit}
      />
    </main>
  );
}
