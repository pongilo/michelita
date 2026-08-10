import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/auth-context";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Item, ItemContent, ItemTitle, ItemDescription, ItemSeparator } from "@/components/ui/item";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomerFormModal, type CustomerFormValues } from "@/components/customer-form-modal";
import { useDeleteCustomer } from "@/hooks/tanstack/customer/use-delete-customer";
import { useGetCustomerDetails } from "@/hooks/tanstack/customer/use-get-customer-details";
import { useUpdateCustomer } from "@/hooks/tanstack/customer/use-update-customer";
import { currencyFormatter, formatFullDate, formatMonthYearLabel, toExactDatetime } from "@/lib/utils/formatter";
import { EllipsisVerticalIcon } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import { Badge } from "@/components/ui/badge";
import { AppTitle } from "@/components/app-title";

const ALL_MONTHS = "all";

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export const Route = createFileRoute("/app/customers/$customerId")({
  component: CustomerDetailsPage,
});

function CustomerDetailsPage() {
  const { organization } = useAuth();
  const { customerId } = Route.useParams();
  const navigate = useNavigate();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(ALL_MONTHS);

  const { data, isLoading, isError, error } = useGetCustomerDetails({
    organizationId: organization!.id,
    customerId,
  });

  const monthOptions = useMemo(() => {
    if (!data) return [];
    const labels = new Map<string, string>();
    for (const order of data.orders) {
      const date = toExactDatetime(order.orderedAt);
      const key = monthKey(date);
      if (!labels.has(key)) labels.set(key, formatMonthYearLabel(date));
    }
    return Array.from(labels.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([value, label]) => ({ value, label }));
  }, [data]);

  const filteredOrders = useMemo(() => {
    if (!data) return [];
    if (selectedMonth === ALL_MONTHS) return data.orders;
    return data.orders.filter((order) => monthKey(toExactDatetime(order.orderedAt)) === selectedMonth);
  }, [data, selectedMonth]);

  const filteredMetrics = useMemo(() => {
    const totalInvoiced = filteredOrders.reduce((sum, order) => sum + order.itemTotal, 0);
    const totalPaid = filteredOrders.filter((o) => o.isPaid).reduce((sum, order) => sum + order.itemTotal, 0);
    const totalPending = filteredOrders.filter((o) => !o.isPaid).reduce((sum, order) => sum + order.itemTotal, 0);
    return {
      totalInvoiced: Number(totalInvoiced.toFixed(2)),
      totalPaid: Number(totalPaid.toFixed(2)),
      totalPending: Number(totalPending.toFixed(2)),
    };
  }, [filteredOrders]);
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
        <AppTitle>{data?.customer.name ?? "Cliente"}</AppTitle>
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
              <div className="max-md:space-y-1 py-4 md:flex md:justify-between md:flex-wrap">
                <p className="font-heading text-base font-medium">Telefone</p>
                <p className="text-base text-muted-foreground">
                  {data.customer.phone}
                </p>
              </div>
            )}
            {data.customer.address && (
              <div className="max-md:space-y-1 py-4 md:flex md:justify-between md:flex-wrap">
                <p className="font-heading text-base font-medium">Endereço</p>
                <p className="text-base text-muted-foreground">
                  {data.customer.address}
                </p>
              </div>
            )}
            {data.customer.note && (
              <div className="max-md:space-y-1 py-4 md:flex md:justify-between md:flex-wrap">
                <p className="font-heading text-base font-medium">Observação</p>
                <p className="text-base text-muted-foreground">
                  {data.customer.note}
                </p>
              </div>
            )}
          </div>

          {/* Resumo financeiro */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border p-4 space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total faturado</p>
              <p className="font-heading text-lg font-semibold">{currencyFormatter.format(filteredMetrics.totalInvoiced)}</p>
            </div>
            <div className="rounded-2xl border p-4 space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total pago</p>
              <p className="font-heading text-lg font-semibold text-green-700">{currencyFormatter.format(filteredMetrics.totalPaid)}</p>
            </div>
            <div className={`rounded-2xl border p-4 space-y-1 ${filteredMetrics.totalPending > 0 ? "border-amber-300 bg-amber-400/10" : ""}`}>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">A receber</p>
              <p className={`font-heading text-lg font-semibold ${filteredMetrics.totalPending > 0 ? "text-amber-700" : ""}`}>
                {currencyFormatter.format(filteredMetrics.totalPending)}
              </p>
            </div>
          </div>

          {/* Pedidos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="font-heading text-base font-medium">Pedidos ({filteredOrders.length})</h2>
              {monthOptions.length > 0 && (
                <Select value={selectedMonth} onValueChange={(v) => v && setSelectedMonth(v)}>
                  <SelectTrigger size="sm">
                    <SelectValue>
                      {selectedMonth === ALL_MONTHS
                        ? "Todos os meses"
                        : monthOptions.find((o) => o.value === selectedMonth)?.label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_MONTHS}>Todos os meses</SelectItem>
                    {monthOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {filteredOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {data.orders.length === 0 ? "Este cliente ainda não possui pedidos." : "Nenhum pedido neste período."}
              </p>
            ) : (
              <div className="space-y-2">
                {filteredOrders.map((order) => (
                  <Item key={order.id} variant="outline" className="items-start" render={<Link to="/app/orders/$orderId" params={{ orderId: order.id }} />}>
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
