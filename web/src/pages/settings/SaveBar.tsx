import { Check } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { ApiError } from '../../services/api-client'

interface SaveBarProps {
  onSave: () => void
  pending: boolean
  saved: boolean
  error: unknown
}

export function SaveBar({ onSave, pending, saved, error }: SaveBarProps) {
  const apiError = error instanceof ApiError ? error : null
  return (
    <div className="flex flex-wrap items-center justify-end gap-3 border-t border-outline-variant pt-3">
      {apiError && (
        <p className="mr-auto text-xs text-rose-700 dark:text-rose-300">
          {apiError.message}{' '}
          {apiError.details
            .map((d) => `${d.field ? `${d.field}: ` : ''}${d.message}`)
            .join(' · ')}
        </p>
      )}
      {saved && !pending && !apiError && (
        <span className="flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300">
          <Check className="size-3.5" /> Salvo. Prévias e cobertura
          recalculadas.
        </span>
      )}
      <Button variant="primary" onClick={onSave} loading={pending}>
        Salvar
      </Button>
    </div>
  )
}
