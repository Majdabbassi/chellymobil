import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, Image, TextInput, StyleSheet, Pressable } from 'react-native';
import { router, useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { useLayoutEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { getGlobalStats } from '@/services/stats';
import { getAllProducts, ProductDTO } from '@/services/products';
import { ActivityDTO, getAllActivities } from '@/services/avtivities';
import { CompetitionDTO } from '@/services/adherent';
import { getAllEvenements } from '@/services/evenements';
import { CoachDTO, getAllCoachs } from '@/services/coach';
import { getUpcomingCompetitions } from '@/services/competitions';

// ==========================================
// COMPONENT DEFINITIONS
// ==========================================

// Section container component
const Section = ({ children, title, seeAllLink, onSeeAll, noBackground }) => (
  <View style={[styles.section, noBackground && styles.sectionNoBackground]}>
    {title && (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {seeAllLink && (
          <Pressable onPress={onSeeAll}>
            <Text style={styles.seeAll}>
              {seeAllLink} <Ionicons name="chevron-forward-outline" size={14} color="#8B5CF6" />
            </Text>
          </Pressable>
        )}
      </View>
    )}
    {children}
  </View>
);

// Card component for consistent card styling
const Card = ({ children, style, onPress }) => (
  <Pressable
    style={[styles.card, style]}
    onPress={onPress}
  >
    {children}
  </Pressable>
);

// Header component with user greeting and notification icon
const Header = ({ userName }) => (
  <View style={styles.headerContainer}>
    <View style={styles.header}>
      <Text style={styles.headerTitle}>ChellySport</Text>
    </View>
    <Text style={styles.greeting}>Hey, {userName}</Text>
  </View>
);



// Stats display component - Fixed implementation
const Stats = () => {
  const [stats, setStats] = useState({ adherents: 0, coachs: 0, trophees: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const result = await getGlobalStats();
        setStats(result);
      } catch (error) {
        console.error('Erreur récupération stats:', error);
        // Set fallback values in case of error
        setStats({ adherents: 250, coachs: 15, trophees: 32 });
      } finally {
        setIsLoading(false);
      }
    };
  
    fetchStats();
  }, []);

  return (
    <View style={styles.statsRow}>
      <View style={styles.statBox}>
        <Text style={isLoading ? styles.statNumberLoading : styles.statNumber}>
          {isLoading ? "..." : stats.adherents}
        </Text>
        <Text style={styles.statLabel}>Adhérents</Text>
      </View>
      <View style={styles.statBox}>
        <Text style={isLoading ? styles.statNumberLoading : styles.statNumber}>
          {isLoading ? "..." : stats.coachs}
        </Text>
        <Text style={styles.statLabel}>Coachs</Text>
      </View>
    </View>
  );
};

// Motivation quote component
const MotivationQuote = () => (
  <View style={styles.motivationBox}>
    <Text style={styles.motivationText}>
      💪 Le sport forge le caractère, développe la discipline et crée des champions dans la vie comme sur le terrain !
    </Text>
  </View>
);

// Promo banner component
const PromoBanner = () => (
  <View style={styles.promoBanner}>
    <View style={styles.promoTextContainer}>
      <Text style={styles.promoTitle}>🎁 Offre Parent Exclusive</Text>
      <Text style={styles.promoDescription}>
        Inscris ton enfant ce mois-ci et reçois une séance gratuite + un t-shirt ChellySport 🎽
      </Text>
      <Text style={styles.promoSub}>Valable jusqu'au 30 avril pour les nouveaux adhérents</Text>
    </View>
    <Pressable style={styles.promoButton} onPress={() => router.push('/auth/register')}>
      <Text style={styles.promoButtonText}>📥 Inscrire mon enfant</Text>
    </Pressable>
  </View>
);

// Horizontal scrollable cards list component
const HorizontalCardList = ({ data, renderItem }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.horizontalScrollView}
  >
    {data.map((item, index) => renderItem(item, index))}
  </ScrollView>
);

