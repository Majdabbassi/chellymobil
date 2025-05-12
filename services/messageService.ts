import API from './api';
import { AxiosError } from 'axios';

/* ------------------------------------------------------------------ */
/* 🔁 Gestion centralisée des erreurs                                 */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/* 1. 📩 Récupérer tous les messages d’un utilisateur                 */
/* ------------------------------------------------------------------ */
export const getAllMessages = async (userId: number) => {
  try {
    const { data } = await API.get(`/messages/all/${userId}`);
    return data;
  } catch (err) {
    handleAxiosError('Error fetching all messages:', err);
    throw err;
  }
};

/* ------------------------------------------------------------------ */
/* 2. 🔍 Recherche de messages avec filtres                           */
/* ------------------------------------------------------------------ */
export const searchMessages = async (
  userId: number,
  searchTerm?: string,
  role?: string,
  unreadOnly: boolean = false,
  groupOnly: boolean = false
) => {
  try {
    const params = {
      userId,
      search: searchTerm || '',
      role: role || '',
      unreadOnly,
      groupOnly,
    };
    const { data } = await API.get('/messages/search', { params });
    return data;
  } catch (err) {
    handleAxiosError('Error searching messages:', err);
    throw err;
  }
};

/* ------------------------------------------------------------------ */
/* 3. 💬 Conversation entre deux utilisateurs                         */
/* ------------------------------------------------------------------ */
export const getConversation = async (
  senderId: number,
  receiverId: number
) => {
  try {
    const params = { senderId, receiverId };
    const { data } = await API.get('/messages/conversation', { params });
    return data;
  } catch (err) {
    handleAxiosError('Error fetching conversation:', err);
    throw err;
  }
};

/* ------------------------------------------------------------------ */
/* 4. ✅ Marquer un message comme lu/non lu                            */
/* ------------------------------------------------------------------ */
export const markMessageAsSeen = async (
  messageId: number,
  seen: boolean
) => {
  try {
    const params = { seen };
    await API.put(`/messages/${messageId}/seen`, null, { params });
  } catch (err) {
    handleAxiosError('Error marking message as seen:', err);
    throw err;
  }
};

/* ------------------------------------------------------------------ */
/* 5. ✉️ Envoyer un message                                           */
/* ------------------------------------------------------------------ */
export const sendMessage = async (messageData: any) => {
  try {
    const { data } = await API.post('/messages/sendMessage', messageData);
    return data;
  } catch (err) {
    handleAxiosError('Error sending message:', err);
    throw err;
  }
};

/* ------------------------------------------------------------------ */
/* 6. 🗑️ Supprimer un message individuel                              */
/* ------------------------------------------------------------------ */
export const deleteMessage = async (messageId: number) => {
  try {
    await API.delete(`/messages/${messageId}`);
  } catch (err) {
    handleAxiosError('Error deleting message:', err);
    throw err;
  }
};

/* ------------------------------------------------------------------ */
/* 7. 🧹 Supprimer une conversation entière                           */
/* ------------------------------------------------------------------ */
export const deleteConversation = async (
  user1Id: number,
  user2Id: number
) => {
  try {
    const params = { user1Id, user2Id };
    await API.delete('/messages/conversation', { params });
  } catch (err) {
    handleAxiosError('Error deleting conversation:', err);
    throw err;
  }
};

/* ------------------------------------------------------------------ */
/* 8. 📥 Archiver / Désarchiver une conversation                      */
/* ------------------------------------------------------------------ */
export const archiveConversation = async (
  user1Id: number,
  user2Id: number,
  archived: boolean
) => {
  try {
    const params = { user1Id, user2Id, archived };
    await API.put('/messages/archive/conversation', null, { params });
  } catch (err) {
    handleAxiosError('Error archiving conversation:', err);
    throw err;
  }
};

/* ------------------------------------------------------------------ */
/* 9. 🗂️ Archiver / Désarchiver un message unique                     */
/* ------------------------------------------------------------------ */
export const archiveMessage = async (
  messageId: number,
  archived: boolean
) => {
  try {
    const params = { archived };
    await API.put(`/messages/archive/${messageId}`, null, { params });
  } catch (err) {
    handleAxiosError('Error archiving message:', err);
    throw err;
  }
};
