import API from './api'; // Assure-toi que le chemin est correct vers services/api.ts

/**
 * 📌 Récupère toutes les performances d’un adhérent
 */
export const getPerformanceByAdherent = async (adherentId: number) => {
  try {
    const response = await API.get(`/performances/adherent/${adherentId}`);
    return response.data;
  } catch (error) {
    console.error('❌ Erreur récupération performances adhérent :', error);
    throw error;
  }
};

/**
 * 📌 Récupère les performances d’un adhérent pour une activité précise
 */
export const getPerformanceByAdherentAndActivity = async (
  adherentId: number,
  activiteId: number
) => {
  try {
    const response = await API.get(`/performances/adherent/${adherentId}/activite/${activiteId}`);
    return response.data;
  } catch (error) {
    console.error('❌ Erreur récupération performances par activité :', error);
    throw error;
  }
};

/**
 * 📌 Récupère les activités liées à un adhérent (utile pour filtrer)
 */
export const getActivitiesByAdherent = async (adherentId: number) => {
  try {
    const response = await API.get(`/activites/by-adherent/${adherentId}`);
    return response.data;
  } catch (error) {
    console.error('❌ Erreur récupération activités adhérent :', error);
    throw error;
  }
};
