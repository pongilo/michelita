import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { NotFoundComponent } from './routes/__root'

export function getRouter() {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    defaultNotFoundComponent: NotFoundComponent,
  })

  return router
}