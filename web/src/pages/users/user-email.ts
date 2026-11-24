/**
 * E-mail digitado na inclusão: minúsculas, sem espaços e, se vier só o login ("joao.silva"),
 * completa com o domínio da empresa. Quem confere o domínio de verdade é a API.
 */
export function normalizeUserEmail(input: string, domain: string): string {
  const value = input.trim().toLowerCase()
  if (!value) return ''
  return value.includes('@') ? value : `${value}@${domain}`
}

/** Só o formato: algo@algo.algo, do domínio da empresa. */
export function isCompanyEmail(email: string, domain: string): boolean {
  return (
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.endsWith(`@${domain}`)
  )
}
