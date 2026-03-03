import { createFileRoute } from '@tanstack/react-router'
import { MenuSection } from '@/components/menu-section';
import { bolosCaseiros } from '@/lib/utils/content';

export const Route = createFileRoute('/_site/bolos-caseiros')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <MenuSection
      id={bolosCaseiros.id}
      title={bolosCaseiros.title} 
      description={bolosCaseiros.description} 
      menu={bolosCaseiros.menu} 
    />
  )
}
