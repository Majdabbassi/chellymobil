import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function CustomDrawerContent(props) {
  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.container}>
      <Text style={styles.title}>🏀 Club Sportif</Text>

      <TouchableOpacity style={styles.item} onPress={() => router.push('/ParentDashboardScreen')}>
        <Ionicons name="home-outline" size={20} color="#6D28D9" />
        <Text style={styles.label}>Accueil</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.item} onPress={() => router.push('/calendar')}>
        <Ionicons name="calendar-outline" size={20} color="#6D28D9" />
        <Text style={styles.label}>Calendrier</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.item} onPress={() => router.push('/messages')}>
        <Ionicons name="chatbubbles-outline" size={20} color="#6D28D9" />
        <Text style={styles.label}>Messages</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.item} onPress={() => router.push('/PaymentSelectionScreen')}>
        <Ionicons name="card-outline" size={20} color="#6D28D9" />
        <Text style={styles.label}>Paiements</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.item} onPress={() => router.push('/ParametresScreen')}>
        <Ionicons name="settings-outline" size={20} color="#6D28D9" />
        <Text style={styles.label}>Paramètres</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.item, { marginTop: 20 }]}
        onPress={() => {
          // ton action de logout ici
        }}
      >
        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        <Text style={[styles.label, { color: '#EF4444' }]}>Déconnexion</Text>
      </TouchableOpacity>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 20,
    color: '#6D28D9',
    fontWeight: 'bold',
    marginBottom: 20,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  label: {
    marginLeft: 12,
    fontSize: 16,
    color: '#374151',
  },
});
