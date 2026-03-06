import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { ProductFormModal } from "@/components/product-form-modal";
import { useGetUser } from "@/hooks/tanstack/auth/use-get-user";
import { useDeleteProduct } from "@/hooks/tanstack/product/use-delete-product";
import { useGetProducts } from "@/hooks/tanstack/product/use-get-products";
import { useGetOrganization } from "@/hooks/tanstack/organization/use-get-organization";
import type { Database } from "@/lib/database.types";

type Product = Database["public"]["Tables"]["product"]["Row"];

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export const Route = createFileRoute("/app/product")({
  component: ProductPage,
});

function ProductPage() {
  const navigate = useNavigate();
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [productQueryParams, setProductQueryParams] = useQueryStates({
    modal: parseAsStringLiteral(["new", "edit"]),
    productId: parseAsString,
    q: parseAsString,
    status: parseAsStringLiteral(["all", "active", "inactive"]),
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
    data: products = [],
    error: productsError,
    isLoading: isLoadingProducts,
  } = useGetProducts({ organizationId });

  const { mutateAsync: deleteProduct, isPending: isDeleting } = useDeleteProduct({ organizationId });
  const isEditModalRequested = productQueryParams.modal === "edit";
  const editingProductId = isEditModalRequested ? productQueryParams.productId ?? null : null;
  const searchQuery = productQueryParams.q ?? "";
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const statusFilter = productQueryParams.status ?? "all";

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
    setProductQueryParams({
      modal: "new",
      productId: null,
    });
  }

  function handleEdit(product: Product) {
    setFeedbackError("");
    setSuccessMessage("");
    setProductQueryParams({
      modal: "edit",
      productId: product.id,
    });
  }

  function handleCloseFormModal() {
    setProductQueryParams({
      modal: null,
      productId: null,
    });
    setFeedbackError("");
  }

  async function handleDelete(product: Product) {
    const shouldDelete = window.confirm(`Deseja excluir o produto "${product.name}"?`);
    if (!shouldDelete) {
      return;
    }

    setFeedbackError("");
    setSuccessMessage("");
    setDeletingProductId(product.id);

    try {
      await deleteProduct({ id: product.id });

      if (editingProductId === product.id) {
        handleCloseFormModal();
      }

      setSuccessMessage("Produto excluido com sucesso.");
    } catch (error) {
      setFeedbackError(error instanceof Error ? error.message : "Erro ao excluir produto.");
    } finally {
      setDeletingProductId(null);
    }
  }

  const isLoadingPage = isLoadingUser || isLoadingOrganization || isLoadingProducts;
  const baseError = userError?.message || organizationError?.message || productsError?.message || "";
  const errorMessage = feedbackError || baseError;
  const productToEdit = products.find((product) => product.id === editingProductId) ?? null;
  const isFormModalOpen =
    productQueryParams.modal === "new" || (isEditModalRequested && !!productToEdit);
  const filteredProducts = products.filter((product) => {
    const matchesSearch = normalizedSearchQuery
      ? `${product.name} ${product.description ?? ""}`.toLowerCase().includes(normalizedSearchQuery)
      : true;

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && product.active) ||
      (statusFilter === "inactive" && !product.active);

    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    if (isLoadingProducts) {
      return;
    }

    if (isEditModalRequested && editingProductId && !productToEdit) {
      setProductQueryParams({
        modal: null,
        productId: null,
      });
      setFeedbackError("Produto nao encontrado para edicao.");
    }
  }, [isLoadingProducts, isEditModalRequested, editingProductId, productToEdit, setProductQueryParams]);

  return (
    <main className="p-5 lg:p-8 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Produtos</h1>
        <button type="button" className="btn btn-primary" onClick={handleOpenCreateModal}>
          Novo produto
        </button>
      </header>

      <p className="opacity-80">Gerencie os produtos da sua organizacao.</p>

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
            <h2 className="card-title">Lista de produtos</h2>
            <div className="flex w-full max-w-xl flex-wrap gap-2">
              <input
                type="search"
                value={searchQuery}
                onChange={(event) =>
                  setProductQueryParams({
                    q: event.target.value.trim() ? event.target.value : null,
                  })
                }
                placeholder="Buscar produto..."
                className="input input-bordered flex-1 min-w-56"
              />
              <select
                className="select select-bordered"
                value={statusFilter}
                onChange={(event) =>
                  setProductQueryParams({
                    status: event.target.value as "all" | "active" | "inactive",
                  })
                }
              >
                <option value="all">Todos</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
              </select>
            </div>
          </div>

          {isLoadingPage ? <span className="loading loading-spinner loading-md" /> : null}

          {!isLoadingPage && filteredProducts.length === 0 ? (
            <p className="opacity-75">Nenhum produto cadastrado.</p>
          ) : null}

          {!isLoadingPage && filteredProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Descricao</th>
                    <th>Preco</th>
                    <th>Status</th>
                    <th>Criado em</th>
                    <th className="text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id}>
                      <td>{product.name}</td>
                      <td>{product.description ?? "-"}</td>
                      <td>{currencyFormatter.format(product.price)}</td>
                      <td>
                        <span className={`badge ${product.active ? "badge-success" : "badge-ghost"}`}>
                          {product.active ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td>{new Date(product.created_at).toLocaleDateString("pt-BR")}</td>
                      <td className="text-right">
                        <div className="inline-flex gap-2">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => handleEdit(product)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-error btn-outline"
                            onClick={() => handleDelete(product)}
                            disabled={isDeleting && deletingProductId === product.id}
                          >
                            {isDeleting && deletingProductId === product.id ? "Excluindo..." : "Excluir"}
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

      <ProductFormModal
        isOpen={isFormModalOpen}
        organizationId={organizationId}
        productToEdit={productToEdit}
        onSuccess={setSuccessMessage}
        onClose={handleCloseFormModal}
      />
    </main>
  );
}
