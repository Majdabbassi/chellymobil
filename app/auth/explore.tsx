import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, Image, TextInput, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
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
      <Ionicons name="notifications-outline" size={24} color="#FFF" />
    </View>
    <Text style={styles.greeting}>Hey, {userName}</Text>
  </View>
);

// Search bar component
const SearchBar = () => (
  <View style={styles.searchContainer}>
    <Ionicons name="search" size={20} color="#8B5CF6" style={styles.searchIcon} />
    <TextInput 
      placeholder="Rechercher une activité ou un produit" 
      style={styles.searchInput} 
      placeholderTextColor="#9CA3AF"
    />
    <Ionicons name="options-outline" size={20} color="#8B5CF6" />
  </View>
);

// Back button component
const BackButton = ({ onPress }) => (
  <Pressable style={styles.backButton} onPress={onPress}>
    <Ionicons name="arrow-back-circle" size={36} color="#8B5CF6" />
  </Pressable>
);

// Filter bar component
const FilterBar = ({ filters, activeFilter, onFilterChange }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    style={styles.filterRow}
    contentContainerStyle={styles.filterRowContent}
  >
    {filters.map((filter, index) => (
      <Pressable
        key={index}
        onPress={() => onFilterChange(filter)}
        style={[
          styles.filterBtn,
          activeFilter === filter && styles.filterBtnActive,
        ]}
      >
        <Text
          style={[
            styles.filterText,
            activeFilter === filter && styles.filterTextActive,
          ]}
        >
          {filter}
        </Text>
      </Pressable>
    ))}
  </ScrollView>
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
      <View style={styles.statBox}>
        <Text style={isLoading ? styles.statNumberLoading : styles.statNumber}>
          {isLoading ? "..." : stats.trophees}
        </Text>
        <Text style={styles.statLabel}>Trophées</Text>
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
    <Pressable style={styles.promoButton} onPress={() => console.log('Inscription')}>
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
    <Text style={styles.footerLink}>Mentions légales · Contact · Aide</Text>
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
  const [categories, setCategories] = useState([
    {
      title: 'Sport',
      count: '12 activités',
      image: 'https://cdn-icons-png.flaticon.com/512/3120/3120730.png',
    },
    {
      title: 'Compétitions',
      count: '8 compétitions',
      image: 'https://cdn-icons-png.flaticon.com/512/1599/1599828.png',
    },
    {
      title: 'Événements',
      count: '5 événements',
      image: 'https://cdn-icons-png.flaticon.com/512/912/912314.png',
    },
    {
      title: 'Nutrition',
      count: '6 conseils',
      image: 'https://cdn-icons-png.flaticon.com/512/1786/1786669.png',
    },
    {
      title: 'Coaching',
      count: '4 coachs',
      image: 'https://cdn-icons-png.flaticon.com/512/3135/3135789.png', // Icône de coach
    },
    {
      title: 'Préparation Physique',
      count: '3 programmes',
      image: 'https://cdn-icons-png.flaticon.com/512/2331/2331948.png', // Icône fitness
    },
    {
      title: 'Rééducation',
      count: '2 soins',
      image: 'https://cdn-icons-png.flaticon.com/512/2942/2942713.png', // Icône soin
    },
    {
      title: 'Bien-être',
      count: '5 sessions',
      image: 'https://cdn-icons-png.flaticon.com/512/3523/3523063.png', // Icône zen
    },
  ]);
  

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
        setEvenements(data);
      } catch (error) {
        console.error("Erreur chargement événements:", error);
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

  // Render functions for list items
  const renderCategoryCard = (category, index) => (
    <Card 
      key={index} 
      style={styles.categoryCard}
      onPress={() => {
        setActiveFilter(category.title);
        // Scroll to competitions section
        scrollRef.current?.scrollToEnd({ animated: true });
      }}
    >
      <Image source={{ uri: category.image }} style={styles.categoryImage} />
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{category.title}</Text>
        <Text style={styles.cardSubtitle}>{category.count}</Text>
      </View>
    </Card>
  );

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
  const renderEventCard = (event, index) => {
    // 1. Récupération & nettoyage du Base64 (identique à renderCompetitionCard)
    let rawBase64 = event.imageBase64 || '';
    const cleanBase64 = rawBase64.replace(/^data:image\/[a-z]+;base64,/, '');
  
    // 2. Construction de l'URI pour Image avec fallback
    const imageUri = cleanBase64
      ? `data:image/jpeg;base64,${cleanBase64}`
      : 'https://cdn-icons-png.flaticon.com/512/2800/2800382.png'; // Fallback
  
    return (
      <Card key={event.id || `event-${index}`} style={styles.eventCard}>
        <View style={styles.competitionCardHeader}>
          <Text style={styles.competitionCardType}>{event.type || 'Événement'}</Text>
          <Text style={styles.competitionCardCategory}>{event.organisateur || ''}</Text>
        </View>
  
        <View style={styles.competitionCardImageContainer}>
          <Image
            source={{ uri: imageUri }}
            style={styles.competitionCardImage}
            resizeMode="cover"
            onError={(e) => {
              console.log('❌ Erreur image événement:', e.nativeEvent);
            }}
          />
        </View>
  
        <View style={styles.competitionCardBody}>
          <Text style={styles.competitionCardTitle} numberOfLines={1}>
            {event.nom || event.title || 'Événement sans nom'}
          </Text>
          <View style={styles.competitionCardDetails}>
            <View style={styles.competitionCardDetail}>
              <Ionicons name="calendar-outline" size={16} color="#8B5CF6" />
              <Text style={styles.competitionCardDetailText}>
                {event.date || 'Date à confirmer'}
              </Text>
            </View>
            <View style={styles.competitionCardDetail}>
              <Ionicons name="location-outline" size={16} color="#8B5CF6" />
              <Text style={styles.competitionCardDetailText}>
                {event.lieu || 'Lieu à confirmer'}
              </Text>
            </View>
          </View>
          <Pressable style={styles.competitionCardButton}>
            <Text style={styles.competitionCardButtonText}>Voir Détails</Text>
          </Pressable>
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
          <Pressable style={styles.competitionCardButton}>
            <Text style={styles.competitionCardButtonText}>S'inscrire</Text>
          </Pressable>
        </View>
      </Card>
    );
  };
  

  


  return (
    <ScrollView style={styles.container} ref={scrollRef}>
      {/* Back Button */}
      <BackButton onPress={() => router.push('/auth/parent-login')} />
      
      {/* Header */}
      <Header userName="Parent" />
      
      {/* Search Bar */}
      <SearchBar />
      
      {/* Stats & Motivation */}
      <Section noBackground>
        <View style={styles.statsContainer}>
          <Stats />
          <MotivationQuote />
        </View>
      </Section>
      
      {/* Categories */}
      <Section 
        title="📂 Catégories" 
        seeAllLink="Voir tout"
        onSeeAll={() => console.log('See all categories')}
      >
        <HorizontalCardList
          data={categories}
          renderItem={renderCategoryCard}
        />
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
        <View style={styles.sectionHeader}>
          <View style={styles.navigationControls}>
            <Pressable onPress={scrollLeft}>
              <Ionicons name="chevron-back" size={20} color="#8B5CF6" />
            </Pressable>
            <Pressable onPress={scrollRight}>
              <Ionicons name="chevron-forward" size={20} color="#8B5CF6" />
            </Pressable>
          </View>
          <Pressable onPress={() => router.push('(tabs)/all-activities')}>
            <Text style={styles.seeAll}>
              Voir tout <Ionicons name="chevron-forward-outline" size={14} color="#8B5CF6" />
            </Text>
          </Pressable>
        </View>
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
      
      {/* Events */}
      <Section 
        title="📅 Événements à venir" 
        seeAllLink="Voir tout"
        onSeeAll={() => router.push('(tabs)/events')}
      >
        <HorizontalCardList
          data={evenements.map((event) => ({
            title: event.nom,
            date: `📅 ${event.date}`,
            type: event.type || 'Événement',
            image: { uri: event.imageBase64 || 'https://cdn-icons-png.flaticon.com/512/2800/2800382.png' },
          }))}
          renderItem={renderEventCard}
        />
      </Section>
      
      {/* Top Coaches */}
      <Section 
        title="👨‍🏫 Top Coachs" 
        seeAllLink="Voir tout"
        onSeeAll={() => router.push('(tabs)/coachs')}
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
        <FilterBar 
          filters={filters}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />

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
// ==========================================
// STYLES AMÉLIORÉS
// ==========================================

const styles = StyleSheet.create({
  // Layout & containers - Améliorations avec des espacements cohérents
  container: {
    flex: 1,
    backgroundColor: '#F9FAFC', // Couleur de fond légèrement plus claire et bleutée
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24, // Espacement légèrement augmenté
    backgroundColor: '#FFF',
    borderRadius: 16, // Coins plus arrondis
    padding: 18,
    shadowColor: '#6366F1', // Ombre violette subtile
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6', // Bordure très légère
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
    marginBottom: 16,
  },
  navigationControls: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#F3F4FF', // Fond subtil pour les contrôles
    borderRadius: 8,
    padding: 6,
  },
  horizontalScrollView: {
    paddingRight: 10,
    paddingBottom: 8,
    paddingLeft: 2, // Petit padding gauche pour équilibrer
  },
  
  // Header components - Plus élégant et moderne
  headerContainer: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    backgroundColor: '#8B5CF6',
    padding: 18,
    borderRadius: 16,
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800', // Plus épais pour plus d'impact
    color: '#FFF',
    letterSpacing: 0.5, // Espacement des lettres légèrement augmenté
  },
  greeting: {
    fontSize: 22, // Légèrement plus grand
    color: '#1F2937',
    marginBottom: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  backButton: {
    marginBottom: 12,
    alignSelf: 'flex-start',
    padding: 6,
    backgroundColor: '#F3F4FF', // Fond subtil
    borderRadius: 20,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  
  // Search bar - Aspect plus moderne et interactif
  searchContainer: {
    backgroundColor: '#fff',
    borderRadius: 12, // Légèrement plus arrondi
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#EEF2FF', // Bordure légèrement violette
    elevation: 3,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    height: 56, // Hauteur fixe pour consistance
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 14,
    fontWeight: '400',
  },
  
  // Section titles and links - Typographie améliorée
  sectionTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#1F2937',
    letterSpacing: 0.2,
  },
  seeAll: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '600',
    paddingVertical: 4, // Zone de tap plus grande
    paddingHorizontal: 6,
  },
  
  // Stats section - Mise en page plus soignée
  statsContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 22,
    marginBottom: 22,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#EEF2FF',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 18,
  },
  statBox: {
    alignItems: 'center',
    backgroundColor: '#F9FAFB', // Légère séparation visuelle
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    minWidth: 80, // Largeur minimale pour l'uniformité
  },
  statNumber: {
    fontSize: 24, // Plus grand pour l'importance
    fontWeight: 'bold',
    color: '#8B5CF6',
  },
  statNumberLoading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#D1D5DB',
  },
  statLabel: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 6,
    fontWeight: '500', // Légèrement plus épais
  },
  motivationBox: {
    borderTopWidth: 1,
    borderTopColor: '#EEF2FF',
    paddingTop: 16,
    marginTop: 6,
  },
  motivationText: {
    fontSize: 15, // Légèrement plus grand
    fontStyle: 'italic',
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 22, // Meilleur espacement des lignes
  },
  
  // Promo banner - Plus attractif et accrocheur
  promoBanner: {
    backgroundColor: '#4C1D95',
    borderRadius: 16,
    padding: 22,
    marginBottom: 24,
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#7C3AED', // Bordure subtile
  },
  promoTextContainer: {
    marginBottom: 16,
  },
  promoTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  promoDescription: {
    fontSize: 15,
    color: '#E9D5FF',
    marginBottom: 6,
    lineHeight: 22, // Meilleur espacement
  },
  promoSub: {
    fontSize: 12,
    color: '#C4B5FD',
    marginTop: 4,
  },
  promoButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  promoButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 0.3,
  },
  
  // Card base styles - Aspect plus premium
  card: {
    borderRadius: 14, // Plus arrondi
    overflow: 'hidden',
    marginRight: 15,
    backgroundColor: '#fff',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#EEF2FF',
    // Animation effect could be added here in a real React Native app
  },
  cardBody: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  cardImage: {
    width: '100%',
    height: 110, // Légèrement plus grand
    resizeMode: 'cover',
    backgroundColor: '#EFF6FF',
  },
  
  // Category card specifics - Plus distinctif
  categoryCard: {
    width: 150,
    borderLeftWidth: 3, // Bordure décorative
    borderLeftColor: '#8B5CF6',
  },
  categoryImage: {
    width: '100%',
    height: 85,
    resizeMode: 'cover',
    backgroundColor: '#EFF6FF',
  },
  
  // Activity card specifics - Plus attrayant
  activityCard: {
    width: 170, // Légèrement plus large
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
  },
  
  // Product card specifics - Présentation améliorée
  productCard: {
    width: 200,
    borderRadius: 14,
    backgroundColor: '#FCFCFF', // Très subtil fond coloré
  },
  productImage: {
    width: '100%',
    height: 130, // Plus grand pour mieux voir
    resizeMode: 'cover',
    backgroundColor: '#EFF6FF',
  },
  
  // Event card specifics - Style cohérent
  eventCard: {
    width: 220, // Plus large pour mettre en avant
    borderRadius: 14,
  },
  eventImage: {
    width: '100%',
    height: 130,
    resizeMode: 'cover',
    backgroundColor: '#EFF6FF',
  },
  eventTag: {
    backgroundColor: '#EDE9FE',
    color: '#8B5CF6',
    fontSize: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginBottom: 6,
    alignSelf: 'flex-start',
    fontWeight: '600',
  },
  eventDate: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  
  // Coach card specifics - Plus élégant
  coachCard: {
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 14,
    width: 110, // Largeur fixe pour cohérence
    borderRadius: 14,
  },
  coachImage: {
    width: 70, // Plus grand
    height: 70,
    borderRadius: 35,
    marginBottom: 10,
    borderWidth: 3, // Bordure plus épaisse
    borderColor: '#8B5CF6',
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  coachName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginTop: 4,
  },
  
  // Filter bar - Plus intuitif et réactif
  filterRow: {
    marginVertical: 16,
  },
  filterRowContent: {
    paddingBottom: 6,
  },
  filterBtn: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 24, // Plus arrondi
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: '#F9FAFB',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterBtnActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#7C3AED',
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  filterText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  
  // Competition styles - Plus visuellement attrayant
  competitionsContainer: {
    gap: 18,
  },
  emptyCompetitionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    marginTop: 8,
  },
  emptyCompetitionText: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 22,
  },
  competitionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EEF2FF',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    marginBottom: 16, // Espacement entre cartes
  },
  competitionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  competitionCardType: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8B5CF6',
    backgroundColor: '#F3F4FF', // Fond subtil pour mettre en valeur
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  competitionCardCategory: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    paddingTop: 3,
  },
  competitionCardImageContainer: {
    width: '100%',
    height: 140, // Plus grand pour mieux voir
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EFF6FF', // Fond en cas d'erreur d'image
  },
  competitionCardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  competitionCardBody: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  competitionCardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 10,
    lineHeight: 24,
  },
  competitionCardDetails: {
    marginBottom: 14,
  },
  competitionCardDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    backgroundColor: '#F9FAFB', // Fond subtil
    padding: 6,
    borderRadius: 8,
  },
  competitionCardDetailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#4B5563',
    flex: 1, // Permet au texte de s'adapter
  },
  competitionCardButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  competitionCardButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 0.3,
  },
  
  // Footer - Plus soigné
  footer: {
    marginTop: 24,
    paddingVertical: 24,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  footerLink: {
    fontSize: 13,
    color: '#8B5CF6',
    fontWeight: '500',
    padding: 8, // Zone de tap plus large
  },
});