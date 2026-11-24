/** Chaves do TanStack Query: uma por entidade, sem duplicar. */
export const queryKeys = {
  collaborators: (filters: unknown) => ['collaborators', filters] as const,
  collaboratorsAll: ['collaborators'] as const,
  collaborator: (id: string) => ['collaborator', id] as const,
  facets: ['collaborator-facets'] as const,
  rules: ['signature-rules'] as const,
  coverage: ['coverage'] as const,
  settings: ['settings'] as const,
  directoryStatus: ['directory-status'] as const,
  googleIntegration: ['google-integration'] as const,
  templates: ['signature-templates'] as const,
  templateVariables: ['signature-template-variables'] as const,
  applications: (collaboratorId: string) =>
    ['signature-applications', collaboratorId] as const,
  phraseProfiles: ['phrase-profiles'] as const,
  automation: ['automation'] as const,
  me: ['me'] as const,
  authConfig: ['auth-config'] as const,
  users: ['users'] as const,
}

/** Tudo que depende de regra/configuração/diretório e precisa recalcular depois de uma gravação. */
export const derivedQueryRoots = [
  ['collaborators'],
  ['collaborator'],
  ['coverage'],
  ['collaborator-facets'],
  ['directory-status'],
  ['automation'],
]
