import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../services/query-keys'
import { googleIntegrationService } from '../services/report.service'
import { settingService } from '../services/setting.service'
import type { ApplyScope } from '../types/api'

/** Referência fixa: um objeto novo a cada render dispararia efeitos que dependem dele. */
const LOCKED: ApplyScope = { mode: 'LIST', emails: [] }

/** Quem pode receber gravação no Gmail (lista de teste ou todos) e como mudar. */
export function useApplyScope() {
  const queryClient = useQueryClient()
  const google = useQuery({
    queryKey: queryKeys.googleIntegration,
    queryFn: googleIntegrationService.status,
  })
  const scope: ApplyScope = google.data?.applyScope ?? LOCKED

  const save = useMutation({
    mutationFn: (next: ApplyScope) =>
      settingService.update('apply-scope', next),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.googleIntegration })
      queryClient.invalidateQueries({ queryKey: queryKeys.settings })
    },
  })

  const inList = (email: string) => scope.emails.includes(email.toLowerCase())
  const toggleEmail = (email: string) =>
    save.mutate({
      ...scope,
      emails: inList(email)
        ? scope.emails.filter((e) => e !== email.toLowerCase())
        : [...scope.emails, email.toLowerCase()],
    })

  return { scope, loading: google.isLoading, save, inList, toggleEmail }
}
