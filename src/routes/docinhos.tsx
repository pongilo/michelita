import { createFileRoute } from '@tanstack/react-router'
import { MenuSection } from '../components/MenuSection';
import { docinhosDeFesta } from '../utils/content';

export const Route = createFileRoute('/docinhos')({
  component: RouteComponent,
})



function RouteComponent() {
  return (
    <MenuSection 
      id={docinhosDeFesta.id}
      title={docinhosDeFesta.title} 
      description={docinhosDeFesta.description} 
      items={docinhosDeFesta.menu}  
    />
  )
}
