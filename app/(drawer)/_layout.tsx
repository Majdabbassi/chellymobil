import { Drawer } from 'expo-router/drawer';
import React, { useEffect, useState } from 'react';
import CustomDrawerContent from '../CustomDrawerContent';
import { getParentById } from '@/services/parentService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Parent {
  nom: string;
  prenom: string;
  email: string;
  avatar?: string;
}

export default function DrawerLayout() {
    const [user, setUser] = useState<Parent>({ nom: '', prenom: '', email: '' });

  useEffect(() => {
  const fetchParent = async () => {
    try {
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        console.log('⛔ Aucun token trouvé, on ne fait pas l’appel API getParentById');
        return;
      }

    const parent = await getParentById();
    const avatar =
      typeof parent.avatar === 'string'
        ? (parent.avatar.startsWith('data:') ? parent.avatar : `data:image/jpeg;base64,${parent.avatar}`)
        : undefined;

    setUser({
      nom: parent.nom,
      prenom: parent.prenom,
      email: parent.email,
      avatar: avatar,
    });
      console.log("👤 Parent chargé dans DrawerLayout:", parent);
    } catch (error) {
      console.error('❌ Erreur récupération parent drawer:', error);
    }
  };

  fetchParent();
}, []);
  return (
    <Drawer
        drawerContent={(props) => <CustomDrawerContent {...props} user={user} />}
        screenOptions={{
            headerShown: false,
            drawerActiveTintColor: '#6D28D9',
            drawerInactiveTintColor: '#1F2937',
            drawerLabelStyle: { fontSize: 16, fontWeight: '600' },
        }}
        >
        <Drawer.Screen name="(tabs)" options={{ title: 'Accueil' }} />
        <Drawer.Screen name="competition" options={{ title: 'Compétitions' }} />
    </Drawer>

  );
}
