import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView, 
  Modal, 
  Image,
  Alert,
  TextInput,
  Image as RNImage,  Switch,
  ActivityIndicator
} from 'react-native';
import API from '@/services/api';
import API_BASE_URL from '@/services/api';

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { AdherentDTO } from '../types/AdherentDTO';
import { getPerformanceByAdherent } from '@/services/performanceService';
import { useNavigation } from '@react-navigation/native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker'; // ← important !
import * as DocumentPicker from 'expo-document-picker';

const pickImage = async (): Promise<string | null> => {
  
  let permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
  
  if (!permissionResult.granted) {
    alert("Permission refusée pour accéder à la galerie !");
    return null;
  }

  let pickerResult = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 1,
    base64: true,
  });

  if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
    const selectedImage = pickerResult.assets[0];
    console.log('Image sélectionnée:', selectedImage.uri);
    return selectedImage.base64 ? `data:image/jpeg;base64,${selectedImage.base64}` : null;
  }

  return null;
};

const formatImageUri = (imageBase64?: string): string | null => {
  if (!imageBase64) return null;
  return imageBase64.startsWith('data:')
    ? imageBase64
    : `data:image/jpeg;base64,${imageBase64}`;
};
const extractAdherents = (payload: any) => {
  if (Array.isArray(payload))          return payload;          // tableau brut
  if (Array.isArray(payload?.data))    return payload.data;     // { data: [...] }
  if (Array.isArray(payload?.content)) return payload.content;  // { content: [...] }
  console.warn('[loadAdherents] format inattendu:', payload);
  return [];
};

export default function ParametresScreen() {
  const [activeModal, setActiveModal] = useState<
  null | 'personal' | 'password' | 'notifications' | 'children' | 'childDetail' | 'documents' | 'addChild'
>(null);
  const [selectedEnfant, setSelectedEnfant] = useState<AdherentDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigation = useNavigation<any>();

  // États pour les données utilisateur
  const [userData, setUserData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: ''
  });
  
  // Variables d'état pour le mot de passe
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Variables d'état pour les notifications
  const [notificationSettings, setNotificationSettings] = useState({
    pushEnabled: true,
    emailEnabled: true, 
    smsEnabled: false
  });
  
  // Variables d'état pour les enfants/adhérents
const [enfants, setEnfants] = useState<AdherentDTO[]>([]);  
  // Variables d'état pour les documents
  const [documents, setDocuments] = useState([]);
  const [newChild, setNewChild] = useState({
    prenom: '',
    nom: '',
    dateNaissance: '', // format 'yyyy-mm-dd'
    sexe: '', // 👈 ajouté ici
    
    imageBase64: '',    // 🆕 pour stocker l'image choisie
  });
  
  // Vérifier l'état d'authentification dès le chargement du composant
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          const userLoaded = await loadUserData(); // 👈 capturer si le user est bien chargé
          if (userLoaded) {
            setIsAuthenticated(true); // 🔥 Ne faire ça que si le user est bien chargé
            await Promise.all([ loadAdherents() ]);
          } else {
            setError("Erreur de chargement de l'utilisateur");
          }
        } else {
          setError("Utilisateur non connecté");
        }
      } catch (e) {
        console.error(e);
        setError("Erreur d’authentification");
      } finally {
        setIsLoading(false);
      }
    };
    checkAuthStatus();
  }, []);
  <TouchableOpacity
  onPress={() => router.replace('/dashboard')}
  style={{ position: 'absolute', top: 40, left: 20, zIndex: 10 }}
>
  <Ionicons name="arrow-back" size={26} color="#8A6BFF" />
</TouchableOpacity>

