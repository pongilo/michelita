import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { CustomerFormModal, type CustomerFormValues } from "@/components/customer-form-modal";
import { useCreateCustomer } from "@/hooks/tanstack/customer/use-create-customer";
import { useDeleteCustomer } from "@/hooks/tanstack/customer/use-delete-customer";
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
  const { mutateAsync: deleteCustomer, isPending: isDeletingCustomer } = useDeleteCustomer({
    organizationId: organization.id,
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

  function handleOpenCreateModal() {
    setFormError("");
    setFormSuccess("");
    setIsCreateModalOpen(true);
  }

  function handleCloseCreateModal() {
    setIsCreateModalOpen(false);
    setFormError("");
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

  async function handleDeleteCustomer(customerId: string) {
    setActionError("");
    setFormSuccess("");

    const confirmed = window.confirm(
      "Deseja realmente excluir este cliente? Esta acao nao pode ser desfeita.",
    );
    if (!confirmed) {
      return;
    }

    try {
      await deleteCustomer({
        id: customerId,
        organizationId: organization.id,
      });
      setFormSuccess("Cliente excluido com sucesso.");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Erro ao excluir cliente.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clientes</h1>
        <button type="button" className="btn btn-primary" onClick={handleOpenCreateModal}>
          Novo cliente
        </button>
      </div>

      {formSuccess ? (
        <div className="alert alert-success mb-4">
          <span>{formSuccess}</span>
        </div>
      ) : null}

      {actionError ? (
        <div className="alert alert-error mb-4">
          <span>{actionError}</span>
        </div>
      ) : null}

      <section className="card border border-base-300 bg-base-100 shadow-sm">
          {isLoading ? <p>Carregando clientes...</p> : null}
          {isError ? <p className="text-error">{error.message}</p> : null}

          {!isLoading && !isError && customers.length === 0 ? (
            <p className="text-sm opacity-70">Nenhum cliente cadastrado.</p>
          ) : null}

          {!isLoading && !isError && customers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Telefone</th>
                    <th>Endereço</th>
                    <th>Pedidos</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id}>
                      <td>
                        <Link to="/app/customers/$customerId" params={{ customerId: customer.id }} className="link">
                          {customer.name}
                        </Link>
                      </td>
                      <td>{customer.phone ?? "-"}</td>
                      <td>{customer.address ?? "-"}</td>
                      <td>{customer._count.order}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
      </section>

      <CustomerFormModal
        isOpen={isCreateModalOpen}
        mode="create"
        isSubmitting={isCreatingCustomer}
        errorMessage={formError}
        successMessage=""
        onClose={handleCloseCreateModal}
        onSubmit={onSubmit}
      />
    </main>
  );
}
