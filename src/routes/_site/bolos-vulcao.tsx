import { createFileRoute } from '@tanstack/react-router'
import { MenuSection } from '@/components/menu-section';
import { bolosVulcao } from '@/lib/utils/content';

export const Route = createFileRoute('/_site/bolos-vulcao')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <MenuSection 
      id={bolosVulcao.id}
      title={bolosVulcao.title} 
      description={bolosVulcao.description} 
      menu={bolosVulcao.menu} 
    />
  )
}
