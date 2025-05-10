import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';

interface CustomDrawerProps {
  user: {
    nom: string;
    prenom: string;
    email: string;
  };
  [key: string]: any; // for props.navigation etc.
}

export default function CustomDrawerContent({ user, ...props }: CustomDrawerProps) {
  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>
            {user?.prenom?.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.username}>{user.prenom} {user.nom}</Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>


      <TouchableOpacity style={styles.menuItem} onPress={() => props.navigation.navigate('competition')}>
        <Ionicons name="trophy-outline" size={20} color="#6D28D9" />
        <Text style={styles.menuText}>Compétitions</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => {
          props.navigation.reset({ index: 0, routes: [{ name: 'login' }] });
        }}
      >
        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        <Text style={[styles.menuText, { color: '#EF4444' }]}>Se déconnecter</Text>
      </TouchableOpacity>
    </DrawerContentScrollView>
  );
}


const styles = StyleSheet.create({
  container: {
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  email: {
    fontSize: 14,
    color: '#000',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  menuText: {
    marginLeft: 14,
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
  },
});
