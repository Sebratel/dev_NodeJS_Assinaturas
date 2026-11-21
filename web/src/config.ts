/** Variáveis do frontend vão para o bundle: nunca colocar segredo aqui. */
export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
};
