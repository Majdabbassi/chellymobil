import { Drawer } from 'expo-router/drawer';
import React, { useEffect, useState } from 'react';
import CustomDrawerContent from '../CustomDrawerContent';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as jwt_decode from 'jwt-decode';

interface JwtPayload {
  nom: string;
  prenom: string;
  email: string;
}

export default function DrawerLayout() {
const [user, setUser] = useState<JwtPayload>({ nom: '', prenom: '', email: '' });
  useEffect(() => {
    const fetchUserFromToken = async () => {
      const token = await AsyncStorage.getItem('jwt');
      if (token) {
        const decoded = jwt_decode.jwtDecode<JwtPayload>(token);
        setUser(decoded);
      }
    };

    fetchUserFromToken();
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
