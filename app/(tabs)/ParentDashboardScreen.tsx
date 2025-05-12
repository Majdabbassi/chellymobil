import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { getParentById } from '@/services/parentService';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage'
import { registerForPushNotificationsAsync } from '@/services/firebase-notifications';
import * as Notifications from 'expo-notifications';
import API from '@/services/api';
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
    return require('../../assets/images/adaptive-icon.png');
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
  return require('../../assets/images/adaptive-icon.png');
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
      try {
        const data = await getParentById();
        console.log("Parent data received:", data);
        
        // Log pour déboguer les données d'avatar
        console.log("Avatar du parent reçu:", data.avatar);
        
        // Simule des notifications si le backend n'en renvoie pas
        const notificationsList = data.notificationsList && data.notificationsList.length > 0
          ? data.notificationsList
          : [
              "📅 Match samedi à 14h",
              "💰 Paiement en attente",
              "💬 Nouveau message du coach"
            ];
        
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
          notificationsList,
          notifications: notificationsList.length,
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
 
  const renderProgressBar = (progress: number) => {
    return (
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
        <View style={styles.progressTextContainer}>
          <Text style={styles.progressText}>{progress}%</Text>
          <Text style={styles.progressLabel}>Complété</Text>
        </View>
      </View>
    );
  };
  
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
           
            {showNotifications && (
              <View style={styles.notificationDropdown}>
                {parent?.notificationsList && parent.notificationsList.length > 0 ? (
                  parent.notificationsList.map((notif, idx) => (
                    <Text key={idx} style={styles.notificationItem}>{notif}</Text>
                  ))
                ) : (
                  <Text style={styles.notificationItem}>Aucune notification</Text>
                )}
              </View>
            )}
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
       
        {/* Quick Links */}
<View style={styles.quickLinksContainer}>
  {/* First Row */}
  <View style={styles.quickLinksRow}>
    <TouchableOpacity style={styles.quickLink} onPress={() => router.push('/calendar')}>
      <View style={[styles.quickLinkIcon, { backgroundColor: '#F0F4FF' }]}>
        <Ionicons name="calendar" size={22} color="#6366F1" />
      </View>
      <Text style={styles.quickLinkText}>Calendrier</Text>
    </TouchableOpacity>

    <TouchableOpacity style={styles.quickLink} onPress={() => router.push('/PaymentSelectionScreen')}>
      <View style={[styles.quickLinkIcon, { backgroundColor: '#F5F3FF' }]}>
        <Ionicons name="card-outline" size={22} color="#8B5CF6" />
      </View>
      <Text style={styles.quickLinkText}>Paiements</Text>
    </TouchableOpacity>

    <TouchableOpacity style={styles.quickLink} onPress={() => router.push('/messagess')}>
      <View style={[styles.quickLinkIcon, { backgroundColor: '#F0FDF4' }]}>
        <Ionicons name="chatbubbles-outline" size={22} color="#10B981" />
      </View>
      <Text style={styles.quickLinkText}>Messages</Text>
    </TouchableOpacity>
  </View>

  {/* Second Row */}
  <View style={styles.quickLinksRow}>
    <TouchableOpacity style={styles.quickLink} onPress={() => router.push('/ParametresScreen')}>
      <View style={[styles.quickLinkIcon, { backgroundColor: '#FEF2F2' }]}>
        <Ionicons name="settings-outline" size={22} color="#EF4444" />
      </View>
      <Text style={styles.quickLinkText}>Paramètres</Text>
    </TouchableOpacity>

    <TouchableOpacity style={styles.quickLink} onPress={() => router.push('/activities')}>
      <View style={[styles.quickLinkIcon, { backgroundColor: '#E0F2FE' }]}>
        <Ionicons name="football-outline" size={22} color="#0EA5E9" />
      </View>
      <Text style={styles.quickLinkText}>Activités</Text>
    </TouchableOpacity>

    <TouchableOpacity style={styles.quickLink} onPress={() => router.push('/competitions')}>
      <View style={[styles.quickLinkIcon, { backgroundColor: '#FEFCE8' }]}>
        <Ionicons name="trophy-outline" size={22} color="#F59E0B" />
      </View>
      <Text style={styles.quickLinkText}>Compétitions</Text>
    </TouchableOpacity>
  </View>
</View>

       
        {/* Adhérents Section Title */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Mes Adhérents</Text>
          <TouchableOpacity style={styles.sectionAction}>
            <Text style={styles.sectionActionText}>Voir tout</Text>
            <Ionicons name="chevron-forward" size={16} color="#8B5CF6" />
          </TouchableOpacity>
        </View>
       
        {/* Adhérents Cards */}
        {adherents && adherents.length > 0 ? (
          adherents
            .filter(child => child && child.nom) // sécurité
            .map((child, i) => (
              <View key={i} style={styles.childCard}>
                <View style={styles.childHeader}>
                  <View style={styles.childAvatar}>
                    {child.avatar ? (
                      <Image 
                        source={getImageSource(child.avatar)} 
                        style={styles.avatarImage} 
                        onError={(e) => console.error(`Erreur image adhérent ${child.id}:`, e.nativeEvent.error)}
                      />
                    ) : (
                      <Text style={styles.childInitials}>
                        {child.nom?.charAt(0) ?? '?'}
                      </Text>
                    )}
                  </View>
                  <View style={styles.childInfo}>
                    <Text style={styles.childName}>
                      {child.prenom} {child.nom}
                    </Text>
                    {/* Si tu veux afficher l'âge, il doit exister dans ton DTO */}
                    {child.age && <Text style={styles.childAge}>{child.age} ans</Text>}
                  </View>
      <TouchableOpacity
  style={styles.moreButton}
  onPress={() => setVisibleMenuId(visibleMenuId === child.id ? null : child.id)}
>
  <Ionicons name="ellipsis-vertical" size={20} color="#8B5CF6" />
</TouchableOpacity>
{visibleMenuId === child.id && (
  <View style={{
    position: 'absolute',
    top: 70,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    zIndex: 999,
  }}>
    <TouchableOpacity onPress={() => {
      router.push({ pathname: '/AdherentDetailScreen', params: { adherentId: child.id } });
      setVisibleMenuId(null);
    }}>
      <Text style={{ paddingVertical: 8, color: '#1F2937' }}>👤 Voir profil</Text>
    </TouchableOpacity>
    <TouchableOpacity onPress={() => {
      alert('Modifier à implémenter');
      setVisibleMenuId(null);
    }}>
      <Text style={{ paddingVertical: 8, color: '#1F2937' }}>✏️ Modifier</Text>
    </TouchableOpacity>
    <TouchableOpacity onPress={() => {
      alert('Supprimer à implémenter');
      setVisibleMenuId(null);
    }}>
      <Text style={{ paddingVertical: 8, color: 'red' }}>🗑 Supprimer</Text>
    </TouchableOpacity>
  </View>
)}

                </View>
<View style={[styles.childContent, { flexGrow: 1 }]}>             
       <View style={styles.nextSessionContainer}>
                    <View style={styles.nextSessionContainer}>
                      <Ionicons name="time-outline" size={18} color="#8B5CF6" />
                    </View>
                    <Text style={styles.nextSessionText}>
                      Prochaine séance :{' '}
                      <Text style={styles.nextSessionTime}>
                        {child.nextSession ?? 'Non spécifiée'}
                      </Text>
                    </Text>
                  </View>
                  <Text style={styles.activityTitle}>Activités</Text>
                  <View style={styles.activitiesList}>
                    {(child.activities ?? []).map((act, j) => (
                      <View key={j} style={styles.activityTag}>
                        <Text style={styles.activityText}>{act}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={styles.progressTitle}>Progression globale</Text>
                  {renderProgressBar(child.progress ?? 0)}
                  <View style={styles.buttonsRow}>
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() => router.push('/calendar')}
                    >
                      <Ionicons name="calendar-outline" size={18} color="#8B5CF6" />
                      <Text style={styles.secondaryButtonText}>Planning</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.detailsButton}
                      onPress={() => router.push({
                        pathname: '/AdherentDetailScreen',
                        params: { adherentId: child.id }
                      })}
                    >
                      <Text style={styles.detailsButtonText}>Voir les détails</Text>
                      <Ionicons name="arrow-forward" size={16} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.detailsButton}
                      onPress={() => router.push({
                        pathname: '/AdherentPerformanceScreen',
                        params: { adherentId: child.id }
                      })}
                    >
                      <Text style={styles.detailsButtonText}>Voir les performances</Text>
                      <Ionicons name="arrow-forward" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
        ) : (
          <View style={styles.noAdherentsContainer}>
            <Text style={styles.noAdherentsText}>Aucun adhérent trouvé</Text>
          </View>
        )}
        {/* Upcoming Events Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Événements à venir</Text>
          <TouchableOpacity
            style={styles.sectionAction}
            onPress={() => router.push('/calendar')}
          >
            <Text style={styles.sectionActionText}>Calendrier</Text>
            <Ionicons name="chevron-forward" size={16} color="#8B5CF6" />
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.eventsScrollView}>
          {competitions && competitions.length > 0 ? (
            competitions.map((comp, index) => (
              <TouchableOpacity
                key={index}
                style={styles.eventCard}
                onPress={() => router.push({
                  pathname: '/calendar', // Replace with a valid path
                  params: { competitionId: comp.id }
                })}
              >
                <View style={styles.eventDateBadge}>
                  <Text style={styles.eventDateDay}>
                    {new Date(comp.date).getDate()}
                  </Text>
                  <Text style={styles.eventDateMonth}>
                    {new Date(comp.date).toLocaleString('fr-FR', { month: 'short' }).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle}>{comp.nom}</Text>
                  <View style={styles.eventDetails}>
                    <Ionicons name="location-outline" size={14} color="#6B7280" />
                    <Text style={styles.eventDetailsText}>{comp.lieu || 'Lieu non précisé'}</Text>
                  </View>
                  <View style={styles.eventDetails}>
                    <Ionicons name="time-outline" size={14} color="#6B7280" />
                    <Text style={styles.eventDetailsText}>
                      {new Date(comp.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.noEventsContainer}>
              <Text style={styles.noEventsText}>Aucun événement à venir</Text>
            </View>
          )}
        </ScrollView>
        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => router.push('(tabs)/dashboard')}
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
    paddingTop: 72,
    paddingBottom: 180, // More space at bottom for comfortable scrolling
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
    position: 'absolute',
    top: 60,
    right: 10,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 20,
    shadowColor: '#5D3FD3',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 1000,
    width: 300,
    borderWidth: 1,
    borderColor: '#EBE5FF',
  },
  notificationItem: {
    fontSize: 15,
    color: '#1F2937',
    paddingVertical: 12,
    flexDirection: 'row',
    flexWrap: 'nowrap',
    borderBottomWidth: 1,
    borderBottomColor: '#F0EBFF',
    paddingBottom: 14,
    marginBottom: 12,
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
    marginBottom: 38,
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
  paddingHorizontal: 30,
  marginTop: 20,
},
quickLinksRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 18,
},
  quickLink: {
    alignItems: 'center',
    width: (width - 100) / 4, // Better spacing distribution
  },
  quickLinkIcon: {
    width: 62,
    height: 62,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#5D3FD3',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EBE5FF',
  },
  quickLinkText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
    textAlign: 'center',
  },

  // Section Headers - More distinctive with subtle indicators
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    letterSpacing: 0.4,
    position: 'relative',
    paddingLeft: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#5D3FD3',
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0EBFF',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  sectionActionText: {
    color: '#5D3FD3',
    fontSize: 15,
    marginRight: 8,
    fontWeight: '600',
  },

  // Child Cards - Neumorphic inspired design
  childCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    overflow: 'hidden',
    marginHorizontal: 24,
    marginBottom: 36,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: '#EBE5FF',
    shadowColor: '#5D3FD3',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  
  childHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EBE5FF',
    backgroundColor: '#FCFAFF',
    marginTop: 12,
  },
  
  childAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#5D3FD3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 18,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#5D3FD3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  childInitials: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  childInfo: {
    flex: 1,
    minWidth: 0, // Prevents text overflow
  },
  childName: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 6,
    flexShrink: 1,
  },
  moreButton: {
    padding: 12,
    backgroundColor: '#F0EBFF',
    borderRadius: 14,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  childContent: {
    padding: 22,
  },

  // Next Session - More visually distinctive
  nextSessionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0EBFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 22,
    minHeight: 68,
    shadowColor: '#5D3FD3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  nextSessionText: {
    color: '#4B5563',
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
    flexWrap: 'wrap',
  },
  nextSessionTime: {
    color: '#5D3FD3',
    fontWeight: 'bold',
    fontSize: 16,
  },

  // Activities - Modernized tags
  activityTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 14,
  },
  activitiesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 22,
  },
  activityTag: {
    backgroundColor: '#F0EBFF',
    borderRadius: 16,
    paddingVertical: 9,
    paddingHorizontal: 16,
    marginRight: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#D8CBFF',
    shadowColor: '#5D3FD3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  activityText: {
    color: '#5D3FD3',
    fontSize: 15,
    fontWeight: '600',
  },

  // Progress Section - More visual appeal
  progressTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 14,
  },
  progressContainer: {
    height: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    marginBottom: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#5D3FD3',
    borderRadius: 6,
  },
  progressTextContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  progressText: {
    color: '#5D3FD3',
    fontSize: 16,
    fontWeight: '600',
  },
  progressLabel: {
    color: '#4B5563',
    fontSize: 15,
  },

  // Buttons - More interactive and polished
  buttonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0EBFF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: '#D8CBFF',
    shadowColor: '#5D3FD3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  secondaryButtonText: {
    color: '#5D3FD3',
    fontWeight: '600',
    marginLeft: 10,
    fontSize: 16,
  },
  detailsButton: {
    backgroundColor: '#5D3FD3',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 130,
    marginLeft: 12,
    marginTop: 10,
    shadowColor: '#5D3FD3',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  detailsButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginRight: 10,
    fontSize: 16,
  },

  // Events - More elegant cards
  eventsScrollView: {
    marginTop: 16,
    paddingLeft: 24,
    marginBottom: 36,
  },
  eventCard: {
    width: 300,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    marginRight: 18,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#EBE5FF',
    shadowColor: '#5D3FD3',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  eventDateBadge: {
    width: 76,
    backgroundColor: '#5D3FD3',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
  },
  eventDateDay: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: 'bold',
  },
  eventDateMonth: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  eventInfo: {
    flex: 1,
    padding: 18,
  },
  eventTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  eventDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventDetailsText: {
    color: '#4B5563',
    fontSize: 14,
    marginLeft: 8,
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
  activeNavItem: {
    backgroundColor: '#F0EBFF',
    borderRadius: 18,
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    color: '#5D3FD3',
    fontSize: 13,
    marginTop: 6,
    fontWeight: '600',
  },

  // Empty States - More appealing visually
  noAdherentsContainer: {
    alignItems: 'center',
    padding: 36,
    backgroundColor: '#F9FAFB',
    marginHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 30,
    shadowColor: '#5D3FD3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  noAdherentsText: {
    fontSize: 17,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 26,
  },
  noEventsContainer: {
    width: width - 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 40,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#5D3FD3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  noEventsText: {
    color: '#4B5563',
    fontStyle: 'italic',
    fontSize: 17,
    textAlign: 'center',
  },
  
  // Enhanced modern elements
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0EBFF',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginHorizontal: 24,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#D8CBFF',
    shadowColor: '#5D3FD3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#374151',
  },
  filterButton: {
    backgroundColor: '#E4DEFF',
    padding: 10,
    borderRadius: 14,
    marginLeft: 12,
  },
  badge: {
    backgroundColor: '#5D3FD3',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginLeft: 14,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  notificationTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EBE5FF',
    paddingBottom: 10,
  },
  cardActionButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: '#EBE5FF',
    shadowColor: '#5D3FD3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  }
});