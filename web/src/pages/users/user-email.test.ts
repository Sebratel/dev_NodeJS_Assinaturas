import { describe, expect, it } from 'vitest'
import { isCompanyEmail, normalizeUserEmail } from './user-email'

describe('normalizeUserEmail', () => {
  it('só o login vira o e-mail da empresa', () => {
    expect(normalizeUserEmail(' Joao.Silva ', 'sebratel.com.br')).toBe(
      'joao.silva@sebratel.com.br'
    )
  })

  it('e-mail completo só perde espaços e maiúsculas', () => {
    expect(
      normalizeUserEmail('Maria.Souza@Sebratel.com.br', 'sebratel.com.br')
    ).toBe('maria.souza@sebratel.com.br')
  })

  it('vazio continua vazio', () => {
    expect(normalizeUserEmail('   ', 'sebratel.com.br')).toBe('')
  })
})

describe('isCompanyEmail', () => {
  it('aceita só o domínio da empresa', () => {
    expect(isCompanyEmail('a.b@sebratel.com.br', 'sebratel.com.br')).toBe(true)
    expect(isCompanyEmail('a.b@gmail.com', 'sebratel.com.br')).toBe(false)
    expect(isCompanyEmail('a b@sebratel.com.br', 'sebratel.com.br')).toBe(false)
  })
})
