import type {
  CoverageReport,
  DirectoryStatus,
  GoogleIntegrationStatus,
} from '../types/api'
import { httpClient, unwrap } from './api-client'

export const reportService = {
  coverage: () =>
    unwrap<CoverageReport>(httpClient.get('/v1/reports/coverage')),
}

export const directoryService = {
  status: () => unwrap<DirectoryStatus>(httpClient.get('/v1/directory/status')),
  sync: () => unwrap<DirectoryStatus>(httpClient.post('/v1/directory/sync')),
}

export const googleIntegrationService = {
  status: () =>
    unwrap<GoogleIntegrationStatus>(httpClient.get('/v1/google-integration')),
  /** Refaz o teste de delegação (só pede token, não grava). */
  check: () =>
    unwrap<GoogleIntegrationStatus>(
      httpClient.post('/v1/google-integration/check')
    ),
}
