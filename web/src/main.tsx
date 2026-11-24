import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { AuthProvider } from './context/AuthContext'
import './index.css'
import { enterFromHub } from './services/hub-session'
import { applyInitialTheme } from './utils/theme'

applyInitialTheme()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
  },
})

// Aberto pelo Hub Apps (?sso_token=): troca o token pela sessão ANTES de montar a tela (ver hub-session.ts).
void enterFromHub().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </StrictMode>
  )
})
