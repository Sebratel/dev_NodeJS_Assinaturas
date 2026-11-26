import { useQuery } from '@tanstack/react-query'
import { useCallback } from 'react'
import { queryKeys } from '../services/query-keys'
import { signatureTemplateService } from '../services/signature-template.service'

/** Nome do modelo pelo id decidido nas regras; null (ou modelo excluído) = o padrão. */
export function useTemplateName() {
  const templates = useQuery({
    queryKey: queryKeys.templates,
    queryFn: signatureTemplateService.list,
  })
  return useCallback(
    (templateId: string | null): string => {
      const list = templates.data ?? []
      const chosen = templateId ? list.find((t) => t.id === templateId) : null
      return (chosen ?? list.find((t) => t.isDefault))?.name ?? '—'
    },
    [templates.data]
  )
}
