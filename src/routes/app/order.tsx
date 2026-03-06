import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/order')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/order"!</div>
}
