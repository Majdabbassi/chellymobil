import API from './api'; // ✅ Utilise l'instance axios centralisée

/**
 * 📲 Envoie le token FCM au backend pour l'utilisateur connecté
 * @param token Le token FCM à associer au compte
 */
export async function sendTokenToBackend(token: string) {
  try {
    await API.post('/notifications/token', { token });
  } catch (error) {
    console.error('❌ Erreur envoi du token FCM au backend :', error);
    throw error;
  }
}
