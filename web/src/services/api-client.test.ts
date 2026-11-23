import {
  AxiosError,
  AxiosHeaders,
  type InternalAxiosRequestConfig,
} from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getIdToken = vi.fn<(force?: boolean) => Promise<string | null>>()

vi.mock('../config', () => ({
  config: {
    apiBaseUrl: '/api',
    auth: { enabled: true, hostedDomain: 'sebratel.com.br', firebase: {} },
  },
}))
vi.mock('./firebase-auth.service', () => ({
  firebaseAuthService: { getIdToken: (force?: boolean) => getIdToken(force) },
}))

const { httpClient, setSessionExpiredHandler, ApiError } =
  await import('./api-client')

type Reply = { status: number; data?: unknown }

/** Adaptador falso: responde na ordem da fila e guarda o Authorization de cada chamada. */
function fakeServer(replies: Reply[]) {
  const seenTokens: Array<string | undefined> = []
  httpClient.defaults.adapter = async (request: InternalAxiosRequestConfig) => {
    seenTokens.push(
      AxiosHeaders.from(request.headers).get('Authorization') as
        string | undefined
    )
    const reply = replies.shift() ?? { status: 500 }
    const response = {
      status: reply.status,
      statusText: '',
      data: reply.data ?? {},
      headers: {},
      config: request,
    }
    if (reply.status >= 400)
      throw new AxiosError(
        `HTTP ${reply.status}`,
        'ERR_BAD_REQUEST',
        request,
        null,
        response
      )
    return response
  }
  return seenTokens
}

describe('httpClient com login (padrao-login-sso)', () => {
  const onExpired = vi.fn()

  beforeEach(() => {
    getIdToken.mockReset()
    onExpired.mockReset()
    setSessionExpiredHandler(onExpired)
  })

  it('manda o token do SDK em cada requisição', async () => {
    getIdToken.mockResolvedValue('token-a')
    const seen = fakeServer([{ status: 200, data: { success: true, data: 1 } }])

    await httpClient.get('/v1/me')

    expect(seen).toEqual(['Bearer token-a'])
  })

  it('no 401, renova o token e tenta de novo uma vez', async () => {
    // Como o SDK: depois de renovar, o token em memória passa a ser o novo.
    let current = 'token-velho'
    getIdToken.mockImplementation(async (force) => {
      if (force) current = 'token-novo'
      return current
    })
    const seen = fakeServer([
      { status: 401 },
      { status: 200, data: { success: true, data: 1 } },
    ])

    const response = await httpClient.get('/v1/me')

    expect(response.status).toBe(200)
    expect(getIdToken).toHaveBeenCalledWith(true)
    expect(seen.at(-1)).toBe('Bearer token-novo')
    expect(onExpired).not.toHaveBeenCalled()
  })

  it('falha ao renovar NÃO encerra a sessão', async () => {
    getIdToken.mockImplementation(async (force) => {
      if (force) throw new Error('auth/network-request-failed')
      return 'token-atual'
    })
    fakeServer([{ status: 401 }])

    const error = await httpClient.get('/v1/me').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as InstanceType<typeof ApiError>).code).toBe(
      'AUTH_REFRESH_FAILED'
    )
    expect(onExpired).not.toHaveBeenCalled()
  })

  it('401 que persiste depois de renovar encerra a sessão', async () => {
    getIdToken.mockResolvedValue('token')
    fakeServer([
      { status: 401 },
      {
        status: 401,
        data: {
          success: false,
          error: { code: 'AUTH_REQUIRED', message: 'Sessão expirada.' },
        },
      },
    ])

    const error = await httpClient.get('/v1/me').catch((e: unknown) => e)

    expect((error as InstanceType<typeof ApiError>).code).toBe('AUTH_REQUIRED')
    expect(onExpired).toHaveBeenCalledTimes(1)
  })
})
