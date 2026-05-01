import { createFileRoute } from '@tanstack/react-router'
import { MenuSection } from '@/components/menu-section';
import { bolosBombom } from '@/lib/utils/content';

export const Route = createFileRoute('/_site/bolos-bombom')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <MenuSection 
      id={bolosBombom.id}
      title={bolosBombom.title} 
      description={bolosBombom.description} 
      menu={bolosBombom.menu} 
    />
  )
}
