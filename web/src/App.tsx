import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthGate } from './components/layout/AuthGate'
import { RootLayout } from './components/layout/RootLayout'
import { LoadingState } from './components/ui/States'

// Cada tela num pedaço próprio: o editor de código (Modelos) e as demais só baixam quando abertas.
const CollaboratorsPage = lazy(() =>
  import('./pages/collaborators/CollaboratorsPage').then((m) => ({
    default: m.CollaboratorsPage,
  }))
)
const RulesPage = lazy(() =>
  import('./pages/rules/RulesPage').then((m) => ({ default: m.RulesPage }))
)
const TemplatesPage = lazy(() =>
  import('./pages/templates/TemplatesPage').then((m) => ({
    default: m.TemplatesPage,
  }))
)
const PhrasesPage = lazy(() =>
  import('./pages/phrases/PhrasesPage').then((m) => ({
    default: m.PhrasesPage,
  }))
)
const MonitoringPage = lazy(() =>
  import('./pages/monitoring/MonitoringPage').then((m) => ({
    default: m.MonitoringPage,
  }))
)
const SettingsPage = lazy(() =>
  import('./pages/settings/SettingsPage').then((m) => ({
    default: m.SettingsPage,
  }))
)
const UsersPage = lazy(() =>
  import('./pages/users/UsersPage').then((m) => ({ default: m.UsersPage }))
)

function Page({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingState />}>{children}</Suspense>
}

export function App() {
  return (
    <BrowserRouter>
      <AuthGate>
        <Routes>
          <Route element={<RootLayout />}>
            <Route index element={<Navigate to="/colaboradores" replace />} />
            <Route
              path="/colaboradores"
              element={
                <Page>
                  <CollaboratorsPage />
                </Page>
              }
            />
            <Route
              path="/regras"
              element={
                <Page>
                  <RulesPage />
                </Page>
              }
            />
            <Route
              path="/modelos"
              element={
                <Page>
                  <TemplatesPage />
                </Page>
              }
            />
            <Route
              path="/frases"
              element={
                <Page>
                  <PhrasesPage />
                </Page>
              }
            />
            <Route
              path="/monitoramento"
              element={
                <Page>
                  <MonitoringPage />
                </Page>
              }
            />
            <Route
              path="/cobertura"
              element={<Navigate to="/monitoramento?aba=cobertura" replace />}
            />
            <Route
              path="/configuracoes"
              element={
                <Page>
                  <SettingsPage />
                </Page>
              }
            />
            {/* Só Master: a própria tela redireciona os outros perfis. */}
            <Route
              path="/usuarios"
              element={
                <Page>
                  <UsersPage />
                </Page>
              }
            />
            <Route
              path="*"
              element={<Navigate to="/colaboradores" replace />}
            />
          </Route>
        </Routes>
      </AuthGate>
    </BrowserRouter>
  )
}
