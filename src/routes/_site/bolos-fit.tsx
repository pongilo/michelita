import { createFileRoute } from '@tanstack/react-router'
import { MenuSection } from '@/components/menu-section';
import { bolosFit } from '@/lib/utils/content';

export const Route = createFileRoute('/_site/bolos-fit')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <MenuSection
      id={bolosFit.id}
      title={bolosFit.title} 
      description={bolosFit.description} 
      menu={bolosFit.menu} 
    />
  )
}
