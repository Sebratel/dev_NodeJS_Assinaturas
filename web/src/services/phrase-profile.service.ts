import type {
  PhraseProfile,
  PhraseProfileInput,
  PhraseProfileSimulation,
} from '../types/api'
import { httpClient, unwrap } from './api-client'

export const phraseProfileService = {
  list: () => unwrap<PhraseProfile[]>(httpClient.get('/v1/phrase-profiles')),
  create: (input: PhraseProfileInput) =>
    unwrap<PhraseProfile>(httpClient.post('/v1/phrase-profiles', input)),
  update: (id: string, input: PhraseProfileInput) =>
    unwrap<PhraseProfile>(httpClient.put(`/v1/phrase-profiles/${id}`, input)),
  remove: (id: string) =>
    httpClient.delete(`/v1/phrase-profiles/${id}`).then(() => undefined),
  /** Efeito do perfil antes de salvar (não grava nada). */
  simulate: (input: PhraseProfileInput & { id?: string }) =>
    unwrap<PhraseProfileSimulation>(
      httpClient.post('/v1/phrase-simulations', input)
    ),
}
