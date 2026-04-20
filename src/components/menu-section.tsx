interface Menu {
  name: string;
  description: string;
  items: {
    name: string
    description?: string;
    price: string
    img?: string
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
      <div className="max-w-7xl mx-auto space-y-16 mt-16" id={id}>
        {menu.map((m) => (
          <div key={m.name} className="space-y-5">
            <div className="px-5 space-y-1">
              <h2 className="font-display text-white text-2xl">{m.name || `${m.items.length} Sabores`}</h2>
              {m.description && (
                <p className="font-body text-white/80 text-base">{m.description}</p>
              )}
            </div>
            <div className="font-body text-white text-base grid grid-cols-1 sm:px-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:gap-5 gap-1">
              {[...m.items].sort((a, b) => {
                  const parse = (p: string) => parseFloat(p.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
                  return parse(a.price) - parse(b.price);
                }).map(item => (
                <div
                  key={item.name}
                  className="p-2 cursor-default flex sm:flex-col-reverse justify-between items-center duration-200 hover:bg-white/20 rounded-3xl"
                >
                  <div className="flex-1 p-3 w-full">
                    <p className="font-bold text-base">{item.name}</p>
                    {item.description && (
                      <p className="text-white/80 text-sm mt-0.5">{item.description}</p>
                    )}
                    <p className="font-bold text-sm mt-1">{item.price}</p>
                  </div>
                  <div className="w-30 sm:w-full aspect-square rounded-2xl overflow-hidden bg-white/10">
                    {item.img && (
                      <img src={item.img} alt={item.name} className="object-cover size-full" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}