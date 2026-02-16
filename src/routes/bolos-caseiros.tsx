import { createFileRoute } from '@tanstack/react-router'
import { MenuSection } from '../components/MenuSection';
import { bolosCaseiros } from '../utils/content';

export const Route = createFileRoute('/bolos-caseiros')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <MenuSection
      id={bolosCaseiros.id}
      title={bolosCaseiros.title} 
      description={bolosCaseiros.description} 
      items={bolosCaseiros.menu} 
    />
  )
}
