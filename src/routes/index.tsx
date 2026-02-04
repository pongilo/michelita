import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MenuSection } from "../components/MenuSection";

const menuItems = [
  { id: "bolos-caseiros", label: "Bolos Caseiros" },
  { id: "bolos-de-pote", label: "Bolos de Pote" },
  { id: "bolos-de-festa", label: "Bolos de Festa" },
  { id: "docinhos", label: "Docinhos" },
];

const bolosCaseiros = [
  { name: "Banana com canela", price: 26 },
  { name: "Cenoura", price: 26 },
  { name: "Chocolate", price: 25 },
  { name: "Coco molhado", price: 30 },
  { name: "Fubá", price: 26 },
  { name: "Fubá com goiabada", price: 28 },
  { name: "Fubá cremoso", price: 30 },
  { name: "Iogurte", price: 26 },
  { name: "Laranja", price: 25 },
  { name: "Limão", price: 25 },
  { name: "Maça com canela", price: 30 },
  { name: "Milho", price: 30 },
];

const bolosDePote = [
  { name: "Brigadeiro", price: 18 },
  { name: "Cenoura com Ganache", price: 23 },
  { name: "Chocolimão", price: 18 },
  { name: "Mousse de Limão", price: 18 },
  { name: "Ninho com Nutella", price: 23 },
  { name: "Prestígio", price: 23 },
];

const bolosDeFesta = [
  { name: "Brigadeiro", price: 80, category: "Brigadeiro" },
  { name: "Brigadeiro c/ Morango", price: 82, category: "Brigadeiro" },
  { name: "Brigadeiro c/ Ninho", price: 86, category: "Brigadeiro" },
  { name: "Brigadeiro Duo", price: 83, category: "Brigadeiro" },

  { name: "Ninho c/ Nutella", price: 91, category: "Ninho" },
  { name: "Ninho c/ Morango", price: 92, category: "Ninho" },
  { name: "Ninho c/ Frutas Vermelhas", price: 85, category: "Ninho" },

  { name: "Doce de leite c/ Ameixa", price: 74, category: "Doce de Leite" },
  { name: "Doce de leite c/ Abacaxi", price: 72, category: "Doce de Leite" },
  { name: "Doce de leite c/ Morango", price: 76, category: "Doce de Leite" },
  { name: "Doce de leite c/ Nozes", price: 92, category: "Doce de Leite" },

  { name: "Alpino", price: 93, category: "Chocolate" },
  { name: "Laka Oreo", price: 73, category: "Chocolate" },
  { name: "Suflair", price: 70, category: "Chocolate" },
  { name: "Prestígio", price: 81, category: "Chocolate" },
  { name: "Chocolimão", price: 82, category: "Chocolate" },

  { name: "Abacaxi c/ Coco", price: 77, category: "Frutas" },
  { name: "Paçoca", price: 80, category: "Especiais" },
  { name: "Morango c/ Nutella", price: 95, category: "Especiais" },
  { name: "Mousse de Limão", price: 80, category: "Frutas" },
  { name: "Churros", price: 78, category: "Especiais" },
];

const docinhosDeFesta = [
  { name: "Brigadeiro", price: 95, quantity: 100 },
  { name: "Beijinho", price: 80, quantity: 100 },
  { name: "Brigadeiro Branco", price: 100, quantity: 100 },
  { name: "Bicho de pé", price: 90, quantity: 100 },
  { name: "Ninho c/ Nutella", price: 102, quantity: 100 },
];


export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="bg-michelita-purple min-h-screen">
      <div className="space-y-16 py-16">
        <div className="flex flex-col items-center justify-center gap-8 px-4">
          <img src="/logo.svg" alt="Michelita" className="h-16" />
          <h1 className="font-display text-michelita-yellow text-2xl md:text-6xl text-center">
            Um aconchego na alma, <br />
            em forma de doce
          </h1>

          <ul className="flex items-center gap-6">
            {menuItems.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="font-body text-michelita-yellow hover:underline transition-colors"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>

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

        <MenuSection
          id="bolos-caseiros"
          title="Bolos Caseiros" 
          description="Receitas de família, feitas com carinho e ingredientes selecionados" 
          items={bolosCaseiros} 
        />
        <MenuSection 
          id="bolos-de-pote"
          title="Bolos de pote" 
          description="Camadas de sabor para adoçar seu dia a qualquer momento" 
          items={bolosDePote} 
        />
        <MenuSection 
          id="bolos-de-festa"
          title="Bolos de festa" 
          description="Para celebrar os momentos mais especiais com quem você ama" 
          items={bolosDeFesta} 
        />
        <MenuSection 
          id="docinhos"
          title="Docinhos" 
          description="Pequenas delícias que derretem na boca" 
          items={docinhosDeFesta}  
        />
      </div>
    </div>
  );
}
