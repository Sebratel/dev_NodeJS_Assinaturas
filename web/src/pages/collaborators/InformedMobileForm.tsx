import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { Input } from '../../components/ui/Input'
import { ApiError } from '../../services/api-client'
import { collaboratorService } from '../../services/collaborator.service'
import { derivedQueryRoots, queryKeys } from '../../services/query-keys'

/** Celular que Direção e Gerência digitam (não existe no AD). */
export function InformedMobileForm({
  collaboratorId,
  current,
}: {
  collaboratorId: string
  current: string
}) {
  const queryClient = useQueryClient()
  const [mobile, setMobile] = useState(current)
  const save = useMutation({
    mutationFn: (value: string) =>
      collaboratorService.setInformedMobile(collaboratorId, value),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.collaborator(collaboratorId), data)
      derivedQueryRoots
        .filter((k) => k[0] !== 'collaborator')
        .forEach((queryKey) => queryClient.invalidateQueries({ queryKey }))
    },
  })
  const error = save.error instanceof ApiError ? save.error.message : undefined

  return (
    <form
      className="flex flex-wrap items-end gap-2 rounded-2xl border border-outline-variant bg-surface-container-lowest p-3"
      onSubmit={(event) => {
        event.preventDefault()
        save.mutate(mobile)
      }}
    >
      <Field
        label="Celular informado"
        htmlFor="informed-mobile"
        hint="Direção e Gerência digitam o próprio"
        error={error}
        className="min-w-48 flex-1"
      >
        <Input
          id="informed-mobile"
          inputMode="tel"
          placeholder="(51) 99999-0000"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
        />
      </Field>
      <Button type="submit" variant="primary" loading={save.isPending}>
        Salvar
      </Button>
    </form>
  )
}
