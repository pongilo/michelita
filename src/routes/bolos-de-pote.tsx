import { createFileRoute } from '@tanstack/react-router'
import { MenuSection } from '../components/MenuSection';
import { bolosDePote } from '../utils/content';

export const Route = createFileRoute('/bolos-de-pote')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <MenuSection 
      id={bolosDePote.id}
      title={bolosDePote.title} 
      description={bolosDePote.description} 
      items={bolosDePote.menu} 
    />
  )
}
