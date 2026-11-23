import { useMutation, useQueryClient } from '@tanstack/react-query'
import { derivedQueryRoots, queryKeys } from '../../services/query-keys'
import { settingService } from '../../services/setting.service'
import type { SettingKey, Settings } from '../../types/api'

/** Grava uma chave de configuração e recalcula tudo que depende dela (lista, cobertura, prévias). */
export function useSaveSetting<K extends SettingKey>(key: K) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (value: Settings[K]) => settingService.update(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings })
      derivedQueryRoots.forEach((queryKey) =>
        queryClient.invalidateQueries({ queryKey })
      )
    },
  })
}
