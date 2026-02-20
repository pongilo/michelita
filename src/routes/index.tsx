import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { bolosCaseiros } from "../utils/content";
import { bolosDeFesta } from "../utils/content";
import { bolosDePote } from "../utils/content";
import { docinhosDeFesta } from "../utils/content";

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
      </div>
      <nav className="max-w-2xl mx-auto p-5 space-y-5">
        <h2 className="font-display text-michelita-yellow text-2xl">
          
        </h2>
        <ul className="space-y-4">
          {[
            { href: 'https://wa.me/5519981904593', icon: './icon-whatsapp.svg', label: 'Faça seu pedido pelo WhatsApp', description: 'Entre em contato (19) 98190-4593' },
            { href: 'https://www.instagram.com/michelitaconfeitaria/', icon: './icon-instagram.svg', label: 'Siga-nos no Instagram', description: 'Nos acompanhe no perfil @michelitaconfeitaria' },
          ].map((item, index) => (
            <li key={index}>
              <a
                href={item.href}
                className="cursor-pointer p-5 rounded-3xl transition-colors text-michelita-yellow hover:bg-michelita-yellow/10 border-2 border-michelita-yellow flex gap-5 items-center"
                target="_blank"
              >
                <img src={item.icon} alt="" className="flex-none" />
                <div className="flex-1">
                  <h3 className="font-body font-bold text-lg">{item.label}</h3>
                  <p className="font-body text-base text-michelita-yellow">{item.description}</p>
                </div>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <nav className="max-w-2xl mx-auto p-5 space-y-5">
        <h2 className="font-display text-michelita-yellow text-2xl">
          Conheça nossos sabores
        </h2>
        <ul className="space-y-4">
          {[
            { id: bolosCaseiros.id, label: bolosCaseiros.title, description: bolosCaseiros.description },
            { id: bolosDePote.id, label: bolosDePote.title, description: bolosDePote.description },
            { id: bolosDeFesta.id, label: bolosDeFesta.title, description: bolosDeFesta.description },
            { id: docinhosDeFesta.id, label: docinhosDeFesta.title, description: docinhosDeFesta.description },
          ].map((item) => (
            <li key={item.id}>
              <Link
                to={item.id}
                className="cursor-pointer p-5 rounded-3xl transition-colors text-michelita-yellow hover:bg-michelita-yellow/10 block border-2 border-michelita-yellow"
                resetScroll={true}
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
