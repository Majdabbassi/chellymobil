import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? 'http://192.168.110.138:8080';

export default function CompetitionDetailsScreen() {
  const { id } = useLocalSearchParams();
  const [competition, setCompetition] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const response = await axios.get(`${API_URL}/api/competitions/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setCompetition(response.data);
      } catch (error) {
        console.error('❌ Failed to load competition details', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6D28D9" />
      </View>
    );
  }

  if (!competition) {
    return (
      <View style={styles.centered}>
        <Text>Compétition introuvable</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/competition')} style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{competition.nom}</Text>
      </View>

      {/* Image */}
      {competition.imageBase64 && (
        <Image
          source={{ uri: competition.imageBase64 }}
          style={styles.image}
          resizeMode="cover"
        />
      )}

      {/* Details Section */}
      <Text style={styles.sectionTitle}>📌 Détails</Text>
      <Text style={styles.detail}><Text style={styles.label}>📅 Date :</Text> {competition.date}</Text>
      <Text style={styles.detail}><Text style={styles.label}>📍 Lieu :</Text> {competition.lieu}</Text>
      <Text style={styles.detail}><Text style={styles.label}>🏢 Organisateur :</Text> {competition.organisateur}</Text>
      <Text style={styles.detail}><Text style={styles.label}>📝 Description :</Text> {competition.description || '—'}</Text>

      {/* Résultat */}
      <Text style={styles.sectionTitle}>🥇 Résultat</Text>
      <View style={styles.resultBox}>
        <Text style={styles.resultText}>{competition.resultat || '—'}</Text>
      </View>

      {/* Trophées */}
      <Text style={styles.sectionTitle}>🎖️ Trophées</Text>
      <View style={styles.trophyList}>
        {competition.trophies?.length ? (
          competition.trophies.map((trophy, index) => (
            <View key={index} style={styles.trophyBadge}>
              <Text style={styles.trophyText}>{trophy}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.detail}>Aucun trophée</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#F9FAFB',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor:'#6D28D9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
    padding:10,
    borderRadius:10,
  },
  backButton: {
    marginRight: 10,
    color: '#fff' ,
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
    textAlign: 'center',     // ✅ center text itself
    flex: 1,
  },
  image: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 20,
    backgroundColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4B5563',
    marginTop: 16,
    marginBottom: 6,
  },
  label: {
    fontWeight: 'bold',
    color: '#374151',
  },
  detail: {
    fontSize: 15,
    color: '#1F2937',
    marginBottom: 8,
  },
  resultBox: {
    backgroundColor: '#E0F2FE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  resultText: {
    fontSize: 15,
    color: '#0369A1',
    fontWeight: '600',
  },
  trophyList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  trophyBadge: {
    backgroundColor: '#FDE68A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  trophyText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
  },
});
