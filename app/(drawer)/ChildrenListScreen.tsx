import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image,
  ActivityIndicator, TextInput, Alert, Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRouter } from 'expo-router';
import API from '@/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

interface Adherent {
  id: number;
  nom: string;
  prenom: string;
  imageBase64?: string;
}

export default function ChildrenListScreen() {
  const [adherents, setAdherents] = useState<Adherent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const navigation = useNavigation();
  const router = useRouter();

  const [newChild, setNewChild] = useState({
    prenom: '',
    nom: '',
    dateNaissance: '',
    sexe: '',
    imageBase64: '',
  });

  const pickImage = async (): Promise<string | null> => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission refusée", "Autorisez l'accès à la galerie pour choisir une image.");
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1
    });

    if (!result.canceled && result.assets.length > 0) {
      const base64 = result.assets[0].base64;
      return base64 ? `data:image/jpeg;base64,${base64}` : null;
    }

    return null;
  };

  const handleAddChild = async () => {
    if (!newChild.nom || !newChild.prenom || !newChild.dateNaissance) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs.');
      return;
    }

    try {
      const userId = await AsyncStorage.getItem('userId');
      const res = await API.post(`/adherents/by-admin/${userId}`, newChild);
      setAdherents(prev => [...prev, res.data]);
      setNewChild({ prenom: '', nom: '', dateNaissance: '', sexe: '', imageBase64: '' });
      Keyboard.dismiss();
      setShowAddModal(false);
      Alert.alert("Succès", "Enfant ajouté !");
    } catch (err) {
      console.error("Erreur ajout enfant:", err);
      Alert.alert("Erreur", "Impossible d'ajouter l'enfant.");
    }
  };

  useEffect(() => {
    const fetchChildren = async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      try {
        const res = await API.get('/parents/me');
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
      onPress={() => router.push({ pathname: '/AdherentDetailScreen', params: { adherentId: item.id } })}
    >
      <Image
        source={
          item.imageBase64?.startsWith('data:')
            ? { uri: item.imageBase64 }
            : item.imageBase64
              ? { uri: `data:image/jpeg;base64,${item.imageBase64}` }
              : require('@/assets/images/adaptive-icon.png')
        }
        style={styles.image}
      />
      <Text style={styles.cardText}>{item.prenom} {item.nom}</Text>
    </TouchableOpacity>
  );

  return (
    <>
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => navigation.toggleDrawer()}>
            <Ionicons name="menu" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Mes enfants</Text>
        </View>

        <TouchableOpacity
          style={[styles.button, { marginBottom: 20 }]}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.buttonText}>Ajouter un enfant</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator size="large" style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={adherents}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            numColumns={2}
            columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 16 }}
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {showAddModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ajouter un enfant</Text>

            <TextInput
              style={styles.input}
              placeholder="Prénom"
              value={newChild.prenom}
              onChangeText={(text) => setNewChild({ ...newChild, prenom: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Nom"
              value={newChild.nom}
              onChangeText={(text) => setNewChild({ ...newChild, nom: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="yyyy-mm-dd"
              value={newChild.dateNaissance}
              onChangeText={(text) => setNewChild({ ...newChild, dateNaissance: text })}
            />

            <View style={styles.selectInput}>
              {['Homme', 'Femme'].map(sexe => (
                <TouchableOpacity
                  key={sexe}
                  style={[
                    styles.selectOption,
                    newChild.sexe === sexe && styles.selectedOption,
                  ]}
                  onPress={() => setNewChild({ ...newChild, sexe })}
                >
                  <Text style={styles.selectOptionText}>{sexe}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.imagePickerButton}
              onPress={async () => {
                const image = await pickImage();
                if (image) setNewChild(prev => ({ ...prev, imageBase64: image }));
              }}
            >
              <Text style={styles.imagePickerButtonText}>Choisir une image</Text>
            </TouchableOpacity>

            {newChild.imageBase64 && (
              <Image source={{ uri: newChild.imageBase64 }} style={styles.previewImage} />
            )}

            <TouchableOpacity
              style={styles.button}
              onPress={handleAddChild}
            >
              <Text style={styles.buttonText}>Ajouter</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowAddModal(false)} style={{ marginTop: 10 }}>
              <Text style={{ color: 'red', textAlign: 'center' }}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </>
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
    aspectRatio: 1,
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
  button: {
    flexDirection: 'row',
    backgroundColor: '#7C3AED',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 999,
  },
  modalContent: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 16,
    width: '100%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4B5563',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 10,
    marginVertical: 8,
  },
  selectInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  selectOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#DDD',
    padding: 10,
    marginHorizontal: 5,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedOption: {
    backgroundColor: '#DDD6FE',
    borderColor: '#7C3AED',
  },
  selectOptionText: {
    color: '#4B5563',
    fontWeight: '600',
  },
  imagePickerButton: {
    backgroundColor: '#E0E7FF',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  imagePickerButtonText: {
    color: '#4F46E5',
    fontWeight: 'bold',
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignSelf: 'center',
    marginBottom: 10,
  },
});