// Footer component
const Footer = () => (
  <View style={styles.footer}>
    <Text style={styles.footerText}>© 2025 ChellySport</Text>
  </View>
);

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function ExploreScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const scrollRef = useRef(null);
  const [activeFilter, setActiveFilter] = useState('All');
  const [products, setProducts] = useState([]);
  const [competitions, setCompetitions] = useState([]);

  

  useEffect(() => {
    const fetchProducts = async () => {
      const data = await getAllProducts();
      setProducts(data);
    };

    fetchProducts();
  }, []);


  const [coachs, setCoachs] = useState([]);
  useEffect(() => {
    const fetchCoachs = async () => {
      try {
        const data = await getAllCoachs();
        setCoachs(data);
      } catch (error) {
        console.error("Erreur chargement coachs:", error);
      }
    };
    fetchCoachs();
  }, []);

  // Hide tab bar
  useLayoutEffect(() => {
    navigation.setOptions({ tabBarStyle: { display: 'none' } });
  }, [navigation]);

  // Data constants
  const filters = ['All', 'Football', 'Handball', 'Basket', 'Tennis'];
  const [activities, setActivities] = useState([]);
  const [evenements, setEvenements] = useState([]);

  useEffect(() => {
  const fetchEvenements = async () => {
    try {
      const data = await getAllEvenements();
      console.log('📦 Evenements API response:', data); // 🔍 Debug
      if (Array.isArray(data)) {
        setEvenements(data);
      } else {
        console.warn('⚠️ getAllEvenements did not return an array:', data);
        setEvenements([]); // fallback to empty array
      }
    } catch (error) {
      console.error("❌ Erreur chargement événements:", error);
      setEvenements([]); // fallback in case of error
    }
  };
  fetchEvenements();
}, []);
  
  useEffect(() => {
    const fetchCompetitions = async () => {
      try {
        const data = await getUpcomingCompetitions();
        setCompetitions(data);
      } catch (error) {
        console.error("Erreur chargement compétitions à venir:", error);
      }
    };
    fetchCompetitions();
  }, []);

  // Filter competitions based on active filter
  const filteredCompetitions = activeFilter === 'All'
    ? competitions
    : competitions.filter(comp => comp.type === activeFilter || comp.category === activeFilter);

  // Scroll functions for horizontal lists
  const scrollRight = () => scrollRef.current?.scrollTo({ x: 200, animated: true });
  const scrollLeft = () => scrollRef.current?.scrollTo({ x: 0, animated: true });



  const renderActivityCard = (activity, index) => {
    let imageUri = activity.image?.uri || activity.image;
  
    if (imageUri && !imageUri.startsWith('data:image')) {
      imageUri = `data:image/jpeg;base64,${imageUri}`;
    }
  
    return (
      <Card key={index} style={styles.activityCard}>
        <Image source={{ uri: imageUri }} style={styles.cardImage} />
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{activity.title}</Text>
          <Text style={styles.cardSubtitle}>{activity.count}</Text>
        </View>
      </Card>
    );
  };
  
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const data = await getAllActivities();
        setActivities(data);
      } catch (error) {
        console.error("Erreur lors du chargement des activités :", error);
      }
    };
    fetchActivities();
  }, []);
  
  const renderProductCard = (product, index) => {
    const imageUri = product.imageBase64?.startsWith('data:')
      ? product.imageBase64
      : `data:image/jpeg;base64,${product.imageBase64}`;
  
    return (
      <Card key={index} style={styles.productCard}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.productImage}
            onError={(e) => console.log('Erreur image produit:', e.nativeEvent)}
          />
        ) : (
          <View style={styles.productImage} />
        )}
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{product.designation}</Text>
          <Text style={styles.cardSubtitle}>{product.prix} €</Text>
        </View>
      </Card>
    );
  };

  

  const renderCoachCard = (coach, index) => {
    // Nom complet
    const fullName = `${coach.prenom || ''} ${coach.nom || ''}`.trim();
  
    // Corriger base64 en supprimant tous les doublons de "data:image/jpeg;base64,"
    let rawBase64 = coach.imageBase64 || coach.image || '';
    rawBase64 = rawBase64.replace(/(data:image\/[a-z]+;base64,)+/, ''); // supprime tous les préfixes
  
    const imageUri = rawBase64
      ? `data:image/jpeg;base64,${rawBase64}`
      : 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
  
    return (
      <Card key={index} style={styles.coachCard}>
        <Image
          source={{ uri: imageUri }}
          style={styles.coachImage}
          onError={(e) => {
            console.log('❌ Erreur image coach:', e.nativeEvent);
          }}
        />
        <Text style={styles.coachName}>{fullName || 'Coach inconnu'}</Text>
      </Card>
    );
  };
  
  
  
  const renderCompetitionCard = (competition, index) => {
    // 1. Récupération & nettoyage du Base64
    let rawBase64 = competition.imageBase64 || '';
    const cleanBase64 = rawBase64.replace(/^data:image\/[a-z]+;base64,/, '');
  
    // 2. Construction de l'URI pour Image
    const imageUri = cleanBase64
      ? `data:image/jpeg;base64,${cleanBase64}`
      : 'https://cdn-icons-png.flaticon.com/512/3467/3467580.png'; // Fallback
  
    // 3. Log de debug utile
    console.log(`🏆 Compétition: ${competition.nom}`);
    console.log(`📸 imageUri (preview): ${imageUri.substring(0, 80)}...`);
  
    return (
      <Card key={index} style={styles.competitionCard}>
        <View style={styles.competitionCardHeader}>
          <Text style={styles.competitionCardType}>{competition.type || 'Compétition'}</Text>
          <Text style={styles.competitionCardCategory}>{competition.category || ''}</Text>
        </View>
  
        <View style={styles.competitionCardImageContainer}>
        <Image
  source={{ uri: imageUri }}
  style={styles.competitionCardImage}
  onError={(e) => {
    console.log('❌ Erreur image compétition:', e.nativeEvent);
  }}
/>

        </View>
  
        <View style={styles.competitionCardBody}>
          <Text style={styles.competitionCardTitle}>{competition.nom}</Text>
          <View style={styles.competitionCardDetails}>
            <View style={styles.competitionCardDetail}>
              <Ionicons name="calendar-outline" size={16} color="#8B5CF6" />
              <Text style={styles.competitionCardDetailText}>{competition.date}</Text>
            </View>
            <View style={styles.competitionCardDetail}>
              <Ionicons name="location-outline" size={16} color="#8B5CF6" />
              <Text style={styles.competitionCardDetailText}>
                {competition.lieu || 'Lieu à confirmer'}
              </Text>
            </View>
          </View>
        </View>
      </Card>
    );
  };
  

  


  return (
    <ScrollView style={styles.container} ref={scrollRef}>
      
      {/* Header */}
      <Header userName="Parent" />
      
      
      {/* Stats & Motivation */}
      <Section noBackground>
        <View style={styles.statsContainer}>
          <Stats />
          <MotivationQuote />
        </View>
      </Section>
      
      {/* Promo Banner */}
      <PromoBanner />
      

      {/* Popular Products */}
      <Section 
  title="🛍️ Produits populaires" 
  seeAllLink="Visiter la boutique"
  // appel relatif : le nom du fichier sans extension
  onSeeAll={() => router.push('/boutique')}  
>
        <HorizontalCardList
          data={products}
          renderItem={renderProductCard}
        />
      </Section>
      
      {/* Activities */}
      <Section title="📋 Activités proposées">
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.horizontalScrollView}
          ref={scrollRef}
        >
          {activities.map((activity, index) =>
            renderActivityCard(
              {
                title: activity.nom,
                image: { uri: activity.imageBase64 || 'https://cdn-icons-png.flaticon.com/512/483/483361.png' },
                count: activity.lieu
              },
              index
            )
          )}
        </ScrollView>
      </Section>
      
      
      {/* Top Coaches */}
      <Section 
        title="👨‍🏫 Coachs" 
      >
      <HorizontalCardList
  data={coachs.map(c => ({
    prenom: c.prenom,
    nom: c.nom,
    imageBase64: c.imageBase64,
  }))}
  renderItem={renderCoachCard}
