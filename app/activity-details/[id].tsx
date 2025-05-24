import React, { useEffect, useState } from 'react';
import { Calendar } from 'react-native-calendars';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Modal, FlatList, Pressable } from 'react-native';

const API_BASE_URL = Constants?.expoConfig?.extra?.apiUrl ?? 'http://192.168.227.138:8080';

export default function ActivityDetailsScreen() {
  const { id } = useLocalSearchParams();
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adherents, setAdherents] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPaymentType, setSelectedPaymentType] = useState<'FULL' | 'SESSION' | null>(null);
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);
  const [selectedAdherent, setSelectedAdherent] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [sessionEvents, setSessionEvents] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDetailModalVisible, setSessionDetailModalVisible] = useState(false);


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
      setSessionEvents(response.data); // ✅ This contains the list of sessions
    } catch (err) {
      console.error("❌ Failed to load session events", err);
    }
  };

  fetchSessions();
}, [calendarModalVisible, activity?.id]);

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#6366F1" /></View>;
  }

  if (error || !activity) {
    return <View style={styles.centered}><Text style={styles.error}>{error}</Text></View>;
  }
// Build markedDates from sessionEvents
const markedDates = sessionEvents.reduce((acc, session) => {
  const date = session.start.split('T')[0]; // Extract just the date
  acc[date] = {
    marked: true,
    dotColor: '#4F46E5',
    ...(date === selectedDate && {
      selected: true,
      selectedColor: '#4F46E5',
    })
  };
  return acc;
}, {});

  return (
    <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerContainer}>
            <TouchableOpacity onPress={() => router.push('/activities')} style={styles.backButton}>
                <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{activity.nom}</Text>
        </View>

      <Image
        source={{
          uri: activity.imageBase64
            ? activity.imageBase64
            : 'https://via.placeholder.com/200',
        }}
        style={styles.image}
      />

      <Text style={styles.label}>Description:</Text>
      <Text style={styles.text}>{activity.description || 'Aucune description disponible.'}</Text>

      <Text style={styles.label}>Équipes:</Text>
      {activity.equipes?.length > 0 ? (
        activity.equipes.map((equipe, index) => (
          <View key={index} style={styles.equipeBox}>
            <Text style={styles.equipeName}>{equipe.nomEquipe}</Text>
            <Text style={styles.equipeCoach}>
              Coach: {equipe.coachPrenom} {equipe.coachNom}
            </Text>
          </View>
        ))
      ) : (
        <Text style={styles.text}>Aucune équipe disponible</Text>
      )}

        <TouchableOpacity
            style={styles.button}
            onPress={() => {
                setSelectedPaymentType('FULL');
                setModalVisible(true);
            }}
            >
            <Text style={styles.buttonText}>S’abonner - {activity.prix} DT</Text>
        </TouchableOpacity>

        <TouchableOpacity
            style={[styles.button, { backgroundColor: '#6B7280' }]}
            onPress={() => {
                setSelectedPaymentType('SESSION');
                setModalVisible(true);
            }}
            >
            <Text style={styles.buttonText}>
                Réserver une séance - {activity.prixParSeance ?? '---'} DT
            </Text>
        </TouchableOpacity>


            <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
            >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                <Text style={[styles.label, { textAlign: 'center', marginBottom: 15 }]}>
                Choisir un enfant :
                </Text>
                <FlatList
                    data={adherents}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                    <Pressable
                        onPress={() => {
                        setModalVisible(false);

                        if (selectedPaymentType === 'FULL') {
                            router.push({
                            pathname: '/paymentscreen',
                            params: {
                                activityId: activity.id.toString(),
                                adherentId: item.id.toString(),
                                adherentName: `${item.prenom} ${item.nom}`,
                                activityName: activity.nom,
                                amount: activity.prix?.toString() ?? '---',
                                type: 'FULL',
                            },
                            });
                        } else if (selectedPaymentType === 'SESSION') {
                            // Save the selected adherent to state and show the calendar modal
                            setSelectedAdherent(item);
                            setCalendarModalVisible(true);
                        }
                        }}

                        style={styles.adherentItem}
                    >
                        <Text style={styles.text}>{item.prenom} {item.nom}</Text>
                    </Pressable>
                    )}
                />
                <Pressable onPress={() => setModalVisible(false)} style={{ alignSelf: 'flex-end', marginBottom: 10 }}>
                    <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>Fermer</Text>
                </Pressable>
                </View>
            </View>
            </Modal>
            <Modal
            animationType="slide"
            transparent={true}
            visible={calendarModalVisible}
            onRequestClose={() => setCalendarModalVisible(false)}
            >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                <Text style={[styles.label, { textAlign: 'center', marginBottom: 10 }]}>
                    Choisir une séance :
                </Text>

                <Calendar
                        onDayPress={(day) => {
                            const session = sessionEvents.find(s => s.start.startsWith(day.dateString));
                            if (!session) return;

                            setSelectedDate(day.dateString);
                            setSelectedSession(session); // store the session
                            setSessionDetailModalVisible(true); // show details modal
                        }}

                        markedDates={markedDates}
                        theme={{ selectedDayBackgroundColor: '#4F46E5' }}
                />


                <Pressable
                    onPress={() => setCalendarModalVisible(false)}
                    style={{ alignSelf: 'flex-end', marginTop: 10 }}
                >
                    <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>Fermer</Text>
                </Pressable>
                </View>
            </View>
            </Modal>
            <Modal
            animationType="slide"
            transparent={true}
            visible={sessionDetailModalVisible}
            onRequestClose={() => setSessionDetailModalVisible(false)}
            >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                <Text style={[styles.label, { textAlign: 'center', marginBottom: 10 }]}>Détails de la séance</Text>
                {selectedSession ? (
                    <>
                    <Text style={styles.text}><Text style={{ fontWeight: 'bold' }}>Date:</Text> {selectedSession.start.split('T')[0]}</Text>
                    <Text style={styles.text}><Text style={{ fontWeight: 'bold' }}>Heure:</Text> {selectedSession.start.split('T')[1]?.substring(0, 5)}</Text>
                    <Text style={styles.text}><Text style={{ fontWeight: 'bold' }}>Lieu:</Text> {selectedSession.lieu || '—'}</Text>
                    <Text style={styles.text}><Text style={{ fontWeight: 'bold' }}>Équipe:</Text> {selectedSession.equipe || '—'}</Text>
                    </>
                ) : (
                    <Text>Chargement...</Text>
                )}

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
                    <TouchableOpacity
                    onPress={() => {
                        setSessionDetailModalVisible(false);
                    }}
                    >
                    <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>Annuler</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                    onPress={() => {
                        setSessionDetailModalVisible(false);
                        router.push({
                        pathname: '/paymentscreen',
                        params: {
                            adherentId: selectedAdherent.id.toString(),
                            adherentName: `${selectedAdherent.prenom} ${selectedAdherent.nom}`,
                            sessionId: selectedSession.id.toString(),
                            activityName: activity.nom,
                            amount: activity.prixParSeance?.toString() ?? '---',
                            type: 'SESSION',
                        },
                        });
                    }}
                    >
                    <Text style={{ color: '#10B981', fontWeight: 'bold' }}>Continuer au paiement</Text>
                    </TouchableOpacity>
                </View>
                </View>
            </View>
            </Modal>



    </ScrollView>



  );
}

