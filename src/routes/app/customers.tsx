import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { CustomerFormModal, type CustomerFormValues } from "@/components/customer-form-modal";
import { useCreateCustomer } from "@/hooks/tanstack/customer/use-create-customer";
import { useGetCustomers } from "@/hooks/tanstack/customer/use-get-customers";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/ui/search-input";
import { ListContainer } from "@/components/ui/list-container";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/customers")({
  component: CustomersPage,
});

function CustomersPage() {
  const location = useLocation();
  const { organization } = Route.useRouteContext();
  const { data: customers = [], isLoading, isError, error } = useGetCustomers({
    organizationId: organization.id,
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

  const isCustomerProfileRoute =
    location.pathname.startsWith("/app/customers/") && location.pathname !== "/app/customers";

  if (isCustomerProfileRoute) {
    return <Outlet />;
  }

  async function onSubmit(values: CustomerFormValues) {
    try {
      const customer = await createCustomer({
        organizationId: organization.id,
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

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8">
      <PageHeader>
        <PageHeader.Info>
          <PageHeader.Title>Clientes</PageHeader.Title>
          {!isLoading && !isError && (
            <PageHeader.Subtitle>
              {customers.length} {customers.length === 1 ? "cliente cadastrado" : "clientes cadastrados"}
            </PageHeader.Subtitle>
          )}
        </PageHeader.Info>
        <PageHeader.Controls>
          <SearchInput value={search} onChange={setSearch} placeholder="Nome, telefone ou endereço" />
          <Button
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
          >
            + Novo cliente
          </Button>
        </PageHeader.Controls>
      </PageHeader>

      {isLoading ? <LoadingState label="Carregando clientes..." /> : null}

      {isError ? <p className="text-error text-sm">{error.message}</p> : null}

      {!isLoading && !isError && customers.length === 0 ? (
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
              + Novo cliente
            </Button>
          </EmptyState.Action>
        </EmptyState>
      ) : null}

      {!isLoading && !isError && customers.length > 0 && filteredCustomers.length === 0 ? (
        <EmptyState compact>
          <EmptyState.Icon>🔍</EmptyState.Icon>
          <EmptyState.Title>Nenhum cliente encontrado</EmptyState.Title>
          <EmptyState.Description>Nenhum resultado para "{search}"</EmptyState.Description>
        </EmptyState>
      ) : null}

      {!isLoading && !isError && filteredCustomers.length > 0 ? (
        <ListContainer>
          {filteredCustomers.map((customer) => (
            <Link
              key={customer.id}
              to="/app/customers/$customerId"
              params={{ customerId: customer.id }}
              className="flex items-center gap-4 px-4 py-3 bg-base-100 hover:bg-base-200/50 transition-colors"
            >
              <div className="bg-primary/15 text-primary rounded-full w-10 h-10 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold">{customer.name.slice(0, 1).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium leading-snug truncate">{customer.name}</p>
                <p className="text-sm opacity-50 truncate">
                  {[customer.phone, customer.address].filter(Boolean).join(" · ") || "Sem contato"}
                </p>
              </div>
              <span className="badge badge-outline badge-sm shrink-0">
                {customer._count.order} {customer._count.order === 1 ? "pedido" : "pedidos"}
              </span>
            </Link>
          ))}
        </ListContainer>
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
