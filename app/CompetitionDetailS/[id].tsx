import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const API_URL = Constants.expoConfig?.extra?.apiUrl ?? 'http://192.168.110.138:8080';

export default function CompetitionDetailsScreen() {
  const { id } = useLocalSearchParams();
  const [competition, setCompetition] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const response = await axios.get(`${API_URL}/api/competitions/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setCompetition(response.data);
        
        // Start animations when data is loaded
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]).start();
      } catch (error) {
        console.error('❌ Failed to load competition details', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id]);

  const AnimatedCard = ({ children, delay = 0 }) => {
    const cardFade = useRef(new Animated.Value(0)).current;
    const cardSlide = useRef(new Animated.Value(30)).current;

    useEffect(() => {
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(cardFade, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(cardSlide, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]).start();
      }, delay);

      return () => clearTimeout(timer);
    }, []);

    return (
      <Animated.View
        style={{
          opacity: cardFade,
          transform: [{ translateY: cardSlide }],
        }}
      >
        {children}
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <LinearGradient
        colors={['#8B5CF6', '#A855F7', '#C084FC']}
        style={styles.loadingContainer}
      >
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (!competition) {
    return (
      <LinearGradient
        colors={['#8B5CF6', '#A855F7', '#C084FC']}
        style={styles.loadingContainer}
      >
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContent}>
          <Text style={styles.errorText}>🚫 Compétition introuvable</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.push('/competition')}
          >
            <Text style={styles.retryButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#8B5CF6', '#A855F7', '#C084FC']}
        style={styles.backgroundGradient}
      >
        <Animated.View
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim }
              ],
            },
          ]}
        >
          {/* Header */}
          <LinearGradient
            colors={['#7C3AED', '#8B5CF6', '#A855F7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <View style={styles.headerContent}>
              <TouchableOpacity
                onPress={() => router.push('/competition')}
                style={styles.backButton}
                activeOpacity={0.8}
              >
                <Text style={styles.backArrow}>←</Text>
              </TouchableOpacity>
              <Text style={styles.title} numberOfLines={2}>
                {competition.nom}
              </Text>
            </View>
          </LinearGradient>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={true}
          >
            {/* Image */}
            {competition.imageBase64 && (
              <AnimatedCard delay={100}>
                <View style={styles.imageContainer}>
                  <Image
                    source={{ uri: competition.imageBase64 }}
                    style={styles.image}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.3)']}
                    style={styles.imageOverlay}
                  />
                </View>
              </AnimatedCard>
            )}

            {/* Details Section */}
            <AnimatedCard delay={200}>
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.iconContainer}>
                    <Text style={styles.sectionIcon}>📌</Text>
                  </View>
                  <Text style={styles.sectionTitle}>Détails</Text>
                </View>
                
                <View style={styles.detailsGrid}>
                  <DetailItem
                    icon="📅"
                    label="Date"
                    value={competition.date}
                  />
                  <DetailItem
                    icon="📍"
                    label="Lieu"
                    value={competition.lieu}
                  />
                  <DetailItem
                    icon="🏢"
                    label="Organisateur"
                    value={competition.organisateur}
                  />
                  <DetailItem
                    icon="📝"
                    label="Description"
                    value={competition.description || 'Aucune description'}
                    fullWidth
                  />
                </View>
              </View>
            </AnimatedCard>

            {/* Résultat */}
            <AnimatedCard delay={300}>
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.iconContainer}>
                    <Text style={styles.sectionIcon}>🥇</Text>
                  </View>
                  <Text style={styles.sectionTitle}>Résultat</Text>
                </View>
                
                <LinearGradient
                  colors={['#EDE9FE', '#F3E8FF']}
                  style={styles.resultBox}
                >
                  <Text style={styles.resultText}>
                    {competition.resultat || 'Résultat non disponible'}
                  </Text>
                </LinearGradient>
              </View>
            </AnimatedCard>

            {/* Trophées */}
            <AnimatedCard delay={400}>
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.iconContainer}>
                    <Text style={styles.sectionIcon}>🎖️</Text>
                  </View>
                  <Text style={styles.sectionTitle}>Trophées</Text>
                </View>
                
                <View style={styles.trophyContainer}>
                  {competition.trophies?.length ? (
                    competition.trophies.map((trophy, index) => (
                      <Animated.View
                        key={index}
                        style={[
                          styles.trophyBadge,
                          {
                            transform: [{
                              scale: new Animated.Value(0).interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, 1],
                              })
                            }]
                          }
                        ]}
                      >
                        <LinearGradient
                          colors={['#FEF3C7', '#FDE68A']}
                          style={styles.trophyGradient}
                        >
                          <Text style={styles.trophyText}>{trophy}</Text>
                        </LinearGradient>
                      </Animated.View>
                    ))
                  ) : (
                    <View style={styles.noTrophyContainer}>
                      <Text style={styles.noTrophyText}>🏆 Aucun trophée pour le moment</Text>
                    </View>
                  )}
                </View>
              </View>
            </AnimatedCard>
          </ScrollView>
        </Animated.View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const DetailItem = ({ icon, label, value, fullWidth = false }) => (
  <View style={[styles.detailItem, fullWidth && styles.detailItemFull]}>
    <View style={styles.detailHeader}>
      <Text style={styles.detailIcon}>{icon}</Text>
      <Text style={styles.detailLabel}>{label}</Text>
    </View>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  backgroundGradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  container: {
    flex: 1,
    margin: 16,
    marginTop: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backArrow: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginRight: 60, // Compensate for back button
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  image: {
    width: '100%',
    height: 220,
    backgroundColor: '#F3F4F6',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionIcon: {
    fontSize: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
  },
  detailsGrid: {
    gap: 16,
  },
  detailItem: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
  },
  detailItemFull: {
    // Full width styling if needed
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
    lineHeight: 24,
  },
  resultBox: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#8B5CF6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  resultText: {
    fontSize: 18,
    color: '#7C3AED',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 26,
  },
  trophyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  trophyBadge: {
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#F59E0B',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  trophyGradient: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  trophyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
  },
  noTrophyContainer: {
    backgroundColor: '#F3F4F6',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  noTrophyText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },
});