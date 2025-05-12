import API from './api'; // Assure-toi que le chemin est correct

/**
 * Récupère les sessions du calendrier selon les filtres fournis.
 * @param params Objets de filtres facultatifs : coachId, adherentId, etc.
 * @returns Liste des sessions formatées.
 */
export const getCalendarSessions = async (params: {
  coachId?: number;
  adherentId?: number;
  parentId?: number;
  activiteId?: number;
  equipeId?: number;
  lieuId?: number;
  month?: number;
  year?: number;
}) => {
  try {
    const response = await API.get('/sessions/calendar', { params });
    return response.data;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des sessions du calendrier :', error);
    throw error;
  }
};
