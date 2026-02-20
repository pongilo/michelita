import { Link } from "@tanstack/react-router";

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
    <main className="py-16">
      <header className="mx-auto px-5 flex flex-col items-center justify-center">
        <h1 className="font-display text-michelita-yellow text-5xl md:text-6xl text-center max-w-xl md:max-w-2xl">
          {title} 
        </h1>
        <p className="font-body text-base md:text-xl text-center text-michelita-yellow mt-2 mb-5">{description}</p>
      </header>
      <div className="sticky top-5 flex items-center justify-center gap-2">
        <Link
          to="/"
          className="cursor-pointer px-5 py-2.5 rounded-3xl transition-colors text-michelita-yellow bg-michelita-purple hover:bg-michelita-yellow/10 border-2 border-michelita-yellow inline-flex gap-5 items-center"
          resetScroll={true}
        >
          <p className="font-body text-base text-michelita-yellow font-bold">Menu</p>
        </Link>
        <a
          href="https://wa.me/5519981904593"
          className="cursor-pointer px-5 py-2.5 rounded-3xl transition-colors text-michelita-yellow bg-michelita-purple hover:bg-michelita-yellow/10 border-2 border-michelita-yellow inline-flex gap-2.5 items-center"
          target="_blank"
        >
          <img src="./icon-whatsapp.svg" alt="" className="flex-none size-5" />
          <p className="font-body text-base text-michelita-yellow font-bold">Fazer meu pedido</p>
        </a>
      </div>
      <div className="max-w-2xl mx-auto space-y-10 mt-16" id={id}>
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
