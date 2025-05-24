import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet
} from 'react-native';
import axios from 'axios';
import { router, useNavigation } from 'expo-router';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? 'http://192.168.227.138:8080';

export default function CompetitionListScreen() {
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  useEffect(() => {
    const fetchCompetitions = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const response = await axios.get(`${API_URL}/api/competitions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCompetitions(response.data);
      } catch (error) {
        console.error('❌ Failed to load competitions', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompetitions();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6D28D9" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      {/* ✅ Clickable Header inside ScrollView */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.toggleDrawer()}>
          <Ionicons name="menu" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Liste des Compétitions</Text>
      </View>

      {competitions.map((competition) => (
        <TouchableOpacity
          key={competition.id}
          style={styles.card}
          onPress={() => router.push(`/CompetitionDetailS/${competition.id}`)}
        >
          <Text style={styles.cardTitle}>{competition.nom}</Text>
          <Text style={styles.cardDate}>{competition.date}</Text>
          <Text style={styles.cardLieu}>{competition.lieu}</Text>

          {new Date(competition.date) > new Date() ? (
            <Text style={styles.avenirBadge}>📅 À venir</Text>
          ) : (
            <Text style={styles.winningBadge}>🏆 {competition.winningPercentage}%</Text>
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    backgroundColor: '#F9FAFB',
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#6D28D9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    padding: 16,
    borderRadius: 10,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    top: 14,
    zIndex: 10,
  },
  backArrow: {
    fontSize: 22,
    color: '#fff',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    flex: 1,
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  cardLieu: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  avenirBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#DBEAFE',
    color: '#1D4ED8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 'bold',
  },
  winningBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#D1FAE5',
    color: '#047857',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 'bold',
  },
});
