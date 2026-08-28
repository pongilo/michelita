import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { MenuList } from "@/components/menu-list";
import { useGetProductCategories } from "@/hooks/tanstack/product-category/use-get-product-categories";
import { useGetProducts } from "@/hooks/tanstack/product/use-get-products";
import { currencyFormatter } from "@/lib/utils/formatter";
import { SITE_ORGANIZATION_ID } from "@/lib/site-organization";

export const Route = createFileRoute("/_site/$itemId")({
  component: ItemDetailPage,
});

function ItemDetailPage() {
  const { itemId } = Route.useParams();
  const { data: categoriesData, isLoading: isLoadingCategories } = useGetProductCategories({
    organizationId: SITE_ORGANIZATION_ID,
  });
  const { data: productsData, isLoading: isLoadingProducts } = useGetProducts({
    organizationId: SITE_ORGANIZATION_ID,
  });

  const isLoading = isLoadingCategories || isLoadingProducts;
  const category = categoriesData?.categories.find((c) => c.slug === itemId);
  const products = (productsData?.products ?? []).filter(
    (product) => product.isActive && product.categoryId === category?.id,
  );

  if (!isLoading && !category) {
    return <Navigate to="/" />;
  }

  return (
    <>
      <div className="flex items-center px-3 pt-3 gap-3 sticky top-0 bg-michelita-purple z-10">
        <Link
          to="/"
          className="flex items-center gap-1.5 p-2 rounded-xl hover:bg-white/10 active:bg-white/20 duration-150 text-michelita-yellow font-body font-semibold text-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <h2 className="font-display text-xl text-michelita-yellow py-3">
          {category?.name}
        </h2>
      </div>
      {isLoading ? (
        <p className="font-body text-white text-center py-10">Carregando produtos...</p>
      ) : (
        <MenuList>
          {products.map((product, index) => (
            <MenuList.Item key={product.id} index={index}>
              {product.imageUrl && <MenuList.Item.Thumbnail src={product.imageUrl} alt={product.name} />}
              <MenuList.Item.Info
                name={product.name}
                description={product.description ?? undefined}
                price={currencyFormatter.format(product.price)}
              />
            </MenuList.Item>
          ))}
        </MenuList>
      )}
    </>
  );
}
