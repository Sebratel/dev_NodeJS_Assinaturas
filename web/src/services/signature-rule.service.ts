import type { RuleSimulation, SignatureRule, SignatureRuleInput } from '../types/api';
import { httpClient, unwrap } from './api-client';

export const signatureRuleService = {
  list: () => unwrap<SignatureRule[]>(httpClient.get('/v1/signature-rules')),
  create: (input: SignatureRuleInput) => unwrap<SignatureRule>(httpClient.post('/v1/signature-rules', input)),
  update: (id: string, input: SignatureRuleInput) => unwrap<SignatureRule>(httpClient.put(`/v1/signature-rules/${id}`, input)),
  remove: (id: string) => httpClient.delete(`/v1/signature-rules/${id}`).then(() => undefined),
  /** Efeito da regra antes de salvar (não grava nada). */
  simulate: (input: SignatureRuleInput & { id?: string }) => unwrap<RuleSimulation>(httpClient.post('/v1/simulations', input)),
};
