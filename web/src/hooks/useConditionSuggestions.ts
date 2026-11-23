import { useQuery } from '@tanstack/react-query'
import { useCallback } from 'react'
import { collaboratorService } from '../services/collaborator.service'
import { queryKeys } from '../services/query-keys'
import type { RuleField } from '../types/api'

/** Valores que existem no AD para sugerir nas condições (área, time, empresa…). */
export function useConditionSuggestions() {
  const facets = useQuery({
    queryKey: queryKeys.facets,
    queryFn: collaboratorService.facets,
  })
  return useCallback(
    (field: RuleField): string[] => {
      const data = facets.data
      if (field === 'area') return data?.areas ?? []
      if (field === 'team')
        return [...new Set((data?.teams ?? []).map((t) => t.team))]
      if (field === 'segment') return ['B2B']
      // Valores de Company que existem no AD + o do B2B, mesmo que ninguém tenha ainda.
      if (field === 'company')
        return [
          ...new Set([
            ...(data?.companies ?? []).map((c) => c.company),
            'Sebratel Empresas',
          ]),
        ]
      return []
    },
    [facets.data]
  )
}
