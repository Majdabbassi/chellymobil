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
import API from '@/services/api'; // ✅ Utilisation de l'API centralisée
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getAdherentsOfCurrentParent, getActivitiesByAdherent, getCurrentParentInfo } from '@/services/adherent';
import * as Linking from 'expo-linking';
import { AdherentDTO } from '@/types/AdherentDTO';
import { Calendar } from 'react-native-calendars';
import { getAllActivities } from '@/services/avtivities';
import AwesomeAlert from 'react-native-awesome-alerts';

// Get API base URL from environment variables or fallback to a default
const API_BASE_URL = Constants?.expoConfig?.extra?.apiUrl ?? 'http://192.168.64.138:8080';

export default function PaymentSelectionScreen() {
  const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const [sessionDates, setSessionDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [adherents, setAdherents] = useState<AdherentDTO[]>([]);
  const [selectedAdherent, setSelectedAdherent] = useState<AdherentDTO | null>(null);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [availableActivities, setAvailableActivities] = useState<{ id: number; nom: string; prix: number }[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [activityPrices, setActivityPrices] = useState<Record<string, number>>({});
  const [showLocalForm, setShowLocalForm] = useState(false);
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [paymentPeriodType, setPaymentPeriodType] = useState<'perSession' | 'perMonth' | 'per3Months'>('perMonth');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSessionDetails, setSelectedSessionDetails] = useState<any>(null);
  const [sessionsMap, setSessionsMap] = useState<Record<string, any>>({});
  const [paidMonths, setPaidMonths] = useState<string[]>([]);
  const [parentInfo, setParentInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: ''
  });
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [alreadyPaidMonth, setAlreadyPaidMonth] = useState<string | null>(null);

  const handleApiError = useCallback((error: any, customMessage = 'Une erreur est survenue') => {
    console.error(customMessage, error);
    const errorMessage = error?.response?.data?.message || error?.message || customMessage;
    setError(errorMessage);
    Alert.alert('Erreur', errorMessage);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (
      paymentPeriodType === 'perMonth' &&
      selectedActivities.length > 0 &&
      availableActivities.length > 0
    ) {
      const selected = availableActivities.find(a => a.nom === selectedActivities[0]);
      if (selected) {
        fetchPaidMonths(selected.id);
      }
    }
  }, [selectedActivities, paymentPeriodType, availableActivities]);

  useEffect(() => {
    if (selectedAdherent) {
      handleAdherentSelect(selectedAdherent);
    }
  }, [paymentPeriodType]);

  useEffect(() => {
    const loadSessionsForActivity = async () => {
      if (paymentPeriodType !== 'perSession' || selectedActivities.length !== 1) {
        setSelectedDate('');
        setSelectedSessionDetails(null);
        setSessionDates([]);
        setSessionsMap({});
        return;
      }

      const selectedActivity = availableActivities.find(a => a.nom === selectedActivities[0]);
      if (!selectedActivity) return;

      try {
        const response = await API.get(`/sessions/activite/${selectedActivity.id}`);
        const sessions = response.data;

        const map: Record<string, any> = {};
        sessions.forEach((session: any) => {
          const dateStr = session.dateTime.split('T')[0];
          map[dateStr] = session;
        });

        setSelectedDate('');
        setSelectedSessionDetails(null);
        setSessionDates(Object.keys(map));
        setSessionsMap(map);
      } catch (error) {
        console.error('Erreur chargement des sessions', error);
      }
    };

    loadSessionsForActivity();
  }, [selectedActivities, paymentPeriodType, availableActivities]);

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
          const formattedAdherents = adherentsData.map(adherent => {
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

  // Reset selected months when payment period type changes
  useEffect(() => {
    setSelectedMonths([]);
    setSelectedDate('');
  }, [paymentPeriodType]);

  const fetchPaidMonths = useCallback(async (activityId: number) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/konnect/paid-months?activiteId=${activityId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (Array.isArray(response.data)) {
        setPaidMonths(response.data);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des mois déjà payés :", error);
    }
  }, [token]);

  const handleAdherentSelect = useCallback(async (adherent: AdherentDTO) => {
    setSelectedAdherent(adherent);
    setSelectedActivities([]);
    setAvailableActivities([]);
    setLoading(true);
  
    try {
      if (!adherent || !adherent.id) {
        throw new Error('Adhérent invalide');
      }
  
      const activities = paymentPeriodType === 'perSession'
        ? await getAllActivities()
        : await getActivitiesByAdherent(adherent.id);
  
      if (!Array.isArray(activities)) {
        throw new Error('Format de données invalide');
      }
  
      const formattedActivities = activities.map(activity => ({
        id: 'id' in activity && typeof activity.id === 'number' ? activity.id : 0,
        nom: activity.nom || '',
        prix: activity.prix || 0,
      }));
  
      setAvailableActivities(formattedActivities);
      
      if (paymentPeriodType === 'perMonth' && formattedActivities.length > 0) {
        fetchPaidMonths(formattedActivities[0].id);
      }

      const pricesDict = formattedActivities.reduce<Record<string, number>>((dict, activity) => {
        if (activity && activity.nom) {
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
  }, [handleApiError, paymentPeriodType, fetchPaidMonths]);

  const calculateTotal = useCallback(() => {
    let total = 0;
  
    switch (paymentPeriodType) {
      case 'perSession':
        if (selectedDate && selectedSessionDetails?.prix != null) {
          total = selectedSessionDetails.prix;
        }
        break;
  
      case 'perMonth':
        total = selectedActivities.reduce((sum, name) => {
          return sum + (activityPrices[name] || 0) * selectedMonths.length;
        }, 0);
        break;
  
      case 'per3Months':
        total = selectedActivities.reduce((sum, name) => {
          return sum + (activityPrices[name] || 0) * selectedMonths.length * 3;
        }, 0);
        break;
    }
  
    return total;
  }, [selectedActivities, activityPrices, selectedMonths, paymentPeriodType, selectedDate, selectedSessionDetails]);

  const isFormComplete = useCallback(() => {
    if (!selectedAdherent || selectedActivities.length === 0 || loading) {
      return false;
    }
    
    switch(paymentPeriodType) {
      case 'perSession':
        return !!selectedDate;
      case 'perMonth':
      case 'per3Months':
        return selectedMonths.length > 0;
      default:
        return false;
    }
  }, [selectedAdherent, selectedActivities, loading, paymentPeriodType, selectedDate, selectedMonths]);

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
    Alert.alert('Information incomplète', 'Veuillez compléter toutes les informations nécessaires.');
    return;
  }

  if (!validateParentInfo()) return;

  setLoading(true);

  try {
    if (!selectedAdherent || typeof selectedAdherent.id !== 'number') {
      throw new Error('Adhérent invalide');
    }

    const selectedActivityObjs = availableActivities.filter(a => selectedActivities.includes(a.nom));
    if (selectedActivityObjs.length === 0) {
      throw new Error('Aucune activité valide sélectionnée');
    }

    if (selectedActivityObjs.length > 1) {
      Alert.alert(
        'Information',
        `Pour le paiement en ligne, une seule activité peut être traitée à la fois. Nous allons procéder avec ${selectedActivityObjs[0].nom}.`,
        [{ text: 'Continuer' }, {
          text: 'Annuler', onPress: () => {
            setLoading(false);
            return;
          }
        }]
      );
    }

    const selectedActivity = selectedActivityObjs[0];

    // Vérifier si une session est requise (même pour perMonth → pour date limite interne)
    let sessionId: number | undefined = undefined;
    if (paymentPeriodType !== 'perSession') {
      const sessionResponse = await axios.get(
        `${API_BASE_URL}/api/sessions/next-session?activityId=${selectedActivity.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const session = sessionResponse.data;
      if (!session || !session.id) {
        throw new Error("Aucune session future trouvée pour l'activité sélectionnée.");
      }
      sessionId = session.id;
    }

    const total = Math.round(calculateTotal() * 100);
    const paymentData: any = {
      adherentId: selectedAdherent.id,
      total,
      firstName: parentInfo.firstName,
      lastName: parentInfo.lastName,
      email: parentInfo.email,
      phoneNumber: parentInfo.phoneNumber,
      paymentPeriodType,
    };

    let paymentDescription = '';

    if (paymentPeriodType === 'perSession') {
      if (!selectedSessionDetails || !selectedSessionDetails.id) {
        throw new Error('Aucune session sélectionnée ou détails de session invalides');
      }
      paymentData.sessionId = selectedSessionDetails.id;
      paymentData.sessionDate = selectedDate;
      paymentDescription = `Paiement de séance ${selectedActivity.nom} (${selectedDate}) pour ${selectedAdherent.prenom}`;
    } else {
      paymentData.moisPaiement = selectedMonths.join(',');
      paymentData.months = selectedMonths;
      paymentData.activiteId = selectedActivity.id; // ✅ Ajout essentiel
      paymentDescription = `Paiement de ${selectedActivity.nom} (${selectedMonths.join(', ')}) pour ${selectedAdherent.prenom}`;
    }

    paymentData.description = paymentDescription;

    const paymentResponse = await axios.post(
      `${API_BASE_URL}/api/konnect/pay`,
      paymentData,
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
  handleApiError,
  calculateTotal,
  paymentPeriodType,
  selectedDate,
  selectedSessionDetails
]);


  const handleLocalPayment = useCallback(async () => {
    if (!isFormComplete()) {
      Alert.alert('Information incomplète', 'Veuillez compléter toutes les informations nécessaires.');
      return;
    }

    if (!validateParentInfo()) {
      return;
    }
    
    setLoading(true);
setShowLocalForm(false);
setShowSuccessAlert(true);

    try {
      if (!selectedAdherent || typeof selectedAdherent.id !== 'number') {
        throw new Error("Adhérent sélectionné invalide");
      }
      
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
      
      let paymentData: any = {
        activiteIds: selectedActivityIds,
        payInCash: true,
      };

      if (paymentPeriodType === 'perSession') {
        paymentData.sessionDate = selectedDate;
      } else {
        paymentData.months = selectedMonths;
        paymentData.moisPaiement = selectedMonths.join(',');
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/reservations/by-parent/${selectedAdherent.id}`,
        paymentData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
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
    selectedDate,
    paymentPeriodType,
    token, 
    handleApiError
  ]);
  
  const formatSelectedDate = (dateString: string) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    } catch (e) {
      return dateString;
    }
  };

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
        {/* Type de paiement */}
        <View style={styles.contentCard}>
          <Text style={styles.sectionTitle}>Type de paiement</Text>
          <View style={styles.optionsGrid}>
            {[
              { label: 'Par séance', value: 'perSession' },
              { label: 'Par mois', value: 'perMonth' },
              { label: '3 mois', value: 'per3Months' }
            ].map(option => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.option,
                  paymentPeriodType === option.value && styles.selected
                ]}
                onPress={() => setPaymentPeriodType(option.value as 'perSession' | 'perMonth' | 'per3Months')}
              >
                <Text style={[
                  styles.optionText,
                  paymentPeriodType === option.value && styles.selectedText
                ]}>
                  {option.label}
                </Text>
                {paymentPeriodType === option.value && (
                  <Ionicons name="checkmark-circle" size={20} color="#6B46C1" style={styles.checkIcon} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Sélection de la période selon le type de paiement */}
        {paymentPeriodType === 'perSession' ? (
          <View style={styles.contentCard}>
            <Text style={styles.sectionTitle}>Date de la séance</Text>
            <Calendar
              onDayPress={(day) => {
                setSelectedDate(day.dateString);
                const session = sessionsMap[day.dateString];
                setSelectedSessionDetails(session || null);
              }}
              markedDates={{
                ...Object.keys(sessionsMap).reduce((acc, date) => {
                  const isPast = new Date(date) < new Date(new Date().toDateString());
                  const isSelected = selectedDate === date;

                  acc[date] = {
                    marked: true,
                    selected: isSelected,
                    selectedColor: isSelected ? '#6B46C1' : undefined,
                    dotColor: isPast ? '#e53e3e' : '#6B46C1',
                    disableTouchEvent: false,
                  };
                  return acc;
                }, {} as Record<string, any>)
              }}
              theme={{
                selectedDayBackgroundColor: '#6B46C1',
                arrowColor: '#6B46C1',
                todayTextColor: '#6B46C1',
                textMonthFontWeight: 'bold',
                textDayFontSize: 16,
              }}
            />

            {selectedSessionDetails && (
              <View style={{ marginTop: 12, padding: 12, backgroundColor: '#f0f0ff', borderRadius: 8 }}>
                <Text style={{ fontWeight: 'bold' }}>Détails de la séance :</Text>
                <Text>🕒 Heure : {new Date(selectedSessionDetails.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                <Text>🏟️ Terrain : {selectedSessionDetails.lieu?.nom || 'N/A'}</Text>
                <Text>🎯 Activité : {selectedSessionDetails.activite?.nom || '-'}</Text>
                <Text>💰 Prix : {selectedSessionDetails.prix != null ? `${selectedSessionDetails.prix} €` : '-'}</Text>
              </View>
            )}
          </View>
        ) : (
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
                      selectedMonths.includes(month) && styles.selected,
                      paidMonths.includes(month) && { opacity: 0.5 }
                    ]}
                 onPress={() => {
  if (paidMonths.includes(month)) {
    setAlreadyPaidMonth(month);
    return;
  }

  setSelectedMonths(prev =>
    prev.includes(month)
      ? prev.filter(m => m !== month)
      : [...prev, month]
  );
}}

                    disabled={loading || paidMonths.includes(month)}
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
        )}
<AwesomeAlert
  show={showSuccessAlert}
  showProgress={false}
  title="✅ Paiement confirmé"
  message="Votre paiement local a bien été enregistré."
  closeOnTouchOutside={true}
  closeOnHardwareBackPress={false}
  showConfirmButton={true}
  confirmText="OK"
  confirmButtonColor="#6B46C1"
  onConfirmPressed={() => {
    setShowSuccessAlert(false);
  }}
/>

<AwesomeAlert
  show={alreadyPaidMonth !== null}
  showProgress={false}
  title="⛔ Mois déjà payé"
  message={`Le mois de ${alreadyPaidMonth} a déjà été réglé.`}
  closeOnTouchOutside={true}
  closeOnHardwareBackPress={false}
  showConfirmButton={true}
  confirmText="OK"
  confirmButtonColor="#EF4444"
  onConfirmPressed={() => {
    setAlreadyPaidMonth(null);
  }}
/>

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
              {paymentPeriodType === 'perSession' 
                ? (selectedDate ? formatSelectedDate(selectedDate) : '-')
                : (selectedMonths.length > 0 ? selectedMonths.join(', ') : '-')}
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
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    backgroundColor: 'rgba(107, 70, 193, 0.05)',
    borderRadius: 12,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  loadingText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#6B46C1',
    letterSpacing: 0.3,
  },
  errorContainer: {
    padding: 18,
    backgroundColor: 'rgba(229, 62, 62, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    margin: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#e53e3e',
  },
  errorText: {
    marginLeft: 12,
    color: '#e53e3e',
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  container: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(107, 70, 193, 0.95)',
    paddingHorizontal: 18,
    paddingVertical: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  backButton: {
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  contentCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#6B46C1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
  },
  section: {
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a202c',
    letterSpacing: 0.3,
    position: 'relative',
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(107, 70, 193, 0.3)',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(247, 250, 252, 0.9)',
    borderRadius: 12,
    padding: 16,
    margin: 8,
    minWidth: '45%',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    transition: '0.3s',
  },
  selected: {
    backgroundColor: 'rgba(235, 244, 255, 0.95)',
    borderColor: '#6B46C1',
    borderWidth: 2,
    transform: [{ scale: 1.02 }],
    shadowColor: '#6B46C1',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  optionText: {
    color: '#4a5568',
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  selectedText: {
    color: '#553C9A',
    fontWeight: '600',
  },
  checkIcon: {
    marginLeft: 8,
    backgroundColor: 'rgba(107, 70, 193, 0.1)',
    borderRadius: 20,
    padding: 4,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#6B46C1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
  },
  summaryTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a202c',
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    opacity: 0.9,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 4,
  },
  summaryLabel: {
    color: '#4a5568',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 6,
  },
  summaryValue: {
    color: '#2d3748',
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'right',
    flex: 1,
    marginLeft: 20,
  },
  divider: {
    height: 1.5,
    backgroundColor: 'rgba(107, 70, 193, 0.2)',
    marginVertical: 16,
    borderRadius: 1,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: 'rgba(107, 70, 193, 0.05)',
    borderRadius: 12,
    padding: 16,
  },
  totalLabel: {
    color: '#2d3748',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  totalValue: {
    color: '#6B46C1',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(107, 70, 193, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  button: {
    backgroundColor: '#6B46C1',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#6B46C1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.7,
    shadowOpacity: 0.1,
  },
  buttonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 17,
    marginLeft: 10,
    letterSpacing: 0.5,
  },
  konnectButton: {
    backgroundColor: '#4338CA',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#4338CA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  cancelButton: {
    marginTop: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(107, 70, 193, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(107, 70, 193, 0.2)',
  },
  cancelButtonText: {
    color: '#6B46C1',
    fontWeight: '600',
    fontSize: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#718096',
    padding: 20,
    fontStyle: 'italic',
    fontSize: 16,
    backgroundColor: 'rgba(226, 232, 240, 0.5)',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 8,
  },
  calendarContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'white',
    shadowColor: '#6B46C1',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  sessionDetails: {
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(235, 244, 255, 0.8)',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#6B46C1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sessionDetailsTitle: {
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 8,
    color: '#2d3748',
  },
  sessionDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  sessionDetailsIcon: {
    marginRight: 8,
    width: 20,
    textAlign: 'center',
  },
  sessionDetailsText: {
    color: '#4a5568',
    fontSize: 15,
    flex: 1,
  },
  alertContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.9)',
  },
  alertTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2d3748',
    marginBottom: 16,
    textAlign: 'center',
  },
  alertMessage: {
    fontSize: 16,
    color: '#4a5568',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  alertButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    backgroundColor: '#6B46C1',
    borderRadius: 12,
    shadowColor: '#6B46C1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  alertButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  // Pour le paiement déjà effectué
  alertErrorTitle: {
    color: '#E53E3E',
  },
  alertErrorButton: {
    backgroundColor: '#E53E3E',
    shadowColor: '#E53E3E',
  },
  alertSuccessIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(72, 187, 120, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  alertErrorIcon: {
    backgroundColor: 'rgba(229, 62, 62, 0.1)',
  },
  // Nouveaux styles pour améliorer l'expérience utilisateur
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(226, 232, 240, 0.5)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    color: '#718096',
    fontWeight: '600',
    fontSize: 14,
  },
  activeTabText: {
    color: '#6B46C1',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#E53E3E',
    borderRadius: 12,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Spécifique à la méthode de paiement
  paymentMethodCard: {
    borderRadius: 16,
    padding: 20,
    marginVertical: 10,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cashPayment: {
    backgroundColor: 'rgba(72, 187, 120, 0.05)',
    borderColor: 'rgba(72, 187, 120, 0.3)',
  },
  onlinePayment: {
    backgroundColor: 'rgba(66, 153, 225, 0.05)',
    borderColor: 'rgba(66, 153, 225, 0.3)',
  },
  paymentIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cashIcon: {
    backgroundColor: 'rgba(72, 187, 120, 0.1)',
  },
  onlineIcon: {
    backgroundColor: 'rgba(66, 153, 225, 0.1)',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  cashTitle: {
    color: '#2F855A',
  },
  onlineTitle: {
    color: '#2B6CB0',
  },
  paymentDescription: {
    fontSize: 14,
    color: '#718096',
    lineHeight: 20,
  },
});