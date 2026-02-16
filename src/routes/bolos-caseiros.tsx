import { createFileRoute } from '@tanstack/react-router'
import { MenuSection } from '../components/MenuSection';

export const Route = createFileRoute('/bolos-caseiros')({
  component: RouteComponent,
})

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


function RouteComponent() {
  return (
    <MenuSection
      id="bolos-caseiros"
      title="Bolos Caseiros" 
      description="Receitas de família, feitas com carinho e ingredientes selecionados" 
      items={bolosCaseiros} 
    />
  )
}
