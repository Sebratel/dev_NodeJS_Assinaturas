import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { config } from '../config'
import { firebaseAuthService } from './firebase-auth.service'
import { hubSession } from './hub-session'
import type { PaginationMeta } from '../types/api'

/** Erro da API já traduzido do envelope { success:false, error:{ code, message, details } }. */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly details: Array<{ field?: string; message: string }> = []
  ) {
    super(message)
  }
}

interface Envelope<T> {
  success: boolean
  data: T
  meta?: PaginationMeta
  error?: {
    code: string
    message: string
    details?: Array<{ field?: string; message: string }>
  }
}

export const httpClient = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: 30_000,
})

type RetriableRequest = InternalAxiosRequestConfig & { _authRetried?: boolean }

/** Chamado quando o 401 persiste depois de renovar o token: aí sim a sessão acabou. */
let onSessionExpired: () => void = () => undefined
export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler
}

/**
 * Token de cada requisição: a sessão do Hub (sistema aberto dentro do Hub Apps) tem prioridade; senão, o do
 * SDK do Firebase (padrao-login-sso), nunca guardado em variável.
 */
httpClient.interceptors.request.use(async (request) => {
  if (!config.auth.enabled) return request
  const hub = hubSession.get()
  if (hub) {
    request.headers.set('Authorization', `Bearer ${hub.token}`)
    return request
  }
  try {
    const token = await firebaseAuthService.getIdToken()
    if (token) request.headers.set('Authorization', `Bearer ${token}`)
  } catch {
    // Sem rede para renovar: segue sem cabeçalho novo; a API responde e o 401 decide.
  }
  return request
})

httpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<Envelope<unknown>>) => {
    const original = error.config as RetriableRequest | undefined
    // Sessão do Hub não se renova aqui: 401 = acabou (venceu as 8 h). O fim de sessão abaixo leva ao login,
    // que explica que é para abrir de novo pelo Hub.
    if (
      config.auth.enabled &&
      error.response?.status === 401 &&
      hubSession.get()
    ) {
      hubSession.clear()
      hubSession.setError(
        'Sua sessão do Hub terminou. Abra o sistema de novo pelo Hub Apps.'
      )
    } else if (
      config.auth.enabled &&
      error.response?.status === 401 &&
      original &&
      !original._authRetried
    ) {
      original._authRetried = true
      let renewed: string | null = null
      try {
        renewed = await firebaseAuthService.getIdToken(true)
      } catch {
        // Falha ao renovar (rede, Google fora) NÃO é logout: o token atual vale até vencer de verdade.
        return Promise.reject(
          new ApiError(
            'AUTH_REFRESH_FAILED',
            'Não foi possível renovar a sessão agora. Tente de novo em instantes.',
            401
          )
        )
      }
      if (renewed) {
        original.headers.set('Authorization', `Bearer ${renewed}`)
        return httpClient.request(original)
      }
    }
    if (config.auth.enabled && error.response?.status === 401)
      onSessionExpired()

    const body = error.response?.data
    if (body?.error) {
      return Promise.reject(
        new ApiError(
          body.error.code,
          body.error.message,
          error.response?.status ?? 0,
          body.error.details ?? []
        )
      )
    }
    const offline = !error.response
    return Promise.reject(
      new ApiError(
        offline ? 'API_UNREACHABLE' : 'REQUEST_FAILED',
        offline ? 'A API não respondeu. Ela está rodando?' : error.message,
        error.response?.status ?? 0
      )
    )
  }
)

/** Devolve só o `data` do envelope. */
export async function unwrap<T>(
  request: Promise<{ data: Envelope<T> }>
): Promise<T> {
  const response = await request
  return response.data.data
}

/** Para listas paginadas: devolve `data` e `meta`. */
export async function unwrapPage<T>(
  request: Promise<{ data: Envelope<T[]> }>
): Promise<{ items: T[]; meta: PaginationMeta }> {
  const response = await request
  return {
    items: response.data.data,
    meta: response.data.meta as PaginationMeta,
  }
}
