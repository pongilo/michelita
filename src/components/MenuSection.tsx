import { useState } from "react";

interface MenuItem {
  name: string;
  price: number;
  quantity?: number;
  category?: string;
}

interface MenuSectionProps {
  id: string;
  title: string;
  items: MenuItem[];
  description: string;
}

export function MenuSection({ id, title, items, description }: MenuSectionProps) {
  const categories = [...new Set(items.map((item) => item.category).filter(Boolean))];
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredItems = selectedCategory
    ? items.filter((item) => item.category === selectedCategory)
    : items;

  return (
    <div className="max-w-2xl w-full mx-auto" id={id}>
      <header className="px-5">
        <h3 className="font-display text-michelita-yellow text-xl md:text-3xl text-center">
          {title} <span className="font-body text-lg">({items.length} sabores)</span>
        </h3>
        <p className="font-body text-base md:text-xl text-center text-michelita-yellow mt-2">{description}</p>
      </header>

      {categories.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mt-4 px-5">
          <button
            onClick={() => setSelectedCategory(null)}
            data-selected={selectedCategory === null}
            className="font-body font-bold cursor-pointer text-sm px-4 py-2 rounded-full border border-michelita-yellow transition-colors text-michelita-yellow hover:bg-michelita-yellow/10 data-[selected=true]:bg-michelita-yellow data-[selected=true]:text-michelita-purple"
          >
            Todos
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category!)}
              data-selected={selectedCategory === category}
              className="font-body font-bold cursor-pointer text-sm px-4 py-2 rounded-full border border-michelita-yellow transition-colors text-michelita-yellow hover:bg-michelita-yellow/10 data-[selected=true]:bg-michelita-yellow data-[selected=true]:text-michelita-purple"
            >
              {category}
            </button>
          ))}
        </div>
      )}

      <dl className="font-body text-michelita-yellow text-center mt-6 text-lg">
        {filteredItems.map((item) => (
          <div
            key={item.name}
            className="flex items-center gap-4 py-3 px-5 rounded-full duration-200 hover:ring-2 hover:ring-michelita-yellow cursor-default"
          >
            <dt className="text-nowrap block">{item.name}
              {item.quantity && (
                <span className="text-sm"> ({item.quantity} un.)</span>
              )}
            </dt>
            <hr className="w-full border-t border-michelita-yellow/50 border-dashed" />
            <dd className="text-nowrap align-middle">
              <span className="text-sm">R$</span> {item.price}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
