import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, View } from 'react-native';

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { CartProvider } from '@/contexts/CartContext';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <CartProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            display: 'none', // masque complètement la tabBar
            position: 'absolute',
            height: 0,
          },
          tabBarButton: () => <View style={{ display: 'none' }} />, // désactive tous les boutons
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Accueil',
          }}
        />
      </Tabs>
    </CartProvider>
  );
}
