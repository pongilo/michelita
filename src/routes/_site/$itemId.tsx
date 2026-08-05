import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { MenuList } from "@/components/menu-list";
import { findItemById } from "@/lib/site-content";

export const Route = createFileRoute("/_site/$itemId")({
  beforeLoad: ({ params }) => {
    if (!findItemById(params.itemId)) throw redirect({ to: "/" });
  },
  component: ItemDetailPage,
});

function ItemDetailPage() {
  const { itemId } = Route.useParams();
  const item = findItemById(itemId)!;

  return (
    <>
      <div className="flex items-center px-3 gap-3 sticky top-0 bg-michelita-purple z-10 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <Link
          to="/"
          className="flex items-center gap-1.5 p-2 rounded-xl hover:bg-white/10 active:bg-white/20 duration-150 text-michelita-yellow font-body font-semibold text-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <h2 className="font-display text-xl text-michelita-yellow py-3">
          {item.name}
        </h2>
      </div>
      <MenuList>
        {item.items.map((subItem, index) => (
          <MenuList.Item key={subItem.name} index={index}>
            {subItem.img && <MenuList.Item.Thumbnail src={subItem.img} alt={subItem.name} />}
            <MenuList.Item.Info name={subItem.name} description={subItem.description} price={subItem.price} />
          </MenuList.Item>
        ))}
      </MenuList>
    </>
  );
}