const styles = StyleSheet.create({
   headerContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#6D28D9', // purple
  paddingVertical: 20,
  paddingHorizontal: 16,
  width: '100%',
    borderRadius:10,

},
backButton: {
  marginRight: 12,
},
backArrow: {
  fontSize: 20,
  color: 'white',
},
headerTitle: {
  fontSize: 18,
  color: 'white',
  fontWeight: 'bold',
},


  container: {
    padding: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    color: 'red',
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 20,
  },
  label: {
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 15,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 15,
    textAlign: 'left',
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  equipeBox: {
    marginTop: 10,
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 10,
    width: '100%',
  },
  equipeName: {
    fontSize: 16,
    fontWeight: '600',
  },
  equipeCoach: {
    fontSize: 14,
    color: '#555',
  },
  button: {
    marginTop: 20,
    backgroundColor: '#6D28D9',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    width: '100%',
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalOverlay: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: 'rgba(0,0,0,0.5)',
},
modalContent: {
  backgroundColor: '#fff',
  padding: 20,
  borderRadius: 12,
  width: '90%',
  maxHeight: '70%',
  elevation: 4, // Android shadow
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 4,
},

adherentItem: {
  paddingVertical: 10,
  paddingHorizontal: 15,
  borderBottomWidth: 1,
  borderBottomColor: '#e5e7eb',
  borderRadius: 8,
  marginBottom: 10,
  backgroundColor: '#F9FAFB',
},


});
