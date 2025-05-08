import messaging from '@react-native-firebase/messaging';
import { Alert, Platform } from 'react-native';

export async function requestUserPermission() {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  return enabled;
}

export async function getFcmToken() {
  const token = await messaging().getToken();
  console.log("📲 FCM Token:", token);
  return token;
}

export function setupNotificationListeners() {
  // App in foreground
  messaging().onMessage(async remoteMessage => {
    Alert.alert(remoteMessage.notification?.title ?? 'Notification', remoteMessage.notification?.body ?? '');
  });

  // Background or quit state
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('🔔 Message in background:', remoteMessage);
  });
}