const getUserIdFromStorage = async (): Promise<number | null> => {
  try {
    const id = await AsyncStorage.getItem('userId');
    console.log('userId récupéré :', id); // ← Ajoute ça
    return id ? parseInt(id) : null;
  } catch (error) {
    console.error('Erreur en récupérant userId:', error);
    console.error('Erreur en récupérant userId:', error);
    return null;
  }
};

  // Fonction pour charger les documents
  const loadDocuments = async () => {
    try {
      const response = await API.get('/documents');
      console.log("[loadDocuments] Réponse backend:", response.data);
  
      const documents = response.data.data || []; // 👈 ICI !!! pas .content mais .data
  
      setDocuments(documents);
      console.log("[loadDocuments] Documents enregistrés dans l'état:", documents);
  
      return documents;
    } catch (error) {
      console.error("Erreur:", error);
      setError(error.response?.data?.message || "Erreur de chargement des documents");
      return [];
    }
  };
  
  // Fonction pour charger les données de l'utilisateur
  const loadUserData = async (): Promise<boolean> => {
    try {
      const id = await getUserIdFromStorage();
      if (!id) {
        console.error('Utilisateur non connecté');
        return false;
      }
  
      const response = await API.get(`/utilisateurs/${id}`); 
  
      console.log("[loadUserData] Réponse backend:", response.data);
  
      const user = response.data.data; // 👈 ICI : c'est `response.data.data` !!!
  
      setUserData({
        nom: user.nom || '',
        prenom: user.prenom || '',
        email: user.email || '',
        telephone: user.telephone || '',
      });
  
      console.log("[loadUserData] Données utilisateur enregistrées dans l'état :", {
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        telephone: user.telephone,
      });
  
      return true;
    } catch (error) {
      console.error('Erreur lors du chargement de l’utilisateur:', error);
      return false;
    }
  };
  
  
  
  
  
  // Fonction pour charger les adhérents (enfants)
  const loadAdherents = async () => {
    try {
      const { data: payload } = await API.get('/adherents');
  
      const adherentsRaw = extractAdherents(payload);
  
      const adherentsWithImages = adherentsRaw.map(a => ({
        ...a,
        imageUri: formatImageUri(a.imageBase64 ?? a.photo ?? a.imageData)
      }));
  
      setEnfants(adherentsWithImages);
      return adherentsWithImages;
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message ?? 'Erreur de chargement des adhérents');
      return [];
    }
  };
  
  
  
  // Fonction pour charger les documents

  
  // Charger toutes les données
  const loadAllData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Chargement séquentiel pour éviter les race conditions
      const userData = await loadUserData();
      if (userData) {
        await Promise.all([
          loadAdherents(),
          loadDocuments()
        ]);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des données:", error);
      setError("Impossible de charger les données. Veuillez réessayer plus tard.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fonctions pour mettre à jour les données
  const updatePersonalInfo = async () => {
    try {
      setIsLoading(true);
      await API.put('/utilisateurs/me', {
        nom: userData.nom,
        prenom: userData.prenom,
        telephone: userData.telephone
        // 🔥 ne jamais envoyer email ici 🔥
      });
  
      Alert.alert("Succès", "Informations personnelles mises à jour ✅");
      closeModal();
      await loadUserData();
    } catch (error: any) {
      console.error("Erreur:", error);
      Alert.alert("Erreur", error.response?.data?.message || "Erreur de mise à jour des informations");
    } finally {
      setIsLoading(false);
    }
  };
  
  
  const updatePassword = async () => {
    if (newPassword !== confirmPassword) {
      Alert.alert("Erreur", "Les mots de passe ne correspondent pas");
      return;
    }
  
    if (newPassword.length < 6) {
      Alert.alert("Erreur", "Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
  
    try {
      setIsLoading(true);
      await API.put('/utilisateurs/password', {
        currentPassword,
        newPassword
      });
  
      Alert.alert("Succès", "Mot de passe modifié avec succès ✅");
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      closeModal();
    } catch (error) {
      console.error("Erreur:", error);
      Alert.alert("Erreur", error.response?.data?.message || "Erreur lors du changement de mot de passe");
    } finally {
      setIsLoading(false);
    }
  };
  
  const updateNotificationSettings = async () => {
    try {
      setIsLoading(true);
      await API.put('/users/preferences', {
        preferences: {
          push: notificationSettings.pushEnabled,
          email: notificationSettings.emailEnabled,
          sms: notificationSettings.smsEnabled
        }
      });
      
      Alert.alert("Succès", "Préférences de notifications mises à jour");
      closeModal();
      
      // Recharger les données pour s'assurer que tout est à jour
      await loadUserData();
    } catch (error) {
      console.error("Erreur:", error);
      Alert.alert("Erreur", error.response?.data?.message || "Erreur de mise à jour des préférences");
    } finally {
      setIsLoading(false);
    }
  };
  const getBlobFromUri = async (uri: string): Promise<Blob> => {
    const response = await fetch(uri);
    const blob = await response.blob();
    return blob;
  };
  
  const handleUploadDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
  
      if (result.canceled || !result.assets || result.assets.length === 0) {
        console.log("Annulé par l'utilisateur ou aucun fichier sélectionné");
        return;
      }
  
      const file = result.assets[0];
      const blob = await getBlobFromUri(file.uri);
  
      const formData = new FormData();
      formData.append('file', blob, file.name || 'document.pdf');
  
      const token = await AsyncStorage.getItem('token');
  
   const response = await fetch(`${API_BASE_URL}/api/documents/upload`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
  body: formData,
});

      const response = await axios.post('http://192.168.64.138:8080/api/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
        },
      });
  
      console.log("✅ Upload réussi:", response.data);
      Alert.alert("Succès", "Document uploadé avec succès !");
      await loadDocuments();
    } catch (error: any) {
      console.error("❌ Erreur d'upload:", error.response?.data || error.message);
      Alert.alert("Erreur", error.response?.data?.message || "Erreur d'upload du document.");
    }
  };
  
  
  const handleAddChild = async () => {
    if (!newChild.prenom || !newChild.nom || !newChild.dateNaissance) {
      Alert.alert('Erreur', 'Merci de remplir tous les champs.');
      return;
    }
  
    try {
      setIsLoading(true);
      const parentId = await getUserIdFromStorage(); // récupère l'ID parent connecté
      if (!parentId) {
        throw new Error('Utilisateur non authentifié');
      }
  
      await API.post(`/adherents/by-admin/${parentId}`, {
        nom: newChild.nom,
        prenom: newChild.prenom,
        dateNaissance: newChild.dateNaissance,
        sexe: newChild.sexe,        // 👈 Ajoute ça
        imageBase64: newChild.imageBase64, // 👈 ajouter ça !
      
      });
  
      Alert.alert('Succès', "Enfant ajouté ✅");
      closeModal();
      await loadAdherents(); // Recharge les enfants après ajout
    } catch (error: any) {
      console.error('Erreur ajout enfant:', error);
      Alert.alert('Erreur', error.response?.data?.message || "Erreur d'ajout de l'enfant");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleLogout = async () => {
    try {
      console.log("🔵 Déconnexion en cours...");
      // Ne supprime que ce qui est nécessaire
      await AsyncStorage.multiRemove(['token', 'userId']);
      setIsAuthenticated(false);
      console.log("✅ Déconnexion réussie");
      // Replace pour éviter d’empiler les écrans
      router.replace('/auth/login');
    } catch (error) {
      console.error("❌ Erreur lors de la déconnexion:", error);
      Alert.alert("Erreur", "Un problème est survenu lors de la déconnexion");
    }
  };
  
  
  
  
  
  const handlePress = async (modalName: 'personal' | 'password' | 'notifications' | 'children' | 'childDetail' | 'documents') => {
    setActiveModal(modalName);
    
    // Only fetch data for personal modal
    if (modalName === 'personal') {
      try {
        setIsLoading(true);
        await loadUserData();
      } catch (error) {
        console.error("Error loading user data:", error);
        Alert.alert("Erreur", "Impossible de charger vos informations personnelles");
      } finally {
        setIsLoading(false);
      }
    } else if (modalName === 'children') {
      try {
        setIsLoading(true);
        await loadAdherents();
      } catch (error) {
        console.error("Error loading children data:", error);
        Alert.alert("Erreur", "Impossible de charger les données des enfants");
      } finally {
        setIsLoading(false);
      }
    } else if (modalName === 'documents') {
      try {
        setIsLoading(true);
        await loadDocuments();
      } catch (error) {
        console.error("Error loading documents:", error);
        Alert.alert("Erreur", "Impossible de charger les documents");
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  const closeModal = () => {
    setActiveModal(null);
    setSelectedEnfant(null);
  };
  
  const showEnfantDetails = async (enfant: AdherentDTO) => {
    try {
      setIsLoading(true);
  
      const response = await API.get(`/adherents/${enfant.id}`);
      const adherentDetail = response.data;
  
      console.log("[showEnfantDetails] Détails adhérent récupérés:", adherentDetail);
  
      const performances = await getPerformanceByAdherent(enfant.id);
      console.log("[showEnfantDetails] Performances récupérées:", performances);
  
      const activitesFromPerformances = (performances || [])
        .map((perf: { activite: { id: number; nom: string } }) => perf.activite)
        .filter(
          (act: { id: number; nom: string }, index: number, self: { id: number; nom: string }[]) =>
            act && index === self.findIndex((a: { id: number; nom: string }) => a.id === act.id)
        )
        .map((act: { nom: string }) => ({
          nom: act.nom ?? 'Activité inconnue',
        }));
  
      console.log("[showEnfantDetails] Activités reconstruites:", activitesFromPerformances);
  
      setSelectedEnfant({
        ...adherentDetail,
        niveau: adherentDetail.niveau || "N/A",
        horairesCours: adherentDetail.horairesCours || [],
        entraineur: adherentDetail.entraineur || "Non spécifié",
        activites: Array.isArray(adherentDetail.activites) && adherentDetail.activites.length > 0
          ? adherentDetail.activites.map((act: { nom: string } | string) => ({
              nom: typeof act === 'string' ? act : act?.nom ?? 'Activité inconnue',
            }))
          : activitesFromPerformances,
        performances: performances || [],
        paiements: adherentDetail.paiements || [],
      });
  
      setActiveModal('childDetail');
    } catch (error) {
      console.error("Erreur lors du chargement des détails de l'adhérent:", error);
      Alert.alert("Erreur", "Impossible de charger les détails de l'adhérent.");
    } finally {
      setIsLoading(false);
    }
  };
  
  
  const showDocumentDetails = (document) => {
    Alert.alert(
      document.nom,
      `Date d'ajout: ${document.date}\n\nVous pouvez consulter et télécharger ce document.`
    );
  };
  
  const renderModal = () => {
    switch(activeModal) {
      case 'personal':
        return (
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Informations personnelles</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nom</Text>
              <TextInput
                style={styles.input}
                value={userData.nom}
                onChangeText={(text) => setUserData({...userData, nom: text})}
                placeholder="Votre nom"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Prénom</Text>
              <TextInput
                style={styles.input}
                value={userData.prenom}
                onChangeText={(text) => setUserData({...userData, prenom: text})}
                placeholder="Votre prénom"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={userData.email}
                onChangeText={(text) => setUserData({...userData, email: text})}
                placeholder="Votre email"
                keyboardType="email-address"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Téléphone</Text>
              <TextInput
                style={styles.input}
                value={userData.telephone}
                onChangeText={(text) => setUserData({...userData, telephone: text})}
                placeholder="Votre téléphone"
                keyboardType="phone-pad"
              />
            </View>
            
            <TouchableOpacity style={styles.button} onPress={updatePersonalInfo} disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.buttonText}>Enregistrer</Text>
              )}
            </TouchableOpacity>
          </View>
        );
      case 'password':
        return (
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Changer le mot de passe</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mot de passe actuel</Text>
              <TextInput
                style={styles.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Entrez votre mot de passe actuel"
                secureTextEntry
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nouveau mot de passe</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Entrez votre nouveau mot de passe"
                secureTextEntry
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirmer le mot de passe</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirmez votre nouveau mot de passe"
                secureTextEntry
              />
            </View>
            
            <TouchableOpacity style={styles.button} onPress={updatePassword} disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.buttonText}>Modifier</Text>
              )}
            </TouchableOpacity>
          </View>
        );
      case 'notifications':
        return (
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Notifications</Text>
            
            <View style={styles.switchGroup}>
              <Text style={styles.switchLabel}>Notifications push</Text>
              <Switch
                trackColor={{ false: "#D1D5DB", true: "#8A6BFF" }}
                thumbColor={notificationSettings.pushEnabled ? "#FFFFFF" : "#F3F4F6"}
                ios_backgroundColor="#D1D5DB"
                onValueChange={() => setNotificationSettings({
                  ...notificationSettings, 
                  pushEnabled: !notificationSettings.pushEnabled
                })}
                value={notificationSettings.pushEnabled}
              />
            </View>
            
            <View style={styles.switchGroup}>
              <Text style={styles.switchLabel}>Notifications par email</Text>
              <Switch
                trackColor={{ false: "#D1D5DB", true: "#8A6BFF" }}
                thumbColor={notificationSettings.emailEnabled ? "#FFFFFF" : "#F3F4F6"}
                ios_backgroundColor="#D1D5DB"
                onValueChange={() => setNotificationSettings({
                  ...notificationSettings, 
                  emailEnabled: !notificationSettings.emailEnabled
                })}
                value={notificationSettings.emailEnabled}
              />
            </View>
            
            <View style={styles.switchGroup}>
              <Text style={styles.switchLabel}>Notifications par SMS</Text>
              <Switch
                trackColor={{ false: "#D1D5DB", true: "#8A6BFF" }}
                thumbColor={notificationSettings.smsEnabled ? "#FFFFFF" : "#F3F4F6"}
                ios_backgroundColor="#D1D5DB"
                onValueChange={() => setNotificationSettings({
                  ...notificationSettings, 
                  smsEnabled: !notificationSettings.smsEnabled
                })}
                value={notificationSettings.smsEnabled}
              />
            </View>
            
            <TouchableOpacity style={styles.button} onPress={updateNotificationSettings} disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.buttonText}>Enregistrer</Text>
              )}
            </TouchableOpacity>
          </View>
        );
        case 'addChild':
  return (
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>Ajouter un enfant</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Prénom</Text>
        <TextInput
          style={styles.input}
          placeholder="Prénom de l'enfant"
          value={newChild.prenom}
          onChangeText={(text) => setNewChild({ ...newChild, prenom: text })}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Nom</Text>
        <TextInput
          style={styles.input}
          placeholder="Nom de l'enfant"
          value={newChild.nom}
          onChangeText={(text) => setNewChild({ ...newChild, nom: text })}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Date de naissance</Text>
        <TextInput
          style={styles.input}
          placeholder="yyyy-mm-dd"
          value={newChild.dateNaissance}
          onChangeText={(text) => setNewChild({ ...newChild, dateNaissance: text })}
        />
      </View>
      <View style={styles.inputGroup}>
  <Text style={styles.inputLabel}>Sexe</Text>
  <View style={styles.selectInput}>
    <TouchableOpacity
      style={[
        styles.selectOption,
        newChild.sexe === 'Homme' && styles.selectedOption,
      ]}
      onPress={() => setNewChild({ ...newChild, sexe: 'Homme' })}
    >
      <Text style={styles.selectOptionText}>Homme</Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={[
        styles.selectOption,
        newChild.sexe === 'Femme' && styles.selectedOption,
      ]}
      onPress={() => setNewChild({ ...newChild, sexe: 'Femme' })}
    >
      <Text style={styles.selectOptionText}>Femme</Text>
    </TouchableOpacity>
  </View>
</View>

      <TouchableOpacity
  style={styles.imagePickerButton}
  onPress={async () => {
    const image = await pickImage();
    if (image) {
      setNewChild(prev => ({
        ...prev,
        imageBase64: image,
      }));
    }
  }}
>
  <Text style={styles.imagePickerButtonText}>Choisir une image</Text>
</TouchableOpacity>


{newChild.imageBase64 ? (
  <Image
    source={{ uri: newChild.imageBase64 }}
    style={styles.previewImage}
  />
) : null}
      <TouchableOpacity 
        style={styles.button} 
        onPress={handleAddChild}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.buttonText}>Ajouter</Text>
        )}
      </TouchableOpacity>
    </View>
  );

        // juste avant de render ta liste, transforme chaque enfant :
        case 'children': {
          // on est sûr que `enfants` est AdherentDTO[]
          const enfantsWithUri = enfants.map(enf => ({
            ...enf,
            uri: formatImageUri(enf.imageBase64), 
          }));
  return (
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>Gérer mes enfants</Text>

      {isLoading ? (
        <ActivityIndicator color="#8A6BFF" size="large" style={{ marginVertical: 20 }} />
      ) : enfantsWithUri.length > 0 ? (
        enfantsWithUri.map(enfant => (
          <TouchableOpacity
            key={enfant.id}
            style={styles.listItem}
            onPress={() => showEnfantDetails(enfant)}
          >
            <View style={styles.childInfo}>
              <View style={styles.childIconContainer}>
                {enfant.uri ? (
                  <RNImage source={{ uri: enfant.uri }} style={styles.childImage} />
                ) : (
                  <Ionicons name="person" size={20} color="#FFFFFF" />
                )}
              </View>
              <Text style={styles.childName}>{enfant.prenom} {enfant.nom}</Text>
            </View>
            <Text style={styles.childAge}>{enfant.age} ans</Text>
            <Ionicons name="chevron-forward" size={18} color="#8A6BFF" />
          </TouchableOpacity>
        ))
      ) : (
        <Text style={styles.emptyStateText}>Aucun adhérent trouvé</Text>
      )}

<TouchableOpacity
  style={[styles.button, styles.addButton]}
  onPress={() => {
    setNewChild({ prenom: '', nom: '', dateNaissance: '' }); // reset form
    setActiveModal('addChild'); // ← ouvrir modal d'ajout
  }}
>
  <Ionicons name="add" size={18} color="#FFFFFF" style={styles.addIcon} />
  <Text style={styles.buttonText}>Ajouter un enfant</Text>
</TouchableOpacity>

    </View>
  );
}

        
      case 'childDetail':
        if (!selectedEnfant) return null;
        return (
          <View style={styles.modalContent}>
            <View style={styles.profileHeader}>
            <View style={styles.profileImageContainer}>
  {selectedEnfant.imageBase64 ? (
    <RNImage
      source={{ 
        uri: selectedEnfant.imageBase64.startsWith('data:') 
          ? selectedEnfant.imageBase64 
          : `data:image/jpeg;base64,${selectedEnfant.imageBase64}` 
      }}
      style={styles.profileImage}
    />
  ) : (
    <Ionicons name="person" size={40} color="#FFFFFF" />
  )}
</View>

              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {selectedEnfant?.prenom} {selectedEnfant?.nom}
                </Text>
                <Text style={styles.profileAge}>
                  {selectedEnfant?.dateNaissance
                    ? `${new Date().getFullYear() - new Date(selectedEnfant.dateNaissance).getFullYear()} ans`
                    : 'Âge non renseigné'}
                </Text>
              </View>
            </View>
        
            {/* Détails adhérent */}
            <View style={styles.detailCard}>
              <Text style={styles.detailCardTitle}>Informations adhérent</Text>
        
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Sexe :</Text>
                <Text style={styles.detailValue}>{selectedEnfant?.sexe || 'Non précisé'}</Text>
              </View>
        
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Date de naissance :</Text>
                <Text style={styles.detailValue}>
                  {selectedEnfant?.dateNaissance ? new Date(selectedEnfant.dateNaissance).toLocaleDateString() : 'Non précisée'}
                </Text>
              </View>
        
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Date d'adhésion :</Text>
                <Text style={styles.detailValue}>
                  {selectedEnfant?.dateInscriptionClub ? new Date(selectedEnfant.dateInscriptionClub).toLocaleDateString() : 'Non précisée'}
                </Text>
              </View>
            </View>
        
            {/* Détails Parent */}
            <View style={styles.detailCard}>
              <Text style={styles.detailCardTitle}>Parent</Text>
        
              <View style={styles.detailItem}>
  <Text style={styles.detailLabel}>Nom :</Text>
  <Text style={styles.detailValue}>
    {selectedEnfant?.nomParent && selectedEnfant.nomParent.trim() !== '' 
      ? selectedEnfant.nomParent 
      : 'Non précisé'}
  </Text>
</View>


              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Email :</Text>
                <Text style={styles.detailValue}>{selectedEnfant?.emailParent || 'Non précisé'}</Text>
              </View>
        
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Téléphone :</Text>
                <Text style={styles.detailValue}>{selectedEnfant?.telephoneParent || 'Non précisé'}</Text>
              </View>
            </View>
        
            {/* Activités */}
            <View style={styles.detailCard}>
  <Text style={styles.detailCardTitle}>Activités</Text>

  {Array.isArray(selectedEnfant?.activites) && selectedEnfant.activites.length > 0 ? (
    <View style={styles.activitiesList}>
      {selectedEnfant.activites.map((activite, idx) => (
        <View key={idx} style={styles.activityTag}>
          <Text style={styles.activityText}>
            {activite?.nom ?? 'Activité inconnue'}
          </Text>
        </View>
      ))}
    </View>
  ) : (
    <Text style={styles.emptyStateText}>Aucune activité enregistrée</Text>
  )}
</View>

        
            {/* Horaires */}
            {selectedEnfant?.horairesCours && Array.isArray(selectedEnfant.horairesCours) && selectedEnfant.horairesCours.length > 0 && (
              <View style={styles.detailCard}>
                <Text style={styles.detailCardTitle}>Horaires</Text>
                {selectedEnfant.horairesCours.map((horaire, index) => (
                  <View key={index} style={{ marginBottom: 8 }}>
                    <Text style={styles.detailValue}>{horaire.nom} - {horaire.lieu}</Text>
                  </View>
                ))}
              </View>
            )}
        
            {/* Performances */}
         {/* Performances */}
<View style={styles.detailCard}>
  <Text style={styles.detailCardTitle}>Performances</Text>

  {selectedEnfant?.performances && selectedEnfant.performances.length > 0 ? (
    selectedEnfant.performances.map((perf, index) => {
      const date = perf.date
        ? new Date(perf.date).toLocaleDateString()
        : 'Date inconnue';

      return (
        <View key={index} style={styles.performanceItem}>
          <View style={styles.performanceHeader}>
            <Text style={styles.performanceDate}>📅 {date}</Text>
           <Text style={styles.performanceTitle}>
  {perf.activite?.nom ?? 'Activité inconnue'}
</Text>

          </View>
          <Text style={styles.performanceResult}>
            🌟 {perf.note !== undefined ? `${perf.note}/10` : 'Non noté'}
          </Text>
          {perf.commentaire && (
            <Text style={styles.performanceComment}>
              💬 {perf.commentaire}
            </Text>
          )}
        </View>
      );
    })
  ) : (
    <Text style={styles.emptyStateText}>Aucune performance enregistrée</Text>
  )}
</View>

            {/* Paiements */}
            <View style={styles.detailCard}>
              <Text style={styles.detailCardTitle}>Paiements</Text>
        
              {selectedEnfant?.paiements && selectedEnfant.paiements.length > 0 ? (
                selectedEnfant.paiements.map((paiement, index) => (
                  <View key={index} style={{ marginBottom: 8 }}>
                    <Text style={styles.detailValue}>
                      {paiement.date ? new Date(paiement.date).toLocaleDateString() : 'Date inconnue'} - {paiement.montant}€ ({paiement.statut})
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyStateText}>Aucun paiement enregistré</Text>
              )}
            </View>
        
            {/* Actions */}
            <View style={styles.actionButtons}>

              <TouchableOpacity 
  style={[styles.button, styles.calendarButton]}
  onPress={() => {
    closeModal();
    navigation.navigate('calendar'); // ← juste 'calendar'
  }}
>
  <Ionicons name="calendar-outline" size={18} color="#FFFFFF" style={styles.buttonIcon} />
  <Text style={styles.buttonText}>Planning</Text>
</TouchableOpacity>


            </View>
          </View>
        );
        
        
      case 'documents':
        return (
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Documents</Text>
            
            {isLoading ? (
              <ActivityIndicator color="#8A6BFF" size="large" style={{marginVertical: 20}} />
            ) : documents.length > 0 ? (
              documents.map((document) => (
                <TouchableOpacity 
                  key={document.id} 
                  style={styles.listItem}
                  onPress={() => showDocumentDetails(document)}
                >
                  <View style={styles.docInfo}>
                    <Ionicons name="document-text" size={20} color="#8A6BFF" />
                    <Text style={styles.docName}>{document.nom}</Text>
                  </View>
                  <Text style={styles.docDate}>{document.date}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#8A6BFF" />
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.emptyStateText}>Aucun document trouvé</Text>
            )}
            
            <TouchableOpacity 
  style={[styles.button, styles.addButton]}
  onPress={handleUploadDocument}
>
  <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" style={styles.addIcon} />
  <Text style={styles.buttonText}>Uploader un document</Text>
</TouchableOpacity>

          </View>
        );
      default:
        return null;
    }
  };
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      console.log("Utilisateur non authentifié ➔ redirection login");
      router.replace('/auth/login');
    }
  }, [isAuthenticated, isLoading]);
  
  // Afficher un écran de connexion si l'utilisateur n'est pas authentifié
  if (!isAuthenticated && !isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Vous devez être connecté pour accéder à cette page</Text>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => {
              // navigation.navigate('Login');
              Alert.alert("Info", "Redirection vers la page de connexion.");
            }}
          >
            <Text style={styles.buttonText}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  // Afficher un message d'erreur si nécessaire
  if (error && isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => {
              setError(null);
              loadAllData();
            }}
          >
            <Text style={styles.buttonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      {isLoading && !activeModal ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#8A6BFF" size="large" />
          <Text style={styles.loadingText}>Chargement des données...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Paramètres</Text>
          <View style={styles.userInfoContainer}>
  <Text style={styles.userInfoTitle}>Informations personnelles</Text>
  <View style={styles.userInfoRow}>
    <Text style={styles.userInfoLabel}>Nom :</Text>
    <Text style={styles.userInfoValue}>{userData.nom}</Text>
  </View>
  <View style={styles.userInfoRow}>
    <Text style={styles.userInfoLabel}>Prénom :</Text>
    <Text style={styles.userInfoValue}>{userData.prenom}</Text>
  </View>
  <View style={styles.userInfoRow}>
    <Text style={styles.userInfoLabel}>Email :</Text>
    <Text style={styles.userInfoValue}>{userData.email}</Text>
  </View>
  <View style={styles.userInfoRow}>
    <Text style={styles.userInfoLabel}>Téléphone :</Text>
    <Text style={styles.userInfoValue}>{userData.telephone}</Text>
  </View>
</View>

          {/* Éléments de menu - Correction des doublons */}
          <TouchableOpacity 
            style={styles.item} 
            onPress={() => handlePress('personal')}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="person-outline" size={22} color="#FFFFFF" style={styles.icon} />
            </View>
            <Text style={styles.label}>Informations personnelles</Text>
            <Ionicons name="chevron-forward" size={20} color="#8A6BFF" style={styles.arrowIcon} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.item} 
            onPress={() => handlePress('password')}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="lock-closed-outline" size={22} color="#FFFFFF" style={styles.icon} />
            </View>
            <Text style={styles.label}>Changer le mot de passe</Text>
            <Ionicons name="chevron-forward" size={20} color="#8A6BFF" style={styles.arrowIcon} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.item} 
            onPress={() => handlePress('notifications')}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="notifications-outline" size={22} color="#FFFFFF" style={styles.icon} />
            </View>
            <Text style={styles.label}>Notifications</Text>
            <Ionicons name="chevron-forward" size={20} color="#8A6BFF" style={styles.arrowIcon} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.item} 
            onPress={() => handlePress('children')}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="people-outline" size={22} color="#FFFFFF" style={styles.icon} />
            </View>
            <Text style={styles.label}>Gérer mes enfants</Text>
            <Ionicons name="chevron-forward" size={20} color="#8A6BFF" style={styles.arrowIcon} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.item} 
            onPress={() => handlePress('documents')}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="document-text-outline" size={22} color="#FFFFFF" style={styles.icon} />
            </View>
            <Text style={styles.label}>Documents</Text>
            <Ionicons name="chevron-forward" size={20} color="#8A6BFF" style={styles.arrowIcon} />
          </TouchableOpacity>

          <TouchableOpacity 
        style={[styles.item, styles.logoutItem]} 
        onPress={() =>
          Alert.alert(
            "Déconnexion", 
            "Êtes-vous sûr de vouloir vous déconnecter ?", 
            [
              { text: "Annuler", style: "cancel" },
              { text: "Déconnexion", style: "destructive", onPress: handleLogout }
            ]
          )
        }
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, styles.logoutIconContainer]}>
          <Ionicons name="log-out-outline" size={22} color="#FFFFFF" style={styles.icon} />
        </View>
        <Text style={styles.logoutLabel}>Déconnexion</Text>
      </TouchableOpacity>

        </ScrollView>
      )}
      
      <Modal
        visible={activeModal !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity style={styles.backButton} onPress={closeModal}>
                <Ionicons name="chevron-back" size={24} color="#8A6BFF" />
              </TouchableOpacity>

              <Text style={styles.modalHeaderTitle}>
                {activeModal === 'personal' && "Informations personnelles"}
                {activeModal === 'password' && "Changer le mot de passe"}
                {activeModal === 'notifications' && "Notifications"}
                {activeModal === 'children' && "Gérer mes enfants"}
                {activeModal === 'childDetail' && "Détails adhérent"}
                {activeModal === 'documents' && "Documents"}
              </Text>

              <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                <Ionicons name="close" size={24} color="#8A6BFF" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalScrollContent}>
              {renderModal()}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 25,
    color: '#6B46C1',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#8A6BFF',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    backgroundColor: '#8A6BFF',
    borderRadius: 8,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  icon: {
    color: '#FFFFFF',
  },
  label: {
    fontSize: 16,
    flex: 1,
    color: '#1F2937',
  },
  arrowIcon: {
    marginLeft: 8,
  },
  logoutItem: {
    marginTop: 30,
  },
  logoutIconContainer: {
    backgroundColor: '#EF4444',
  },
  logoutLabel: {
    fontSize: 16,
    flex: 1,
    color: '#EF4444',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    padding: 16,
    backgroundColor: '#FFFFFF'  },
  
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  modalScrollContent: {
    flexGrow: 1,
  },
  modalContent: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1F2937',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#8A6BFF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 16,
    color: '#1F2937',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  childInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  childIconContainer: {
    backgroundColor: '#8A6BFF',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  childName: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  childAge: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 10,
  },
  emptyStateText: {
    textAlign: 'center',
    color: '#6B7280',
    marginVertical: 20,
    fontSize: 16,
  },
  addButton: {
    marginTop: 20,
  },
  addIcon: {
    marginRight: 8,
  },
  docInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  docName: {
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 10,
  },
  docDate: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 10,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  profileImageContainer: {
    backgroundColor: '#8A6BFF',
    borderRadius: 40,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  profileAge: {
    fontSize: 16,
    color: '#6B7280',
  },
  detailCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  detailCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  activitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  activityTag: {
    backgroundColor: '#EDE9FE',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  activityText: {
    color: '#8A6BFF',
    fontSize: 14,
  },
  performanceItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  performanceDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  performanceTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  performanceResult: {
    fontSize: 14,
    color: '#059669',
    marginBottom: 4,
  },
  performanceComment: {
    fontSize: 13,
    color: '#374151',
  },
  
  
  paiementItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  paiementInfo: {
    flex: 1,
  },
  paiementDate: {
    fontSize: 14,
    color: '#1F2937',
  },
  paiementMontant: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  paiementStatut: {
    fontSize: 14,
    fontWeight: '500',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statutPaye: {
    backgroundColor: '#D1FAE5',
    color: '#059669',
  },
  statutEnAttente: {
    backgroundColor: '#FEF3C7',
    color: '#D97706',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  editButton: {
    flex: 1,
    marginRight: 8,
    backgroundColor: '#8A6BFF',
  },
  calendarButton: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: '#3B82F6',
  },
  buttonIcon: {
    marginRight: 8,
  },
  userInfoContainer: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  userInfoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  userInfoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  userInfoLabel: {
    fontWeight: '500',
    color: '#374151',
    width: 100,
  },
  userInfoValue: {
    color: '#4B5563',
    flex: 1,
  },

  profileImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  childImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  activitiesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  selectInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  
  selectOption: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  
  selectedOption: {
    backgroundColor: '#8A6BFF',
    borderColor: '#8A6BFF',
  },
  
  selectOptionText: {
    color: '#1F2937',
    fontSize: 16,
  },
  
// Ajoute dans ton StyleSheet en dessous des autres styles similaires
addChildContainer: {
  backgroundColor: '#F9FAFB',
  padding: 20,
  borderRadius: 12,
  marginTop: 20,
},

addChildTitle: {
  fontSize: 18,
  fontWeight: 'bold',
  color: '#1F2937',
  marginBottom: 16,
  textAlign: 'center',
},

addChildInput: {
  backgroundColor: '#FFFFFF',
  borderWidth: 1,
  borderColor: '#E5E7EB',
  borderRadius: 8,
  paddingHorizontal: 12,
  paddingVertical: 10,
  fontSize: 16,
  marginBottom: 12,
},

addChildButton: {
  backgroundColor: '#8B5CF6',
  borderRadius: 8,
  paddingVertical: 14,
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: 10,
},

addChildButtonText: {
  color: '#FFFFFF',
  fontSize: 16,
  fontWeight: '600',
},
imagePickerButton: {
  backgroundColor: '#E0E7FF',
  paddingVertical: 12,
  borderRadius: 8,
  alignItems: 'center',
  marginBottom: 12,
},

imagePickerButtonText: {
  color: '#4338CA',
  fontSize: 16,
  fontWeight: '600',
},

previewImage: {
  width: 100,
  height: 100,
  borderRadius: 50,
  alignSelf: 'center',
  marginBottom: 12,
},

});