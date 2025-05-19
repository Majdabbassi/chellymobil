import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { getParentById } from '@/services/parentService';
import AsyncStorage from '@react-native-async-storage/async-storage'
import { registerForPushNotificationsAsync } from '@/services/firebase-notifications';
import * as Notifications from 'expo-notifications';
import API from '@/services/api';
import Modal from 'react-native-modal';

const { width } = Dimensions.get('window');

// Define interfaces outside of the component
interface Competition {
  id: number;
  nom: string;
  date: string;
  lieu: string;
}

interface Parent {
  id: number;
  nom: string;
  prenom: string;
  dateInscriptionClub?: string;
  notifications?: number;
  notificationsList?: string[]; 
  adherents?: any[];
  avatar?: any;
}

interface Adherent {
  id: number;
  nom: string;
  prenom: string;
  activites?: {
    nom: string;
    competition?: Competition;
  }[];
  activities?: string[];
  progress?: number;
  nextSession?: string;
  age?: number;
  avatar?: any;
  imageBase64?: string;
  dateNaissance?: string;
}
// Fonction utilitaire améliorée pour gérer les images
const getImageSource = (image?: string | any) => {
  // Vérification du log pour déboguer
  console.log("Type d'image reçue:", typeof image);
  
  // Si pas d'image, retourner l'image par défaut
  if (!image) {
    console.log("Aucune image trouvée, utilisation de l'image par défaut");
    return require('@/assets/images/adaptive-icon.png');
  }

  // Si c'est déjà un objet avec uri (format React Native)
  if (image.uri) {
    console.log("Image avec URI trouvée:", image.uri.substring(0, 30) + "...");
    return image;
  }

  // Si c'est une chaîne de caractères
  if (typeof image === 'string') {
    // Si c'est déjà un data URI complet
    if (image.startsWith('data:')) {
      console.log("Data URI trouvé, utilisation directe");
      return { uri: image };
    } 
    // Si c'est une chaîne base64 sans préfixe
    else if (image.length > 0) {
      console.log("Chaîne base64 trouvée, ajout du préfixe data URI");
      return { uri: `data:image/jpeg;base64,${image}` };
    }
  }

  // Dans tous les autres cas, retourner l'image par défaut
  console.log("Format non reconnu, utilisation de l'image par défaut");
  return require('@/assets/images/adaptive-icon.png');
};

export default function ParentDashboardScreen() {
  const [parent, setParent] = useState<Parent | null>(null);
  const [adherents, setAdherents] = useState<Adherent[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const navigation = useNavigation();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [visibleMenuId, setVisibleMenuId] = useState<number | null>(null);

  // Nouvel useEffect pour récupérer les notifications depuis l'API

useEffect(() => {
  const fetchNotifications = async () => {
    const token = await AsyncStorage.getItem('token');
        if (!token) {
          console.log("⛔ Pas de token pour notifications");
          return;
        }

    try {
      const res = await API.get('/notifications/me'); // ✅ Utilise API centralisé
      const notifs = res.data || [];

      setParent(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          notificationsList: notifs.map(n => n.message).filter((msg): msg is string => msg !== null),
          notifications: notifs.filter(n => !n.seen).length
        };
      });
    } catch (e) {
      console.error("❌ Erreur chargement notifications:", e);
    }
  };

  fetchNotifications();
}, []);

