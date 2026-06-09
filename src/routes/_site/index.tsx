import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MenuList } from "@/components/menu-list";
import { content } from "@/lib/site-content";

export const Route = createFileRoute("/_site/")({
  component: HomePage,
});

const menu = content.map((section) => ({
  id: section.id,
  name: section.title,
}));

function HomePage() {
  const navigate = useNavigate();

  return (
    <>
      <nav className="flex gap-1.5 z-20 overflow-x-auto p-5 sticky top-0 max-w-7xl mx-auto bg-michelita-purple">
        {menu.map(({ name, id }) => (
          <a
            key={id}
            href={`#${id}`}
            className="font-body font-bold text-nowrap text-base py-1.5 px-3 text-white"
          >
            {name}
          </a>
        ))}
      </nav>
      <div className="space-y-5">
        {content.map((section) => (
          <div key={section.id} id={section.id}>
            <h2 className="font-display text-xl text-michelita-yellow px-6 py-3 border-b border-michelita-yellow mb-3">
              {section.title}
            </h2>
            <MenuList>
              {section.items.map((item, index) => {
                const hasSubItems = "items" in item && item.items.length > 0;
                return (
                  <MenuList.Item
                    key={item.id}
                    index={index}
                    onClick={hasSubItems ? () => navigate({ to: "/$itemId", params: { itemId: item.id } }) : undefined}
                  >
                    {item.img && <MenuList.Item.Thumbnail src={item.img} alt={item.name} />}
                    <MenuList.Item.Info name={item.name} description={item.description} price={item.price} action={hasSubItems} />
                  </MenuList.Item>
                );
              })}
            </MenuList>
          </div>
        ))}
      </div>
    </>
  );
}
