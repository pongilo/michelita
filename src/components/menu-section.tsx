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
    <main>
      <header className="mx-auto px-5 flex flex-col items-center justify-center pt-16">
        <h1 className="font-display text-white text-5xl md:text-6xl text-center max-w-xl md:max-w-2xl">
          {title} 
        </h1>
        <p className="font-body text-base md:text-xl text-center text-white/80 mt-2 mb-5">{description}</p>
      </header>
      <div className="max-w-2xl mx-auto space-y-10 mt-16" id={id}>
        {menu.map((m) => (
          <div key={m.name} className="space-y-5">
            <div className="px-5 space-y-1">
              <h2 className="font-display text-white text-2xl">{m.name || `${m.items.length} Sabores`}</h2>
              {m.description && (
                <p className="font-body text-white/80 text-base">{m.description}</p>
              )}
            </div>
            <div className="font-body text-white text-center text-lg">
              {m.items.map(item => (
                  <div
                    key={item.name}
                    className="flex items-center gap-4 py-3 px-5 rounded-full duration-200 hover:bg-white/20 cursor-default"
                  >
                    <p className="flex-none">{item.name}</p>
                    <hr className="flex-1 border-t border-white/50 border-dashed" />
                    <p className="flex-none align-middle">
                      <span className="text-sm">R$</span> {item.price}
                    </p>
                  </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}


export function MenuList({ children }: { children: React.ReactNode }) {
  return (
    <dl className="font-body text-white text-center text-lg">
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
