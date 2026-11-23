import { httpClient, unwrap } from './api-client'

/** Quem a API reconheceu no token. Com login desligado, a API devolve o usuário local. */
export interface CurrentUser {
  email: string
  name: string | null
  authEnabled: boolean
  isAdmin?: boolean
}

export const meService = {
  get: () => unwrap<CurrentUser>(httpClient.get('/v1/me')),
}
