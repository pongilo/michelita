import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Item, ItemGroup, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions } from "@/components/ui/item";
import { CustomerFormModal, type CustomerFormValues } from "@/components/customer-form-modal";
import { useDeleteCustomer } from "@/hooks/tanstack/customer/use-delete-customer";
import { useGetCustomerDetails } from "@/hooks/tanstack/customer/use-get-customer-details";
import { useUpdateCustomer } from "@/hooks/tanstack/customer/use-update-customer";
import { currencyFormatter, dateFormatter as datetimeFormatter } from "@/lib/utils/formatter";
import { EllipsisVerticalIcon } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";

export const Route = createFileRoute("/app/customers/$customerId")({
  component: CustomerDetailsPage,
});

function CustomerDetailsPage() {
  const { organization } = Route.useRouteContext();
  const { customerId } = Route.useParams();
  const navigate = useNavigate();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { data, isLoading, isError, error } = useGetCustomerDetails({
    organizationId: organization.id,
    customerId,
  });
  const { mutateAsync: updateCustomer, isPending: isUpdatingCustomer } = useUpdateCustomer({
    organizationId: organization.id,
  });
  const { mutateAsync: deleteCustomer, isPending: isDeletingCustomer } = useDeleteCustomer({
    organizationId: organization.id,
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
      await deleteCustomer({ id: data.customer.id, organizationId: organization.id });
      await navigate({ to: "/app/customers" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir cliente.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl p-5">

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
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

      {data ? (
        <div className="space-y-5">

          {/* Contato */}
          {(data.customer.phone || data.customer.address || data.customer.note) ? (
            <Card size="sm">
              <CardContent>
                <ItemGroup>
                  {data.customer.phone && (
                    <Item size="sm">
                      <ItemContent><ItemDescription>Telefone</ItemDescription></ItemContent>
                      <ItemContent><ItemTitle>{data.customer.phone}</ItemTitle></ItemContent>
                    </Item>
                  )}
                  {data.customer.address && (
                    <Item size="sm">
                      <ItemContent><ItemDescription>Endereço</ItemDescription></ItemContent>
                      <ItemContent><ItemTitle>{data.customer.address}</ItemTitle></ItemContent>
                    </Item>
                  )}
                  {data.customer.note && (
                    <Item size="sm">
                      <ItemContent><ItemDescription>Observação</ItemDescription></ItemContent>
                      <ItemContent><ItemTitle>{data.customer.note}</ItemTitle></ItemContent>
                    </Item>
                  )}
                </ItemGroup>
              </CardContent>
            </Card>
          ) : null}

          {/* Métricas */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Card size="sm">
              <CardHeader>
                <CardDescription>Pedidos</CardDescription>
                <CardTitle className="text-lg">{data.metrics.totalOrders}</CardTitle>
              </CardHeader>
            </Card>
            <Card size="sm">
              <CardHeader>
                <CardDescription>Último pedido</CardDescription>
                <CardTitle className="text-sm">
                  {data.metrics.lastOrderAt ? datetimeFormatter.format(new Date(data.metrics.lastOrderAt)) : "—"}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card size="sm">
              <CardHeader>
                <CardDescription>Vendas</CardDescription>
                <CardTitle className="text-lg">{currencyFormatter.format(data.metrics.totalInvoiced)}</CardTitle>
              </CardHeader>
            </Card>
          </section>

          {/* Pedidos */}
          <div className="space-y-2">
            <h2 className="font-heading text-base font-medium">Pedidos</h2>
            {data.recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">Este cliente ainda não possui pedidos.</p>
            ) : (
              <ItemGroup>
                {data.recentOrders.map((order) => (
                  <Item
                    key={order.id}
                    size="sm"
                    variant="outline"
                    render={<Link to="/app/orders/$orderId" params={{ orderId: order.id }} />}
                  >
                    <ItemMedia className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${order.isPaid ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>
                      {order.isPaid ? "✓" : "!"}
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>
                        #{order.id.slice(0, 8)}
                        {order.note ? <span className="opacity-50 font-normal"> · {order.note}</span> : null}
                      </ItemTitle>
                      <ItemDescription>
                        {datetimeFormatter.format(new Date(order.orderedAt))}
                        {" · "}
                        {order.itemCount} {order.itemCount === 1 ? "item" : "itens"}
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <span className="text-sm font-semibold">{currencyFormatter.format(order.itemTotal)}</span>
                    </ItemActions>
                  </Item>
                ))}
              </ItemGroup>
            )}
          </div>
        </div>
      ) : null}

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
