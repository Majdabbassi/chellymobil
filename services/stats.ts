// services/stats.ts
import API from './api';

export const getGlobalStats = async (): Promise<{ adherents: number; coachs: number; trophees: number }> => {
  const { data } = await API.get('/stats');
  return data;
};
