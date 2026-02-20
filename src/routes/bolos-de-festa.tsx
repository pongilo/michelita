import { createFileRoute } from '@tanstack/react-router'
import { MenuSection } from '../components/MenuSection';
import { bolosDeFesta } from '../utils/content';

export const Route = createFileRoute('/bolos-de-festa')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <MenuSection 
      id={bolosDeFesta.id}
      title={bolosDeFesta.title} 
      description={bolosDeFesta.description} 
      menu={bolosDeFesta.menu} 
    />
  )
}
