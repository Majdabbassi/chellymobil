// /services/deconnect.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

export const logoutAndRedirect = async (navigation: any) => {
  try {
    console.log("🚪 Déconnexion en cours...");

    // First close the drawer
    navigation.closeDrawer?.();

    await AsyncStorage.multiRemove(['token', 'userId']);
    
    setTimeout(() => {
      console.log("✅ Redirection vers /auth/login");
      router.replace('/auth/login');
    }, 300); // small delay to let drawer close animation finish

  } catch (err) {
    console.error("❌ Erreur de déconnexion :", err);
  }
};
