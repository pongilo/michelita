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
import { PlusIcon } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import { AppTitle } from "@/components/app-title";
import { useMemo, useState } from "react";
import { normalize } from "@/lib/utils";

export const Route = createFileRoute("/app/customers/")({
  component: CustomersPage,
});

function CustomersPage() {
  const { organization } = useAuth();
  const [searchInput, setSearchInput] = useState("");

  const { data, isLoading, isError, error } = useGetCustomers({
    organizationId: organization!.id,
  });

  const allCustomers = data?.customers ?? [];
  const total = allCustomers.length;

  const customers = useMemo(() => {
    const search = normalize(searchInput.trim());
    if (!search) return allCustomers;
    return allCustomers.filter((customer) =>
      [customer.name, customer.phone, customer.address].some((field) =>
        field && normalize(field).includes(search)
      )
    );
  }, [allCustomers, searchInput]);

  const { mutateAsync: createCustomer, isPending: isCreatingCustomer } = useCreateCustomer();
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

  if (total === 0 && !searchInput) {
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
    <>
    <main className="mx-auto w-full max-w-6xl px-5 pb-24 md:pb-5">
      <header className="sticky top-[env(safe-area-inset-top)] z-20 space-y-4 bg-background pt-5 md:static md:top-auto md:z-auto md:bg-transparent">
        <div className="flex items-start justify-between">
          <div className="flex items-baseline gap-2">
            <AppTitle>Clientes</AppTitle>
            <p className="text-sm text-muted-foreground">
              ({total} {total === 1 ? "cliente cadastrado" : "clientes cadastrados"})
            </p>
          </div>
          <Button size="icon-sm" className="hidden md:inline-flex" onClick={() => setIsCreateModalOpen(true)}>
            <PlusIcon />
          </Button>
        </div>
        <div className="flex gap-2 flex-wrap mb-5">
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Nome, telefone ou endereço"
          />
        </div>
      </header>

      {customers.length === 0 && searchInput && (
        <EmptyState compact>
          <EmptyState.Icon>🔍</EmptyState.Icon>
          <EmptyState.Title>Nenhum cliente encontrado</EmptyState.Title>
          <EmptyState.Description>Nenhum resultado para "{searchInput}"</EmptyState.Description>
        </EmptyState>
      )}

      {customers.length > 0 && (
        <div>
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

    <Button
      size="icon"
      className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 size-14 shadow-lg md:hidden"
      onClick={() => setIsCreateModalOpen(true)}
    >
      <PlusIcon className="size-6" />
      <span className="sr-only">Novo cliente</span>
    </Button>
    </>
  );
}
