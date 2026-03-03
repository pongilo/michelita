import { createFileRoute } from '@tanstack/react-router'
import { MenuSection } from '@/components/menu-section';
import { docinhosDeFesta } from '@/lib/utils/content';

export const Route = createFileRoute('/_site/docinhos')({
  component: RouteComponent,
})



function RouteComponent() {
  return (
    <MenuSection 
      id={docinhosDeFesta.id}
      title={docinhosDeFesta.title} 
      description={docinhosDeFesta.description} 
      menu={docinhosDeFesta.menu}  
    />
  )
}
