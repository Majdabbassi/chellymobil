import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// URL du backend exposé via ngrok (mise à jour le 03/05/2025)
const API_BASE_URL = 'http://192.168.100.4:8080';

// 🔁 Utilitaire pour obtenir les headers d'authentification
const getAuthHeaders = async () => {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error("Token JWT manquant");
  return {
    Authorization: `Bearer ${token}`,
  };
};

// 📌 Récupère toutes les performances d’un adhérent
export const getPerformanceByAdherent = async (adherentId: number) => {
  try {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_BASE_URL}/api/performances/adherent/${adherentId}`, {
      headers,
    });
    return response.data;
  } catch (error) {
    console.error('❌ Erreur récupération performances adhérent :', error);
    throw error;
  }
};

// 📌 Récupère les performances d’un adhérent pour une activité précise
export const getPerformanceByAdherentAndActivity = async (adherentId: number, activiteId: number) => {
  try {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_BASE_URL}/api/performances/adherent/${adherentId}/activite/${activiteId}`, {
      headers,
    });
    return response.data;
  } catch (error) {
    console.error('❌ Erreur récupération performances par activité :', error);
    throw error;
  }
};

// 📌 Récupère les activités liées à un adhérent (utile pour filtrer)
export const getActivitiesByAdherent = async (adherentId: number) => {
  try {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_BASE_URL}/api/activites/by-adherent/${adherentId}`, {
      headers,
    });
    return response.data;
  } catch (error) {
    console.error('❌ Erreur récupération activités adhérent :', error);
    throw error;
  }
};
