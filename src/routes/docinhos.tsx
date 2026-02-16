import { createFileRoute } from '@tanstack/react-router'
import { MenuSection } from '../components/MenuSection';

export const Route = createFileRoute('/docinhos')({
  component: RouteComponent,
})

const docinhosDeFesta = [
  { name: "Brigadeiro", price: 95, quantity: 100 },
  { name: "Beijinho", price: 80, quantity: 100 },
  { name: "Brigadeiro Branco", price: 100, quantity: 100 },
  { name: "Bicho de pé", price: 90, quantity: 100 },
  { name: "Ninho c/ Nutella", price: 102, quantity: 100 },
];

function RouteComponent() {
  return (
    <MenuSection 
      id="docinhos"
      title="Docinhos" 
      description="Pequenas delícias que derretem na boca" 
      items={docinhosDeFesta}  
    />
  )
}
