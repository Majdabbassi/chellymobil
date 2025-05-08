import api from './api'; // ← ton Axios configuré avec le token

export interface CompetitionDTO {
  id: number;
  nom: string;
  type: string;
  date: string;
  description: string;
  resultat: string;
  lieu: string;
  organisateur: string;
  imageBase64: string;
  ageCategories: string[];
  trophies: string[];
  activiteIds: number[];
  equipeIds: number[];
  winningPercentage: number;
  isEvenement: boolean;
}

export const getAllEvenements = async (): Promise<CompetitionDTO[]> => {
  try {
    const response = await api.get<CompetitionDTO[]>('/evenements');
    return response.data;
  } catch (error) {
    console.error('Erreur récupération des événements:', error);
    return [];
  }
};
