import { httpClient, unwrap } from './api-client'

/** O que a tela de login precisa saber antes do login (GET público). */
export interface AuthConfig {
  /** true = só master entra direto; os demais pelo Hub Apps. */
  hubOnly: boolean
  /** A entrada pelo Hub está configurada na API (HUB_SSO_SECRET e HUB_APP_ID). */
  hubEnabled: boolean
  hubUrl: string
}

export const DEFAULT_HUB_URL = 'https://hub-apps.sebratel.net.br'

export const authConfigService = {
  get: () => unwrap<AuthConfig>(httpClient.get('/v1/auth/config')),
}
