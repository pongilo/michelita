import { createFileRoute } from '@tanstack/react-router'
import { MenuSection } from '../components/MenuSection';

export const Route = createFileRoute('/bolos-de-pote')({
  component: RouteComponent,
})

const bolosDePote = [
  { name: "Brigadeiro", price: 23 },
  { name: "Cenoura com Ganache", price: 23 },
  { name: "Chocolimão", price: 23 },
  { name: "Mousse de Limão", price: 23 },
  { name: "Ninho com Nutella", price: 23 },
  { name: "Prestígio", price: 23 },
];

function RouteComponent() {
  return (
    <MenuSection 
      id="bolos-de-pote"
      title="Bolos de pote" 
      description="Camadas de sabor para adoçar seu dia a qualquer momento" 
      items={bolosDePote} 
    />
  )
}
