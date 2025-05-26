import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  FlatList, 
  Animated,
  Dimensions,
  StatusBar,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import { Calendar } from 'react-native-calendars';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '@/services/api';
import { NotificationDTO } from './NotificationsScreen';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const BASE_URL = 'http://192.168.227.138:8080/api/sessions';

// Interfaces
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
  activite?: string;
  lieu?: string;
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

// Animation Component
const FadeInView = ({ children, delay = 0, style = {} }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [fadeAnim, translateY, delay]);

  return (
    <Animated.View
      style={[
        {
          opacity: fadeAnim,
          transform: [{ translateY: translateY }],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
};

// Pulse Animation Component
const PulseView = ({ children, style = {} }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => pulse());
    };
    pulse();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        {
          transform: [{ scale: pulseAnim }],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
};

// API Functions
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
    
    const response = await axios.get(`${BASE_URL}/calendar`, {
      params,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    return response.data;
  } catch (err) {
    console.error('Erreur API:', err);
    throw err;
  }
};

export default function CalendarScreen() {
  // States
  const [selected, setSelected] = useState('');
  const [sessions, setSessions] = useState<CalendarSessions>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parentData, setParentData] = useState<{ id: number, adherents: Adherent[] } | null>(null);
  const [currentAdherent, setCurrentAdherent] = useState<Adherent | null>(null);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [adminNotifications, setAdminNotifications] = useState<NotificationDTO[]>([]);
  
  const navigation = useNavigation();
  const scrollY = useRef(new Animated.Value(0)).current;
  
  // Date calculations
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  // Effects
  useEffect(() => {
    const fetchCompetitions = async (parentId: number) => {
      try {
        const res = await API.get(`/competitions/competitions/parent/${parentId}`);
        setCompetitions(res.data);
      } catch (err) {
        console.error("Erreur compétitions:", err);
      }
    };

    const loadParentData = async () => {
      try {
        const response = await API.get('/parents/me');
        const parentData = response.data;

        await AsyncStorage.setItem('parent', JSON.stringify(parentData));
        setParentData(parentData);

        if (parentData?.id) {
          await fetchCompetitions(parentData.id);
        }
      } catch (err) {
        console.error("Erreur lors du chargement du parent:", err);
        setError("Impossible de charger les données du parent");
      } finally {
        setLoading(false);
      }
    };

    loadParentData();
  }, []);

  useEffect(() => {
    const fetchAdminNotifications = async () => {
      try {
        const res = await API.get('/notifications/me');
        const onlyAdmin = res.data
          .filter((n: NotificationDTO) => !n.type || n.type === 'admin')
          .sort((a: NotificationDTO, b: NotificationDTO) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
        setAdminNotifications(onlyAdmin.slice(0, 5));
      } catch (e) {
        console.error("Erreur chargement notifs admin :", e);
      }
    };

    fetchAdminNotifications();
  }, []);

    const loadSessions = useCallback( 
    async (month: number, year: number, adherentIdOverride?: number) => {
    if (!parentData) return;


    try {
      setLoading(true);

      const params = {
        parentId: parentData.id,
        month,
        year
      };

      if (adherentIdOverride || currentAdherent?.id) {
        params.adherentId = adherentIdOverride || currentAdherent.id;
      }

      const data = await getCalendarSessions(params);


      const formattedSessions: CalendarSessions = {};

      if (Array.isArray(data)) {
        data.forEach((session) => {
          if (session && session.date) {
            const dateKey = formatISODate(session.date);
            
            if (!formattedSessions[dateKey]) {
              formattedSessions[dateKey] = [];
            }

            formattedSessions[dateKey].push({
              id: session.id || 0,
              adherent: session.adherent || 'Non spécifié',
              activity: session.activite || session.activity || 'Activité non spécifiée',
              time: session.time || 'Heure non spécifiée',
              location: session.lieu || session.location || 'Lieu non spécifié',
              date: session.date
            });
          }
        });
      }

      setSessions(formattedSessions);
      setError(null);
    } catch (err) {
      console.error("Erreur lors du chargement des séances:", err);
      setError("Impossible de charger les séances. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }, [parentData, currentAdherent]);

// 1️⃣ When parentData arrives, load *all* sessions:
useEffect(() => {
  if (parentData) {
    loadSessions(currentMonth, currentYear);
  }
}, [parentData, loadSessions]);

// 2️⃣ When you manually pick an adherent, load only their sessions:
useEffect(() => {
  if (currentAdherent) {
    loadSessions(currentMonth, currentYear, currentAdherent.id);
  }
}, [currentAdherent, loadSessions]);


  useEffect(() => {
    if (parentData && currentAdherent) {
      loadSessions(currentMonth, currentYear);
    }
  }, [currentAdherent]);

  // Helper Functions
  const formatISODate = (dateStr: string | Date) => {
    if (!dateStr) return '';
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return date.toISOString().split('T')[0];
  };


const changeAdherent = (adherent: Adherent) => {
  // if tapping the same one again → deselect
  if (currentAdherent?.id === adherent.id) {
    setCurrentAdherent(null);
    loadSessions(currentMonth, currentYear);           // no override = all
  } else {
    setCurrentAdherent(adherent);
    loadSessions(currentMonth, currentYear, adherent.id);
  }
};
  const onDayPress = (day: { dateString: string }) => {
    setSelected(day.dateString);
  };

  const getSessionsForDay = (day: string) => {
    return sessions[day] || [];
  };

  const onMonthChange = (month: { month: number; year: number }) => {
    loadSessions(month.month, month.year);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
      return date.toLocaleDateString('fr-FR', options);
    } catch (e) {
      return dateString;
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = formatISODate(new Date(Date.now() + 86400000));

  const getMarkedDates = (): MarkedDates => {
    const markedDates: MarkedDates = {};
    const now = new Date();

    if (selected) {
      markedDates[selected] = {
        selected: true,
        selectedColor: '#8B5CF6',
        selectedTextColor: '#fff',
      };
    }

    Object.entries(sessions).forEach(([date, sessionList]) => {
      if (date === selected) return;

      const sessionDate = new Date(date);
      const isPast = sessionDate < now && date !== selected;

      let dotColor = '#A855F7';

      if (isPast) {
        dotColor = '#EF4444';
      } else {
        if (sessionList.some(session => isActivityOfType(session, 'information'))) {
          dotColor = '#06B6D4';
        } else if (sessionList.some(session => isActivityOfType(session, 'football'))) {
          dotColor = '#10B981';
        } else if (sessionList.some(session => isActivityOfType(session, 'basket'))) {
          dotColor = '#F59E0B';
        }
      }

      markedDates[date] = {
        marked: true,
        dotColor,
      };
    });

    return markedDates;
  };

  const isActivityOfType = (session: Session, type: string) => {
    const activityField = session.activity || session.activite || '';
    return typeof activityField === 'string' && activityField.toLowerCase().includes(type);
  };

  const getActivityIcon = (session: Session) => {
    if (isActivityOfType(session, 'information')) return "information-circle-outline";
    if (isActivityOfType(session, 'football')) return "football-outline";
    if (isActivityOfType(session, 'basket')) return "basketball-outline";
    if (isActivityOfType(session, 'natation')) return "water-outline";
    if (isActivityOfType(session, 'tennis')) return "tennisball-outline";
    return "barbell-outline";
  };


  // Loading Screen
  if (loading && Object.keys(sessions).length === 0) {
    return (
      <LinearGradient colors={['#8B5CF6', '#A855F7', '#C084FC']} style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#8B5CF6" />
        <PulseView>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.loadingText}>Chargement magique...</Text>
          </View>
        </PulseView>
      </LinearGradient>
    );
  }

  // Error Screen
  if (error && Object.keys(sessions).length === 0) {
    return (
      <LinearGradient colors={['#8B5CF6', '#A855F7']} style={styles.errorContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#8B5CF6" />
        <FadeInView style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={64} color="#FFFFFF" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => loadSessions(currentMonth, currentYear, currentAdherent?.id)}
          >
            <Text style={styles.retryButtonText}>✨ Réessayer</Text>
          </TouchableOpacity>
        </FadeInView>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#8B5CF6" />
      
      {/* Animated Header */}
      <LinearGradient colors={['#8B5CF6', '#A855F7', '#C084FC']} style={styles.header}>
        <Animated.View 
          style={[
            styles.headerContent,
            {
              transform: [{
                translateY: scrollY.interpolate({
                  inputRange: [0, 100],
                  outputRange: [0, -20],
                  extrapolate: 'clamp',
                }),
              }],
            },
          ]}
        >
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => navigation.toggleDrawer()}
          >
            <Ionicons name="menu" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>✨ Planning Magique</Text>
          <View style={styles.headerDecorations}>
            <View style={styles.headerDot} />
            <View style={[styles.headerDot, { backgroundColor: '#C084FC' }]} />
            <View style={[styles.headerDot, { backgroundColor: '#DDD6FE' }]} />
          </View>
        </Animated.View>
      </LinearGradient>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {/* Adherent Selector */}
        {parentData && parentData.adherents && parentData.adherents.length > 0 && (
          <FadeInView delay={200} style={styles.adherentSelectorContainer}>
            <BlurView intensity={20} style={styles.adherentBlurCard}>
              <Text style={styles.adherentSelectorTitle}>👥 Sélectionner un adhérent</Text>
              <FlatList
                data={parentData.adherents}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={({ item, index }) => (
                  <FadeInView delay={300 + (index * 100)}>
                    <TouchableOpacity
                      style={[
                        styles.adherentButton,
                        currentAdherent?.id === item.id && styles.adherentButtonActive
                      ]}
                      onPress={() => changeAdherent(item)}
                    >
                      <LinearGradient
                        colors={
                          currentAdherent?.id === item.id
                            ? ['#8B5CF6', '#A855F7']
                            : ['#F3F4F6', '#E5E7EB']
                        }
                        style={styles.adherentGradient}
                      >
                        <Ionicons
                          name="person"
                          size={20}
                          color={currentAdherent?.id === item.id ? '#FFFFFF' : '#8B5CF6'}
                        />
                        <Text
                          style={[
                            styles.adherentButtonText,
                            currentAdherent?.id === item.id && styles.adherentButtonTextActive
                          ]}
                        >
                          {item.prenom} {item.nom}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </FadeInView>
                )}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.adherentList}
              />
            </BlurView>
          </FadeInView>
        )}

        {/* Today & Tomorrow Sessions */}
        <FadeInView delay={400} style={styles.upcomingContainer}>
          <LinearGradient
            colors={['#FFFFFF', '#FAF5FF']}
            style={styles.upcomingCard}
          >
            {/* Today */}
            <View style={styles.todaySection}>
              <LinearGradient
                colors={['#8B5CF6', '#A855F7']}
                style={styles.todayHeader}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="sunny" size={24} color="#FFFFFF" />
                <Text style={styles.todayTitle}>Aujourd'hui</Text>
              </LinearGradient>

              {getSessionsForDay(today).length > 0 ? (
                getSessionsForDay(today).map((session, index) => (
                  <FadeInView key={`today-${index}`} delay={500 + (index * 100)}>
                    <View style={styles.modernSessionCard}>
                      <LinearGradient
                        colors={['#8B5CF6', '#A855F7']}
                        style={styles.sessionTimeContainer}
                      >
                        <Text style={styles.sessionTimeText}>{session.time}</Text>
                      </LinearGradient>
                      <View style={styles.sessionInfo}>
                        <Text style={styles.sessionActivity}>{session.activity}</Text>
                        <Text style={styles.sessionAdherent}>👤 {session.adherent}</Text>
                        <View style={styles.sessionLocationRow}>
                          <Ionicons name="location" size={16} color="#8B5CF6" />
                          <Text style={styles.sessionLocation}>{session.location}</Text>
                        </View>
                      </View>
                      <View style={styles.sessionIcon}>
                        <Ionicons name={getActivityIcon(session)} size={24} color="#8B5CF6" />
                      </View>
                    </View>
                  </FadeInView>
                ))
              ) : (
                <View style={styles.noSessionContainer}>
                  <Text style={styles.noSessionText}>🌙 Aucune séance aujourd'hui</Text>
                </View>
              )}
            </View>

            {/* Tomorrow */}
            <View style={styles.tomorrowSection}>
              <LinearGradient
                colors={['#A855F7', '#C084FC']}
                style={styles.tomorrowHeader}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="moon" size={24} color="#FFFFFF" />
                <Text style={styles.tomorrowTitle}>Demain</Text>
              </LinearGradient>

              {getSessionsForDay(tomorrow).length > 0 ? (
                getSessionsForDay(tomorrow).map((session, index) => (
                  <FadeInView key={`tomorrow-${index}`} delay={600 + (index * 100)}>
                    <View style={styles.modernSessionCard}>
                      <LinearGradient
                        colors={['#A855F7', '#C084FC']}
                        style={styles.sessionTimeContainer}
                      >
                        <Text style={styles.sessionTimeText}>{session.time}</Text>
                      </LinearGradient>
                      <View style={styles.sessionInfo}>
                        <Text style={styles.sessionActivity}>{session.activity}</Text>
                        <Text style={styles.sessionAdherent}>👤 {session.adherent}</Text>
                        <View style={styles.sessionLocationRow}>
                          <Ionicons name="location" size={16} color="#A855F7" />
                          <Text style={styles.sessionLocation}>{session.location}</Text>
                        </View>
                      </View>
                      <View style={styles.sessionIcon}>
                        <Ionicons name={getActivityIcon(session)} size={24} color="#A855F7" />
                      </View>
                    </View>
                  </FadeInView>
                ))
              ) : (
                <View style={styles.noSessionContainer}>
                  <Text style={styles.noSessionText}>⭐ Aucune séance demain</Text>
                </View>
              )}
            </View>
          </LinearGradient>
        </FadeInView>

        {/* Calendar */}
        <FadeInView delay={600} style={styles.calendarContainer}>
          <LinearGradient
            colors={['#FFFFFF', '#FAF5FF']}
            style={styles.calendarCard}
          >
            <View style={styles.calendarTitleContainer}>
              <Ionicons name="calendar" size={28} color="#8B5CF6" />
              <Text style={styles.calendarTitle}>
                📅 Calendrier {currentAdherent && `de ${currentAdherent.prenom}`}
              </Text>
            </View>
            <Calendar
              onDayPress={onDayPress}
              onMonthChange={onMonthChange}
              markedDates={getMarkedDates()}
              theme={styles.calendarTheme}
              style={styles.calendar}
            />
          </LinearGradient>
        </FadeInView>

        {/* Selected Day Info */}
        {selected && (
          <FadeInView delay={700} style={styles.selectedDayContainer}>
            <LinearGradient
              colors={['#FFFFFF', '#FAF5FF']}
              style={styles.selectedDayCard}
            >
              <LinearGradient
                colors={['#8B5CF6', '#A855F7']}
                style={styles.selectedDayHeader}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="calendar-outline" size={24} color="#FFFFFF" />
                <Text style={styles.selectedDayTitle}>{formatDate(selected)}</Text>
              </LinearGradient>

              {getSessionsForDay(selected).length > 0 ? (
                getSessionsForDay(selected).map((session, index) => (
                  <FadeInView key={`selected-${index}`} delay={800 + (index * 100)}>
                    <View style={styles.detailedSessionCard}>
                      <LinearGradient
                        colors={['#8B5CF6', '#A855F7']}
                        style={styles.detailedSessionHeader}
                      >
                        <Text style={styles.detailedSessionTime}>{session.time}</Text>
                        <Text style={styles.detailedSessionActivity}>{session.activity}</Text>
                      </LinearGradient>
                      <View style={styles.detailedSessionBody}>
                        <View style={styles.detailedSessionRow}>
                          <Ionicons name="person" size={18} color="#8B5CF6" />
                          <Text style={styles.detailedSessionText}>{session.adherent}</Text>
                        </View>
                        <View style={styles.detailedSessionRow}>
                          <Ionicons name="location" size={18} color="#8B5CF6" />
                          <Text style={styles.detailedSessionText}>{session.location}</Text>
                        </View>
                      </View>
                      <View style={styles.detailedSessionIcon}>
                        <Ionicons name={getActivityIcon(session)} size={32} color="#8B5CF6" />
                      </View>
                    </View>
                  </FadeInView>
                ))
              ) : (
                <View style={styles.noSelectedSessionContainer}>
                  <Ionicons name="moon-outline" size={48} color="#C084FC" />
                  <Text style={styles.noSelectedSessionText}>Aucune séance prévue ce jour</Text>
                </View>
              )}
            </LinearGradient>
          </FadeInView>
        )}

        {/* Admin Notifications */}
        <FadeInView delay={800} style={styles.notificationsContainer}>
          <LinearGradient
            colors={['#FFFFFF', '#FAF5FF']}
            style={styles.notificationsCard}
          >
            <LinearGradient
              colors={['#06B6D4', '#0891B2']}
              style={styles.notificationsHeader}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="megaphone" size={24} color="#FFFFFF" />
              <Text style={styles.notificationsTitle}>📢 Annonces Administratives</Text>
            </LinearGradient>

            {adminNotifications.length > 0 ? (
              adminNotifications.map((notif, index) => (
                <FadeInView key={notif.id} delay={900 + (index * 100)}>
                  <View style={styles.notificationCard}>
                    <LinearGradient
                      colors={['#06B6D4', '#0891B2']}
                      style={styles.notificationIcon}
                    >
                      <Ionicons name="information" size={20} color="#FFFFFF" />
                    </LinearGradient>
                    <View style={styles.notificationContent}>
                      <Text style={styles.notificationDate}>
                        {new Date(notif.timestamp).toLocaleDateString('fr-FR')} • {new Date(notif.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      <Text style={styles.notificationTitle}>{notif.title}</Text>
                      <Text style={styles.notificationMessage}>{notif.message}</Text>
                    </View>
                  </View>
                </FadeInView>
              ))
            ) : (
              <View style={styles.noNotificationsContainer}>
                <Text style={styles.noNotificationsText}>🔇 Aucune annonce disponible</Text>
              </View>
            )}
          </LinearGradient>
        </FadeInView>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FF',
  },
  
  // Loading & Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
shadowOpacity: 0.3,
  shadowRadius: 16,
  elevation: 8,
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Header Styles
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 0,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    flex: 1,
  },
  headerDecorations: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 44,
    justifyContent: 'flex-end',
  },
  headerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginLeft: 4,
    opacity: 0.7,
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },

  // Adherent Selector
  adherentSelectorContainer: {
    marginHorizontal: 16,
    marginTop: -10,
    marginBottom: 16,
  },
  adherentBlurCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  adherentSelectorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  adherentList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  adherentButton: {
    marginRight: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  adherentButtonActive: {
    shadowOpacity: 0.3,
  },
  adherentGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 120,
  },
  adherentButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  adherentButtonTextActive: {
    color: '#FFFFFF',
  },

  // Upcoming Sessions
  upcomingContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  upcomingCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  todaySection: {
    marginBottom: 20,
  },
  todayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  todayTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tomorrowSection: {
    marginTop: 8,
  },
  tomorrowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  tomorrowTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Modern Session Cards
  modernSessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
  },
  sessionTimeContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 16,
    minWidth: 70,
    alignItems: 'center',
  },
  sessionTimeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionActivity: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  sessionAdherent: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  sessionLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionLocation: {
    marginLeft: 4,
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  sessionIcon: {
    marginLeft: 12,
  },
  noSessionContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noSessionText: {
    fontSize: 16,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },

  // Calendar
  calendarContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  calendarCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  calendarTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  calendarTitle: {
    marginLeft: 8,
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  calendar: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  calendarTheme: {
    backgroundColor: '#FFFFFF',
    calendarBackground: '#FFFFFF',
    textSectionTitleColor: '#8B5CF6',
    selectedDayBackgroundColor: '#8B5CF6',
    selectedDayTextColor: '#FFFFFF',
    todayTextColor: '#8B5CF6',
    dayTextColor: '#1F2937',
    textDisabledColor: '#D1D5DB',
    dotColor: '#8B5CF6',
    selectedDotColor: '#FFFFFF',
    arrowColor: '#8B5CF6',
    monthTextColor: '#1F2937',
    indicatorColor: '#8B5CF6',
    textDayFontWeight: '500',
    textMonthFontWeight: '700',
    textDayHeaderFontWeight: '600',
    textDayFontSize: 16,
    textMonthFontSize: 18,
    textDayHeaderFontSize: 14,
  },

  // Selected Day
  selectedDayContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  selectedDayCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  selectedDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  selectedDayTitle: {
    marginLeft: 8,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  detailedSessionCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  detailedSessionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    justifyContent: 'center',
    minWidth: 100,
  },
  detailedSessionTime: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  detailedSessionActivity: {
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.9,
  },
  detailedSessionBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    justifyContent: 'center',
  },
  detailedSessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailedSessionText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  detailedSessionIcon: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noSelectedSessionContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noSelectedSessionText: {
    marginTop: 12,
    fontSize: 16,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },

  // Competitions
  competitionCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  competitionGradient: {
    padding: 16,
  },
  competitionName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  competitionDate: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  competitionResult: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  competitionDescription: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
    lineHeight: 20,
  },

  // Notifications
  notificationsContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  notificationsCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  notificationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  notificationsTitle: {
    marginLeft: 8,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  noNotificationsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noNotificationsText: {
    fontSize: 16,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },

  // Bottom Spacing
  bottomSpacing: {
    height: 32,
  },
});