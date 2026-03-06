import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { CustomerFormModal } from "@/components/customer-form-modal";
import type { Database } from "@/lib/database.types";
import { useGetUser } from "@/hooks/tanstack/auth/use-get-user";
import { useGetOrganization } from "@/hooks/tanstack/organization/use-get-organization";
import { useGetCustomers } from "@/hooks/tanstack/customer/use-get-customers";
import { useDeleteCustomer } from "@/hooks/tanstack/customer/use-delete-customer";

type Customer = Database["public"]["Tables"]["customer"]["Row"];

export const Route = createFileRoute("/app/customer")({
  component: CustomerPage,
});

function CustomerPage() {
  const navigate = useNavigate();
  const [deletingCustomerId, setDeletingCustomerId] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [customerQueryParams, setCustomerQueryParams] = useQueryStates({
    modal: parseAsStringLiteral(["new", "edit"]),
    customerId: parseAsString,
    q: parseAsString,
  });

  const { data: userData, error: userError, isLoading: isLoadingUser } = useGetUser();
  const userId = userData?.user?.id ?? "";

  const {
    data: organization,
    error: organizationError,
    isLoading: isLoadingOrganization,
  } = useGetOrganization({ userId });
  const organizationId = organization?.id ?? "";

  const {
    data: customers = [],
    error: customersError,
    isLoading: isLoadingCustomers,
  } = useGetCustomers({ organizationId });

  const { mutateAsync: deleteCustomer, isPending: isDeleting } = useDeleteCustomer({ organizationId });
  const isEditModalRequested = customerQueryParams.modal === "edit";
  const editingCustomerId = isEditModalRequested ? customerQueryParams.customerId ?? null : null;
  const searchQuery = customerQueryParams.q ?? "";
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  useEffect(() => {
    if (!isLoadingUser && !userId) {
      navigate({ to: "/login" });
    }
  }, [isLoadingUser, userId, navigate]);

  useEffect(() => {
    if (!isLoadingUser && userId && !isLoadingOrganization && !organization) {
      navigate({ to: "/organization/new" });
    }
  }, [isLoadingUser, userId, isLoadingOrganization, organization, navigate]);

  function handleOpenCreateModal() {
    setFeedbackError("");
    setSuccessMessage("");
    setCustomerQueryParams({
      modal: "new",
      customerId: null,
    });
  }

  function handleEdit(customer: Customer) {
    setFeedbackError("");
    setSuccessMessage("");
    setCustomerQueryParams({
      modal: "edit",
      customerId: customer.id,
    });
  }

  function handleCloseFormModal() {
    setCustomerQueryParams({
      modal: null,
      customerId: null,
    });
    setFeedbackError("");
  }

  async function handleDelete(customer: Customer) {
    const shouldDelete = window.confirm(`Deseja excluir o cliente "${customer.name}"?`);
    if (!shouldDelete) {
      return;
    }

    setFeedbackError("");
    setSuccessMessage("");
    setDeletingCustomerId(customer.id);

    try {
      await deleteCustomer({ id: customer.id });

      if (editingCustomerId === customer.id) {
        handleCloseFormModal();
      }

      setSuccessMessage("Cliente excluido com sucesso.");
    } catch (error) {
      setFeedbackError(error instanceof Error ? error.message : "Erro ao excluir cliente.");
    } finally {
      setDeletingCustomerId(null);
    }
  }

  const isLoadingPage = isLoadingUser || isLoadingOrganization || isLoadingCustomers;
  const baseError = userError?.message || organizationError?.message || customersError?.message || "";
  const errorMessage = feedbackError || baseError;
  const customerToEdit = customers.find((customer) => customer.id === editingCustomerId) ?? null;
  const isFormModalOpen =
    customerQueryParams.modal === "new" || (isEditModalRequested && !!customerToEdit);
  const filteredCustomers = customers.filter((customer) => {
    if (!normalizedSearchQuery) {
      return true;
    }

    const searchableText = `${customer.name} ${customer.phone ?? ""} ${customer.note ?? ""}`.toLowerCase();
    return searchableText.includes(normalizedSearchQuery);
  });

  useEffect(() => {
    if (isLoadingCustomers) {
      return;
    }

    if (isEditModalRequested && editingCustomerId && !customerToEdit) {
      setCustomerQueryParams({
        modal: null,
        customerId: null,
      });
      setFeedbackError("Cliente nao encontrado para edicao.");
    }
  }, [isLoadingCustomers, isEditModalRequested, editingCustomerId, customerToEdit, setCustomerQueryParams]);

  return (
    <main className="p-5 lg:p-8 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Clientes</h1>
        <button type="button" className="btn btn-primary" onClick={handleOpenCreateModal}>
          Novo cliente
        </button>
      </header>

      <p className="opacity-80">Gerencie os clientes da sua organizacao.</p>

      {errorMessage ? (
        <div className="alert alert-error">
          <span>{errorMessage}</span>
        </div>
      ) : null}

      {successMessage ? (
        <div className="alert alert-success">
          <span>{successMessage}</span>
        </div>
      ) : null}

      <section className="card bg-base-100 shadow-xs">
        <div className="card-body">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="card-title">Lista de clientes</h2>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) =>
                setCustomerQueryParams({
                  q: event.target.value.trim() ? event.target.value : null,
                })
              }
              placeholder="Buscar cliente..."
              className="input input-bordered w-full max-w-sm"
            />
          </div>

          {isLoadingPage ? <span className="loading loading-spinner loading-md" /> : null}

          {!isLoadingPage && filteredCustomers.length === 0 ? (
            <p className="opacity-75">Nenhum cliente cadastrado.</p>
          ) : null}

          {!isLoadingPage && filteredCustomers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Telefone</th>
                    <th>Observacao</th>
                    <th>Criado em</th>
                    <th className="text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id}>
                      <td>{customer.name}</td>
                      <td>{customer.phone ?? "-"}</td>
                      <td>{customer.note ?? "-"}</td>
                      <td>{new Date(customer.created_at).toLocaleDateString("pt-BR")}</td>
                      <td className="text-right">
                        <div className="inline-flex gap-2">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => handleEdit(customer)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-error btn-outline"
                            onClick={() => handleDelete(customer)}
                            disabled={isDeleting && deletingCustomerId === customer.id}
                          >
                            {isDeleting && deletingCustomerId === customer.id ? "Excluindo..." : "Excluir"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </section>

      <CustomerFormModal
        isOpen={isFormModalOpen}
        organizationId={organizationId}
        customerToEdit={customerToEdit}
        onSuccess={setSuccessMessage}
        onClose={handleCloseFormModal}
      />
    </main>
  );
}
