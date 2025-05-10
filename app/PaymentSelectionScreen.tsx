import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  SafeAreaView,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getAdherentsOfCurrentParent, getActivitiesByAdherent, getCurrentParentInfo } from '@/services/adherent';
import axios from 'axios';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { AdherentDTO } from '@/types/AdherentDTO';

// Get API base URL from environment variables or fallback to a default
const API_BASE_URL = Constants?.expoConfig?.extra?.apiUrl ?? 'http://192.168.64.138:8080';

export default function PaymentSelectionScreen() {
  const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

  const [loading, setLoading] = useState(false);
  const [adherents, setAdherents] = useState<AdherentDTO[]>([]);
  const [selectedAdherent, setSelectedAdherent] = useState<AdherentDTO | null>(null);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [availableActivities, setAvailableActivities] = useState<{ id: number; nom: string; prix: number }[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [activityPrices, setActivityPrices] = useState<Record<string, number>>({});
  const [showLocalForm, setShowLocalForm] = useState(false);
  const [token, setToken] = useState('');
  const [error, setError] = useState(null);

  const [parentInfo, setParentInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: ''
  });
  // Removed duplicate declaration of selectedAdherent
  // Function to handle API errors
  const handleApiError = useCallback((error: any, customMessage = 'Une erreur est survenue') => {
    console.error(customMessage, error);
    const errorMessage = error?.response?.data?.message || error?.message || customMessage;
    setError(errorMessage);
    Alert.alert('Erreur', errorMessage);
    setLoading(false);
  }, []);

  // Load token from AsyncStorage
  useEffect(() => {
    const getToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        if (!storedToken) {
          Alert.alert('Session expirée', 'Veuillez vous reconnecter.');
          router.replace('/auth/login');
          return;
        }
        setToken(storedToken);
      } catch (error) {
        handleApiError(error, 'Erreur lors de la récupération de votre session');
      }
    };

    getToken();
  }, [handleApiError]);

  // Load initial data when token is available
  useEffect(() => {
    let isMounted = true;
    
    const loadInitialData = async () => {
      if (!token || !isMounted) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Get parent info
        const parent = await getCurrentParentInfo();
        if (!isMounted) return;
        
        setParentInfo({
          firstName: parent.prenom || '',
          lastName: parent.nom || '',
          email: parent.email || '',
          phoneNumber: parent.telephone || ''
        });
    
        // Get adherents
        const adherentsData = await getAdherentsOfCurrentParent();
        if (!isMounted) return;
        
        if (Array.isArray(adherentsData)) {
          // Mapper plus sécurisé pour les adhérents et leurs activités
          const formattedAdherents = adherentsData.map(adherent => {
            // Traiter les activités de manière sécurisée
            const formattedActivities = Array.isArray(adherent.activites) 
              ? adherent.activites.map(activity => {
                  if (activity && typeof activity === 'object' && !Array.isArray(activity)) {
                    return {
                      id: typeof activity.id === 'number' ? activity.id : 0,
                      nom: typeof activity.nom === 'string' ? activity.nom : '',
                      prix: typeof activity.prix === 'number' ? activity.prix : 0,
                      lieu: typeof activity.lieu === 'string' ? activity.lieu : '',
                      description: typeof activity.description === 'string' ? activity.description : '',
                    };
                  } else if (typeof activity === 'string') {
                    return {
                      id: 0,
                      nom: activity,
                      prix: 0,
                      lieu: '',
                      description: '',
                    };
                  } else {
                    return {
                      id: 0,
                      nom: '',
                      prix: 0,
                      lieu: '',
                      description: '',
                    };
                  }
                })
              : [];
    
            // Retourner l'adhérent avec ses activités formatées
            return {
              ...adherent,
              activites: formattedActivities,
            };
          });
    
          setAdherents(formattedAdherents);
        } else {
          setAdherents([]);
        }
        
        setLoading(false);
      } catch (error) {
        if (isMounted) {
          handleApiError(error, 'Erreur lors du chargement des données');
        }
      }
    };

    loadInitialData();
    
    return () => {
      isMounted = false;
    };
  }, [token, handleApiError]);

  const handleAdherentSelect = useCallback(async (adherent: AdherentDTO) => {
    setSelectedAdherent(adherent);
    setSelectedActivities([]);
    setAvailableActivities([]);
    setLoading(true);
    
    try {
      if (!adherent || !adherent.id) {
        throw new Error('Adhérent invalide');
      }
      
      const activities = await getActivitiesByAdherent(adherent.id);
      
      if (!Array.isArray(activities)) {
        throw new Error('Format de données invalide');
      }
      
      setAvailableActivities(
        activities.map(activity => ({
          id: 'id' in activity && typeof activity.id === 'number' ? activity.id : 0, // Ensure `id` exists and is a number
          nom: activity.nom,
          prix: activity.prix,
        }))
      );

      const pricesDict = activities.reduce<Record<string, number>>((dict, activity) => {
        if (activity && activity.nom && typeof activity.prix === 'number') {
          dict[activity.nom] = activity.prix;
        }
        return dict;
      }, {});
      
      setActivityPrices(pricesDict);
    } catch (err) {
      handleApiError(err, 'Erreur lors du chargement des activités');
    } finally {
      setLoading(false);
    }
  }, [handleApiError]);

  const calculateTotal = useCallback(() => {
    return selectedActivities.reduce((total, name) => {
      const prix = activityPrices[name] || 0;
      return total + prix * selectedMonths.length;
    }, 0);
  }, [selectedActivities, activityPrices, selectedMonths]);

  const isFormComplete = useCallback(() => {
    return selectedAdherent && 
           selectedActivities.length > 0 && 
           selectedMonths.length > 0 &&
           !loading;
  }, [selectedAdherent, selectedActivities, selectedMonths, loading]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateParentInfo = useCallback(() => {
    if (!parentInfo.firstName || !parentInfo.lastName) {
      Alert.alert('Information incomplète', 'Le nom et prénom du parent sont requis.');
      return false;
    }
    
    if (!parentInfo.email || !validateEmail(parentInfo.email)) {
      Alert.alert('Email invalide', 'Veuillez fournir une adresse email valide.');
      return false;
    }
    
    if (!parentInfo.phoneNumber || parentInfo.phoneNumber.length < 8) {
      Alert.alert('Numéro de téléphone invalide', 'Veuillez fournir un numéro de téléphone valide.');
      return false;
    }
    
    return true;
  }, [parentInfo]);

  const handleKonnectPayment = useCallback(async () => {
    if (!isFormComplete()) {
      Alert.alert('Information incomplète', 'Veuillez sélectionner un adhérent, au moins une activité et un mois.');
      return;
    }
  
    if (!validateParentInfo()) return;
  
    setLoading(true);
  
    try {
      // Vérifie que l'adhérent est valide
      if (!selectedAdherent || typeof selectedAdherent.id !== 'number') {
        throw new Error('Adhérent invalide');
      }
  
      // Récupère toutes les activités sélectionnées
      const selectedActivityObjs = availableActivities.filter(a => selectedActivities.includes(a.nom));
      if (selectedActivityObjs.length === 0) {
        throw new Error('Aucune activité valide sélectionnée');
      }
  
      // Si plusieurs activités sont sélectionnées, informer l'utilisateur
      if (selectedActivityObjs.length > 1) {
        Alert.alert(
          'Information',
          'Pour le paiement en ligne, une seule activité peut être traitée à la fois. Nous allons procéder avec ' + 
          selectedActivityObjs[0].nom + '.',
          [{ text: 'Continuer' }, { text: 'Annuler', onPress: () => {
            setLoading(false);
            return;
          }}]
        );
      }
  
      // Utiliser la première activité sélectionnée
      const selectedActivity = selectedActivityObjs[0];
  
      // Récupérer les sessions pour cette activité
      const sessionResponse = await axios.get(
        `${API_BASE_URL}/api/sessions/next-session?activityId=${selectedActivity.id}`, 
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
  
      const session = sessionResponse.data;
      if (!session || !session.id) {
        throw new Error("Aucune session future trouvée pour l'activité sélectionnée.");
      }
  
      // Calculer le total pour cette activité uniquement
      const activityPrice = selectedActivity.prix || 0;
      const total = Math.round(activityPrice * selectedMonths.length * 100); // en centimes
  
      const paymentResponse = await axios.post(
        `${API_BASE_URL}/api/konnect/pay`,
        {
          adherentId: selectedAdherent.id,
          sessionId: session.id,
          total,
          firstName: parentInfo.firstName,
          lastName: parentInfo.lastName,
          email: parentInfo.email,
          phoneNumber: parentInfo.phoneNumber,
          description: `Paiement de ${selectedActivity.nom} (${selectedMonths.join(', ')}) pour ${selectedAdherent.prenom}`
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );
      
  
      const konnectUrl = paymentResponse?.data?.payment_url;
  
      if (typeof konnectUrl === 'string' && konnectUrl.startsWith('http')) {
        await Linking.openURL(konnectUrl);
      } else {
        throw new Error('Lien de paiement invalide');
      }
  
    } catch (error) {
      handleApiError(error, 'Erreur lors de la préparation du paiement');
    } finally {
      setLoading(false);
    }
  }, [
    isFormComplete,
    validateParentInfo,
    selectedAdherent,
    selectedActivities,
    availableActivities,
    selectedMonths,
    token,
    parentInfo,
    handleApiError
  ]);
  

  const handleLocalPayment = useCallback(async () => {
    if (!isFormComplete()) {
      Alert.alert('Information incomplète', 'Veuillez sélectionner un adhérent, au moins une activité et un mois.');
      return;
    }

    if (!validateParentInfo()) {
      return;
    }
    
    setLoading(true);

    try {
      // Vérifie que l'adhérent est valide
      if (!selectedAdherent || typeof selectedAdherent.id !== 'number') {
        throw new Error("Adhérent sélectionné invalide");
      }
      
      // Vérifie que chaque activité a un ID
      const selectedActivityIds = availableActivities
        .filter(a => selectedActivities.includes(a.nom))
        .map(a => {
          if (!a || !a.id) {
            throw new Error(`L'activité "${a?.nom || 'inconnue'}" est invalide`);
          }
          return a.id;
        });
        
      if (selectedActivityIds.length === 0) {
        throw new Error('Aucune activité valide sélectionnée');
      }
      
      if (!token) {
        throw new Error('Session expirée');
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/reservations/by-parent/${selectedAdherent.id}`,
        {
          activiteIds: selectedActivityIds,
          payInCash: true,
          months: selectedMonths
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        }
      );

      Alert.alert(
        '✅ Paiement local confirmé', 
        'Votre réservation a été enregistrée avec succès.',
        [{ text: 'OK', onPress: () => setShowLocalForm(false) }]
      );
    } catch (error) {
      handleApiError(error, 'Erreur lors de la confirmation du paiement local');
    } finally {
      setLoading(false);
    }
  }, [
    isFormComplete, 
    validateParentInfo, 
    selectedAdherent, 
    availableActivities, 
    selectedActivities, 
    selectedMonths, 
    token, 
    handleApiError
  ]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar 
        barStyle={Platform.OS === 'ios' ? "dark-content" : "light-content"}
        backgroundColor="#6B46C1" 
      />

      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
          accessible={true}
          accessibilityLabel="Retour"
          accessibilityHint="Retourne à l'écran précédent"
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sélection de paiement</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6B46C1" />
          <Text style={styles.loadingText}>Chargement en cours...</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={24} color="#e53e3e" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <ScrollView 
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Adhérents */}
        <View style={styles.contentCard}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Adhérents</Text>
            </View>
            {adherents.length > 0 ? (
              <View style={styles.optionsGrid}>
                {adherents.map(a => (
                  <TouchableOpacity
                    key={a.id || `adherent-${a.nom}-${a.prenom}`}
                    style={[
                      styles.option,
                      selectedAdherent?.id === a.id && styles.selected
                    ]}
                    onPress={() => handleAdherentSelect(a)}
                    disabled={loading}
                    accessible={true}
                    accessibilityLabel={`Adhérent ${a.prenom} ${a.nom}`}
                    accessibilityHint="Sélectionner cet adhérent"
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectedAdherent?.id === a.id }}
                  >
                    <Text style={[
                      styles.optionText,
                      selectedAdherent?.id === a.id && styles.selectedText
                    ]}>
                      {a.prenom} {a.nom}
                    </Text>
                    {selectedAdherent?.id === a.id && (
                      <Ionicons name="checkmark-circle" size={20} color="#6B46C1" style={styles.checkIcon} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ) : !loading && (
              <Text style={styles.emptyText}>Aucun adhérent disponible</Text>
            )}
          </View>
        </View>

        {/* Mois */}
        <View style={styles.contentCard}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Mois à payer</Text>
            </View>
            <View style={styles.optionsGrid}>
              {months.map(month => (
                <TouchableOpacity
                  key={month}
                  style={[
                    styles.option,
                    selectedMonths.includes(month) && styles.selected
                  ]}
                  onPress={() =>
                    setSelectedMonths(prev =>
                      prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month]
                    )
                  }
                  disabled={loading}
                  accessible={true}
                  accessibilityLabel={`Mois de ${month}`}
                  accessibilityHint={`${selectedMonths.includes(month) ? 'Désélectionner' : 'Sélectionner'} le mois de ${month}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedMonths.includes(month) }}
                >
                  <Text style={[
                    styles.optionText,
                    selectedMonths.includes(month) && styles.selectedText
                  ]}>
                    {month}
                  </Text>
                  {selectedMonths.includes(month) && (
                    <Ionicons name="checkmark-circle" size={20} color="#6B46C1" style={styles.checkIcon} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Activités */}
        <View style={styles.contentCard}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Activités</Text>
            </View>
            {availableActivities.length > 0 ? (
              <View style={styles.optionsGrid}>
                {availableActivities.map(activity => (
                  <TouchableOpacity
                    key={activity.id || `activity-${activity.nom}`}
                    style={[
                      styles.option,
                      selectedActivities.includes(activity.nom) && styles.selected
                    ]}
                    onPress={() =>
                      setSelectedActivities(prev =>
                        prev.includes(activity.nom) ? prev.filter(a => a !== activity.nom) : [...prev, activity.nom]
                      )
                    }
                    disabled={loading}
                    accessible={true}
                    accessibilityLabel={`Activité ${activity.nom}`}
                    accessibilityHint={`${selectedActivities.includes(activity.nom) ? 'Désélectionner' : 'Sélectionner'} l'activité ${activity.nom}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectedActivities.includes(activity.nom) }}
                  >
                    <Text style={[
                      styles.optionText,
                      selectedActivities.includes(activity.nom) && styles.selectedText
                    ]}>
                      {activity.nom} - {activity.prix} €
                    </Text>
                    {selectedActivities.includes(activity.nom) && (
                      <Ionicons name="checkmark-circle" size={20} color="#6B46C1" style={styles.checkIcon} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ) : selectedAdherent && !loading && (
              <Text style={styles.emptyText}>Aucune activité disponible pour cet adhérent</Text>
            )}
          </View>
        </View>

        {/* Récapitulatif */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Récapitulatif</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Adhérent</Text>
            <Text style={styles.summaryValue}>
              {selectedAdherent ? `${selectedAdherent.prenom} ${selectedAdherent.nom}` : '-'}
            </Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Activités</Text>
            <Text style={styles.summaryValue}>
              {selectedActivities.length > 0 ? selectedActivities.join(', ') : '-'}
            </Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Période</Text>
            <Text style={styles.summaryValue}>
              {selectedMonths.length > 0 ? selectedMonths.join(', ') : '-'}
            </Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total à payer</Text>
            <Text style={styles.totalValue}>{calculateTotal().toFixed(2)} €</Text>
          </View>
        </View>

        {/* Options de paiement */}
        <View style={styles.contentCard}>
          <TouchableOpacity
            style={[
              styles.button,
              (!isFormComplete() || loading) && styles.buttonDisabled
            ]}
            onPress={() => setShowLocalForm(true)}
            disabled={!isFormComplete() || loading}
            accessible={true}
            accessibilityLabel="Payer en local"
            accessibilityHint="Ouvre le formulaire de paiement en local"
            accessibilityRole="button"
          >
            <Ionicons name="cash-outline" size={20} color="white" />
            <Text style={styles.buttonText}>Payer en local</Text>
          </TouchableOpacity>

          <View style={{ height: 12 }} />

          <TouchableOpacity
            style={[
              styles.konnectButton,
              (!isFormComplete() || loading) && styles.buttonDisabled
            ]}
            onPress={handleKonnectPayment}
            disabled={!isFormComplete() || loading}
            accessible={true}
            accessibilityLabel="Payer avec Konnect"
            accessibilityHint="Effectue un paiement en ligne avec Konnect"
            accessibilityRole="button"
          >
            <Ionicons name="card-outline" size={20} color="white" />
            <Text style={styles.buttonText}>Payer avec Konnect</Text>
          </TouchableOpacity>
        </View>

        {showLocalForm && (
          <View style={styles.contentCard}>
            <Text style={styles.summaryTitle}>Paiement local</Text>
            <Text style={styles.summaryLabel}>Parent</Text>
            <Text style={styles.summaryValue}>{parentInfo.firstName || '-'} {parentInfo.lastName || '-'}</Text>
            <Text style={styles.summaryLabel}>Email</Text>
            <Text style={styles.summaryValue}>{parentInfo.email || '-'}</Text>
            <Text style={styles.summaryLabel}>Téléphone</Text>
            <Text style={styles.summaryValue}>{parentInfo.phoneNumber || '-'}</Text>

            <View style={{ height: 16 }} />

            <TouchableOpacity
              style={[
                styles.button,
                (loading || !isFormComplete()) && styles.buttonDisabled
              ]}
              onPress={handleLocalPayment}
              disabled={loading || !isFormComplete()}
              accessible={true}
              accessibilityLabel="Confirmer paiement local"
              accessibilityHint="Confirme le paiement en local"
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>Confirmer paiement local</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowLocalForm(false)}
              disabled={loading}
              accessible={true}
              accessibilityLabel="Annuler"
              accessibilityHint="Ferme le formulaire de paiement local"
              accessibilityRole="button"
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Spacer for better scrolling */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    backgroundColor: '#f0f9ff',
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#6B46C1',
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#fff5f5',
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    marginLeft: 10,
    color: '#e53e3e',
    flex: 1,
  },
  container: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#6B46C1',
    padding: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  backButton: {
    padding: 8,
  },
  contentCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  section: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    margin: 6,
    minWidth: '45%',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selected: {
    backgroundColor: '#EBF4FF',
    borderColor: '#6B46C1',
  },
  optionText: {
    color: '#333',
    flex: 1,
  },
  selectedText: {
    color: '#6B46C1',
    fontWeight: '500',
  },
  checkIcon: {
    marginLeft: 4,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    color: '#666',
    fontSize: 14,
    marginBottom: 4,
  },
  summaryValue: {
    color: '#333',
    fontWeight: '500',
    fontSize: 14,
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  totalValue: {
    color: '#6B46C1',
    fontSize: 20,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#6B46C1',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonDisabled: {
    backgroundColor: '#a0aec0',
    opacity: 0.7,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  konnectButton: {
    backgroundColor: '#4A5568',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  cancelButton: {
    marginTop: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#6B46C1',
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    padding: 16,
    fontStyle: 'italic',
  },
});