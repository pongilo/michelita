import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { EllipsisVerticalIcon, Trash2Icon, XIcon } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { AppTitle } from "@/components/app-title";
import { Button, buttonVariants } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProductForm, type ProductFormValues } from "@/components/product-form";
import { useGetProducts } from "@/hooks/tanstack/product/use-get-products";
import { useUpdateProduct } from "@/hooks/tanstack/product/use-update-product";
import { useDeleteProduct } from "@/hooks/tanstack/product/use-delete-product";
import { useGetProductCategories } from "@/hooks/tanstack/product-category/use-get-product-categories";

export const Route = createFileRoute("/app/products/$productId")({
  component: ProductDetailsPage,
});

function ProductDetailsPage() {
  const { organization } = useAuth();
  const { productId } = Route.useParams();
  const navigate = useNavigate();

  const { data, isLoading, isError, error } = useGetProducts({
    organizationId: organization!.id,
  });
  const product = data?.products.find((item) => item.id === productId);

  const { data: categoriesData } = useGetProductCategories({
    organizationId: organization!.id,
  });
  const categories = categoriesData?.categories ?? [];

  const { mutateAsync: updateProduct, isPending: isUpdating } = useUpdateProduct({
    organizationId: organization!.id,
  });
  const { mutateAsync: deleteProduct, isPending: isDeleting } = useDeleteProduct({
    organizationId: organization!.id,
  });

  async function handleSubmit(values: ProductFormValues) {
    if (!product) return;
    try {
      await updateProduct({
        id: product.id,
        name: values.name,
        description: values.description,
        imageUrl: values.imageUrl,
        price: values.price,
        categoryId: values.categoryId,
      });
      toast.success("Produto atualizado com sucesso.");
      navigate({ to: "/app/products" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar produto.");
    }
  }

  async function handleDelete() {
    if (!product) return;
    const confirmed = window.confirm(
      `Deseja realmente excluir o produto "${product.name}"? Esta ação não pode ser desfeita.`,
    );
    if (!confirmed) return;

    try {
      await deleteProduct({ id: product.id, organizationId: organization!.id });
      toast.success("Produto excluído com sucesso.");
      navigate({ to: "/app/products" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir produto.");
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-2xl px-5 py-8">
        <LoadingState label="Carregando produto..." />
      </main>
    );
  }

  if (isError) {
    return (
      <main className="mx-auto w-full max-w-2xl px-5 py-8">
        <p className="text-destructive">Erro ao carregar produto: {error.message}</p>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="mx-auto w-full max-w-2xl space-y-4 px-5 py-8">
        <p className="text-muted-foreground">Produto não encontrado.</p>
        <Button variant="outline" onClick={() => navigate({ to: "/app/products" })}>
          Voltar para produtos
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-5">
      <div className="sticky top-[env(safe-area-inset-top)] z-20 flex items-center justify-between gap-3 bg-background pt-5 mb-6 md:static md:top-auto md:z-auto md:bg-transparent">
        <AppTitle>Editar produto</AppTitle>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger
              className={buttonVariants({ variant: "ghost", size: "icon" })}
              aria-label="Ações do produto"
            >
              <EllipsisVerticalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem variant="destructive" disabled={isDeleting} onClick={handleDelete}>
                <Trash2Icon />
                Excluir produto
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button type="button" variant="ghost" size="icon" nativeButton={false} render={<Link to="/app/products" />}>
            <XIcon />
          </Button>
        </div>
      </div>

      <ProductForm
        mode="edit"
        isSubmitting={isUpdating}
        categories={categories}
        organizationId={organization!.id}
        initialValues={{
          name: product.name,
          description: product.description ?? undefined,
          imageUrl: product.imageUrl ?? undefined,
          price: product.price,
          categoryId: product.categoryId ?? undefined,
        }}
        onSubmit={handleSubmit}
        onCancel={() => navigate({ to: "/app/products" })}
      />
    </main>
  );
}
