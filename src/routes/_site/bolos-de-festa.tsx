import { createFileRoute } from '@tanstack/react-router'
import { MenuSection } from '@/components/menu-section';
import { bolosDeFesta } from '@/lib/utils/content';

export const Route = createFileRoute('/_site/bolos-de-festa')({
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
