import type { CollaboratorFacets, CollaboratorListItem, CollaboratorSignature, Level, SignatureStatus } from '../types/api';
import { httpClient, unwrap, unwrapPage } from './api-client';

export interface CollaboratorFilters {
  search?: string;
  area?: string;
  team?: string;
  level?: Level | '';
  status?: SignatureStatus | '';
  page: number;
  pageSize: number;
}

/** Tira filtros vazios para não mandar `area=` na URL. */
function cleanParams(filters: CollaboratorFilters) {
  return Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '' && v !== undefined));
}

export const collaboratorService = {
  list: (filters: CollaboratorFilters) => unwrapPage<CollaboratorListItem>(httpClient.get('/v1/collaborators', { params: cleanParams(filters) })),
  facets: () => unwrap<CollaboratorFacets>(httpClient.get('/v1/collaborators/facets')),
  getSignature: (id: string) => unwrap<CollaboratorSignature>(httpClient.get(`/v1/collaborators/${encodeURIComponent(id)}`)),
  setInformedMobile: (id: string, informedMobile: string) =>
    unwrap<CollaboratorSignature>(httpClient.put(`/v1/collaborators/${encodeURIComponent(id)}/informed-mobile`, { informedMobile })),
};
