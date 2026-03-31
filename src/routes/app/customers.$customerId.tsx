import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Item, ItemGroup, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions } from "@/components/ui/item";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomerFormModal, type CustomerFormValues } from "@/components/customer-form-modal";
import { TransactionFormModal, type TransactionFormValues } from "@/components/transaction-form-modal";
import { useDeleteCustomer } from "@/hooks/tanstack/customer/use-delete-customer";
import { useGetCustomerDetails } from "@/hooks/tanstack/customer/use-get-customer-details";
import { useLinkCustomerTransaction } from "@/hooks/tanstack/customer/use-link-customer-transaction";
import { useUpdateCustomer } from "@/hooks/tanstack/customer/use-update-customer";
import { useCreateTransaction } from "@/hooks/tanstack/transaction/use-create-transaction";
import { useGetTransactions } from "@/hooks/tanstack/transaction/use-get-transactions";
import { useUpdateTransaction } from "@/hooks/tanstack/transaction/use-update-transaction";
import { currencyFormatter, dateFormatter as datetimeFormatter } from "@/lib/utils/formatter";

function currentDateInputValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

const transactionMethodLabel: Record<string, string> = {
  PIX: "PIX",
  CASH: "Dinheiro",
  CREDIT_CARD: "Cartao de credito",
  DEBIT_CARD: "Cartao de debito",
};

const transactionMethodFormValue: Record<string, TransactionFormValues["method"]> = {
  PIX: "pix",
  CASH: "cash",
  CREDIT_CARD: "credit_card",
  DEBIT_CARD: "debit_card",
};

function localDatetimeNow() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function toLocalDatetimeInput(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return localDatetimeNow();
  return date.toISOString().slice(0, 16);
}

export const Route = createFileRoute("/app/customers/$customerId")({
  component: CustomerDetailsPage,
});

