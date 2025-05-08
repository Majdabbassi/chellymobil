// services/coach.ts
import API from './api';

export interface CoachDTO {
  id: number;
  nom: string;
  prenom: string;
  imageBase64?: string;
  specialite?: string;
}

export const getAllCoachs = async (): Promise<CoachDTO[]> => {
  const response = await API.get('/coachs?size=1000'); // ou adapte le endpoint si tu as une version non paginée
  return response.data.content ?? []; // si c’est paginé
};
