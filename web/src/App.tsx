import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { CollaboratorsPage } from './pages/collaborators/CollaboratorsPage';
import { CoveragePage } from './pages/coverage/CoveragePage';
import { RulesPage } from './pages/rules/RulesPage';
import { PhrasesPage } from './pages/phrases/PhrasesPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { TemplatesPage } from './pages/templates/TemplatesPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/colaboradores" replace />} />
          <Route path="/colaboradores" element={<CollaboratorsPage />} />
          <Route path="/regras" element={<RulesPage />} />
          <Route path="/modelos" element={<TemplatesPage />} />
          <Route path="/frases" element={<PhrasesPage />} />
          <Route path="/cobertura" element={<CoveragePage />} />
          <Route path="/configuracoes" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/colaboradores" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
