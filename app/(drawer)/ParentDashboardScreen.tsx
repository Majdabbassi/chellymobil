import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image,
  Animated,
  Dimensions,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { getParentById } from '@/services/parentService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerForPushNotificationsAsync } from '@/services/firebase-notifications';
import * as Notifications from 'expo-notifications';
import API from '@/services/api';
import Modal from 'react-native-modal';
import { getAllProducts, ProductDTO } from '@/services/products';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

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

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const FloatingCard = ({ children, style, delay = 0 }) => {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animation d'entrée
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        })
      ])
    ]).start();

    // Animation de flottement continue
    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        })
      ])
    );
    floatAnimation.start();

    return () => floatAnimation.stop();
  }, []);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8]
  });

  return (
    <Animated.View
      style={[
        style,
        {
          transform: [{ translateY }, { scale: scaleAnim }],
          opacity: opacityAnim,
        }
      ]}
    >
      {children}
    </Animated.View>
  );
};

const PulsingIcon = ({ name, size, color, style }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, []);

  return (
    <Animated.View style={[style, { transform: [{ scale: pulseAnim }] }]}>
      <Ionicons name={name} size={size} color={color} />
    </Animated.View>
  );
};

const HorizontalCardList = ({ data, renderItem }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.horizontalScrollView}
  >
    {data.map((item, index) => renderItem(item, index))}
  </ScrollView>
);

const getImageSource = (image?: string | any) => {  
  if (!image) {
    return require('@/assets/images/adaptive-icon.png');
  }
  if (image.uri) {
    return image;
  }
  if (typeof image === 'string') {
    if (image.startsWith('data:')) {
      return { uri: image };
    } 
    else if (image.length > 0) {
      return { uri: `data:image/jpeg;base64,${image}` };
    }
  }
  return require('@/assets/images/adaptive-icon.png');
};

