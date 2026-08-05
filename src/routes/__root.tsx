/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from '@tanstack/react-router'
import { useEffect } from 'react'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { NuqsAdapter } from 'nuqs/adapters/tanstack-router'
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import appCss from '@/styles.css?url'
import { Toaster } from 'sonner';
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthProvider } from "@/contexts/auth-context"

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
      { title: 'Michelita Confeitaria | Bolos Artesanais em Americana' },
      { name: 'description', content: 'Confira nossos sabores e encomende bolos caseiros, vulcão, de pote e personalizados para aniversários, festas e ocasiões especiais.' },
      // Open Graph
      { property: 'og:title', content: 'Michelita Confeitaria | Bolos Artesanais em Americana' },
      { property: 'og:description', content: 'Confira nossos sabores e encomende bolos caseiros, vulcão, de pote e personalizados para aniversários, festas e ocasiões especiais.' },
      { property: 'og:image', content: 'https://michelita.com.br/social.png' },
      { property: 'og:type', content: 'article' },
      // Twitter Card
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: 'Michelita Confeitaria | Bolos Artesanais em Americana' },
      { name: 'twitter:description', content: 'Confira nossos sabores e encomende bolos caseiros, vulcão, de pote e personalizados para aniversários, festas e ocasiões especiais.' },
      { name: 'twitter:image', content: 'https://michelita.com.br/social.png' },
      // PWA
      { name: 'theme-color', content: '#593A93' },
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      { name: 'apple-mobile-web-app-title', content: 'Michelita' },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss
      },
      { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
      { rel: 'icon', href: '/pwa-icon.svg', type: 'image/svg+xml' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon-180x180.png' },
      { rel: 'manifest', href: '/manifest.webmanifest' },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
})

function useRegisterSW() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
    }
  }, [])
}

function RootComponent() {
  useRegisterSW()

  return (
    <html lang="pt-BR" className="scroll-smooth scroll-pt-20" data-theme="light">
      <head>
        <HeadContent />
      </head>
      <body>
        <GoogleAnalytics />
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TooltipProvider>
              <NuqsAdapter>
                <Outlet />
              </NuqsAdapter>
            </TooltipProvider>
          </AuthProvider>
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
        <TanStackRouterDevtools />
        <Toaster />
        <Scripts />
      </body>
    </html>
  )
}

function GoogleAnalytics() {
  useEffect(() => {
    const gaScriptSrc = 'https://www.googletagmanager.com/gtag/js?id=G-X2XZPB717X'
    const gaInitScriptId = 'ga-gtag-init'

    if (!document.querySelector(`script[src="${gaScriptSrc}"]`)) {
      const gaScript = document.createElement('script')
      gaScript.async = true
      gaScript.src = gaScriptSrc
      document.head.appendChild(gaScript)
    }

    if (!document.getElementById(gaInitScriptId)) {
      const gaInitScript = document.createElement('script')
      gaInitScript.id = gaInitScriptId
      gaInitScript.text = [
        'window.dataLayer = window.dataLayer || [];',
        'function gtag(){dataLayer.push(arguments);}',
        "gtag('js', new Date());",
        "gtag('config', 'G-X2XZPB717X');",
      ].join('')
      document.head.appendChild(gaInitScript)
    }
  }, [])

  return null
}

function NotFoundComponent() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-2xl font-bold">Pagina nao encontrada</h1>
      <p className="text-base-content/70">A pagina que voce tentou acessar nao existe.</p>
      <a href="/" className="btn btn-primary">
        Voltar para o inicio
      </a>
    </main>
  )
}
