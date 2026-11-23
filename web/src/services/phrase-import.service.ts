import type { PhraseImportMatch } from '../types/api';
import { httpClient, unwrap } from './api-client';

export const phraseImportService = {
  /** Liga cada linha da planilha a um time do AD (não grava nada). */
  preview: (rows: Array<{ team: string; phrase: string }>) => unwrap<PhraseImportMatch[]>(httpClient.post('/v1/phrase-imports/preview', { rows })),
};
