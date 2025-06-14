import React, { useEffect, useState, useRef } from 'react';
import { Calendar } from 'react-native-calendars';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Modal, FlatList, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const API_BASE_URL = Constants?.expoConfig?.extra?.apiUrl ?? 'http://192.168.233.138:8080';

export default function ActivityDetailsScreen() {
  const { id } = useLocalSearchParams();
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adherents, setAdherents] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPaymentType, setSelectedPaymentType] = useState(null);
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);
  const [selectedAdherent, setSelectedAdherent] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [sessionEvents, setSessionEvents] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDetailModalVisible, setSessionDetailModalVisible] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const modalScaleAnim = useRef(new Animated.Value(0)).current;
  const calendarScaleAnim = useRef(new Animated.Value(0)).current;
  const detailScaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const response = await axios.get(`${API_BASE_URL}/api/activites/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setActivity(response.data);
        
        // Start animations after data loads
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ]).start();
      } catch (err) {
        setError('Erreur lors du chargement des détails.');
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, [id]);

  useEffect(() => {
    const fetchAdherents = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const parentId = await AsyncStorage.getItem('parentId');

        if (!parentId) {
          console.warn('⚠️ parentId is missing from AsyncStorage');
          return;
        }

        const response = await axios.get(`${API_BASE_URL}/api/parents/${parentId}/adherents`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setAdherents(response.data);
      } catch (err) {
        console.error('❌ Failed to fetch adherents', err);
      }
    };

    fetchAdherents();
  }, []);

  useEffect(() => {
    const fetchSessions = async () => {
      if (!calendarModalVisible || !activity?.id) return;
      try {
        const token = await AsyncStorage.getItem('token');
        const response = await axios.get(`${API_BASE_URL}/api/sessions/calendar`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { activiteId: activity.id }
        });
        setSessionEvents(response.data);
      } catch (err) {
        console.error("❌ Failed to load session events", err);
      }
    };

    fetchSessions();
  }, [calendarModalVisible, activity?.id]);

  // Modal animations
  useEffect(() => {
    if (modalVisible) {
      Animated.spring(modalScaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      modalScaleAnim.setValue(0);
    }
  }, [modalVisible]);

  useEffect(() => {
    if (calendarModalVisible) {
      Animated.spring(calendarScaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      calendarScaleAnim.setValue(0);
    }
  }, [calendarModalVisible]);

  useEffect(() => {
    if (sessionDetailModalVisible) {
      Animated.spring(detailScaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      detailScaleAnim.setValue(0);
    }
  }, [sessionDetailModalVisible]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={['#8B5CF6', '#A78BFA', '#C4B5FD']}
          style={styles.loadingGradient}
        >
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </LinearGradient>
      </View>
    );
  }

  if (error || !activity) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  const markedDates = sessionEvents.reduce((acc, session) => {
    const date = session.start.split('T')[0];
    acc[date] = {
      marked: true,
      dotColor: '#8B5CF6',
      ...(date === selectedDate && {
        selected: true,
        selectedColor: '#8B5CF6',
      })
    };
    return acc;
  }, {});

  const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#7C3AED" />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Animated Header */}
        <Animated.View 
          style={[
            styles.headerContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <LinearGradient
            colors={['#7C3AED', '#8B5CF6', '#A78BFA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <TouchableOpacity onPress={() => router.push('/activities')} style={styles.backButton}>
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{activity.nom}</Text>
          </LinearGradient>
        </Animated.View>

        <Animated.View 
          style={[
            styles.contentContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          {/* Image with shadow and border radius */}
          <View style={styles.imageContainer}>
            <Image
              source={{
                uri: activity.imageBase64 || 'https://via.placeholder.com/300x200',
              }}
              style={styles.image}
            />
            <LinearGradient
              colors={['transparent', 'rgba(124, 58, 237, 0.1)']}
              style={styles.imageOverlay}
            />
          </View>

          {/* Description Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📋 Description</Text>
            <Text style={styles.cardText}>
              {activity.description || 'Aucune description disponible.'}
            </Text>
          </View>

          {/* Teams Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>👥 Équipes</Text>
            {activity.equipes?.length > 0 ? (
              activity.equipes.map((equipe, index) => (
                <Animated.View 
                  key={index} 
                  style={[
                    styles.equipeBox,
                    {
                      opacity: fadeAnim,
                      transform: [{ translateX: slideAnim }]
                    }
                  ]}
                >
                  <LinearGradient
                    colors={['#F8FAFC', '#F1F5F9']}
                    style={styles.equipeGradient}
                  >
                    <Text style={styles.equipeName}>🏆 {equipe.nomEquipe}</Text>
                    <Text style={styles.equipeCoach}>
                      👨‍🏫 Coach: {equipe.coachPrenom} {equipe.coachNom}
                    </Text>
                  </LinearGradient>
                </Animated.View>
              ))
            ) : (
              <Text style={styles.cardText}>Aucune équipe disponible</Text>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonsContainer}>
            <AnimatedTouchable
              style={[styles.primaryButton, { transform: [{ scale: scaleAnim }] }]}
              onPress={() => {
                setSelectedPaymentType('FULL');
                setModalVisible(true);
              }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#7C3AED', '#8B5CF6']}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>
                  💳 S'abonner - {activity.prix} DT
                </Text>
              </LinearGradient>
            </AnimatedTouchable>

            <AnimatedTouchable
              style={[styles.secondaryButton, { transform: [{ scale: scaleAnim }] }]}
              onPress={() => {
                setSelectedPaymentType('SESSION');
                setModalVisible(true);
              }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#6366F1', '#8B5CF6']}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>
                  🎯 Réserver une séance - {activity.prixParSeance ?? '---'} DT
                </Text>
              </LinearGradient>
            </AnimatedTouchable>
          </View>
        </Animated.View>

        {/* Adherents Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <Animated.View 
              style={[
                styles.modalContent,
                { transform: [{ scale: modalScaleAnim }] }
              ]}
            >
              <LinearGradient
                colors={['#FFFFFF', '#F8FAFC']}
                style={styles.modalGradient}
              >
                <Text style={styles.modalTitle}>👶 Choisir un enfant</Text>
                <FlatList
                  data={adherents}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => {
                        setModalVisible(false);
                        if (selectedPaymentType === 'FULL') {
                          router.push({
                            pathname: '/PaymentSelectionScreen',
                            params: {
                              adherentId: item.id.toString(),
                              adherentName: `${item.prenom} ${item.nom}`,
                              activityId: activity.id.toString(),
                              activityName: activity.nom,
                              amount: activity.prix?.toString() ?? '---',
                              type: 'FULL',
                            },
                          });
                        } else if (selectedPaymentType === 'SESSION') {
                          setSelectedAdherent(item);
                          setCalendarModalVisible(true);
                        }
                      }}
                      style={styles.adherentItem}
                    >
                      <LinearGradient
                        colors={['#F8FAFC', '#EDE9FE']}
                        style={styles.adherentGradient}
                      >
                        <Text style={styles.adherentText}>
                          👤 {item.prenom} {item.nom}
                        </Text>
                      </LinearGradient>
                    </Pressable>
                  )}
                />
                <Pressable 
                  onPress={() => setModalVisible(false)} 
                  style={styles.closeButton}
                >
                  <Text style={styles.closeButtonText}>✕ Fermer</Text>
                </Pressable>
              </LinearGradient>
            </Animated.View>
          </View>
        </Modal>

        {/* Calendar Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={calendarModalVisible}
          onRequestClose={() => setCalendarModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <Animated.View 
              style={[
                styles.modalContent,
                { transform: [{ scale: calendarScaleAnim }] }
              ]}
            >
              <LinearGradient
                colors={['#FFFFFF', '#F8FAFC']}
                style={styles.modalGradient}
              >
                <Text style={styles.modalTitle}>📅 Choisir une séance</Text>
                <Calendar
                  onDayPress={(day) => {
                    const session = sessionEvents.find(s => s.start.startsWith(day.dateString));
                    if (!session) return;
                    setSelectedDate(day.dateString);
                    setSelectedSession(session);
                    setSessionDetailModalVisible(true);
                  }}
                  markedDates={markedDates}
                  theme={{
                    selectedDayBackgroundColor: '#8B5CF6',
                    todayTextColor: '#7C3AED',
                    arrowColor: '#8B5CF6',
                    monthTextColor: '#7C3AED',
                    indicatorColor: '#8B5CF6',
                    textDayFontWeight: '600',
                    textMonthFontWeight: 'bold',
                    textDayHeaderFontWeight: '600',
                  }}
                />
                <Pressable
                  onPress={() => setCalendarModalVisible(false)}
                  style={styles.closeButton}
                >
                  <Text style={styles.closeButtonText}>✕ Fermer</Text>
                </Pressable>
              </LinearGradient>
            </Animated.View>
          </View>
        </Modal>

        {/* Session Detail Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={sessionDetailModalVisible}
          onRequestClose={() => setSessionDetailModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <Animated.View 
              style={[
                styles.modalContent,
                { transform: [{ scale: detailScaleAnim }] }
              ]}
            >
              <LinearGradient
                colors={['#FFFFFF', '#F8FAFC']}
                style={styles.modalGradient}
              >
                <Text style={styles.modalTitle}>🏃‍♂️ Détails de la séance</Text>
                {selectedSession ? (
                  <View style={styles.sessionDetails}>
                    <View style={styles.sessionDetailItem}>
                      <Text style={styles.sessionDetailLabel}>📅 Date:</Text>
                      <Text style={styles.sessionDetailValue}>
                        {selectedSession.start.split('T')[0]}
                      </Text>
                    </View>
                    <View style={styles.sessionDetailItem}>
                      <Text style={styles.sessionDetailLabel}>⏰ Heure:</Text>
                      <Text style={styles.sessionDetailValue}>
                        {selectedSession.start.split('T')[1]?.substring(0, 5)}
                      </Text>
                    </View>
                    <View style={styles.sessionDetailItem}>
                      <Text style={styles.sessionDetailLabel}>📍 Lieu:</Text>
                      <Text style={styles.sessionDetailValue}>
                        {selectedSession.lieu || '—'}
                      </Text>
                    </View>
                    <View style={styles.sessionDetailItem}>
                      <Text style={styles.sessionDetailLabel}>👥 Équipe:</Text>
                      <Text style={styles.sessionDetailValue}>
                        {selectedSession.equipe || '—'}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text>Chargement...</Text>
                )}

                <View style={styles.sessionButtonContainer}>
                  <TouchableOpacity
                    onPress={() => setSessionDetailModalVisible(false)}
                    style={styles.cancelButton}
                  >
                    <Text style={styles.cancelButtonText}>❌ Annuler</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setSessionDetailModalVisible(false);
                      router.push({
                        pathname: '/PaymentSelectionScreen',
                        params: {
                          adherentId: selectedAdherent.id.toString(),
                          adherentName: `${selectedAdherent.prenom} ${selectedAdherent.nom}`,
                          sessionId: selectedSession.id.toString(),
                          sessionDate: selectedSession.start,
                          activityId: activity.id.toString(),
                          activityName: activity.nom,
                          amount: activity.prixParSeance?.toString() ?? '---',
                          type: 'SESSION',
                        },
                      });
                    }}
                    style={styles.continueButton}
                  >
                    <LinearGradient
                      colors={['#10B981', '#059669']}
                      style={styles.continueButtonGradient}
                    >
                      <Text style={styles.continueButtonText}>✅ Continuer au paiement</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </Animated.View>
          </View>
        </Modal>

      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 10,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
  },
  error: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '600',
  },
  headerContainer: {
    height: 100,
    width: '100%',
  },
  headerGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 10,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    elevation: 8,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  backButton: {
    marginRight: 15,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  backArrow: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  imageContainer: {
    position: 'relative',
    alignSelf: 'center',
    marginBottom: 25,
    borderRadius: 20,
    elevation: 10,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  image: {
    width: width - 80,
    height: 220,
    borderRadius: 20,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    elevation: 5,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7C3AED',
    marginBottom: 12,
  },
  cardText: {
    fontSize: 15,
    color: '#64748B',
    lineHeight: 22,
  },
  equipeBox: {
    marginBottom: 12,
    borderRadius: 15,
    overflow: 'hidden',
  },
  equipeGradient: {
    padding: 16,
  },
  equipeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#7C3AED',
    marginBottom: 4,
  },
  equipeCoach: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  buttonsContainer: {
    marginTop: 10,
  },
  primaryButton: {
    marginBottom: 15,
    borderRadius: 20,
    elevation: 6,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  secondaryButton: {
    marginBottom: 20,
    borderRadius: 20,
    elevation: 6,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 20,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    width: width - 40,
    maxHeight: height * 0.8,
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  modalGradient: {
    padding: 25,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#7C3AED',
    textAlign: 'center',
    marginBottom: 20,
  },
  adherentItem: {
    marginBottom: 12,
    borderRadius: 15,
    overflow: 'hidden',
  },
  adherentGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  adherentText: {
    fontSize: 16,
    color: '#7C3AED',
    fontWeight: '600',
  },
  closeButton: {
    alignSelf: 'center',
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#FEE2E2',
    borderRadius: 20,
  },
  closeButtonText: {
    color: '#DC2626',
    fontWeight: 'bold',
    fontSize: 16,
  },
  sessionDetails: {
    marginBottom: 20,
  },
  sessionDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#8B5CF6',
  },
  sessionDetailLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#7C3AED',
    flex: 1,
  },
  sessionDetailValue: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  sessionButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#FEE2E2',
    borderRadius: 15,
  },
  cancelButtonText: {
    color: '#DC2626',
    fontWeight: 'bold',
    fontSize: 14,
  },
  continueButton: {
    borderRadius: 15,
    elevation: 4,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  continueButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 15,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});