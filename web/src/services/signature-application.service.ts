import type { ApplicationBatch, CollaboratorFilterParams, SignatureApplication } from '../types/api';
import { httpClient, unwrap } from './api-client';

export interface StartBatchInput {
  collaboratorIds?: string[];
  filter?: CollaboratorFilterParams;
  includePending: boolean;
}

export const signatureApplicationService = {
  startBatch: (input: StartBatchInput) => unwrap<ApplicationBatch>(httpClient.post('/v1/signature-applications/batches', input)),
  getBatch: (id: string) => unwrap<ApplicationBatch>(httpClient.get(`/v1/signature-applications/batches/${id}`)),
  history: (collaboratorId: string) => unwrap<SignatureApplication[]>(httpClient.get('/v1/signature-applications', { params: { collaboratorId } })),
  restore: (id: string) => unwrap<SignatureApplication>(httpClient.post(`/v1/signature-applications/${id}/restore`)),
};
