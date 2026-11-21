import type { SettingKey, Settings } from '../types/api';
import { httpClient, unwrap } from './api-client';

export const settingService = {
  getAll: () => unwrap<Settings>(httpClient.get('/v1/settings')),
  update: <K extends SettingKey>(key: K, value: Settings[K]) => unwrap<Settings[K]>(httpClient.put(`/v1/settings/${key}`, { value })),
};
