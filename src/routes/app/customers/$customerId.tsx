import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/auth-context";
import { useState } from "react";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Item, ItemContent, ItemTitle, ItemDescription, ItemSeparator } from "@/components/ui/item";
import { CustomerFormModal, type CustomerFormValues } from "@/components/customer-form-modal";
import { useDeleteCustomer } from "@/hooks/tanstack/customer/use-delete-customer";
import { useGetCustomerDetails } from "@/hooks/tanstack/customer/use-get-customer-details";
import { useUpdateCustomer } from "@/hooks/tanstack/customer/use-update-customer";
import { currencyFormatter, formatFullDate } from "@/lib/utils/formatter";
import { EllipsisVerticalIcon } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/app/customers/$customerId")({
  component: CustomerDetailsPage,
});

function CustomerDetailsPage() {
  const { organization } = useAuth();
  const { customerId } = Route.useParams();
  const navigate = useNavigate();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { data, isLoading, isError, error } = useGetCustomerDetails({
    organizationId: organization!.id,
    customerId,
  });
  const { mutateAsync: updateCustomer, isPending: isUpdatingCustomer } = useUpdateCustomer({
    organizationId: organization!.id,
  });
  const { mutateAsync: deleteCustomer, isPending: isDeletingCustomer } = useDeleteCustomer({
    organizationId: organization!.id,
  });

  async function onSubmit(values: CustomerFormValues) {
    if (!data) return;
    try {
      await updateCustomer({
        id: data.customer.id,
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
    if (!data) return;
    const confirmed = window.confirm("Deseja realmente excluir este cliente? Esta ação não pode ser desfeita.");
    if (!confirmed) return;
    try {
      await deleteCustomer({ id: data.customer.id, organizationId: organization!.id });
      await navigate({ to: "/app/customers" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir cliente.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl p-5">

      {/* Header */}
      <div className="mb-6 flex flex-nowrap items-center justify-between gap-3">
        <h1 className="text-2xl font-heading">{data?.customer.name ?? "Cliente"}</h1>
        {data && (
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

      {data && (
        <div className="space-y-8">
          <div className="divide-y md:border md:py-1 md:px-5 md:rounded-2xl md:card">
            {data.customer.phone && (
              <div className="space-y-1 py-4 md:flex md:justify-between md:flex-wrap">
                <p className="font-heading text-base font-medium">Telefone</p>
                <p className="text-base text-muted-foreground">
                  {data.customer.phone}
                </p>
              </div>
            )}
            {data.customer.address && (
              <div className="space-y-1 py-4 md:flex md:justify-between md:flex-wrap">
                <p className="font-heading text-base font-medium">Endereço</p>
                <p className="text-base text-muted-foreground">
                  {data.customer.address}
                </p>
              </div>
            )}
            {data.customer.note && (
              <div className="space-y-1 py-4 md:flex md:justify-between md:flex-wrap">
                <p className="font-heading text-base font-medium">Observação</p>
                <p className="text-base text-muted-foreground">
                  {data.customer.note}
                </p>
              </div>
            )}
          </div>

          {/* Pedidos */}
          <div className="space-y-2">
            <h2 className="font-heading text-base font-medium">Pedidos ({data.metrics.totalOrders})</h2>
            {data.recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">Este cliente ainda não possui pedidos.</p>
            ) : (
              <div className="space-y-2">
                {data.recentOrders.map((order) => (
                  <Item key={order.id} variant="outline" className="items-start" render={<Link to="/app/orders/$orderId" params={{ orderId: order.id }} />}>
                    <ItemContent>
                      <div className="flex justify-between items-center">
                        <ItemTitle>{formatFullDate(new Date(order.orderedAt))}</ItemTitle>
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
                  </Item>
                ))}
              </div>
            )}
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
          data
            ? {
                name: data.customer.name,
                phone: data.customer.phone ?? "",
                address: data.customer.address ?? "",
                note: data.customer.note ?? "",
              }
            : undefined
        }
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={onSubmit}
      />
    </main>
  );
}
