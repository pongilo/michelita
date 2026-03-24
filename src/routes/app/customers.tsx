import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { CustomerFormModal, type CustomerFormValues } from "@/components/customer-form-modal";
import { useCreateCustomer } from "@/hooks/tanstack/customer/use-create-customer";
import { useGetCustomers } from "@/hooks/tanstack/customer/use-get-customers";

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
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [actionError, setActionError] = useState("");

  const isCustomerProfileRoute =
    location.pathname.startsWith("/app/customers/") && location.pathname !== "/app/customers";

  if (isCustomerProfileRoute) {
    return <Outlet />;
  }

  async function onSubmit(values: CustomerFormValues) {
    setFormError("");
    setFormSuccess("");
    setActionError("");

    try {
      const customer = await createCustomer({
        organizationId: organization.id,
        name: values.name.trim(),
        phone: values.phone?.trim() || undefined,
        address: values.address?.trim() || undefined,
        note: values.note?.trim() || undefined,
      });

      setFormSuccess(`Cliente ${customer.name} criado com sucesso.`);
      setIsCreateModalOpen(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Erro ao criar cliente.");
    }
  }


  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Clientes</h1>
          {!isLoading && !isError && (
            <p className="text-sm opacity-60 mt-0.5">
              {customers.length} {customers.length === 1 ? "cliente cadastrado" : "clientes cadastrados"}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="input input-bordered input-sm flex items-center gap-2 w-64">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 opacity-50">
              <path fillRule="evenodd" d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" clipRule="evenodd" />
            </svg>
            <input
              type="search"
              placeholder="Nome, telefone ou endereço"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="grow bg-transparent outline-none"
            />
          </label>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => { setFormError(""); setFormSuccess(""); setIsCreateModalOpen(true); }}
          >
            + Novo cliente
          </button>
        </div>
      </div>

      {formSuccess ? (
        <div className="alert alert-success mb-5">
          <span>{formSuccess}</span>
        </div>
      ) : null}

      {actionError ? (
        <div className="alert alert-error mb-5">
          <span>{actionError}</span>
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm opacity-60">
          <span className="loading loading-spinner loading-sm" />
          Carregando clientes...
        </div>
      ) : null}

      {isError ? <p className="text-error text-sm">{error.message}</p> : null}

      {!isLoading && !isError && customers.length === 0 ? (
        <div className="card border border-base-300 bg-base-100">
          <div className="card-body items-center text-center py-16">
            <div className="text-5xl mb-3">👥</div>
            <h3 className="font-semibold text-lg">Nenhum cliente ainda</h3>
            <p className="text-sm opacity-60 max-w-xs">Cadastre seus primeiros clientes para vincular pedidos e transações.</p>
            <button
              type="button"
              className="btn btn-primary btn-sm mt-4"
              onClick={() => { setFormError(""); setFormSuccess(""); setIsCreateModalOpen(true); }}
            >
              + Novo cliente
            </button>
          </div>
        </div>
      ) : null}

      {!isLoading && !isError && customers.length > 0 && filteredCustomers.length === 0 ? (
        <div className="card border border-base-300 bg-base-100">
          <div className="card-body items-center text-center py-12">
            <div className="text-4xl mb-2">🔍</div>
            <p className="font-medium">Nenhum cliente encontrado</p>
            <p className="text-sm opacity-60">Nenhum resultado para "{search}"</p>
          </div>
        </div>
      ) : null}

      {!isLoading && !isError && filteredCustomers.length > 0 ? (
        <div className="flex flex-col divide-y divide-base-300 rounded-box overflow-hidden">
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
        </div>
      ) : null}

      <CustomerFormModal
        isOpen={isCreateModalOpen}
        mode="create"
        isSubmitting={isCreatingCustomer}
        errorMessage={formError}
        successMessage=""
        onClose={() => { setIsCreateModalOpen(false); setFormError(""); }}
        onSubmit={onSubmit}
      />
    </main>
  );
}
