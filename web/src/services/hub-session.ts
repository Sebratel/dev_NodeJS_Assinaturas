import { config } from '../config'

/**
 * Entrada pelo Hub Apps (guia "Apps embutidos no Hub"): o Hub abre o sistema num quadro com `?sso_token=`.
 * A troca pela sessão própria acontece ANTES de o React montar (main.tsx): montando antes, o portão do login
 * veria "sem usuário" no meio da troca; e no modo de desenvolvimento os efeitos rodam duas vezes, o que
 * queimaria o token de uso único.
 *
 * A sessão fica no sessionStorage: vale só para aquele quadro. Uma aba aberta direto no sistema não herda.
 */
const STORAGE_KEY = 'assinaturas-hub-session'

export interface HubSession {
  token: string
  expiresAt: string
  user: { email: string; name: string }
}

/** Motivo da última troca recusada (a tela de login mostra). */
let lastError: string | null = null

export const hubSession = {
  get(): HubSession | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      const session = JSON.parse(raw) as HubSession
      if (session?.token && Date.parse(session.expiresAt) > Date.now())
        return session
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // sessionStorage bloqueado ou conteúdo inválido: sem sessão do Hub.
    }
    return null
  },
  save(session: HubSession) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    } catch {
      lastError =
        'O navegador bloqueou o armazenamento deste quadro. Abra o sistema direto ou libere o armazenamento.'
    }
  },
  clear() {
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // nada a limpar
    }
  },
  /** Lê e esquece o motivo da última recusa. */
  takeError(): string | null {
    const error = lastError
    lastError = null
    return error
  },
  setError(message: string) {
    lastError = message
  },
}

/** Se a URL trouxe `sso_token`, tira da URL e troca por uma sessão. Nunca lança erro. */
export async function enterFromHub(): Promise<void> {
  const url = new URL(window.location.href)
  const ssoToken = url.searchParams.get('sso_token')
  if (!ssoToken) return
  // Sai da URL antes de tudo: o token vale 5 min e não deve ficar no histórico.
  url.searchParams.delete('sso_token')
  window.history.replaceState(
    window.history.state,
    '',
    url.pathname + url.search + url.hash
  )
  try {
    const response = await fetch(`${config.apiBaseUrl}/v1/auth/hub`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: ssoToken }),
    })
    const body = await response.json().catch(() => null)
    if (!response.ok || !body?.success) {
      lastError =
        body?.error?.message ??
        'Não foi possível entrar pelo Hub. Abra de novo pelo Hub Apps.'
      return
    }
    const { token, expiresAt, user } = body.data
    hubSession.save({ token, expiresAt, user })
  } catch {
    lastError =
      'A API não respondeu na entrada pelo Hub. Tente abrir de novo pelo Hub Apps.'
  }
}
