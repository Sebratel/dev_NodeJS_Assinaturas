/** Variáveis do frontend vão para o bundle: nunca colocar segredo aqui (padroes-frontend › variáveis). */
const env = import.meta.env

export const config = {
  apiBaseUrl: env.VITE_API_BASE_URL || '/api',
  auth: {
    /** Login com Google (Firebase). Desligado só no desenvolvimento local, igual ao AUTH_ENABLED da API. */
    enabled: env.VITE_AUTH_ENABLED === 'true',
    /** Só melhora o seletor de contas; quem valida o domínio é a API. */
    hostedDomain: env.VITE_AUTH_HOSTED_DOMAIN || 'sebratel.com.br',
    firebase: {
      apiKey: env.VITE_FIREBASE_API_KEY ?? '',
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
      projectId: env.VITE_FIREBASE_PROJECT_ID ?? '',
      appId: env.VITE_FIREBASE_APP_ID ?? '',
    },
  },
}
