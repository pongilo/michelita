interface Menu {
  name: string;
  description: string;
  items: {
    name: string
    price: string
    quantity?: number;
  }[]
}

interface MenuSectionProps {
  id: string;
  title: string;
  menu: Menu[];
  description: string;
}

export function MenuSection({ id, title, menu, description }: MenuSectionProps) {
  return (
    <main className="py-16 space-y-16">
      <header className="mx-auto px-5 flex flex-col items-center justify-center">
        <h1 className="font-display text-michelita-yellow text-5xl md:text-6xl text-center max-w-xl md:max-w-2xl">
          {title} 
        </h1>
        <p className="font-body text-base md:text-xl text-center text-michelita-yellow mt-2">{description}</p>
        {/* {categories.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mt-5">
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
        )} */}
      </header>
      <div className="max-w-2xl mx-auto space-y-10" id={id}>
        {menu.map((m) => (
          <div key={m.name} className="space-y-5">
            <div className="px-5 space-y-1">
              <h2 className="font-display text-michelita-yellow text-2xl">{m.name || `${m.items.length} Sabores`}</h2>
              {m.description && (
                <p className="font-body text-michelita-yellow text-base">{m.description}</p>
              )}
            </div>
            <dl className="font-body text-michelita-yellow text-center text-lg">
              {m.items.map(item => (
                  <div
                    key={item.name}
                    className="flex items-center gap-4 py-3 px-5 rounded-full duration-200 hover:ring-2 hover:ring-michelita-yellow cursor-default"
                  >
                    <dt className="text-nowrap block">{item.name}
                    </dt>
                    <hr className="w-full border-t border-michelita-yellow/50 border-dashed" />
                    <dd className="text-nowrap align-middle">
                      <span className="text-sm">R$</span> {item.price}
                    </dd>
                  </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </main>
  );
}


export function MenuList({ children }: { children: React.ReactNode }) {
  return (
    <dl className="font-body text-michelita-yellow text-center text-lg">
      {children}
    </dl>
  )
}

export function MenuItem({ name, price }: { name: string, price: number }) {
  return (
    <div className="flex items-center gap-4 py-3 px-5 rounded-full duration-200 hover:ring-2 hover:ring-michelita-yellow cursor-default">
      <dt className="text-nowrap block">{name}</dt>
      <hr className="w-full border-t border-michelita-yellow/50 border-dashed" />
      <dd className="text-nowrap align-middle">
        <span className="text-sm">R$</span> {price}
      </dd>
    </div>
  )
}
