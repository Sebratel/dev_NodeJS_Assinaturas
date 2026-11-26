import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { queryKeys } from '../services/query-keys'
import { signatureTemplateService } from '../services/signature-template.service'

/** Campos que a regra pode pôr nas variáveis e as variáveis que os modelos usam. */
export function useTemplateVariables() {
  const query = useQuery({
    queryKey: queryKeys.templateVariables,
    queryFn: signatureTemplateService.variables,
  })
  const fieldLabels = useMemo(
    () => new Map((query.data?.fields ?? []).map((f) => [f.key, f.label])),
    [query.data]
  )
  return { ...query, fieldLabels }
}
