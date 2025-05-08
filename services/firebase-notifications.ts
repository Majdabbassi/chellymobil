import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// 📱 Fonction pour enregistrer l'appareil aux notifications push Expo
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  console.log('🚀 Appel à registerForPushNotificationsAsync');

  if (!Device.isDevice) {
    alert('❌ Les notifications push doivent être testées sur un vrai appareil');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      alert('❌ Permission refusée pour les notifications');
      return null;
    }

    // Assurez-vous que le projectId est bien défini dans app.json
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;

    if (!projectId) {
      console.warn('⚠️ Aucun projectId détecté dans app.json > extra.eas.projectId');
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;

    console.log('✅ Expo Push Token:', token);
    return token;

  } catch (error) {
    console.error('❌ Erreur lors de la récupération du token de notification:', error);
    return null;
  }
}

// 📥 Configuration du comportement des notifications en premier plan
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    console.log('📥 Notification reçue (foreground):', notification);
    return {
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  }
});
