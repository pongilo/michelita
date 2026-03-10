/// <reference types="vite/client" />
import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { NuqsAdapter } from 'nuqs/adapters/tanstack-router'
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import appCss from '@/styles.css?url'

const queryClient = new QueryClient();
    
export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Michelita | Confeitaria artesanal feito em família em Americana',
      },
    ],
    links: [
      { 
        rel: 'stylesheet', 
        href: appCss 
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        href: '/favicon.png',
      }
    ]
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <html lang="pt-BR" className="scroll-smooth scroll-pt-20" data-theme="bumblebee">
      <head>
        <HeadContent />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <NuqsAdapter>
            <Outlet />
          </NuqsAdapter>
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
        <TanStackRouterDevtools />
        <Scripts />
      </body>
    </html>
  )
}