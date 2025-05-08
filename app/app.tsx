import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ParentLoginScreen from '@/components/LoginScreen';
import RegisterFormScreen from '@/components/RegisterFormScreen';
import HomeScreen from './(tabs)';
import { registerForPushNotificationsAsync } from '@/services/firebase-notifications';
import { sendTokenToBackend } from '@/services/firebase-token';
import * as Notifications from 'expo-notifications';

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => {
    const initNotifications = async () => {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        await sendTokenToBackend(token);
      }
    };

    initNotifications();

    // 🔔 Foreground notification listener
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('📥 Notification reçue:', notification);
    });

    return () => subscription.remove(); // cleanup
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={ParentLoginScreen} />
        <Stack.Screen name="Register" component={RegisterFormScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
