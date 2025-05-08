import API from './api';
import { CompetitionDTO } from './adherent'; // ou adapte selon ton projet

export const getUpcomingCompetitions = async (): Promise<CompetitionDTO[]> => {
  const response = await API.get('/competitions/upcoming');
  return response.data;
};
