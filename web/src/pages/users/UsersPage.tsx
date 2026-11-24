import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { AppPageHeader } from '../../components/layout/AppPageHeader'
import { Badge, type BadgeTone } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Field } from '../../components/ui/Field'
import { Input, Select } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Segmented } from '../../components/ui/Segmented'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../components/ui/States'
import { config } from '../../config'
import { ROLE_LABELS, usePermissions } from '../../hooks/usePermissions'
import { ApiError } from '../../services/api-client'
import { meService } from '../../services/me.service'
import { queryKeys } from '../../services/query-keys'
import { userService } from '../../services/user.service'
import type { AppUser, UserRole } from '../../types/api'
import { formatRelative } from '../../utils/format'
import { isCompanyEmail, normalizeUserEmail } from './user-email'

const ROLES: UserRole[] = ['VIEWER', 'EDITOR', 'MASTER']
/** Visualizador não se inclui: toda conta do domínio já entra assim. */
const GRANTABLE_ROLES: UserRole[] = ['EDITOR', 'MASTER']
const ROLE_TONES: Record<UserRole, BadgeTone> = {
  MASTER: 'brand',
  EDITOR: 'info',
  VIEWER: 'neutral',
}
const ROLE_HELP: Record<UserRole, string> = {
  VIEWER: 'vê tudo, sem alterar',
  EDITOR: 'edita regras, modelos e frases',
  MASTER: 'também grava no Gmail e gerencia usuários',
}

function errorMessage(error: unknown): string | null {
  return error instanceof ApiError ? error.message : null
}

/**
 * Perfis acima de Visualizador. Toda conta do domínio já entra como Visualizador, sem cadastro; aqui ficam só
 * Editores e Masters. Só Master vê a tela; para os outros a rota volta para Colaboradores.
 */