export default function ParentDashboardScreen() {
  const [parent, setParent] = useState<Parent | null>(null);
  const [adherents, setAdherents] = useState<Adherent[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const navigation = useNavigation();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [weekSessions, setWeekSessions] = useState<{ [day: string]: string[] }>({});
  const [products, setProducts] = useState([]);
  const headerAnim = useRef(new Animated.Value(0)).current;
  const cardAnimations = useRef(Array(8).fill(0).map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Animation du header
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Animation séquentielle des cartes
    const cardSequence = cardAnimations.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
      })
    );
    
    Animated.stagger(100, cardSequence).start();
  }, []);

  // Tous vos useEffect existants...
  useEffect(() => {
    const fetchNotifications = async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log("⛔ Pas de token pour notifications");
        return;
      }
      try {
        const res = await API.get('/notifications/me');
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
        if (expoToken) {
          await API.post('/notifications/token', {
            token: expoToken,
          });
        }
      } catch (e) {
        console.error('❌ Erreur enregistrement token de notification:', e);
      }
    };
    initNotifications();
  }, []);

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(notification => { 
      const newMessage = notification.request.content.body;
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
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const fetchParent = async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        return;
      }
      try {
        const data = await getParentById();
        let processedAvatar = null;
        if (data.avatar) {
          if (typeof data.avatar === 'string') {
            processedAvatar = data.avatar.startsWith('data:') 
              ? data.avatar 
              : `data:image/jpeg;base64,${data.avatar}`;
          } else {
            processedAvatar = data.avatar;
          }
        }
        setParent({
          ...data,
          notificationsList: [],
          notifications: 0,
          avatar: processedAvatar
        });

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

        const adherentsMapped = await Promise.all(
          (data.adherents || []).map(async (adherent: Adherent) => {
            let latestNote = 0;
            try {
              const perfRes = await API.get(`/performances/adherent/${adherent.id}/last`, {
                timeout: 5000,
              });
              latestNote = perfRes.data?.note ?? 0;
            } catch (err) {
              console.warn(`⚠️ Erreur performance adhérent ${adherent.id}`, err);
            }

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

            let adherentAvatar = null;
            if (adherent.imageBase64) {
              adherentAvatar = adherent.imageBase64.startsWith('data:')
                ? adherent.imageBase64
                : `data:image/jpeg;base64,${adherent.imageBase64}`;
            } else if (adherent.avatar) {
              adherentAvatar = typeof adherent.avatar === 'string'
                ? (adherent.avatar.startsWith('data:')
                  ? adherent.avatar
                  : `data:image/jpeg;base64,${adherent.avatar}`)
                : adherent.avatar;
            }

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
      }
    };
    fetchParent();
  }, []);

  useEffect(() => {
    const fetchWeekSessionsFromCalendar = async () => {
      if (!parent?.id) return;
      const weekMap: { [key: number]: string } = {
        1: 'Lun',2: 'Mar',3: 'Mer',4: 'Jeu',5: 'Ven',6: 'Sam',0: 'Dim',
      };
      try {
        const res = await API.get(`/sessions/calendar`, {
          params: { parentId: parent.id }
        });
        const allSessions = res.data || [];
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + 1);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        const filtered: { [key: string]: string[] } = {};
        
        allSessions.forEach((s: any) => {
          const sessionDate = new Date(s.start); 
          const activityName = s.activite?.nom || s.title || 'Activité inconnue';
          const adherentName = s.adherent?.prenom || s.adherent || 'Adhérent inconnu';
          if (sessionDate >= startOfWeek && sessionDate <= endOfWeek) {
            const day = weekMap[sessionDate.getDay()];
            if (!filtered[day]) filtered[day] = [];
            filtered[day].push(`${activityName} — ${adherentName}`);
          }
        });
        setWeekSessions(filtered);
      } catch (e) {
        console.error('❌ Erreur lors du filtrage des sessions du calendrier:', e);
      }
    };
    fetchWeekSessionsFromCalendar();
  }, [parent]);

  useEffect(() => {
    const fetchProducts = async () => {
      const data = await getAllProducts();
      setProducts(data);
    };
    fetchProducts();
  }, []);

  interface WeekPlanProps {
    weekSessions?: { [day: string]: string[] };
  }

  const WeekPlan: React.FC<WeekPlanProps> = ({ weekSessions }) => {
    const days = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
    const sessionsMap = weekSessions || {};
    
    return (
      <FloatingCard style={styles.weekPlanContainer} delay={300}>
        <LinearGradient
          colors={['#8B5CF6', '#A855F7', '#C084FC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.weekPlanGradient}
        >
          <Text style={styles.weekPlanTitle}>📅 Planning de la semaine</Text>
          <View style={styles.tableRow}>
            {days.map((d, index) => (
              <FloatingCard key={d} style={styles.tableCell} delay={400 + index * 50}>
                <Text style={styles.dayName}>{d}</Text>
                <ScrollView style={{ maxHeight: 80 }} showsVerticalScrollIndicator={false}>
                  {(sessionsMap[d] || []).length === 0 ? (
                    <Text style={styles.emptySession}>—</Text>
                  ) : (
                    sessionsMap[d].map((entry, i) => (
                      <Text key={i} style={styles.sessionText}>{entry}</Text>
                    ))
                  )}
                </ScrollView>
              </FloatingCard>
            ))}
          </View>
        </LinearGradient>
      </FloatingCard>
    );
  };

  const renderProductCard = (product: ProductDTO, index: number) => {
    const hasValidImage = typeof product.imageBase64 === 'string' && product.imageBase64.length > 0;
    const imageUri = hasValidImage
      ? (product.imageBase64.startsWith('data:')
          ? product.imageBase64
          : `data:image/jpeg;base64,${product.imageBase64}`)
      : null;
    
    return (
      <FloatingCard delay={index * 100} style={{ marginRight: 12 }}>
        <AnimatedTouchable
          onPress={() => router.push(`/product/${product.id}`)}
          style={styles.productCard}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#F3E8FF', '#E9D5FF', '#DDD6FE']}
            style={styles.productImageContainer}
          >
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={styles.productImage}
                onError={(e) =>
                  console.warn('❌ Erreur chargement image produit :', e.nativeEvent?.error)
                }
              />
            ) : (
              <View style={styles.productPlaceholder}>
                <PulsingIcon name="image-outline" size={28} color="#8B5CF6" />
              </View>
            )}
          </LinearGradient>
          <Text numberOfLines={1} style={styles.productTitle}>
            {product.designation}
          </Text>
        </AnimatedTouchable>
      </FloatingCard>
    );
  };

  const headerTranslateY = headerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, 0]
  });

  const headerOpacity = headerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1]
  });

  return (
    <View style={styles.container}>
      {/* Background animé */}
      <LinearGradient
        colors={['#F8FAFC', '#F1F5F9', '#E2E8F0']}
        style={styles.backgroundGradient}
      >
        <View style={styles.backgroundPattern} />
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        {/* Header animé */}
        <Animated.View 
          style={[
            styles.header,
            {
              transform: [{ translateY: headerTranslateY }],
              opacity: headerOpacity,
            }
          ]}
        >
          <View style={styles.headerLeft}>
            <AnimatedTouchable
              style={styles.iconButton}
              onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#8B5CF6', '#A855F7']}
                style={styles.iconButtonGradient}
              >
                <Ionicons name="menu-outline" size={28} color="white" />
              </LinearGradient>
            </AnimatedTouchable>
            <Text style={styles.appName}>Club Sportif</Text>
          </View>
          
          <View style={{ position: 'relative' }}>
            <AnimatedTouchable
              style={styles.notificationButton}
              onPress={() => setShowNotifications(!showNotifications)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#8B5CF6', '#A855F7']}
                style={styles.notificationButtonGradient}
              >
                <PulsingIcon 
                  name="notifications-outline" 
                  size={24} 
                  color="white"
                />
                {parent && parent.notifications && parent.notifications > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationCount}>{parent.notifications}</Text>
                  </View>
                )}
              </LinearGradient>
            </AnimatedTouchable>
           
            <Modal
              isVisible={showNotifications}
              backdropOpacity={0.3}
              animationIn="fadeInDown"
              animationOut="fadeOutUp"
              onBackdropPress={() => setShowNotifications(false)}
              style={styles.modalStyle}
            >
              <TouchableOpacity
                style={styles.notificationDropdown}
                activeOpacity={0.9}
                onPress={() => {
                  setShowNotifications(false);
                  router.push('/NotificationsScreen');
                }}
              >
                <LinearGradient
                  colors={['#FFFFFF', '#F8FAFC']}
                  style={styles.notificationDropdownGradient}
                >
                  {parent?.notificationsList?.length > 0 ? (
                    parent.notificationsList
                      .slice(0, 3)
                      .map((notif, idx) => (
                        <View key={idx} style={styles.notificationItemRow}>
                          <Text style={styles.notificationItemText}>{notif}</Text>
                          {idx < 2 && <View style={styles.separator} />}
                        </View>
                      ))
                  ) : (
                    <Text style={styles.notificationItemText}>Aucune notification</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Modal>
          </View>
        </Animated.View>

        {/* Parent Info Card */}
        <FloatingCard style={styles.parentInfoCard} delay={200}>
          <LinearGradient
            colors={['#8B5CF6', '#A855F7', '#C084FC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.parentCardGradient}
          >
            <View style={styles.parentCardContent}>
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
          </LinearGradient>
        </FloatingCard>

        <WeekPlan weekSessions={weekSessions} />

        {/* Quick links avec animations */}
        <View style={styles.quickLinksContainer}>
          {[
            { icon: 'calendar', text: 'Calendrier', colors: ['#8B5CF6', '#A855F7'], route: '/calendar' },
            { icon: 'card-outline', text: 'Paiements', colors: ['#7C3AED', '#8B5CF6'], route: '/PaymentSelectionScreen' },
            { icon: 'chatbubbles-outline', text: 'Messages', colors: ['#A855F7', '#C084FC'], route: '/messagess' },
            { icon: 'notifications-outline', text: 'Notifications', colors: ['#9333EA', '#A855F7'], route: '/NotificationsScreen' },
            { icon: 'settings-outline', text: 'Paramètres', colors: ['#8B5CF6', '#9333EA'], route: '/ParametresScreen' },
            { icon: 'football-outline', text: 'Activités', colors: ['#A855F7', '#B768F8'], route: '/activities' },
            { icon: 'trophy-outline', text: 'Compétitions', colors: ['#7C3AED', '#8B5CF6'], route: '/competition' },
            { icon: 'people-outline', text: 'Enfants', colors: ['#9333EA', '#A855F7'], route: '/ChildrenListScreen' },
          ].map((item, i) => (
            <Animated.View
              key={i}
              style={[
                styles.quickLinkWrapper,
                {
                  transform: [{ 
                    translateY: cardAnimations[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0]
                    })
                  }],
                  opacity: cardAnimations[i],
                }
              ]}
            >
              <AnimatedTouchable 
                style={styles.quickLink} 
                onPress={() => router.push(item.route)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={item.colors}
                  style={styles.quickLinkIcon}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <PulsingIcon name={item.icon} size={24} color="white" />
                </LinearGradient>
                <Text style={styles.quickLinkText}>{item.text}</Text>
              </AnimatedTouchable>
            </Animated.View>
          ))}
        </View>

        {/* Section produits */}
        <FloatingCard style={styles.productsSection} delay={800}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🛍️ Produits populaires</Text>
            <TouchableOpacity onPress={() => router.push('/boutique')}>
              <LinearGradient
                colors={['#8B5CF6', '#A855F7']}
                style={styles.seeAllButton}
              >
                <Text style={styles.seeAllLink}>Visiter la boutique</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <HorizontalCardList
            data={products}
            renderItem={renderProductCard}
          />
        </FloatingCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  backgroundPattern: {
    position: 'absolute',
    width: '200%',
    height: '200%',
    opacity: 0.05,
    backgroundColor: 'transparent',
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23A855F7' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },

  // Header styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    backgroundColor: 'transparent',
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconButton: {
    marginRight: 15,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },

  iconButtonGradient: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: -0.5,
  },

  notificationButton: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },

  notificationButtonGradient: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },

  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },

  notificationCount: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
  },

  // Modal et notifications
  modalStyle: {
    margin: 0,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
    paddingRight: 20,
  },

  notificationDropdown: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    maxWidth: 300,
  },

  notificationDropdownGradient: {
    padding: 20,
    minHeight: 100,
  },

  notificationItemRow: {
    paddingVertical: 8,
  },

  notificationItemText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },

  separator: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginTop: 8,
  },

  // Parent info card
  parentInfoCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 15,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },

  parentCardGradient: {
    padding: 24,
  },

  parentCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  gradientBorder: {
    padding: 3,
    borderRadius: 35,
    background: 'linear-gradient(45deg, #FFFFFF40, #FFFFFF20)',
  },

  parentAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },

  avatarImage: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },

  parentInitials: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
  },

  parentInfo: {
    marginLeft: 20,
    flex: 1,
  },

  parentTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
    letterSpacing: -0.5,
  },

  subTitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },

  // Week plan
  weekPlanContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },

  weekPlanGradient: {
    padding: 20,
  },

  weekPlanTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    marginBottom: 16,
    textAlign: 'center',
  },

  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },

  tableCell: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginHorizontal: 2,
    borderRadius: 12,
    padding: 8,
    minHeight: 100,
    backdropFilter: 'blur(10px)',
  },

  dayName: {
    fontSize: 12,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  emptySession: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },

  sessionText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 4,
    fontWeight: '500',
  },

  // Quick links
  quickLinksContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginBottom: 24,
    justifyContent: 'space-between',
  },

  quickLinkWrapper: {
    width: '23%',
    marginBottom: 16,
  },

  quickLink: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 20,
    elevation: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },

  quickLinkIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },

  quickLinkText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
    lineHeight: 14,
  },

  // Products section
  productsSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: -0.5,
  },

  seeAllButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },

  seeAllLink: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },

  horizontalScrollView: {
    paddingLeft: 4,
  },

  // Product cards
  productCard: {
    width: 140,
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },

  productImageContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },

  productImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },

  productPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  productTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },

  // Additional styles for enhanced animations
  pulseAnimation: {
    animationName: 'pulse',
    animationDuration: '2s',
    animationIterationCount: 'infinite',
  },

  floatAnimation: {
    animationName: 'float',
    animationDuration: '6s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'ease-in-out',
  },

  // Glassmorphism effects
  glassEffect: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },

  // Responsive adjustments
  ...(width < 375 && {
    quickLinkWrapper: {
      width: '48%',
    },
    productCard: {
      width: 120,
    },
  }),
});