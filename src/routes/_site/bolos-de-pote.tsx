import { createFileRoute } from '@tanstack/react-router'
import { MenuSection } from '@/components/menu-section';
import { bolosDePote } from '@/lib/utils/content';

export const Route = createFileRoute('/_site/bolos-de-pote')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <MenuSection 
      id={bolosDePote.id}
      title={bolosDePote.title} 
      description={bolosDePote.description} 
      menu={bolosDePote.menu} 
    />
  )
}
