import type { UserRole } from '../types/api'
import { httpClient, unwrap } from './api-client'

/** Quem a API reconheceu no token, com o perfil. Com login desligado, a API devolve o usuário local como MASTER. */
export interface CurrentUser {
  email: string
  name: string | null
  authEnabled: boolean
  role: UserRole
}

export const meService = {
  get: () => unwrap<CurrentUser>(httpClient.get('/v1/me')),
}
