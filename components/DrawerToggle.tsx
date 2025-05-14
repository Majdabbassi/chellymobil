// components/DrawerToggle.tsx
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import React from 'react';

export default function DrawerToggle() {
  const navigation = useNavigation();

  return (
    <TouchableOpacity onPress={() => navigation.toggleDrawer()} style={{ marginLeft: 10 }}>
      <Ionicons name="menu" size={24} color="#6D28D9" />
    </TouchableOpacity>
  );
}