function CustomerDetailsPage() {
  const { organization } = Route.useRouteContext();
  const { customerId } = Route.useParams();
  const navigate = useNavigate();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState("");
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useGetCustomerDetails({
    organizationId: organization.id,
    customerId,
  });
  const { mutateAsync: updateCustomer, isPending: isUpdatingCustomer } = useUpdateCustomer({
    organizationId: organization.id,
  });
  const { mutateAsync: createTransaction, isPending: isCreatingTransaction } = useCreateTransaction({
    organizationId: organization.id,
  });
  const { mutateAsync: updateTransaction, isPending: isUpdatingTransaction } = useUpdateTransaction({
    organizationId: organization.id,
  });
  const { mutateAsync: deleteCustomer, isPending: isDeletingCustomer } = useDeleteCustomer({
    organizationId: organization.id,
  });
  const { mutateAsync: linkTransaction, isPending: isLinking } = useLinkCustomerTransaction({
    organizationId: organization.id,
    customerId,
  });
  const { data: allTransactions = [] } = useGetTransactions({
    organizationId: organization.id,
    period: "monthly",
    referenceDate: currentDateInputValue(),
  });

  const linkedTransactionIds = useMemo(
    () => new Set(data?.recentTransactions.map((t) => t.id) ?? []),
    [data?.recentTransactions],
  );
  const availableToLink = allTransactions.filter((t) => !linkedTransactionIds.has(t.id));

  const editingTransaction = data?.recentTransactions.find((transaction) => transaction.id === editingTransactionId) ?? null;
  const isEditingTransaction = !!editingTransaction;
  const isSubmittingTransactionForm = isCreatingTransaction || isUpdatingTransaction;

  function handleStartEdit() {
    setIsEditModalOpen(true);
  }

  function handleCloseEditModal() {
    setIsEditModalOpen(false);
  }

  function handleOpenTransactionModal() {
    setEditingTransactionId(null);
    setIsTransactionModalOpen(true);
  }

  function handleStartTransactionEdit(transactionId: string) {
    setEditingTransactionId(transactionId);
    setIsTransactionModalOpen(true);
  }

  function handleCloseTransactionModal() {
    setEditingTransactionId(null);
    setIsTransactionModalOpen(false);
  }

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

  async function handleSubmitCustomerTransaction(values: TransactionFormValues) {
    if (!data) return;
    try {
      if (editingTransaction) {
        await updateTransaction({
          id: editingTransaction.id,
          organizationId: organization.id,
          type: values.type,
          amount: values.amount,
          method: values.method,
          madeAt: values.madeAt,
          linkedCustomerId: data.customer.id,
          description: values.description,
        });
        toast.success("Transação atualizada com sucesso.");
      } else {
        const transaction = await createTransaction({
          organizationId: organization.id,
          type: values.type,
          amount: values.amount,
          method: values.method,
          madeAt: values.madeAt,
          linkedCustomerId: data.customer.id,
          description: values.description,
        });
        toast.success(`Transação ${transaction.id.slice(0, 8)} registrada com sucesso.`);
      }
      setEditingTransactionId(null);
      setIsTransactionModalOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : editingTransaction
            ? "Erro ao atualizar transação."
            : "Erro ao registrar transação.",
      );
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

  async function handleLinkTransaction() {
    if (!selectedTransactionId) return;
    try {
      await linkTransaction({ organizationId: organization.id, customerId, transactionId: selectedTransactionId });
      setIsLinkModalOpen(false);
      setSelectedTransactionId("");
      toast.success("Transação vinculada ao cliente.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao vincular transação.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-8">

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {data && (
            <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0 text-base font-bold">
              {data.customer.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <h1 className="text-2xl font-semibold">{data?.customer.name ?? "Cliente"}</h1>
        </div>
        {data && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              disabled={isDeletingCustomer}
              onClick={handleDeleteCustomer}
            >
              Excluir
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleStartEdit}>
              Editar
            </Button>
            <Button type="button" size="sm" onClick={handleOpenTransactionModal}>
              + Nova transação
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm opacity-60">
          <span className="animate-spin size-4 rounded-full border-2 border-current border-t-transparent" />
          Carregando cliente...
        </div>
      ) : null}
      {isError ? <p className="text-destructive text-sm">{error.message}</p> : null}

      {data ? (
        <div className="space-y-5">

          {/* Contato */}
          {(data.customer.phone || data.customer.address || data.customer.note) ? (
            <Card size="sm">
              <CardContent>
                <ItemGroup>
                  {data.customer.phone ? (
                    <Item size="sm">
                      <ItemContent><ItemDescription>Telefone</ItemDescription></ItemContent>
                      <ItemContent><ItemTitle>{data.customer.phone}</ItemTitle></ItemContent>
                    </Item>
                  ) : null}
                  {data.customer.address ? (
                    <Item size="sm">
                      <ItemContent><ItemDescription>Endereço</ItemDescription></ItemContent>
                      <ItemContent><ItemTitle>{data.customer.address}</ItemTitle></ItemContent>
                    </Item>
                  ) : null}
                  {data.customer.note ? (
                    <Item size="sm">
                      <ItemContent><ItemDescription>Observação</ItemDescription></ItemContent>
                      <ItemContent><ItemTitle>{data.customer.note}</ItemTitle></ItemContent>
                    </Item>
                  ) : null}
                </ItemGroup>
              </CardContent>
            </Card>
          ) : null}

          {/* Métricas */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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
            <Card size="sm">
              <CardHeader>
                <CardDescription>Recebido</CardDescription>
                <CardTitle className="text-lg text-success">{currencyFormatter.format(data.metrics.totalReceived)}</CardTitle>
              </CardHeader>
            </Card>
            <Card size="sm" className="col-span-2 sm:col-span-1">
              <CardHeader>
                <CardDescription>Saldo</CardDescription>
                <CardTitle className={`text-lg ${data.metrics.balance >= 0 ? "text-success" : "text-destructive"}`}>
                  {currencyFormatter.format(data.metrics.balance)}
                </CardTitle>
              </CardHeader>
            </Card>
          </section>

          {/* Pedidos */}
          <Card size="sm">
            <CardHeader>
              <CardTitle>Pedidos</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {data.recentOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground">Este cliente ainda não possui pedidos.</p>
              ) : (
                <ItemGroup>
                  {data.recentOrders.map((order) => (
                    <Item
                      key={order.id}
                      size="sm"
                      variant="outline"
                      render={<Link to="/app/order/$orderId" params={{ orderId: order.id }} />}
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
            </CardContent>
          </Card>

          {/* Transações */}
          <Card size="sm">
            <CardHeader>
              <CardTitle>Transações</CardTitle>
              <CardAction>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => { setSelectedTransactionId(""); setIsLinkModalOpen(true); }}
                >
                  Vincular
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="pt-0">
              {data.recentTransactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem transações vinculadas a este cliente.</p>
              ) : (
                <ItemGroup>
                  {data.recentTransactions.map((transaction) => (
                    <Item
                      key={transaction.id}
                      size="sm"
                      variant="outline"
                      render={<button />}
                      disabled={isSubmittingTransactionForm || isDeletingCustomer}
                      onClick={() => handleStartTransactionEdit(transaction.id)}
                      className="cursor-pointer text-left w-full"
                    >
                      <ItemMedia className={`w-9 h-9 rounded-full flex items-center justify-center text-base ${transaction.type === "entry" ? "bg-success/15 text-success" : "bg-error/15 text-destructive"}`}>
                        {transaction.type === "entry" ? "↑" : "↓"}
                      </ItemMedia>
                      <ItemContent>
                        <ItemTitle>
                          {transaction.description || (transaction.type === "entry" ? "Entrada" : "Saída")}
                        </ItemTitle>
                        <ItemDescription>
                          {transactionMethodLabel[transaction.method] ?? transaction.method}
                          {" · "}
                          {datetimeFormatter.format(new Date(transaction.madeAt))}
                        </ItemDescription>
                      </ItemContent>
                      <ItemActions>
                        <span className={`text-sm font-semibold ${transaction.type === "entry" ? "text-success" : "text-destructive"}`}>
                          {transaction.type === "entry" ? "+" : "−"}{currencyFormatter.format(Math.abs(transaction.amount))}
                        </span>
                      </ItemActions>
                    </Item>
                  ))}
                </ItemGroup>
              )}
            </CardContent>
          </Card>

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
        onClose={handleCloseEditModal}
        onSubmit={onSubmit}
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
              <Select value={selectedTransactionId} onValueChange={setSelectedTransactionId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {availableToLink.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      #{t.id.slice(0, 8)} – {t.type === "entry" ? "Entrada" : "Saida"} {currencyFormatter.format(Math.abs(t.amount))} – {datetimeFormatter.format(new Date(t.madeAt))}{t.description ? ` – ${t.description}` : ""}
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
              disabled={!selectedTransactionId || isLinking}
              onClick={handleLinkTransaction}
            >
              {isLinking ? "Vinculando..." : "Vincular"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TransactionFormModal
        isOpen={isTransactionModalOpen}
        mode={isEditingTransaction ? "edit" : "create"}
        isSubmitting={isSubmittingTransactionForm}
        customers={[]}
        fixedLinkedCustomer={
          data
            ? {
                id: data.customer.id,
                name: data.customer.name,
              }
            : undefined
        }
        errorMessage=""
        successMessage=""
        initialValues={
          data
            ? {
                type: editingTransaction?.type as TransactionFormValues["type"] | undefined,
                amount: editingTransaction ? Math.abs(editingTransaction.amount) : undefined,
                method: editingTransaction
                  ? transactionMethodFormValue[editingTransaction.method] ?? "pix"
                  : undefined,
                madeAt: editingTransaction ? toLocalDatetimeInput(editingTransaction.madeAt) : undefined,
                linkedCustomerId: data.customer.id,
                description: editingTransaction?.description ?? "",
              }
            : undefined
        }
        onClose={handleCloseTransactionModal}
        onSubmit={handleSubmitCustomerTransaction}
      />
    </main>
  );
}

