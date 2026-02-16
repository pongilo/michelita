import { createFileRoute } from "@tanstack/react-router";
      import { Link } from "@tanstack/react-router";

const menuItems = [
  { id: "/bolos-caseiros", label: "Bolos Caseiros", description: 'Receitas de família, feitas com carinho e ingredientes selecionados'  },
  { id: "/bolos-de-pote", label: "Bolos de Pote", description: 'Camadas de sabor para adoçar seu dia a qualquer momento' },
  { id: "/bolos-de-festa", label: "Bolos de Festa", description: 'Para celebrar os momentos mais especiais com quem você ama' },
  { id: "/docinhos", label: "Docinhos", description: 'Pequenas delícias que derretem na boca' },
];

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return ( 
    <div className="space-y-10 py-10">
      <div className="flex flex-col items-center justify-center gap-8 px-5">
        <h1 className="font-display text-michelita-yellow text-5xl md:text-6xl text-center max-w-xl md:max-w-2xl">
          Um aconchego na alma, em forma de doce
        </h1>

        <a
          href="https://www.instagram.com/michelitaconfeitaria/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-body text-lg text-michelita-yellow text-center hover:underline"
        >
          <span className="block text-base">Instagram</span>
          @michelitaconfeitaria
        </a>
        <a
          href="https://wa.me/5519981904593"
          target="_blank"
          rel="noopener noreferrer"
          className="font-body text-lg text-michelita-yellow text-center hover:underline"
        >
          <span className="block text-base">WhatsApp</span>
          (19) 98190-4593
        </a>
      </div>
      <nav className="max-w-2xl mx-auto p-5 space-y-5">
        <h2 className="font-display text-michelita-yellow text-2xl">
          Conheça nossos sabores
        </h2>
        <ul className="space-y-4">
          {menuItems.map((item) => (
            <li key={item.id}>
              <Link
                to={item.id}
                className="cursor-pointer p-5 rounded-3xl transition-colors text-michelita-yellow hover:bg-michelita-yellow/10 block border-2 border-michelita-yellow"
              >
                <h3 className="font-body font-bold text-lg">{item.label}</h3>
                <p className="font-body text-base text-michelita-yellow">{item.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
