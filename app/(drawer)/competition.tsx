import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Dimensions
} from 'react-native';
import axios from 'axios';
import { router, useNavigation } from 'expo-router';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const API_URL = Constants.expoConfig?.extra?.apiUrl ?? 'http://192.168.110.138:8080';

export default function CompetitionListScreen() {
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    const fetchCompetitions = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const response = await axios.get(`${API_URL}/api/competitions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCompetitions(response.data);
        
        // Animation d'entrée
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]).start();
      } catch (error) {
        console.error('❌ Failed to load competitions', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompetitions();
  }, []);

  const AnimatedCard = ({ competition, index }) => {
    const cardAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 600,
        delay: index * 100,
        useNativeDriver: true,
      }).start();
    }, []);

    const handlePressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    };

    const isUpcoming = new Date(competition.date) > new Date();

    return (
      <Animated.View
        style={[
          styles.cardContainer,
          {
            opacity: cardAnim,
            transform: [
              {
                translateY: cardAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              },
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.card, isUpcoming ? styles.upcomingCard : styles.completedCard]}
          onPress={() => router.push(`/CompetitionDetailS/${competition.id}`)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardIconContainer}>
              <Ionicons 
                name={isUpcoming ? "calendar-outline" : "trophy-outline"} 
                size={24} 
                color={isUpcoming ? "#8B5CF6" : "#F59E0B"} 
              />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{competition.nom}</Text>
              <View style={styles.cardDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="calendar" size={14} color="#8B5CF6" />
                  <Text style={styles.cardDate}>{competition.date}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="location" size={14} color="#8B5CF6" />
                  <Text style={styles.cardLieu}>{competition.lieu}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.cardFooter}>
            {isUpcoming ? (
              <View style={styles.upcomingBadge}>
                <Ionicons name="time-outline" size={16} color="#8B5CF6" />
                <Text style={styles.upcomingText}>À venir</Text>
              </View>
            ) : (
              <View style={styles.completedBadge}>
                <Ionicons name="trophy" size={16} color="#F59E0B" />
                <Text style={styles.completedText}>
                  {competition.winningPercentage}% de réussite
                </Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={20} color="#A855F7" />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Chargement des compétitions...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header avec gradient */}
      <View style={styles.headerContainer}>
        <View style={styles.headerGradient}>
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => navigation.toggleDrawer()}
          >
            <Ionicons name="menu" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Compétitions</Text>
          <View style={styles.headerStats}>
            <Text style={styles.statsText}>{competitions.length} événements</Text>
          </View>
        </View>
      </View>

      <Animated.View
        style={[
          styles.contentContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {competitions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={64} color="#C4B5FD" />
              <Text style={styles.emptyTitle}>Aucune compétition</Text>
              <Text style={styles.emptySubtitle}>
                Les compétitions apparaîtront ici une fois ajoutées
              </Text>
            </View>
          ) : (
            competitions.map((competition, index) => (
              <AnimatedCard
                key={competition.id}
                competition={competition}
                index={index}
              />
            ))
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  
  // Loading States
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },

  // Header Styles
  headerContainer: {
    paddingTop: 50,
    paddingBottom: 20,
  },
  headerGradient: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 24,
    paddingVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  menuButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    flex: 1,
    marginHorizontal: 16,
  },
  headerStats: {
    alignItems: 'flex-end',
  },
  statsText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },

  // Content Container
  contentContainer: {
    flex: 1,
    marginTop: -10,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // Card Styles
  cardContainer: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.1)',
  },
  upcomingCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
  },
  completedCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
    lineHeight: 24,
  },
  cardDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardDate: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  cardLieu: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 232, 240, 0.8)',
  },

  // Badge Styles
  upcomingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  upcomingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  completedText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F59E0B',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#475569',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 24,
  },
});