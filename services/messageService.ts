import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// URL du backend exposé via ngrok (mise à jour le 03/05/2025)
const BASE_URL = 'http://192.168.100.4:8080/api/messages';

// Instance axios configurée
const API = axios.create({ baseURL: BASE_URL });

// Gestion centralisée des erreurs Axios
const handleAxiosError = (message: string, error: unknown) => {
  const axiosError = error as AxiosError;
  console.error(message, axiosError);

  if (axiosError.response) {
    console.error('Response data:', axiosError.response.data);
    console.error('Status:', axiosError.response.status);
  } else if (axiosError.request) {
    console.error('No response received:', axiosError.request);
  } else {
    console.error('Request error:', axiosError.message);
  }
};

// Récupère la config axios avec headers d'authent
async function getAuthConfig(): Promise<AxiosRequestConfig | null> {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      console.error('No token found');
      return null;
    }
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
  } catch (err) {
    console.error('Error reading auth token:', err);
    return null;
  }
}

// 1. Récupérer tous les messages d’un utilisateur
export const getAllMessages = async (userId: number) => {
  const config = await getAuthConfig();
  if (!config) return [];
  try {
    const { data } = await API.get(`/all/${userId}`, config);
    return data;
  } catch (err) {
    handleAxiosError('Error fetching all messages:', err);
    throw err;
  }
};

// 2. Recherche de messages avec filtres
export const searchMessages = async (
  userId: number,
  searchTerm?: string,
  role?: string,
  unreadOnly: boolean = false,
  groupOnly: boolean = false
) => {
  const config = await getAuthConfig();
  if (!config) return [];
  try {
    const params = {
      userId,
      search: searchTerm || '',
      role: role || '',
      unreadOnly,
      groupOnly,
    };
    const { data } = await API.get('/search', { ...config, params });
    return data;
  } catch (err) {
    handleAxiosError('Error searching messages:', err);
    throw err;
  }
};

// 3. Conversation entre deux utilisateurs
export const getConversation = async (
  senderId: number,
  receiverId: number
) => {
  const config = await getAuthConfig();
  if (!config) return [];
  try {
    const params = { senderId, receiverId };
    const { data } = await API.get('/conversation', { ...config, params });
    return data;
  } catch (err) {
    handleAxiosError('Error fetching conversation:', err);
    throw err;
  }
};

// 4. Marquer un message comme lu/non lu
export const markMessageAsSeen = async (
  messageId: number,
  seen: boolean
) => {
  const config = await getAuthConfig();
  if (!config) return;
  try {
    const params = { seen };
    await API.put(`/${messageId}/seen`, null, { ...config, params });
  } catch (err) {
    handleAxiosError('Error marking message as seen:', err);
    throw err;
  }
};

// 5. Envoyer un message
export const sendMessage = async (messageData: any) => {
  const config = await getAuthConfig();
  if (!config) return null;
  try {
    const { data } = await API.post('/sendMessage', messageData, config);
    return data;
  } catch (err) {
    handleAxiosError('Error sending message:', err);
    throw err;
  }
};

// 6. Supprimer un message individuel
export const deleteMessage = async (messageId: number) => {
  const config = await getAuthConfig();
  if (!config) return;
  try {
    await API.delete(`/${messageId}`, config);
  } catch (err) {
    handleAxiosError('Error deleting message:', err);
    throw err;
  }
};

// 7. Supprimer une conversation entière
export const deleteConversation = async (
  user1Id: number,
  user2Id: number
) => {
  const config = await getAuthConfig();
  if (!config) return;
  try {
    const params = { user1Id, user2Id };
    await API.delete('/conversation', { ...config, params });
  } catch (err) {
    handleAxiosError('Error deleting conversation:', err);
    throw err;
  }
};

// 8. Archiver / Désarchiver une conversation
export const archiveConversation = async (
  user1Id: number,
  user2Id: number,
  archived: boolean
) => {
  const config = await getAuthConfig();
  if (!config) return;
  try {
    const params = { user1Id, user2Id, archived };
    await API.put('/archive/conversation', null, { ...config, params });
  } catch (err) {
    handleAxiosError('Error archiving conversation:', err);
    throw err;
  }
};

// 9. Archiver / Désarchiver un message unique
export const archiveMessage = async (
  messageId: number,
  archived: boolean
) => {
  const config = await getAuthConfig();
  if (!config) return;
  try {
    const params = { archived };
    await API.put(`/archive/${messageId}`, null, { ...config, params });
  } catch (err) {
    handleAxiosError('Error archiving message:', err);
    throw err;
  }
};