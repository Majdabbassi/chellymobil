import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import API from '@/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

interface Adherent {
  id: number;
  nom: string;
  prenom: string;
  imageBase64?: string;
}

export default function ChildrenListScreen() {
  const [adherents, setAdherents] = useState<Adherent[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const navigation = useNavigation();

  useEffect(() => {
    const fetchChildren = async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      try {
        const res = await API.get('/parents/me'); // Or your actual endpoint
        setAdherents(res.data.adherents || []);
      } catch (error) {
        console.error('Erreur chargement adhérents:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChildren();
  }, []);

  const renderItem = ({ item }: { item: Adherent }) => (
  <TouchableOpacity
    style={styles.card}
    onPress={() =>
      router.push({
        pathname: '/AdherentDetailScreen',
        params: { adherentId: item.id },
      })
    }
  >
    <Image
      source={
        item.imageBase64
          ? { uri: `data:image/jpeg;base64,${item.imageBase64}` }
          : require('@/assets/images/adaptive-icon.png')
      }
      style={styles.image}
    />
    <Text style={styles.cardText}>{item.prenom} {item.nom}</Text>
  </TouchableOpacity>
);


  if (loading) {
    return <ActivityIndicator size="large" style={{ marginTop: 50 }} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
      <TouchableOpacity onPress={() => navigation.toggleDrawer()}>
          <Ionicons name="menu" size={24} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.title}>    Mes enfants</Text>
    </View>
      <FlatList
            data={adherents}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            numColumns={2} // 👈 2 columns
            columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 16 }}
            contentContainerStyle={{ paddingBottom: 20 }}
        />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FAFAFA',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  title: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  card: {
    backgroundColor: '#F5F3FF',
    borderRadius: 20,
    width: '48%',
    aspectRatio: 1, // makes it square
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 10,
  },
  cardText: {
    color: '#6D28D9',
    fontWeight: '600',
    textAlign: 'center',
  },
});

