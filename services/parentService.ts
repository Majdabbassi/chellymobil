import API from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';

const API_BASE_URL = '/parents'; // Utilise le baseURL de l'instance API

/**
 * 🧠 Décodage d’un token JWT en toute sécurité (compatible React Native)
 */
const parseJwt = (token: string): any => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const decodedPayload = Buffer.from(base64, 'base64').toString('utf-8');
    return JSON.parse(decodedPayload);
  } catch (e) {
    console.error('❌ Erreur lors du décodage du token JWT :', e);
    return null;
  }
};

/**
 * 🔐 Récupère l'ID du parent connecté à partir du token JWT.
 */
const getConnectedParentId = async (): Promise<number> => {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('Aucun token trouvé');

  const decoded = parseJwt(token);
  if (!decoded?.id) throw new Error("ID du parent introuvable dans le token");
  return decoded.id;
};

/**
 * 📦 Récupère les données du parent connecté via son ID.
 */
export const getParentById = async (): Promise<any> => {
  try {
    // Le token et le header Authorization sont gérés par l'intercepteur de API
    const parentId = await getConnectedParentId();
    const response = await API.get(`${API_BASE_URL}/${parentId}`);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error('❌ Erreur HTTP:', error.response.status, error.response.data);
    } else {
      console.error('❌ Erreur de requête:', error.message);
    }
    throw error;
  }
};