useEffect(() => {
  const initNotifications = async () => {
    try {
      const expoToken = await registerForPushNotificationsAsync();
      console.log('📱 Expo Push Token:', expoToken);

      if (expoToken) {
        await API.post('/notifications/token', {
          token: expoToken,
        });
        console.log('✅ Token envoyé au backend');
      }
    } catch (e) {
      console.error('❌ Erreur enregistrement token de notification:', e);
    }
  };

  initNotifications();
}, []);

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      console.log("📥 Nouvelle notification reçue :", notification);
 
      const newMessage = notification.request.content.body;
 
      // Met à jour l'état local du parent avec une notification de plus
      setParent(prev => {
        if (!prev) return prev;
        const updatedList = [newMessage, ...(prev.notificationsList || [])].filter((msg): msg is string => msg !== null);
        return {
          ...prev,
          notifications: updatedList.length,
          notificationsList: updatedList,
        };
      });
    });
 
    return () => subscription.remove(); // Nettoyage du listener
  }, []);

  useEffect(() => {
    const fetchParent = async () => {
    const token = await AsyncStorage.getItem('token');

    if (!token) {
      console.log("⛔ Aucun token trouvé, on ne fait pas l'appel API getParentById");
      return; // Don't continue if not logged in
    }

      try {
        const data = await getParentById();
        console.log("Parent data received:", data);
        
        // Log pour déboguer les données d'avatar
        console.log("Avatar du parent reçu:", data.avatar);
        
        
        // Traitement d'avatar amélioré
        let processedAvatar = null;
        if (data.avatar) {
          if (typeof data.avatar === 'string') {
            processedAvatar = data.avatar.startsWith('data:') 
              ? data.avatar 
              : `data:image/jpeg;base64,${data.avatar}`;
            console.log("Avatar traité:", processedAvatar.substring(0, 30) + "...");
          } else {
            processedAvatar = data.avatar;
            console.log("Avatar non-string conservé tel quel");
          }
        }
        
        setParent({
          ...data,
          notificationsList: [],
          notifications: 0,
          avatar: processedAvatar
        });
            
        // Extraire les compétitions
        const extractedCompetitions: Competition[] = [];
 
        if (data.adherents && data.adherents.length > 0) {
          data.adherents.forEach((adherent: Adherent) => {
            if (adherent.activites && adherent.activites.length > 0) {
              adherent.activites.forEach(activite => {
                if (activite.competition) {
                  const competition = {
                    id: activite.competition.id,
                    nom: activite.competition.nom,
                    date: activite.competition.date,
                    lieu: activite.competition.lieu || 'Lieu non précisé'
                  };
                  if (!extractedCompetitions.find(c => c.id === competition.id)) {
                    extractedCompetitions.push(competition);
                  }
                }
              });
            }
          });
        }
 
        // Traiter les adhérents pour ajouter progress + nextSession

const adherentsMapped = await Promise.all(
  (data.adherents || []).map(async (adherent: Adherent) => {
    console.log(`Adhérent ${adherent.id} - imageBase64:`,
      adherent.imageBase64 ? `${adherent.imageBase64.substring(0, 30)}...` : 'null');

    // 1. Récupération de la dernière performance
    let latestNote = 0;
    try {
      const perfRes = await API.get(`/performances/adherent/${adherent.id}/last`, {
        timeout: 5000,
      });
      latestNote = perfRes.data?.note ?? 0;
    } catch (err) {
      console.warn(`⚠️ Erreur performance adhérent ${adherent.id}`, err);
    }

    // 2. Récupération de la prochaine session
    let nextSessionDate = 'Non spécifiée';
    try {
      const sessionRes = await API.get(`/sessions/next/adherent/${adherent.id}`, {
        timeout: 5000,
      });

      if (sessionRes.data?.dateTime) {
        nextSessionDate = new Date(sessionRes.data.dateTime).toLocaleString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    } catch (err) {
      console.warn(`⚠️ Erreur session adhérent ${adherent.id}`, err);
    }

    // Traitement de l’image de l’adhérent
    let adherentAvatar = null;
    if (adherent.imageBase64) {
      adherentAvatar = adherent.imageBase64.startsWith('data:')
        ? adherent.imageBase64
        : `data:image/jpeg;base64,${adherent.imageBase64}`;
      console.log(`Avatar traité pour adhérent ${adherent.id}:`,
        adherentAvatar.substring(0, 30) + "...");
    } else if (adherent.avatar) {
      adherentAvatar = typeof adherent.avatar === 'string'
        ? (adherent.avatar.startsWith('data:')
          ? adherent.avatar
          : `data:image/jpeg;base64,${adherent.avatar}`)
        : adherent.avatar;
      console.log(`Fallback sur avatar pour adhérent ${adherent.id}`);
    }

    // 3. Construction de l’objet final
    return {
      ...adherent,
      id: adherent.id,
      nom: adherent.nom || 'Nom inconnu',
      prenom: adherent.prenom || '',
      avatar: adherentAvatar,
      activities: Array.isArray(adherent.activites) && adherent.activites.length > 0
        ? adherent.activites
        : ['Aucune activité'],
      progress: Math.min(Math.max(latestNote, 0), 100),
      nextSession: nextSessionDate,
      age: adherent.dateNaissance
        ? new Date().getFullYear() - new Date(adherent.dateNaissance).getFullYear()
        : null,
    };
  })
);

 
        setAdherents(adherentsMapped);
        setCompetitions(extractedCompetitions);
      } catch (e) {
        console.error('❌ Erreur lors du chargement du parent:', e);
        // Affichage d'une alerte utilisateur en cas d'erreur réseau
        if ((e as any)?.message === 'Network Error' || (e as any)?.code === 'ERR_NETWORK') {
          alert('Erreur réseau : impossible de contacter le serveur. Vérifiez votre connexion ou réessayez plus tard.');
        } else {
          alert('Erreur lors du chargement des données du parent.');
        }
      }
    };
 
    fetchParent();
  }, []);
  
  return (
    <View style={styles.container}>
      {/* Background Pattern */}
      <Image
        source={require('@/assets/images/pattern-bg.png')}        
        style={styles.backgroundPattern}
        resizeMode="cover"
      />
     
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
            >
              <Ionicons name="menu-outline" size={28} color="#6D28D9" />
            </TouchableOpacity>
            <Text style={styles.appName}>Club Sportif</Text>
          </View>
         
          <View style={{ position: 'relative' }}>
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => setShowNotifications(!showNotifications)}
            >
              <View style={styles.notificationIconContainer}>
                <Ionicons name="notifications-outline" size={24} color="#6D28D9" />
                {parent && parent.notifications && parent.notifications > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationCount}>{parent.notifications}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
           
            <Modal
              isVisible={showNotifications}
              backdropOpacity={0}
              animationIn="fadeIn"
              animationOut="fadeOut"
              onBackdropPress={() => setShowNotifications(false)}
              style={{ margin: 0, justifyContent: 'flex-start', alignItems: 'flex-end' }}
            >
              <TouchableOpacity
                style={styles.notificationDropdown}
                activeOpacity={0.9}
                onPress={() => {
                  setShowNotifications(false);
                  router.push('/NotificationsScreen');
                }}
              >
                {parent?.notificationsList?.length > 0 ? (
                  parent.notificationsList
                    .slice(0, 3) // 👈 Ajout ici pour limiter à 3 notifs
                    .map((notif, idx) => (
                      <View key={idx} style={styles.notificationItemRow}>
                        <Text style={styles.notificationItemText}>{notif}</Text>
                        {idx < 2 && <View style={styles.separator} />}
                      </View>
                    ))
                ) : (
                  <Text style={styles.notificationItemText}>Aucune notification</Text>
                )}
              </TouchableOpacity>
            </Modal>



          </View>
        </View>
       
        {/* Parent Info Card */}
        <View style={styles.parentInfoCard}>
          <View style={styles.gradientBorder}>
            <View style={styles.parentAvatar}>
              {parent?.avatar ? (
                <Image 
                  source={getImageSource(parent.avatar)} 
                  style={styles.avatarImage} 
                  onError={(e) => console.error('Erreur de chargement image parent:', e.nativeEvent.error)}
                />
              ) : (
                parent?.nom && <Text style={styles.parentInitials}>{parent.nom.charAt(0)}</Text>
              )}
            </View>
          </View>
          <View style={styles.parentInfo}>
            {parent && (
              <>
                <Text style={styles.parentTitle}>Bonjour, {parent.prenom} 👋</Text>
                <Text style={styles.subTitle}>Membre depuis {parent.dateInscriptionClub || '---'}</Text>
              </>
            )}
          </View>
        </View>
       
       {/* Quick links */}
        <View style={styles.quickLinksContainer}>
          {[
            { icon: 'calendar', text: 'Calendrier', color: '#6366F1', bg: '#F0F4FF', route: '/calendar' },
            { icon: 'card-outline', text: 'Paiements', color: '#8B5CF6', bg: '#F5F3FF', route: '/PaymentSelectionScreen' },
            { icon: 'chatbubbles-outline', text: 'Messages', color: '#10B981', bg: '#F0FDF4', route: '/messagess' },
            { icon: 'notifications-outline', text: 'Notifications', color: '#A855F7', bg: '#FDF4FF', route: '/NotificationsScreen' },
            { icon: 'settings-outline', text: 'Paramètres', color: '#EF4444', bg: '#FEF2F2', route: '/ParametresScreen' },
            { icon: 'football-outline', text: 'Activités', color: '#0EA5E9', bg: '#E0F2FE', route: '/activities' },
            { icon: 'trophy-outline', text: 'Compétitions', color: '#F59E0B', bg: '#FEFCE8', route: '/competition' },
            { icon: 'people-outline', text: 'Mes enfants', color: '#6366F1', bg: '#EDE9FE', route: '/ChildrenListScreen' },
          ].map((item, i) => (
            <TouchableOpacity key={i} style={styles.quickLink} onPress={() => router.push(item.route)}>
              <View style={[styles.quickLinkIcon, { backgroundColor: item.bg }]}>
                <Ionicons name={item.icon} size={22} color={item.color} />
              </View>
              <Text style={styles.quickLinkText}>{item.text}</Text>
            </TouchableOpacity>
          ))}
        </View>

      
        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => router.push('/')}
          >
            <Ionicons name="home" size={24} color="#8B5CF6" />
            <Text style={styles.navText}>Accueil</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => router.push('/calendar')}
          >
            <Ionicons name="calendar-outline" size={24} color="#71717A" />
            <Text style={[styles.navText, {color: '#71717A'}]}>Calendrier</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => router.push('/messagess')}
          >
            <Ionicons name="chatbubbles-outline" size={24} color="#71717A" />
            <Text style={[styles.navText, {color: '#71717A'}]}>Messages</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => router.push('/ParametresScreen')}
          >
            <Ionicons name="person-outline" size={24} color="#71717A" />
            <Text style={[styles.navText, {color: '#71717A'}]}>Profil</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  // Core Layout - More refined base
  container: {
    flex: 1,
    backgroundColor: '#F9F7FF', // Lighter, more airy background
  },
  backgroundPattern: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.02, // More subtle pattern
  },
  scrollContent: {
    paddingTop: 10,
    paddingBottom: 280, // More space at bottom for comfortable scrolling
  },
  
  // Header Section - More elegant & modern
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 36,
    height: 64,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#5D3FD3', // Richer purple
    marginLeft: 12,
    letterSpacing: 0.6,
  },
  iconButton: {
    padding: 10,
    borderRadius: 14,
  },

  // Notification System - More polished
  notificationButton: {
    padding: 10,
    backgroundColor: '#F0EBFF',
    borderRadius: 14,
    shadowColor: '#5D3FD3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  notificationIconContainer: {
    position: 'relative',
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FF3B30', // More vibrant red
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  notificationCount: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  notificationDropdown: {
  backgroundColor: 'white',
  paddingVertical: 10,
  paddingHorizontal: 16,
  borderRadius: 12,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.1,
  shadowRadius: 8,
  elevation: 10,
  marginTop: 70,     // 👈 Appears below the bell
  marginRight: 25,   // 👈 Aligns from the right
  width: 260,
},
notificationItemRow: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 6,
},
notificationItemText: {
  fontSize: 14,
  color: '#1F2937',
},

