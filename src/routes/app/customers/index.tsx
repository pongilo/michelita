import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import { CustomerFormModal, type CustomerFormValues } from "@/components/customer-form-modal";
import { useCreateCustomer } from "@/hooks/tanstack/customer/use-create-customer";
import { useGetCustomers } from "@/hooks/tanstack/customer/use-get-customers";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/ui/search-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Item, ItemGroup, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions } from "@/components/ui/item";
import { PlusIcon } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import { AppTitle } from "@/components/app-title";

export const Route = createFileRoute("/app/customers/")({
  component: CustomersPage,
});

function CustomersPage() {
  const { organization } = useAuth();
  const { data: customers = [], isLoading, isError, error } = useGetCustomers({
    organizationId: organization!.id,
  });
  const { mutateAsync: createCustomer, isPending: isCreatingCustomer } = useCreateCustomer();
  const [search, setSearch] = useState("");
  const filteredCustomers = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone ?? "").toLowerCase().includes(q) ||
      (c.address ?? "").toLowerCase().includes(q)
    );
  });

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  async function onSubmit(values: CustomerFormValues) {
    try {
      const customer = await createCustomer({
        organizationId: organization!.id,
        name: values.name.trim(),
        phone: values.phone?.trim() || undefined,
        address: values.address?.trim() || undefined,
        note: values.note?.trim() || undefined,
      });

      toast.success(`Cliente ${customer.name} criado com sucesso.`);
      setIsCreateModalOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar cliente.");
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-4xl px-5 py-8">
        {isLoading && <LoadingState label="Carregando clientes..." />}
      </main>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">Erro ao carregar clientes: {error.message}</p>
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <EmptyState>
        <EmptyState.Icon>👥</EmptyState.Icon>
        <EmptyState.Title>Nenhum cliente ainda</EmptyState.Title>
        <EmptyState.Description>
          Cadastre seus primeiros clientes para vincular pedidos e transações.
        </EmptyState.Description>
        <EmptyState.Action>
          <Button
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
          >
            Novo cliente
          </Button>
        </EmptyState.Action>
      </EmptyState>
    )
  }

  return (
    <main className="mx-auto w-full max-w-6xl p-5">
      <header className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-baseline gap-2">
            <AppTitle>Clientes</AppTitle>
            <p className="text-sm text-muted-foreground">
              ({customers.length} {customers.length === 1 ? "cliente cadastrado" : "clientes cadastrados"})
            </p>
          </div>
          <Button
            size="icon-sm"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <PlusIcon />
          </Button>
        </div>
        <div className="flex gap-2 flex-wrap mb-5">
          <SearchInput value={search} onChange={setSearch} placeholder="Nome, telefone ou endereço" />
        </div>
      </header>

      {filteredCustomers.length === 0 && (
        <EmptyState compact>
          <EmptyState.Icon>🔍</EmptyState.Icon>
          <EmptyState.Title>Nenhum cliente encontrado</EmptyState.Title>
          <EmptyState.Description>Nenhum resultado para "{search}"</EmptyState.Description>
        </EmptyState>
      )}

      {!isLoading && !isError && filteredCustomers.length > 0 ? (
        <ItemGroup>
          {filteredCustomers.map((customer) => (
            <Item
              key={customer.id}
              variant="outline"
              render={<Link to="/app/customers/$customerId" params={{ customerId: customer.id }} />}
            >
              <ItemMedia className="bg-primary/15 text-primary rounded-full w-10 h-10 flex items-center justify-center">
                <span className="text-sm font-bold">{customer.name.slice(0, 1).toUpperCase()}</span>
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{customer.name}</ItemTitle>
                <ItemDescription>
                  {[customer.phone, customer.address].filter(Boolean).join(" · ") || "Sem contato"}
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <Badge variant="outline">
                  {customer._count.order} {customer._count.order === 1 ? "pedido" : "pedidos"}
                </Badge>
              </ItemActions>
            </Item>
          ))}
        </ItemGroup>
      ) : null}

      <CustomerFormModal
        isOpen={isCreateModalOpen}
        mode="create"
        isSubmitting={isCreatingCustomer}
        errorMessage=""
        successMessage=""
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={onSubmit}
      />
    </main>
  );
}
