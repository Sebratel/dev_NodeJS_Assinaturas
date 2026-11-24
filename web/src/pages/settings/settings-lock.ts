import { createContext } from 'react'

/**
 * Perfil que falta para alterar a aba aberta ('Editor' ou 'Master'), ou null quando pode alterar.
 * Dado pela SettingsPage; a SaveBar troca o botão Salvar pelo aviso de somente leitura.
 */
export const SettingsLockContext = createContext<'Editor' | 'Master' | null>(
  null
)
