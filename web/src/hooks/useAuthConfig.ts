import { useQuery } from '@tanstack/react-query'
import {
  authConfigService,
  DEFAULT_HUB_URL,
} from '../services/auth-config.service'
import { queryKeys } from '../services/query-keys'

/** Se o acesso é só pelo Hub e o endereço dele. Sem resposta da API, assume login direto liberado. */
export function useAuthConfig() {
  const query = useQuery({
    queryKey: queryKeys.authConfig,
    queryFn: authConfigService.get,
    staleTime: 10 * 60_000,
    retry: false,
  })
  return {
    hubOnly: query.data?.hubOnly ?? false,
    hubEnabled: query.data?.hubEnabled ?? false,
    hubUrl: query.data?.hubUrl || DEFAULT_HUB_URL,
    loading: query.isLoading,
  }
}
