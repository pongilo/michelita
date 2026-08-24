import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MenuList } from "@/components/menu-list";
import { useGetProductCategories } from "@/hooks/tanstack/product-category/use-get-product-categories";
import { useGetProducts } from "@/hooks/tanstack/product/use-get-products";
import { currencyFormatter } from "@/lib/utils/formatter";
import { SITE_ORGANIZATION_ID } from "@/lib/site-organization";

export const Route = createFileRoute("/_site/")({
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const { data: categoriesData, isLoading: isLoadingCategories } = useGetProductCategories({
    organizationId: SITE_ORGANIZATION_ID,
  });
  const { data: productsData, isLoading: isLoadingProducts } = useGetProducts({
    organizationId: SITE_ORGANIZATION_ID,
  });

  const isLoading = isLoadingCategories || isLoadingProducts;
  const categories = categoriesData?.categories ?? [];
  const activeProducts = (productsData?.products ?? []).filter((product) => product.isActive);

  const sections = categories
    .map((category) => {
      const categoryProducts = activeProducts.filter((product) => product.categoryId === category.id);
      const limit = category.displayLimit ?? categoryProducts.length;
      return {
        id: category.slug,
        name: category.name,
        visibleProducts: categoryProducts.slice(0, limit),
        hasMore: categoryProducts.length > limit,
      };
    })
    .filter((section) => section.visibleProducts.length > 0 || section.hasMore);

  return (
    <>
      <nav className="flex gap-1.5 z-20 overflow-x-auto p-5 sticky top-0 max-w-7xl mx-auto bg-michelita-purple">
        {sections.map(({ name, id }) => (
          <a
            key={id}
            href={`#${id}`}
            className="font-body font-bold text-nowrap text-base py-1.5 px-3 text-white"
          >
            {name}
          </a>
        ))}
      </nav>

      {isLoading ? (
        <p className="font-body text-white text-center py-10">Carregando produtos...</p>
      ) : sections.length === 0 ? (
        <p className="font-body text-white text-center py-10">Nenhum produto disponível no momento.</p>
      ) : (
        <div className="space-y-5">
          {sections.map((section) => (
            <div key={section.id} id={section.id}>
              <h2 className="font-display text-xl text-michelita-yellow px-6 py-3 border-b border-michelita-yellow mb-3">
                {section.name}
              </h2>
              <MenuList>
                {section.visibleProducts.map((product, index) => (
                  <MenuList.Item key={product.id} index={index}>
                    <MenuList.Item.Info
                      name={product.name}
                      description={product.description ?? undefined}
                      price={currencyFormatter.format(product.price)}
                    />
                  </MenuList.Item>
                ))}
                {section.hasMore && (
                  <MenuList.Item
                    index={section.visibleProducts.length}
                    onClick={() => navigate({ to: "/$itemId", params: { itemId: section.id } })}
                  >
                    <MenuList.Item.Info name="Ver mais" price="" action />
                  </MenuList.Item>
                )}
              </MenuList>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
