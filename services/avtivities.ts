import api from './api';

export interface ActivityDTO {
  id: number;
  nom: string;
  description: string;
  prix: number;
  lieu: string;
  imageBase64?: string;
}

export const getAllActivities = async (): Promise<ActivityDTO[]> => {
  const response = await api.get('/activites');
  return response.data;
};
