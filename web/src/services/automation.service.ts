import type { AutoApplyRun, AutomationOverview } from '../types/api';
import { httpClient, unwrap } from './api-client';

export const automationService = {
  overview: () => unwrap<AutomationOverview>(httpClient.get('/v1/automation')),
  /** Lê o AD agora e roda a automação (se ligada). */
  runNow: () => unwrap<AutoApplyRun | null>(httpClient.post('/v1/automation/run')),
  /** Grava o que ficou acima do limite e aguardava aprovação. */
  approve: () => unwrap<AutoApplyRun>(httpClient.post('/v1/automation/approve')),
};
