import { createFileRoute } from "@tanstack/react-router";
import { bolosCaseiros } from '@/lib/utils/content';
import { bolosDeFesta } from '@/lib/utils/content';
import { bolosDePote } from '@/lib/utils/content';
import { docinhosDeFesta } from '@/lib/utils/content';

export const Route = createFileRoute("/_site/")({
  component: HomePage,
});

function HomePage() {
  return ( 
    <>
      <header className="max-w-7xl p-5 mx-auto flex gap-5 items-center max-md:flex-col">
        <div className="flex-1 space-y-8">
          <h1 className="font-display text-white text-4xl md:text-[3.25rem] md:leading-13">
            Um aconchego na alma, em forma de doce
          </h1>
          <p className="font-body text-white/80 text-base max-w-140">Bolos artesanais feitos em família, com ingredientes selecionados, carinho em cada detalhe e aquele sabor que transforma qualquer momento em memória.</p>
          <div className="flex gap-4">
            <a href="https://wa.me/5519981904593" target="_blank" className="text-nowrap px-5 py-3 rounded-full font-body font-bold text-michelita-purple bg-michelita-yellow hover:bg-michelita-yellow/80 duration-150">
              Fazer meu pedido
            </a>
            <a href="/#sabores" className="text-nowrap px-5 py-3 rounded-full font-body font-bold text-michelita-yellow hover:bg-white/10 duration-150">
              Ver sabores
            </a>
          </div>
        </div>
        <div className="flex-1">
          <img src="./michelita-bolo-de-festa-suflair.png" alt="" className="w-full" />
        </div>
      </header>

      <div className="space-y-2 text-center p-5 pt-20" id="sabores">
        <h2 className="font-display text-white text-3xl">
          Conheça nossos sabores
        </h2>
        <p className="font-body text-white/80">Temos diversos opções de bolos de festa, potes, caseiros e docinhos.</p>
      </div>

      <div className="divide-y-4 divide-white border-y-4 border-white mt-5">
        {[
          { id: bolosCaseiros.id, label: bolosCaseiros.title, description: bolosCaseiros.description },
          { id: bolosDePote.id, label: bolosDePote.title, description: bolosDePote.description },
          { id: bolosDeFesta.id, label: bolosDeFesta.title, description: bolosDeFesta.description },
          { id: docinhosDeFesta.id, label: docinhosDeFesta.title, description: docinhosDeFesta.description },
        ].map((item) => (
          <a
            key={item.id}
            href={item.id}
            className="block hover:bg-white/20 duration-150"
          >
            <div className="max-w-7xl px-5 py-10 mx-auto space-y-1 relative">
              <h3 className="font-body font-bold text-xl md:text-2xl text-white">{item.label}</h3>
              <p className="font-body text-base text-white/80">{item.description}</p>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute right-5 top-11 md:top-1/2 md:-translate-y-1/2 max-md:size-6">
                <path d="M27.7075 16.7076L18.7075 25.7076C18.5199 25.8952 18.2654 26.0006 18 26.0006C17.7346 26.0006 17.4801 25.8952 17.2925 25.7076C17.1049 25.5199 16.9994 25.2654 16.9994 25.0001C16.9994 24.7347 17.1049 24.4802 17.2925 24.2926L24.5863 17.0001H5C4.73478 17.0001 4.48043 16.8947 4.29289 16.7072C4.10536 16.5196 4 16.2653 4 16.0001C4 15.7349 4.10536 15.4805 4.29289 15.293C4.48043 15.1054 4.73478 15.0001 5 15.0001H24.5863L17.2925 7.70757C17.1049 7.51993 16.9994 7.26543 16.9994 7.00007C16.9994 6.7347 17.1049 6.48021 17.2925 6.29257C17.4801 6.10493 17.7346 5.99951 18 5.99951C18.2654 5.99951 18.5199 6.10493 18.7075 6.29257L27.7075 15.2926C27.8005 15.3854 27.8742 15.4957 27.9246 15.6171C27.9749 15.7385 28.0008 15.8687 28.0008 16.0001C28.0008 16.1315 27.9749 16.2616 27.9246 16.383C27.8742 16.5044 27.8005 16.6147 27.7075 16.7076Z" fill="white"/>
              </svg>
            </div>
          </a>
        ))}
      </div>
    </>
  );
}
