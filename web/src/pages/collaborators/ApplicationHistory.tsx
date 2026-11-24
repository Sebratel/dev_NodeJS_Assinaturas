import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Undo2 } from 'lucide-react'
import { useState } from 'react'
import { Badge, type BadgeTone } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { usePermissions } from '../../hooks/usePermissions'
import { ApiError } from '../../services/api-client'
import { queryKeys } from '../../services/query-keys'
import { signatureApplicationService } from '../../services/signature-application.service'
import type { ApplicationStatus } from '../../types/api'
import { formatRelative } from '../../utils/format'
import { APPLICATION_STATUS_LABELS, TRIGGER_LABELS } from '../../utils/labels'

const TONES: Record<ApplicationStatus, BadgeTone> = {
  APPLIED: 'success',
  UNCHANGED: 'neutral',
  SKIPPED: 'warning',
  FAILED: 'danger',
  RESTORED: 'info',
}

/** O que já foi gravado no Gmail desta pessoa; a gravação mais recente pode ser desfeita. */
export function ApplicationHistory({
  collaboratorId,
}: {
  collaboratorId: string
}) {
  const queryClient = useQueryClient()
  const { canApply } = usePermissions()
  const history = useQuery({
    queryKey: queryKeys.applications(collaboratorId),
    queryFn: () => signatureApplicationService.history(collaboratorId),
  })
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const restore = useMutation({
    mutationFn: (id: string) => signatureApplicationService.restore(id),
    onSuccess: () => {
      setConfirmId(null)
      queryClient.invalidateQueries({
        queryKey: queryKeys.applications(collaboratorId),
      })
    },
  })

  const items = history.data ?? []
  if (!items.length) return null
  // Só a última gravação feita (e ainda não desfeita) pode voltar: desfazer uma antiga apagaria as seguintes.
  const lastWrite = items.find(
    (i) => i.status === 'APPLIED' || i.status === 'RESTORED'
  )
  // Desfazer grava no Gmail: só Master.
  const undoableId =
    canApply && lastWrite?.status === 'APPLIED' ? lastWrite.id : null

  return (
    <section className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest">
      <h3 className="border-b border-outline-variant px-3 py-2 text-sm font-semibold">
        Gravações no Gmail
      </h3>
      <ul className="divide-y divide-outline-variant text-sm">
        {items.slice(0, 6).map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center gap-2 px-3 py-2"
          >
            <Badge tone={TONES[item.status]}>
              {APPLICATION_STATUS_LABELS[item.status]}
            </Badge>
            {item.trigger && item.trigger !== 'MANUAL' && (
              <Badge tone="info">{TRIGGER_LABELS[item.trigger]}</Badge>
            )}
            <span
              className="text-xs text-on-surface-variant"
              title={new Date(item.createdAt).toLocaleString('pt-BR')}
            >
              {formatRelative(item.createdAt)}
            </span>
            {item.reason && (
              <span className="min-w-0 flex-1 truncate text-xs text-on-surface-variant">
                {item.reason}
              </span>
            )}
            {item.id === undoableId && (
              <span className="ml-auto">
                {confirmId === item.id ? (
                  <Button
                    size="sm"
                    variant="danger"
                    loading={restore.isPending}
                    onClick={() => restore.mutate(item.id)}
                  >
                    Confirmar: voltar a anterior
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Undo2 className="size-3.5" />}
                    onClick={() => setConfirmId(item.id)}
                  >
                    Desfazer
                  </Button>
                )}
              </span>
            )}
          </li>
        ))}
      </ul>
      {restore.error instanceof ApiError && (
        <p className="px-3 pb-2 text-xs text-rose-700 dark:text-rose-300">
          {restore.error.message}
        </p>
      )}
    </section>
  )
}
