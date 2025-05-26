import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
  Animated,
  Dimensions,
  StatusBar,
  
} from 'react-native';
import { getAllActivities, ActivityDTO } from '../../services/avtivities';
import { router, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;
export function formatImage(base64: string | undefined | null): string {
  if (!base64) return 'https://via.placeholder.com/80';
  return base64.startsWith('data:image') ? base64 : `data:image/png;base64,${base64}`;
}
export default function ActivitiesScreen() {
  const [activities, setActivities] = useState<ActivityDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const headerAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const data = await getAllActivities();
        setActivities(data);
        
        // Start animations after data is loaded
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
          Animated.timing(headerAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start();
      } catch (err) {
        console.error('❌ Erreur de chargement des activités:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  const AnimatedCard = ({ item, index }) => {
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
        friction: 3,
        useNativeDriver: true,
      }).start();
    };

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
          style={styles.activityCard}
          onPress={() => router.push(`/activity-details/${item.id}`)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: formatImage(item.imageBase64) }}
                style={styles.activityImage}
              />
              <View style={styles.imageOverlay} />
            </View>
            
            <View style={styles.cardContent}>
              <Text style={styles.activityText} numberOfLines={2}>
                {item.nom}
              </Text>
              <View style={styles.cardAccent} />
            </View>
            
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.loadingGradient}
        >
          <Animated.View 
            style={[
              styles.loadingContent,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.spinnerContainer}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
            <Text style={styles.loadingText}>Chargement des activités...</Text>
          </Animated.View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      
      {/* Animated Header */}
      <Animated.View
        style={[
          styles.headerContainer,
          {
            transform: [{ translateY: headerAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerGradient}
        >
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => navigation.toggleDrawer()}
          >
            <Ionicons name="menu" size={24} color="#fff" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Choisir une activité</Text>
          
          <View style={styles.headerAccent} />
        </LinearGradient>
      </Animated.View>

      {/* Animated Content */}
      <Animated.View
        style={[
          styles.contentContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <FlatList
          data={activities}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <AnimatedCard item={item} index={index} />
          )}
          contentContainerStyle={styles.listContainer}
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  
  // Header Styles
  headerContainer: {
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    zIndex: 1000,
  },
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    paddingTop: 50, // Account for status bar
  },
  menuButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '700',
    marginLeft: 16,
    flex: 1,
  },
  headerAccent: {
    width: 4,
    height: 30,
    backgroundColor: '#fff',
    borderRadius: 2,
    opacity: 0.3,
  },
  
  // Content Styles
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  listContainer: {
    paddingBottom: 100,
  },
  
  // Card Styles
  cardContainer: {
    width: CARD_WIDTH,
    marginHorizontal: 8,
    marginBottom: 16,
  },
  activityCard: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  cardGradient: {
    padding: 20,
    minHeight: 180,
    position: 'relative',
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  activityImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardContent: {
    flex: 1,
    alignItems: 'center',
  },
  activityText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },
  cardAccent: {
    marginTop: 12,
    width: 30,
    height: 3,
    backgroundColor: '#fff',
    borderRadius: 2,
    opacity: 0.7,
  },
  cardIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 8,
  },
  
  // Loading Styles
  loadingContainer: {
    flex: 1,
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  spinnerContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 50,
    padding: 20,
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '500',
    textAlign: 'center',
  },
});