separator: {
  height: 1,
  backgroundColor: '#E5E7EB',
  marginVertical: 6,
},


  // Parent Info Card - Premium glass-like design
  parentInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0EBFF',
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 24,
    marginHorizontal: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#D8CBFF',
    shadowColor: '#5D3FD3',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 8,
  },
  gradientBorder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    padding: 3,
    backgroundColor: '#5D3FD3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  parentAvatar: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#5D3FD3',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  parentInitials: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
  },
  avatarImage: {
    width: 66,
    height: 66,
    borderRadius: 33,
  },
  parentInfo: {
    flex: 1,
    marginLeft: 22,
  },
  parentTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 8,
  },
  subTitle: {
    color: '#4B5563',
    fontSize: 16,
    lineHeight: 24,
  },

  // Quick Links - Modern tile style
 quickLinksContainer: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  paddingHorizontal: 20,
  marginBottom: 30,
},

  quickLink: {
  width: '23%', // 4 items per row with some margin
  alignItems: 'center',
  marginBottom: 24,
},
 quickLinkIcon: {
  width: 60,
  height: 60,
  borderRadius: 20,
  justifyContent: 'center',
  alignItems: 'center',
  marginBottom: 8,
  shadowColor: '#5D3FD3',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
},
quickLinkText: {
  fontSize: 13,
  fontWeight: '500',
  color: '#1F2937',
  textAlign: 'center',
},
  // Bottom Navigation - Floating style
  bottomNav: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    height: 84,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#EBE5FF',
    paddingBottom: 12,
    shadowColor: '#5D3FD3',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 12,
    paddingTop: 12,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 64,
  },
  
  navText: {
    color: '#5D3FD3',
    fontSize: 13,
    marginTop: 6,
    fontWeight: '600',
  },

});