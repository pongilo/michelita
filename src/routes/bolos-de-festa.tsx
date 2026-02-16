import { createFileRoute } from '@tanstack/react-router'
import { MenuSection } from '../components/MenuSection';

export const Route = createFileRoute('/bolos-de-festa')({
  component: RouteComponent,
})

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

function RouteComponent() {
  return (
    <MenuSection 
      id="bolos-de-festa"
      title="Bolos de festa" 
      description="Para celebrar os momentos mais especiais com quem você ama" 
      items={bolosDeFesta} 
    />
  )
}
