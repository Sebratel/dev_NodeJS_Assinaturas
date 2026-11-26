import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { signatureRuleService } from '../../services/signature-rule.service'
import type { SignatureRuleInput } from '../../types/api'

/**
 * Simula a regra do rascunho enquanto se edita (nada é gravado): quem ela pega, como mudam os status e a
 * assinatura de uma pessoa. `previewId`: pessoa da prévia; sem escolha, a API usa a primeira que a regra pega.
 */
export function useRuleSimulation(
  input: SignatureRuleInput,
  ruleId: string | undefined,
  ready: boolean
) {
  const [previewId, setPreviewId] = useState<string | null>(null)
  // "Pronto" e o rascunho atrasam juntos: senão a simulação sai com um rascunho velho e a API recusa.
  const debounced = useDebouncedValue(
    JSON.stringify({
      ready,
      input: { ...input, name: input.name || 'Rascunho', id: ruleId },
    }),
    400
  )
  const { ready: debouncedReady, input: payload } = JSON.parse(debounced) as {
    ready: boolean
    input: SignatureRuleInput & { id?: string }
  }
  const simulation = useQuery({
    queryKey: ['simulation', debounced, previewId],
    queryFn: () =>
      signatureRuleService.simulate({
        ...payload,
        previewCollaboratorId: previewId ?? undefined,
      }),
    enabled: ready && debouncedReady,
    staleTime: 10_000,
    // Mantém o resultado anterior enquanto recalcula: a prévia não pisca a cada tecla.
    placeholderData: (previous) => previous,
  })
  return { simulation, ready, setPreviewId }
}

export type RuleSimulationState = ReturnType<typeof useRuleSimulation>