export function UsersPage() {
  const { isMaster } = usePermissions()
  const queryClient = useQueryClient()
  const me = useQuery({
    queryKey: queryKeys.me,
    queryFn: meService.get,
    staleTime: 5 * 60_000,
    retry: false,
  })
  const users = useQuery({
    queryKey: queryKeys.users,
    queryFn: userService.list,
    enabled: isMaster,
  })
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.users })

  const domain = config.auth.hostedDomain
  const [emailInput, setEmailInput] = useState('')
  const [newRole, setNewRole] = useState<UserRole>('EDITOR')
  const [removing, setRemoving] = useState<AppUser | null>(null)

  const create = useMutation({
    mutationFn: userService.create,
    onSuccess: () => {
      setEmailInput('')
      setNewRole('EDITOR')
      refresh()
    },
  })
  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) =>
      userService.updateRole(id, role),
    onSuccess: refresh,
  })
  const remove = useMutation({
    mutationFn: (id: string) => userService.remove(id),
    onSuccess: () => {
      setRemoving(null)
      refresh()
    },
  })

  if (!isMaster) return <Navigate to="/colaboradores" replace />

  const email = normalizeUserEmail(emailInput, domain)
  const emailInvalid = email !== '' && !isCompanyEmail(email, domain)
  const myEmail = me.data?.email.toLowerCase()
  const list = users.data ?? []
  const tableError = errorMessage(changeRole.error)

  return (
    <div className="grid gap-4">
      <AppPageHeader />

      <Card
        title="Dar perfil de Editor ou Master"
        subtitle={`Toda conta @${domain} já entra como Visualizador. Aqui você dá mais acesso a quem precisa.`}
      >
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (email && !emailInvalid) create.mutate({ email, role: newRole })
          }}
        >
          <Field
            label="E-mail"
            htmlFor="new-user-email"
            hint={email && email !== emailInput.trim() ? email : undefined}
            error={
              emailInvalid
                ? `Use um e-mail @${domain}.`
                : (errorMessage(create.error) ?? undefined)
            }
            className="min-w-64 flex-1"
          >
            <Input
              id="new-user-email"
              type="text"
              autoComplete="off"
              placeholder={`nome.sobrenome@${domain}`}
              value={emailInput}
              aria-invalid={emailInvalid}
              onChange={(e) => setEmailInput(e.target.value)}
            />
          </Field>
          <Field label="Perfil" hint={ROLE_HELP[newRole]}>
            <Segmented<UserRole>
              ariaLabel="Perfil da pessoa"
              value={newRole}
              onChange={setNewRole}
              options={GRANTABLE_ROLES.map((role) => ({
                value: role,
                label: ROLE_LABELS[role],
              }))}
            />
          </Field>
          <Button
            type="submit"
            variant="primary"
            icon={<UserPlus className="size-4" />}
            loading={create.isPending}
            disabled={!email || emailInvalid}
          >
            Incluir
          </Button>
        </form>
      </Card>

      {users.isLoading && <LoadingState />}
      {users.isError && (
        <ErrorState error={users.error} onRetry={() => users.refetch()} />
      )}
      {users.data && list.length === 0 && (
        <EmptyState title="Ninguém cadastrado ainda.">
          Inclua acima quem pode usar o sistema.
        </EmptyState>
      )}

      {list.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest">
          {tableError && (
            <p className="border-b border-outline-variant bg-rose-50 px-3 py-2 text-xs text-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
              {tableError}
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="bg-surface-container-low text-left text-[10.5px] uppercase tracking-wide text-on-surface-variant">
                  <th className="px-3 py-2 font-semibold">Pessoa</th>
                  <th className="w-44 px-3 py-2 font-semibold">Perfil</th>
                  <th className="px-3 py-2 font-semibold">Último acesso</th>
                  <th className="px-3 py-2 font-semibold">Incluído por</th>
                  <th className="w-12 px-3 py-2" aria-label="Ações" />
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {list.map((user) => {
                  const isSelf = user.email.toLowerCase() === myEmail
                  const editable = !user.fixed && !isSelf && user.id !== null
                  return (
                    <tr key={user.id ?? user.email} className="align-middle">
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-medium">
                            {user.name || user.email}
                          </span>
                          {isSelf && <Badge>você</Badge>}
                          {user.fixed && (
                            <Badge
                              tone="warning"
                              className="normal-case tracking-normal"
                            >
                              via stack
                            </Badge>
                          )}
                        </div>
                        {user.name && (
                          <div className="text-xs text-on-surface-variant">
                            {user.email}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {editable ? (
                          <Select
                            aria-label={`Perfil de ${user.email}`}
                            value={user.role}
                            disabled={changeRole.isPending}
                            className="min-h-9 py-1.5"
                            onChange={(e) =>
                              changeRole.mutate({
                                id: user.id!,
                                role: e.target.value as UserRole,
                              })
                            }
                          >
                            {ROLES.map((role) => (
                              <option key={role} value={role}>
                                {ROLE_LABELS[role]}
                              </option>
                            ))}
                          </Select>
                        ) : (
                          <span
                            title={
                              user.fixed
                                ? 'Master da stack (AUTH_ADMIN_EMAILS): muda só no Portainer.'
                                : 'Você não pode mudar o próprio perfil.'
                            }
                          >
                            <Badge tone={ROLE_TONES[user.role]}>
                              {ROLE_LABELS[user.role]}
                            </Badge>
                          </span>
                        )}
                      </td>
                      <td
                        className="px-3 py-2 text-on-surface-variant"
                        title={
                          user.lastLoginAt
                            ? new Date(user.lastLoginAt).toLocaleString('pt-BR')
                            : undefined
                        }
                      >
                        {user.lastLoginAt
                          ? formatRelative(user.lastLoginAt)
                          : 'nunca entrou'}
                      </td>
                      <td className="px-3 py-2 text-xs text-on-surface-variant">
                        {user.fixed
                          ? 'stack do Portainer'
                          : (user.createdBy ?? '—')}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {editable && (
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Remover ${user.email}`}
                            onClick={() => setRemoving(user)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-on-surface-variant">
        <strong>Visualizador</strong> {ROLE_HELP.VIEWER}: toda conta @{domain},
        sem cadastro. <strong>Editor</strong> {ROLE_HELP.EDITOR}.{' '}
        <strong>Master</strong> {ROLE_HELP.MASTER}. Masters da stack
        (AUTH_ADMIN_EMAILS) não mudam por aqui e, com o acesso só pelo Hub, são
        os únicos que entram sem ele.
      </p>

      <Modal
        open={removing !== null}
        title="Tirar o perfil"
        onClose={() => setRemoving(null)}
        footer={
          <>
            <Button onClick={() => setRemoving(null)}>Cancelar</Button>
            <Button
              variant="danger"
              loading={remove.isPending}
              onClick={() => removing?.id && remove.mutate(removing.id)}
            >
              Remover
            </Button>
          </>
        }
      >
        <div className="grid gap-2 text-sm">
          <p>
            <strong>{removing?.email}</strong> volta a ser Visualizador, como
            toda conta @{domain}. O histórico de gravações que essa pessoa fez
            continua guardado. Dá para dar o perfil de novo depois.
          </p>
          {errorMessage(remove.error) && (
            <p className="text-xs text-rose-700 dark:text-rose-300">
              {errorMessage(remove.error)}
            </p>
          )}
        </div>
      </Modal>
    </div>
  )
}
