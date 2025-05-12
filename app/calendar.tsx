import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Calendar } from 'react-native-calendars';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '@/services/api';

// URL de base à configurer depuis l'environnement ou les paramètres de l'application

const BASE_URL = 'http://192.168.64.138:8080/api/sessions';

// Interfaces améliorées
interface Adherent {
  id: number;
  nom: string;
  prenom: string;
}

interface Competition {
  id: number;
  nom: string;
  description: string;
  date: string;
  resultat: string;
  lieu: string;
  winningPercentage: number;
}

interface Session {
  id: number;
  adherent: string;
  activity: string;
  time: string;
  location: string;
  date: string;
  activite?: string; // Champ alternatif d'API
  lieu?: string;     // Champ alternatif d'API
}

interface Information {
  id: number;
  titre: string;
  description: string;
  type: string;
  dateDebut: string;
  dateFin: string;
  lieu: string;
  audience: string;
  time?: string;
}

interface CalendarSessions {
  [date: string]: Session[];
}

interface MarkedDates {
  [date: string]: {
    selected?: boolean;
    selectedColor?: string;
    selectedTextColor?: string;
    marked?: boolean;
    dotColor?: string;
  };
}

// Fonction pour récupérer les séances depuis l'API avec logging amélioré
const getCalendarSessions = async (params: {
  coachId?: number;
  adherentId?: number;
  parentId?: number;
  activiteId?: number;
  equipeId?: number;
  lieuId?: number;
  month?: number;
  year?: number;
}) => {
  try {
    console.log('Fetching sessions with params:', JSON.stringify(params));
    const token = await AsyncStorage.getItem('token');
    
    if (!token) {
      console.error('Aucun token disponible');
      throw new Error('Aucun token disponible');
    }
    
    console.log('API URL:', `${BASE_URL}/calendar`);
    
    const response = await axios.get(`${BASE_URL}/calendar`, {
      params,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    console.log('Sessions API response:', JSON.stringify(response.data));
    return response.data;
  } catch (err) {
    const error = err as any;
    console.error('Erreur API avec token :', error);
    console.error('Status:', error.response?.status);
    console.error('Data:', JSON.stringify(error.response?.data));
    throw err;
  }
};

export default function CalendarScreen() {
  const [selected, setSelected] = useState('');
  const [sessions, setSessions] = useState<CalendarSessions>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parentData, setParentData] = useState<{ id: number, adherents: Adherent[] } | null>(null);
  const [currentAdherent, setCurrentAdherent] = useState<Adherent | null>(null);
  const [informations, setInformations] = useState<Information[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const router = useRouter();

  // Obtenir le mois et l'année actuels pour la requête initiale
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  // Fonction pour formater les dates dans un format cohérent (YYYY-MM-DD)
  const formatISODate = (dateStr: string | Date) => {
    if (!dateStr) return '';
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return date.toISOString().split('T')[0];
  };

<<<<<<< HEAD
const fetchCompetitions = async (parentId: number) => {
  try {
    console.log('Fetching competitions for parentId:', parentId);

    const res = await API.get(`/competitions/competitions/parent/${parentId}`); // ✅ BaseURL et headers déjà gérés
    console.log('Competitions fetched:', JSON.stringify(res.data));
    
    setCompetitions(res.data);
  } catch (err: any) {
    console.error("Erreur compétitions:", err);
    console.error('Status:', err.response?.status);
    console.error('Data:', JSON.stringify(err.response?.data));
  }
};

  
const getInformationsByParent = async (parentId: number) => {
  try {
    console.log('Fetching informations for parentId:', parentId);
    
    const response = await API.get(`/informations/by-parent/${parentId}`); // ✅ IP et token gérés automatiquement
    
    console.log('Informations fetched:', JSON.stringify(response.data));
    return response.data;
  } catch (err: any) {
    console.error('Erreur lors du chargement des informations :', err);
    console.error('Status:', err.response?.status);
    console.error('Data:', JSON.stringify(err.response?.data));
    return [];
  }
};
 
  // Charger les données du parent et ses adhérents

useEffect(() => {
  const loadParentData = async () => {
    try {
      // 👉 Appel API pour récupérer le parent et ses adhérents
      const response = await API.get('/parents/me'); // ✅ Token + baseURL gérés automatiquement
      const parentData = response.data;

      // 📝 Stockage dans AsyncStorage pour usage ultérieur
      await AsyncStorage.setItem('parent', JSON.stringify(parentData));
      setParentData(parentData);

      console.log('📦 parentData depuis l\'API:', parentData);
      console.log('👧 Liste des adherents:', parentData.adherents);

      // ✅ Chargement compétitions
      if (parentData?.id) {
        await fetchCompetitions(parentData.id);
=======
  const fetchCompetitions = async (parentId: number) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.error('Aucun token disponible pour les compétitions');
        return;
      }
      
      console.log('Fetching competitions for parentId:', parentId);
      const res = await axios.get(`http://192.168.64.138:8080/api/competitions/competitions/parent/${parentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Competitions fetched:', JSON.stringify(res.data));
      setCompetitions(res.data);
    } catch (err) {
      const error = err as any;
      console.error("Erreur compétitions:", error);
      console.error('Status:', error.response?.status);
      console.error('Data:', JSON.stringify(error.response?.data));
    }
  };
  
  const getInformationsByParent = async (parentId: number) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.error('Aucun token disponible pour les informations');
        return [];
      }
      
      console.log('Fetching informations for parentId:', parentId);
      const response = await axios.get(`http://192.168.64.138:8080/api/informations/by-parent/${parentId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      console.log('Informations fetched:', JSON.stringify(response.data));
      return response.data;
    } catch (err) {
      const error = err as any;
      console.error('Erreur lors du chargement des informations :', error);
      console.error('Status:', error.response?.status);
      console.error('Data:', JSON.stringify(error.response?.data));
      return [];
    }
  };
 
  // Charger les données du parent et ses adhérents
  useEffect(() => {
    const loadParentData = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          setError("Token non disponible");
          setLoading(false);
          return;
        }
  
        // 👉 Appel API pour récupérer le parent et ses adhérents
        const response = await axios.get('http://192.168.64.138:8080/api/parents/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
  
        const parentData = response.data;
  
        // 📝 Stockage dans AsyncStorage pour usage ultérieur
        await AsyncStorage.setItem('parent', JSON.stringify(parentData));
        setParentData(parentData);
  
        console.log('📦 parentData depuis l\'API:', parentData);
        console.log('👧 Liste des adherents:', parentData.adherents);
  
        // ✅ Chargement compétitions
        if (parentData?.id) {
          await fetchCompetitions(parentData.id);
        }
  
        // ✅ Chargement du premier adhérent et ses séances
        if (parentData.adherents && parentData.adherents.length > 0) {
          const firstAdherent = parentData.adherents[0];
          setCurrentAdherent(firstAdherent);
          await loadSessions(currentMonth, currentYear, firstAdherent.id);
        }
  
      } catch (err) {
        console.error("Erreur lors du chargement des données du parent:", err);
        setError("Impossible de charger les données du parent");
      } finally {
        setLoading(false);
>>>>>>> 7247ae8c5682a5dc3ac8097e5cf313d9ead1a58e
      }

      // ✅ Chargement du premier adhérent et ses séances
      if (parentData.adherents && parentData.adherents.length > 0) {
        const firstAdherent = parentData.adherents[0];
        setCurrentAdherent(firstAdherent);
        await loadSessions(currentMonth, currentYear, firstAdherent.id);
      }

    } catch (err) {
      console.error("Erreur lors du chargement des données du parent:", err);
      setError("Impossible de charger les données du parent");
    } finally {
      setLoading(false);
    }
  };

  loadParentData();
}, []);

  // Charger les informations quand les données du parent sont disponibles
  useEffect(() => {
    if (parentData && parentData.id) {
      console.log('Chargement des informations pour le parent ID:', parentData.id);
      getInformationsByParent(parentData.id).then((infos) => {
        console.log(`${infos.length} informations chargées`);
        setInformations(infos);
      });
    }
  }, [parentData]);

  // Effet pour charger les séances quand l'adhérent est sélectionné
  useEffect(() => {
    if (parentData && currentAdherent) {
      console.log(`Chargement des séances pour l'adhérent ${currentAdherent.prenom} ${currentAdherent.nom} (ID: ${currentAdherent.id})`);
      loadSessions(currentMonth, currentYear);
    }
    
  }, [parentData, currentAdherent]);

  const loadSessions = async (month: number, year: number, adherentIdOverride?: number) => {
    if (!parentData || (!currentAdherent && !adherentIdOverride)) return;
  
    const adherentId = adherentIdOverride || currentAdherent.id;
  
    try {
      setLoading(true);
      console.log(`Chargement des séances pour le mois ${month}/${year}`);
      
      const params = {
        parentId: parentData.id,
        adherentId: currentAdherent.id,
        month,
        year
      };
      
      console.log('Paramètres de requête:', JSON.stringify(params));
      const data = await getCalendarSessions({
        parentId: parentData.id,
        adherentId,
        month,
        year
      });
           
      // Formater les données pour correspondre à notre structure
      const formattedSessions: CalendarSessions = {};
     
      if (Array.isArray(data)) {
        console.log(`${data.length} séances récupérées de l'API`);
        
        data.forEach((session, index) => {
          if (session && session.date) {
            const dateKey = formatISODate(session.date);
            console.log(`Session ${index+1} pour la date ${dateKey}:`, JSON.stringify(session));
           
            if (!formattedSessions[dateKey]) {
              formattedSessions[dateKey] = [];
            }
           
            formattedSessions[dateKey].push({
              id: session.id || 0,
              adherent: session.adherent || 'Non spécifié',
              // Utiliser les champs appropriés de l'API
              activity: session.activite || session.activity || 'Activité non spécifiée',
              time: session.time || 'Heure non spécifiée',
              location: session.lieu || session.location || 'Lieu non spécifié',
              date: session.date
            });
          } else {
            console.warn(`Session ${index+1} sans date valide:`, JSON.stringify(session));
          }
        });
        
        console.log('Sessions formatées:', JSON.stringify(formattedSessions));
      } else {
        console.warn('Réponse API inattendue (pas un tableau):', JSON.stringify(data));
      }
     
      setSessions(formattedSessions);
      setError(null);
    } catch (err) {
      const error = err as any;
      console.error("Erreur lors du chargement des séances:", error);
      console.error('Status:', error.response?.status);
      console.error('Data:', JSON.stringify(error.response?.data));
      setError("Impossible de charger les séances. Veuillez réessayer.");
      
      // Afficher une alerte avec l'erreur pour le débogage
      Alert.alert(
        "Erreur de chargement",
        `Impossible de charger les séances: ${error.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  // Changer l'adhérent sélectionné
  const changeAdherent = (adherent: Adherent) => {
    console.log(`Changement d'adhérent pour ${adherent.prenom} ${adherent.nom} (ID: ${adherent.id})`);
    setCurrentAdherent(adherent);
    setSessions({}); // Réinitialiser les séances lors du changement d'adhérent
    setSelected(''); // Réinitialiser le jour sélectionné
    loadSessions(currentMonth, currentYear); // Recharger les séances pour le nouvel adhérent
  };

  const onDayPress = (day: { dateString: string }) => {
    console.log('Jour sélectionné:', day.dateString);
    setSelected(day.dateString);
  };

  const getSessionsForDay = (day: string) => {
    const sessions_for_day = sessions[day] || [];
    // Log pour débogage
    if (sessions_for_day.length > 0) {
      console.log(`${sessions_for_day.length} séances trouvées pour le ${day}`);
    }
    return sessions_for_day;
  };

  // Pour gérer le changement de mois dans le calendrier
  const onMonthChange = (month: { month: number; year: number }) => {
    console.log(`Changement de mois: ${month.month}/${month.year}`);
    loadSessions(month.month, month.year);
  };

  // Formater la date pour l'affichage
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
      return date.toLocaleDateString('fr-FR', options);
    } catch (e) {
      console.error('Erreur de formatage de date:', dateString, e);
      return dateString;
    }
  };

  // Obtenir la date d'aujourd'hui et de demain au format YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = formatISODate(new Date(Date.now() + 86400000));

  // Préparer les dates marquées pour le calendrier
  const getMarkedDates = (): MarkedDates => {
    const markedDates: MarkedDates = {};
    const now = new Date();
 
    if (selected) {
      markedDates[selected] = {
        selected: true,
        selectedColor: '#6D28D9',
        selectedTextColor: '#fff',
      };
    }
 
    Object.entries(sessions).forEach(([date, sessionList]) => {
      if (date === selected) return;
 
      const sessionDate = new Date(date);
      const isPast = sessionDate < now && date !== selected;
 
      let dotColor = '#8B5CF6'; // default
 
      if (isPast) {
        dotColor = '#EF4444'; // red for past sessions
      } else {
        if (sessionList.some(session => isActivityOfType(session, 'information'))) {
          dotColor = '#0E7490'; // blue for information
        } else if (sessionList.some(session => isActivityOfType(session, 'football'))) {
          dotColor = '#22C55E'; // green
        } else if (sessionList.some(session => isActivityOfType(session, 'basket'))) {
          dotColor = '#F59E0B'; // orange
        }
      }
 
      markedDates[date] = {
        marked: true,
        dotColor,
      };
    });
 
    return markedDates;
  };
 
  // Détermine dynamiquement si une activité est d'un certain type
  const isActivityOfType = (session: Session, type: string) => {
    // Vérifier dans les deux champs possibles (activity ou activite)
    const activityField = session.activity || session.activite || '';
    return typeof activityField === 'string' && activityField.toLowerCase().includes(type);
  };

  // Récupérer les informations à venir
  const getUpcomingInformations = () => {
    return informations
      .sort((a, b) => new Date(a.dateDebut).getTime() - new Date(b.dateDebut).getTime())
      .slice(0, 5);
  };
  
  // Fonction pour obtenir les événements récents
  const getRecentEvents = (daysBack: number = 7) => {
    const now = new Date();
    const pastDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    const result = [];
   
    for (const date of Object.keys(sessions)) {
      const sessionDate = new Date(date);
     
      if (sessionDate < now && sessionDate > pastDate) {
        for (const session of sessions[date]) {
          result.push({ date, session });
        }
      }
    }
   
    return result;
  };
  
  const CompetitionCard = ({ comp }: { comp: Competition }) => {
    const isWin = comp.resultat?.toLowerCase() === "win";
    return (
      <View style={{
        borderWidth: 2,
        borderColor: isWin ? "#22C55E" : "#EF4444",
        backgroundColor: "#FFFFFF",
        padding: 12,
        marginBottom: 12,
        borderRadius: 10,
      }}>
        <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{comp.nom}</Text>
        <Text style={{ color: "#6B7280", marginBottom: 6 }}>{formatDate(comp.date)}</Text>
        <Text style={{ color: isWin ? "#22C55E" : "#EF4444", fontWeight: '600' }}>
          {isWin ? "Gagnée" : "Perdue"} • {(comp.winningPercentage || 0).toFixed(0)}%
        </Text>
        <Text style={{ fontStyle: 'italic', color: '#374151' }}>{comp.description}</Text>
      </View>
    );
  };
  
  // Déterminer l'icône à utiliser en fonction du type d'activité
  const getActivityIcon = (session: Session) => {
    if (isActivityOfType(session, 'information')) return "information-circle-outline";
    if (isActivityOfType(session, 'football')) return "football-outline";
    if (isActivityOfType(session, 'basket')) return "basketball-outline";
    if (isActivityOfType(session, 'natation')) return "water-outline";
    if (isActivityOfType(session, 'tennis')) return "tennisball-outline";
    // Icône par défaut
    return "barbell-outline";
  };

  // Debug info
  console.log('Current adherent:', JSON.stringify(currentAdherent));
  console.log('Today:', today, 'Sessions for today:', getSessionsForDay(today).length);
  console.log('Tomorrow:', tomorrow, 'Sessions for tomorrow:', getSessionsForDay(tomorrow).length);
  
  // Rendre un indicateur de chargement si aucune donnée n'est disponible
  if (loading && Object.keys(sessions).length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#6D28D9" />
        <Text style={styles.loadingText}>Chargement des séances...</Text>
      </View>
    );
  }

  // Afficher un message d'erreur si le chargement a échoué
  if (error && Object.keys(sessions).length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadSessions(currentMonth, currentYear)}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#6D28D9" />
        </TouchableOpacity>
        <Text style={styles.title}>Planning des Activités</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Sélecteur d'adhérent */}
        {parentData && parentData.adherents && parentData.adherents.length > 0 && (
          <View style={styles.adherentSelectorContainer}>
            <Text style={styles.adherentSelectorTitle}>Sélectionner un adhérent</Text>
            <FlatList
              data={parentData.adherents}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.adherentButton,
                    currentAdherent?.id === item.id && styles.adherentButtonActive
                  ]}
                  onPress={() => changeAdherent(item)}
                >
                  <Ionicons
                    name="person"
                    size={18}
                    color={currentAdherent?.id === item.id ? '#FFFFFF' : '#6D28D9'}
                  />
                  <Text
                    style={[
                      styles.adherentButtonText,
                      currentAdherent?.id === item.id && styles.adherentButtonTextActive
                    ]}
                  >
                    {item.prenom} {item.nom}
                  </Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.adherentList}
            />
          </View>
        )}

        {/* Séances du jour et demain */}
        <View style={styles.upcomingContainer}>
          <View style={styles.todayHeader}>
            <Ionicons name="today-outline" size={22} color="#6D28D9" />
            <Text style={styles.todayTitle}>Aujourd'hui</Text>
          </View>
         
          {getSessionsForDay(today).length > 0 ? (
            getSessionsForDay(today).map((session, index) => (
              <View key={`today-${index}`} style={styles.sessionCard}>
                <View style={styles.sessionTime}>
                  <Text style={styles.timeText}>{session.time}</Text>
                </View>
                <View style={styles.sessionDetails}>
                  <Text style={styles.activityName}>{session.activity}</Text>
                  <Text style={styles.adherentText}>{session.adherent}</Text>
                  <View style={styles.locationRow}>
                    <Ionicons name="location-outline" size={14} color="#6B7280" />
                    <Text style={styles.locationText}>{session.location}</Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noSessionText}>Aucune séance aujourd'hui</Text>
          )}

          <View style={styles.tomorrowHeader}>
            <Ionicons name="calendar-outline" size={22} color="#8B5CF6" />
            <Text style={styles.tomorrowTitle}>Demain</Text>
          </View>
         
          {getSessionsForDay(tomorrow).length > 0 ? (
            getSessionsForDay(tomorrow).map((session, index) => (
              <View key={`tomorrow-${index}`} style={styles.sessionCard}>
                <View style={styles.sessionTime}>
                  <Text style={styles.timeText}>{session.time}</Text>
                </View>
                <View style={styles.sessionDetails}>
                  <Text style={styles.activityName}>{session.activity}</Text>
                  <Text style={styles.adherentText}>{session.adherent}</Text>
                  <View style={styles.locationRow}>
                    <Ionicons name="location-outline" size={14} color="#6B7280" />
                    <Text style={styles.locationText}>{session.location}</Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noSessionText}>Aucune séance demain</Text>
          )}
        </View>

        {/* Calendar */}
        <View style={styles.calendarContainer}>
          <Text style={styles.calendarTitle}>
            Calendrier des activités {currentAdherent && `de ${currentAdherent.prenom} ${currentAdherent.nom}`}
          </Text>
          <Calendar
            onDayPress={onDayPress}
            onMonthChange={onMonthChange}
            markedDates={getMarkedDates()}
            theme={styles.calendarTheme}
          />
        </View>

        {/* Selected Day Info */}
        {selected && (
          <View style={styles.selectedDayInfo}>
            <View style={styles.selectedDayHeader}>
              <Ionicons name="calendar" size={22} color="#6D28D9" />
              <Text style={styles.selectedDayTitle}>{formatDate(selected)}</Text>
            </View>
           
            {getSessionsForDay(selected).length > 0 ? (
              getSessionsForDay(selected).map((session, index) => (
                <View key={`selected-${index}`} style={styles.detailedSessionCard}>
                  <View style={styles.sessionCardHeader}>
                    <Text style={styles.sessionCardTime}>{session.time}</Text>
                    <Text style={styles.sessionCardActivity}>{session.activity}</Text>
                  </View>
                  <View style={styles.sessionCardBody}>
                    <View style={styles.sessionInfoRow}>
                      <Ionicons name="person-outline" size={16} color="#6B7280" />
                      <Text style={styles.sessionInfoText}>{session.adherent}</Text>
                    </View>
                    <View style={styles.sessionInfoRow}>
                      <Ionicons name="location-outline" size={16} color="#6B7280" />
                      <Text style={styles.sessionInfoText}>{session.location}</Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.noSessionCard}>
                <Ionicons name="information-circle-outline" size={24} color="#9CA3AF" />
                <Text style={styles.noSessionCardText}>Aucune séance prévue ce jour</Text>
              </View>
            )}
          </View>
        )}

        {/* Informations importantes */}
        <View style={styles.remindersContainer}>
          <View style={styles.reminderHeader}>
            <Ionicons name="notifications-outline" size={24} color="#0E7490" />
            <Text style={styles.reminderTitle}>Informations Importantes</Text>
          </View>
         
          {informations.length > 0 && getUpcomingInformations().length > 0 ? (
            getUpcomingInformations().map((info, index) => (
              <View key={`info-${info.id}-${index}`} style={styles.reminderCard}>
                <View style={styles.reminderIconContainer}>
                  <Ionicons name="information-circle-outline" size={22} color="#fff" />
                </View>
                <View style={styles.reminderContent}>
                  <Text style={styles.reminderDate}>
                    {formatDate(info.dateDebut)} {info.time && `• ${info.time}`}
                  </Text>

                  <Text style={styles.reminderText}>{info.titre}</Text>

                  <Text style={styles.reminderDescription}>{info.description}</Text>

                  <Text style={styles.reminderDescription}>
                    Type : {info.type}
                  </Text>

                  <Text style={styles.reminderDescription}>
                    Audience : {info.audience}
                  </Text>

                  {info.lieu && (
                    <View style={styles.locationRow}>
                      <Ionicons name="location-outline" size={14} color="#6B7280" />
                      <Text style={styles.locationText}>
                        {info.lieu}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noSessionText}>Aucune information importante à venir</Text>
          )}
         
          {/* Affichage des compétitions passées */}
          {competitions.filter(comp => new Date(comp.date) < new Date()).length > 0 && (
            <View style={styles.pastEvents}>
              <Text style={styles.pastEventsTitle}>Compétitions récentes</Text>

              {competitions
                .filter(comp => new Date(comp.date) < new Date())
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 5)
                .map((comp) => {
                  const isWin = comp.resultat?.toLowerCase() === 'win';
                  return (
                    <View
                      key={`comp-${comp.id}`}
                      style={[
                        styles.reminderCard,
                        styles.pastReminderCard,
                        {
                          borderLeftWidth: 5,
                          borderLeftColor: isWin ? '#22C55E' : '#EF4444',
                        },
                      ]}
                    >
                      <View style={[styles.reminderIconContainer, styles.pastIconContainer]}>
                        <Ionicons name={isWin ? "trophy-outline" : "close-circle-outline"} size={22} color="#fff" />
                      </View>
                      <View style={styles.reminderContent}>
                        <Text style={styles.pastReminderDate}>{formatDate(comp.date)}</Text>
                        <Text style={[styles.pastReminderText, { fontWeight: 'bold' }]}>
                          {comp.nom}
                        </Text>
                        <Text style={styles.pastReminderPerson}>
                        {isWin ? 'Gagnée' : 'Perdue'} • {(comp.winningPercentage || 0).toFixed(0)}%
                        </Text>
                      </View>
                    </View>
                  );
                })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6D28D9',
    fontWeight: '500',
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#6D28D9',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#F5F3FF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#6D28D9',
  },
  // Styles pour le sélecteur d'adhérent
  adherentSelectorContainer: {
    margin: 16,
    marginBottom: 0,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  adherentSelectorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 12,
  },
  adherentList: {
    paddingVertical: 8,
  },
  adherentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  adherentButtonActive: {
    backgroundColor: '#6D28D9',
    borderColor: '#6D28D9',
  },
  adherentButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6D28D9',
    marginLeft: 6,
  },
  adherentButtonTextActive: {
    color: '#FFFFFF',
  },
  upcomingContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  todayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  todayTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6D28D9',
    marginLeft: 8,
  },
  sessionCard: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginBottom: 10,
    overflow: 'hidden',
  },
  sessionTime: {
    width: 70,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    paddingVertical: 12,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6D28D9',
  },
  sessionDetails: {
    flex: 1,
    padding: 12,
  },
  activityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  adherentText: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 4,
  },
  tomorrowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  tomorrowTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8B5CF6',
    marginLeft: 8,
  },
  noSessionText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginLeft: 8,
    marginBottom: 10,
  },
  calendarContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  calendarTheme: {
    backgroundColor: '#FFFFFF',
    calendarBackground: '#FFFFFF',
    textSectionTitleColor: '#6B7280',
    selectedDayBackgroundColor: '#6D28D9',
    selectedDayTextColor: '#FFFFFF',
    todayTextColor: '#6D28D9',
    dayTextColor: '#1F2937',
    textDisabledColor: '#D1D5DB',
    dotColor: '#8B5CF6',
    selectedDotColor: '#FFFFFF',
    arrowColor: '#6D28D9',
    monthTextColor: '#1F2937',
    textDayFontWeight: '500',
    textMonthFontWeight: 'bold',
    textDayHeaderFontWeight: '600',
    textDayFontSize: 16,
    textMonthFontSize: 18,
    textDayHeaderFontSize: 14,
  },
  selectedDayInfo: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  selectedDayTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6D28D9',
    marginLeft: 8,
    textTransform: 'capitalize',
  },
  detailedSessionCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    marginBottom: 10,
    overflow: 'hidden',
  },
  sessionCardHeader: {
    backgroundColor: '#EDE9FE',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionCardTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6D28D9',
  },
  sessionCardActivity: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
  },
  sessionCardBody: {
    padding: 12,
  },
  sessionInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sessionInfoText: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 8,
  },
  noSessionCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  noSessionCardText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginLeft: 8,
  },
  remindersContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 32,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  reminderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0E7490',
    marginLeft: 8,
  },
  reminderCard: {
    backgroundColor: '#E0F2F7',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0E7490',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reminderContent: {
    flex: 1,
  },
  reminderDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0E7490',
    marginBottom: 4,
  },
  reminderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  reminderDescription: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 2,
  },
  pastEvents: {
    marginTop: 24,
  },
  pastEventsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 12,
  },
  pastReminderCard: {
    backgroundColor: '#F3F4F6',
  },
  pastIconContainer: {
    backgroundColor: '#6B7280',
  },
  pastReminderDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  pastReminderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  pastReminderPerson: {
    fontSize: 14,
    color: '#4B5563',
  },
});
