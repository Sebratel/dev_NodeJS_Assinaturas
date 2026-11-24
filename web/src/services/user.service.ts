import type { AppUser, UserRole } from '../types/api'
import { httpClient, unwrap } from './api-client'

/** Quem pode entrar no sistema e com qual perfil (só Master). Remover é exclusão lógica. */
export const userService = {
  list: () => unwrap<AppUser[]>(httpClient.get('/v1/users')),
  create: (input: { email: string; role: UserRole }) =>
    unwrap<AppUser>(httpClient.post('/v1/users', input)),
  updateRole: (id: string, role: UserRole) =>
    unwrap<AppUser>(httpClient.put(`/v1/users/${id}`, { role })),
  remove: (id: string) =>
    httpClient.delete(`/v1/users/${id}`).then(() => undefined),
}
