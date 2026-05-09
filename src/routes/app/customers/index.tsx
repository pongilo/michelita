import { createFileRoute, Link } from "@tanstack/react-router";
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
import { PlusIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import { AppTitle } from "@/components/app-title";
import { useState } from "react";
import { useQueryState, parseAsInteger } from "nuqs";
import { useDebounce } from "@/hooks/use-debounce";

export const Route = createFileRoute("/app/customers/")({
  component: CustomersPage,
});

const PAGE_SIZE = 20;

function CustomersPage() {
  const { organization } = useAuth();
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 400);
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));

  const {
    data,
    isLoading,
    isError,
    error,
    isFetching,
  } = useGetCustomers({
    organizationId: organization!.id,
    search: debouncedSearch || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const customers = data?.customers ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const { mutateAsync: createCustomer, isPending: isCreatingCustomer } = useCreateCustomer();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  function handleSearchChange(value: string) {
    setSearchInput(value);
    setPage(1);
  }

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
        <LoadingState label="Carregando clientes..." />
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

  if (total === 0 && !debouncedSearch) {
    return (
      <EmptyState>
        <EmptyState.Icon>👥</EmptyState.Icon>
        <EmptyState.Title>Nenhum cliente ainda</EmptyState.Title>
        <EmptyState.Description>
          Cadastre seus primeiros clientes para vincular pedidos e transações.
        </EmptyState.Description>
        <EmptyState.Action>
          <Button size="sm" onClick={() => setIsCreateModalOpen(true)}>
            Novo cliente
          </Button>
        </EmptyState.Action>
        <CustomerFormModal
          isOpen={isCreateModalOpen}
          mode="create"
          isSubmitting={isCreatingCustomer}
          errorMessage=""
          successMessage=""
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={onSubmit}
        />
      </EmptyState>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl p-5">
      <header className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-baseline gap-2">
            <AppTitle>Clientes</AppTitle>
            <p className="text-sm text-muted-foreground">
              ({total} {total === 1 ? "cliente cadastrado" : "clientes cadastrados"})
            </p>
          </div>
          <Button size="icon-sm" onClick={() => setIsCreateModalOpen(true)}>
            <PlusIcon />
          </Button>
        </div>
        <div className="flex gap-2 flex-wrap mb-5">
          <SearchInput
            value={searchInput}
            onChange={handleSearchChange}
            placeholder="Nome, telefone ou endereço"
          />
        </div>
      </header>

      {customers.length === 0 && debouncedSearch && (
        <EmptyState compact>
          <EmptyState.Icon>🔍</EmptyState.Icon>
          <EmptyState.Title>Nenhum cliente encontrado</EmptyState.Title>
          <EmptyState.Description>Nenhum resultado para "{debouncedSearch}"</EmptyState.Description>
        </EmptyState>
      )}

      {customers.length > 0 && (
        <div className={isFetching ? "opacity-60 transition-opacity" : ""}>
          <ItemGroup>
            {customers.map((customer) => (
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
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

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