/>

      </Section>
      
      {/* Competitions */}
      <Section title="🏆 Compétitions à venir">

        {filteredCompetitions.length === 0 ? (
          <View style={styles.emptyCompetitionContainer}>
            <Ionicons name="calendar-outline" size={40} color="#D1D5DB" />
            <Text style={styles.emptyCompetitionText}>
              Aucune compétition {activeFilter !== 'All' ? `pour ${activeFilter}` : ''} à venir.
            </Text>
          </View>
        ) : (
          <View style={styles.competitionsContainer}>
            {filteredCompetitions.map((competition, index) => 
              renderCompetitionCard(competition, index)
            )}
          </View>
        )}
      </Section>
      
      {/* Footer */}
      <Footer />
    </ScrollView>
  );
}

// ==========================================
// STYLES
// ==========================================
const styles = StyleSheet.create({
  // Layout & containers - Design de luxe et aspect premium
  container: {
    flex: 1,
    backgroundColor: '#FAFBFF',
    paddingTop: 55,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 28,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 22,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#EEF2FF',
    position: 'relative',
    overflow: 'hidden',
  },
  sectionNoBackground: {
    backgroundColor: 'transparent',
    shadowColor: 'transparent',
    elevation: 0,
    padding: 0,
    borderWidth: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4FC',
  },
  navigationControls: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: '#F0F1FF',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  horizontalScrollView: {
    paddingRight: 12,
    paddingBottom: 10,
    paddingLeft: 4,
  },
  
  // Header components - Design élégant avec effet de flou et de gradient
  headerContainer: {
    marginBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
    backgroundColor: '#8B5CF6',
    padding: 22,
    borderRadius: 24,
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 15,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#A78BFA',
    position: 'relative',
    overflow: 'hidden',
    // Simulation d'un pseudo-élément avec un fond de dégradé
    // Note: nécessiterait React Native Linear Gradient dans une vraie implémentation
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 0.6,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  greeting: {
    fontSize: 24,
    color: '#1F2937',
    marginBottom: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(139, 92, 246, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  backButton: {
    marginBottom: 16,
    alignSelf: 'flex-start',
    padding: 8,
    backgroundColor: '#F3F4FF',
    borderRadius: 20,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  
  // Search bar - Aspect élégant et moderne
  searchContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#EEF2FF',
    elevation: 5,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    height: 64,
    // Effet de focus simulé (pour une implémentation réelle, utiliser l'état)
  },
  searchIcon: {
    marginRight: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 17,
    color: '#1F2937',
    paddingVertical: 16,
    fontWeight: '500',
  },
  
  // Section titles and links - Typographie premium
  sectionTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(139, 92, 246, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  seeAll: {
    fontSize: 15,
    color: '#8B5CF6',
    fontWeight: '700',
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#F5F3FF',
    borderRadius: 8,
    overflow: 'hidden',
  },
  
  // Stats section - Mise en page luxueuse
  statsContainer: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 26,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#EEF2FF',
    // Effet subtilement brillant
    position: 'relative',
    overflow: 'hidden',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 22,
  },
  statBox: {
    alignItems: 'center',
    backgroundColor: '#F8FAFF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    minWidth: 90,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#EEF2FF',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '900',
    color: '#8B5CF6',
    textShadowColor: 'rgba(139, 92, 246, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statNumberLoading: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#D1D5DB',
  },
  statLabel: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  motivationBox: {
    borderTopWidth: 1,
    borderTopColor: '#EEF2FF',
    paddingTop: 20,
    marginTop: 8,
    backgroundColor: '#FAFAFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  motivationText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  
  // Promo banner - Design premium et accrocheur
  promoBanner: {
    backgroundColor: '#4C1D95',
    borderRadius: 24,
    padding: 28,
    marginBottom: 32,
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#7C3AED',
    position: 'relative',
    overflow: 'hidden',
    // Effet de brillance angulaire
  },
  promoTextContainer: {
    marginBottom: 20,
  },
  promoTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 14,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  promoDescription: {
    fontSize: 17,
    color: '#E9D5FF',
    marginBottom: 8,
    lineHeight: 26,
    letterSpacing: 0.3,
    fontWeight: '500',
  },
  promoSub: {
    fontSize: 13,
    color: '#C4B5FD',
    marginTop: 6,
    fontStyle: 'italic',
  },
  promoButton: {
    backgroundColor: '#A78BFA',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#8B5CF6',
    // Effet de brillance subtile
  },
  promoButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  
  // Card base styles - Design élégant et premium
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 20,
    backgroundColor: '#fff',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#EEF2FF',
    // Effet de transition sur les cartes (nécessiterait Animated dans une vraie app)
  },
  cardBody: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  cardImage: {
    width: '100%',
    height: 130,
    resizeMode: 'cover',
    backgroundColor: '#EFF6FF',
  },
  
  // Category card specifics - Design élégant et distinctif
  categoryCard: {
    width: 160,
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
    borderTopRightRadius: 25,
    borderBottomRightRadius: 25,
    // Effet de dégradé subtil
  },
  categoryImage: {
    width: '100%',
    height: 95,
    resizeMode: 'cover',
    backgroundColor: '#EFF6FF',
    borderTopRightRadius: 20,
  },
  
  // Activity card specifics - Design moderne et attrayant
  activityCard: {
    width: 185,
    backgroundColor: '#FAFBFF',
    borderRadius: 20,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
    // Effet de brillance subtile
  },
  
  // Product card specifics - Design premium et élégant
  productCard: {
    width: 220,
    borderRadius: 24,
    backgroundColor: '#FCFCFF',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    // Effet de relief subtil
  },
  productImage: {
    width: '100%',
    height: 160,
    resizeMode: 'cover',
    backgroundColor: '#EFF6FF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  
  // Event card specifics - Design élégant et attrayant
  eventCard: {
    width: 260,
    borderRadius: 22,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    // Effet de profondeur
  },
  eventImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
    backgroundColor: '#EFF6FF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  eventTag: {
    backgroundColor: '#F3F0FF',
    color: '#8B5CF6',
    fontSize: 13,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
    alignSelf: 'flex-start',
    fontWeight: '700',
    letterSpacing: 0.3,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  eventDate: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  
  // Coach card specifics - Design élégant et premium
  coachCard: {
    alignItems: 'center',
    backgroundColor: '#FAFBFF',
    padding: 18,
    width: 130,
    borderRadius: 20,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
    // Effet de brillance subtile
  },
  coachImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 14,
    borderWidth: 4,
    borderColor: '#A78BFA',
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    // Effet de brillance
  },
  coachName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginTop: 6,
    letterSpacing: 0.2,
  },
  
  // Filter bar - Design moderne et interactif
  filterRow: {
    marginVertical: 18,
  },
  filterRowContent: {
    paddingBottom: 8,
  },
  filterBtn: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 22,
    backgroundColor: '#F9FAFB',
    marginRight: 14,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    // Effet de transition
  },
  filterBtnActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#7C3AED',
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
    // Effet de brillance
  },
  filterText: {
    fontSize: 15,
    color: '#4B5563',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  
  // Competition styles - Design élégant et attrayant
  competitionsContainer: {
    gap: 22,
  },
  emptyCompetitionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#F9FAFF',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    marginTop: 12,
    marginBottom: 12,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  emptyCompetitionText: {
    fontSize: 17,
    color: '#6B7280',
    marginTop: 14,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  competitionCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EEF2FF',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 20,
    // Effet de relief
  },
  competitionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FAFBFF',
  },
  competitionCardType: {
    fontSize: 14,
    fontWeight: '800',
    color: '#8B5CF6',
    backgroundColor: '#F3F0FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
    letterSpacing: 0.2,
  },
  competitionCardCategory: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
    paddingTop: 4,
    fontWeight: '500',
  },
  competitionCardImageContainer: {
    width: '100%',
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    position: 'relative',
    overflow: 'hidden',
    // Effet de zoom léger sur l'image
  },
  competitionCardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  competitionCardBody: {
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  competitionCardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 14,
    lineHeight: 28,
    letterSpacing: 0.3,
  },
  competitionCardDetails: {
    marginBottom: 18,
  },
  competitionCardDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#F9FAFF',
    padding: 10,
    borderRadius: 12,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F3F4FF',
  },
  competitionCardDetailText: {
    marginLeft: 10,
    fontSize: 15,
    color: '#4B5563',
    flex: 1,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  competitionCardButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#7C3AED',
    // Effet de pulsation subtile
  },
  competitionCardButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  
  // Footer - Design élégant et moderne
  footer: {
    marginTop: 30,
    marginBottom: 20,
    paddingVertical: 30,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FAFBFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  footerText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  footerLink: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '600',
    padding: 10,
    letterSpacing: 0.3,
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    paddingHorizontal: 16,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
    // Effet de transition
  },
});