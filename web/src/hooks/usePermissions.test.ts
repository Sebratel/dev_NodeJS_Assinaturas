import { describe, expect, it } from 'vitest'
import { permissionsFor } from './usePermissions'

describe('permissionsFor', () => {
  it('Visualizador só vê', () => {
    expect(permissionsFor('VIEWER')).toEqual({
      role: 'VIEWER',
      roleLabel: 'Visualizador',
      canEdit: false,
      canApply: false,
      isMaster: false,
    })
  })

  it('Editor edita, mas não grava no Gmail nem mexe em configuração técnica', () => {
    expect(permissionsFor('EDITOR')).toMatchObject({
      canEdit: true,
      canApply: false,
      isMaster: false,
    })
  })

  it('Master pode tudo', () => {
    expect(permissionsFor('MASTER')).toMatchObject({
      canEdit: true,
      canApply: true,
      isMaster: true,
      roleLabel: 'Master',
    })
  })

  it('sem perfil conhecido (API fora, resposta antiga), vale o mais restrito', () => {
    expect(permissionsFor(undefined)).toMatchObject({
      role: 'VIEWER',
      canEdit: false,
      canApply: false,
    })
  })
})
