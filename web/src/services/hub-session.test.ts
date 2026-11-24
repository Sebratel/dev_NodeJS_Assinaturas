import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../config', () => ({
  config: { apiBaseUrl: '/api', auth: { enabled: true } },
}))

const { enterFromHub, hubSession } = await import('./hub-session')

function memoryStorage() {
  const data = new Map<string, string>()
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  }
}

const replaceState = vi.fn()
function openAt(href: string) {
  vi.stubGlobal('window', {
    location: { href },
    history: { state: null, replaceState },
  })
}

const IN_8H = new Date(Date.now() + 8 * 3600_000).toISOString()

beforeEach(() => {
  vi.stubGlobal('sessionStorage', memoryStorage())
  replaceState.mockClear()
  hubSession.takeError()
})
afterEach(() => vi.unstubAllGlobals())

describe('entrada pelo Hub Apps', () => {
  it('troca o sso_token pela sessão e tira o token da URL antes de tudo', async () => {
    openAt(
      'https://gestor-assinaturas.sebratel.net.br/regras?x=1&sso_token=abc#topo'
    )
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          token: 'sessao',
          expiresAt: IN_8H,
          user: { email: 'a@sebratel.com.br', name: 'A' },
        },
      }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    await enterFromHub()

    expect(replaceState).toHaveBeenCalledWith(null, '', '/regras?x=1#topo')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/auth/hub',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ token: 'abc' }),
      })
    )
    expect(hubSession.get()).toEqual({
      token: 'sessao',
      expiresAt: IN_8H,
      user: { email: 'a@sebratel.com.br', name: 'A' },
    })
    expect(hubSession.takeError()).toBeNull()
  })

  it('troca recusada: sem sessão e a mensagem da API vai para a tela de login', async () => {
    openAt('https://gestor-assinaturas.sebratel.net.br/?sso_token=usado')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        json: async () => ({
          success: false,
          error: {
            code: 'HUB_TOKEN_USED',
            message: 'Este link de acesso já foi usado.',
          },
        }),
      }))
    )

    await enterFromHub()

    expect(hubSession.get()).toBeNull()
    expect(hubSession.takeError()).toBe('Este link de acesso já foi usado.')
  })

  it('sem sso_token na URL não chama a API', async () => {
    openAt('https://gestor-assinaturas.sebratel.net.br/colaboradores')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await enterFromHub()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(replaceState).not.toHaveBeenCalled()
  })

  it('sessão vencida some sozinha', () => {
    hubSession.save({
      token: 'velha',
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      user: { email: 'a@sebratel.com.br', name: 'A' },
    })
    expect(hubSession.get()).toBeNull()
  })
})
