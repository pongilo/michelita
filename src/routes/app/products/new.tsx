import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { XIcon } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { AppTitle } from "@/components/app-title";
import { Button } from "@/components/ui/button";
import { ProductForm, type ProductFormValues } from "@/components/product-form";
import { useCreateProduct } from "@/hooks/tanstack/product/use-create-product";
import { useGetProductCategories } from "@/hooks/tanstack/product-category/use-get-product-categories";

export const Route = createFileRoute("/app/products/new")({
  component: NewProductPage,
});

function NewProductPage() {
  const { organization } = useAuth();
  const navigate = useNavigate();

  const { data: categoriesData } = useGetProductCategories({
    organizationId: organization!.id,
  });
  const categories = categoriesData?.categories ?? [];

  const { mutateAsync: createProduct, isPending } = useCreateProduct();

  async function handleSubmit(values: ProductFormValues) {
    try {
      await createProduct({
        organizationId: organization!.id,
        name: values.name,
        description: values.description,
        imageUrl: values.imageUrl,
        price: values.price,
        categoryId: values.categoryId,
      });
      toast.success("Produto criado com sucesso.");
      navigate({ to: "/app/products" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar produto.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-5">
      <div className="sticky top-[env(safe-area-inset-top)] z-20 flex items-center justify-between gap-3 bg-background pt-5 mb-6 md:static md:top-auto md:z-auto md:bg-transparent">
        <AppTitle>Novo produto</AppTitle>
        <Button type="button" variant="ghost" size="icon" nativeButton={false} render={<Link to="/app/products" />}>
          <XIcon />
        </Button>
      </div>

      <ProductForm
        mode="create"
        isSubmitting={isPending}
        categories={categories}
        organizationId={organization!.id}
        onSubmit={handleSubmit}
        onCancel={() => navigate({ to: "/app/products" })}
      />
    </main>
  );
}
