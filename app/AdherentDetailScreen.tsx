import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { 
  getActivitiesByAdherent, 
  getAdherentById, 
  getNextSessionByAdherent, 
  getParentCompetitions, 
  getPerformancesByAdherent,
  getEquipesByAdherent 
} from '@/services/adherent';

interface Competition {
  nom: string;
  date: string;
  lieu?: string;
  resultat?: string;
}

interface CompetitionFormatted {
  name: string;
  date: string;
  location: string;
  result: string;
}

interface Equipe {
  name: string;
  coach: string;
}

interface Performance {
  activity: string;
  level: string;
  progress: number;
  achievements: string[];
  evaluationDate: string;  // Add evaluation date
  assignedCoach: string;   // Add assigned coach
}

interface Session {
  activity: string;
  date: string;
  location: string;
}

interface AdherentFormattedData {
  id: string;
  name: string;
  fullName: string;
  age: number;
  birthDate: string;
  registrationDate: string;
  club: string;
  coach: string;
  attendanceRate: string;
  imageBase64: string | null;
  activities: string[];
  performances: Performance[];
  competitions: CompetitionFormatted[];
  nextSessions: Session[];
  equipes: Equipe[];
}

export default function AdherentDetailScreen() {
  const { adherentId } = useLocalSearchParams();
  const parsedAdherentId = Array.isArray(adherentId) ? adherentId[0] : adherentId;
  
  const [adherentData, setAdherentData] = useState<AdherentFormattedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  
  useEffect(() => {
    const fetchAdherentData = async () => {
      try {
        setLoading(true);
    
        const [
          basicData,
          activitiesData,
          performancesData,
          nextSessionData,
          competitionsData,
          equipeData
        ] = await Promise.all([
          getAdherentById(parsedAdherentId),
          getActivitiesByAdherent(parsedAdherentId),
          getPerformancesByAdherent(parsedAdherentId),
          getNextSessionByAdherent(parsedAdherentId),
          getParentCompetitions(),
          getEquipesByAdherent(parsedAdherentId)
        ]);
    
        // Format data with coach and team information
        const formattedData = {
          id: basicData.id,
          name: basicData.prenom,
          fullName: `${basicData.prenom} ${basicData.nom}`,
          age: calculateAge(basicData.dateNaissance),
          birthDate: formatDate(basicData.dateNaissance),
          registrationDate: formatDate(basicData.dateInscriptionClub),
          club: 'Chelly Sport Sousse',
          coach: basicData.coach?.nom || 'Non assigné',
          attendanceRate: basicData.tauxPresence ? `${basicData.tauxPresence}%` : 'Non calculé',
          imageBase64: basicData.imageBase64 || null,
    
          activities: activitiesData?.map(act => act.nom) || [],
          
          // Ensure performances have default values for missing fields
          performances: performancesData?.map(perf => ({
            activity: perf.activity || 'Activité inconnue',
            level: perf.level || 'Non précisé',
            progress: perf.progress || 0,
            achievements: perf.achievements || [],
            evaluationDate: perf.evaluationDate || '',
            assignedCoach: perf.assignedCoach || 'Non assigné'
          })) || [],
          
          competitions: competitionsData?.map((comp: Competition) => ({
            name: comp.nom,
            date: formatDate(comp.date),
            location: comp.lieu || 'Lieu inconnu',
            result: comp.resultat || 'Non spécifié',
          })) as CompetitionFormatted[] || [],
          
          // Ensure nextSessions have default values
          nextSessions: nextSessionData ? [{
            activity: nextSessionData.activity || 'Activité inconnue',
            date: formatDate(nextSessionData.date) || '30/04/2025',
            location: nextSessionData.location || 'Lieu non précisé',
          }] : [],
    
          equipes: equipeData.map((equipe) => ({
            name: equipe.nomEquipe,
            coach: equipe.coachNom || 'Non assigné',
          }))
        };
    
        setAdherentData(formattedData);
      } catch (err) {
        setError(err.message || 'Une erreur est survenue');
        console.error('Erreur:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAdherentData();
  }, [parsedAdherentId]);

  // Utility function to calculate age from birth date
  const calculateAge = (birthDateStr) => {
    if (!birthDateStr) return '';
    const birthDate = new Date(birthDateStr);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  // Function to format dates (YYYY-MM-DD to DD/MM/YYYY)
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  };

  const renderProgressBar = (progress) => {
    // Ensure progress is a number and has a default value
    const displayProgress = typeof progress === 'number' ? progress : 0;
    
    return (
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${displayProgress}%` }]} />
        <View style={styles.progressTextContainer}>
          <Text style={styles.progressText}>{displayProgress}%</Text>
          <Text style={styles.progressLabel}>Complété</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Chargement des données...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#EF4444" />
        <Text style={styles.errorText}>Erreur: {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
          <Text style={styles.retryButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!adherentData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Aucune donnée disponible</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
          <Text style={styles.retryButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#6D28D9" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détails de l'Adhérent</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Adherent Info Card */}
        <View style={styles.adherentInfoCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              {adherentData.imageBase64 ? (
                <Image 
                  source={{ uri: adherentData.imageBase64 }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.adherentInitials}>{adherentData.name.charAt(0)}</Text>
              )}
            </View>
          </View>
          <Text style={styles.adherentName}>{adherentData.fullName}</Text>
          <Text style={styles.adherentAge}>{adherentData.age} ans</Text>
          
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Date de naissance</Text>
              <Text style={styles.infoValue}>{adherentData.birthDate}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Date d'inscription</Text>
              <Text style={styles.infoValue}>{adherentData.registrationDate}</Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Club</Text>
              <Text style={styles.infoValue}>{adherentData.club}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Coach principal</Text>
              <Text style={styles.infoValue}>{adherentData.coach}</Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Taux de présence</Text>
              <Text style={styles.infoValue}>{adherentData.attendanceRate}</Text>
            </View>
          </View>
        </View>
        
        {/* Teams Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Équipes</Text>
          {adherentData.equipes && adherentData.equipes.length > 0 ? (
            <View>
              {adherentData.equipes.map((equipe, index) => (
                <View key={index} style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Équipe</Text>
                    <Text style={styles.infoValue}>{equipe.name}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Coach</Text>
                    <Text style={styles.infoValue}>{equipe.coach}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyStateText}>Aucune équipe enregistrée</Text>
          )}
        </View>
        
        {/* Activities Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activités</Text>
          {adherentData.activities && adherentData.activities.length > 0 ? (
            <View style={styles.activitiesList}>
              {adherentData.activities.map((activity, index) => (
                <View key={index} style={styles.activityTag}>
                  <Text style={styles.activityText}>{activity}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyStateText}>Aucune activité enregistrée</Text>
          )}
        </View>
        
        {/* Performances Section with Month Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performances</Text>
          
          {/* Month selector */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {['Tous', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
              'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'].map((m, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.monthChip,
                    (selectedMonth === idx - 1 || (idx === 0 && selectedMonth === null)) && styles.monthChipActive
                  ]}
                  onPress={() => setSelectedMonth(idx === 0 ? null : idx - 1)}
                >
                  <Text style={[
                    styles.monthChipText,
                    (selectedMonth === idx - 1 || (idx === 0 && selectedMonth === null)) && styles.monthChipTextActive
                  ]}>
                    {m}
                  </Text>
                </TouchableOpacity>
            ))}
          </ScrollView>
          
          {/* Performances list with month filtering */}
          {(() => {
            const filteredPerformances = adherentData.performances
              .filter(p => {
                if (selectedMonth === null) return true;           // Tous
                if (!p.evaluationDate) return false;               // No date
                const d = new Date(p.evaluationDate);
                return d.getMonth() === selectedMonth;             // 0 = Janvier
              });

            return filteredPerformances.length > 0 ? (
              filteredPerformances.map((perf, index) => (
                <View key={index} style={styles.performanceCard}>
                  <View style={styles.performanceHeader}>
                    <Text style={styles.performanceActivity}>{perf.activity}</Text>
                    <View style={styles.levelBadge}>
                      <Text style={styles.levelText}>{perf.level}</Text>
                    </View>
                  </View>
                  
                  {/* Affichage de la date d'évaluation avec valeur par défaut */}
                  <Text style={styles.evaluationDate}>
                    Date d'évaluation: {perf.evaluationDate ? formatDate(perf.evaluationDate) : '30/04/2025'}
                  </Text>

                  {/* Affichage du coach assigné */}
                  <Text style={styles.coachText}>
                    Coach assigné: {perf.assignedCoach || 'Non assigné'}
                  </Text>

                  {/* Progression */}
                  <Text style={styles.progressSubtitle}>Progression</Text>
                  {renderProgressBar(perf.progress)}
                  
                  <Text style={styles.achievementsTitle}>Réalisations</Text>
                  {perf.achievements && perf.achievements.length > 0 ? (
                    perf.achievements.map((achievement, idx) => (
                      <View key={idx} style={styles.achievementItem}>
                        <Ionicons name="trophy-outline" size={16} color="#8B5CF6" />
                        <Text style={styles.achievementText}>{achievement}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyStateText}>Aucune réalisation enregistrée</Text>
                  )}
                </View>
              ))
            ) : (
              <Text style={styles.emptyStateText}>Aucune performance ce mois-là</Text>
            );
          })()}
        </View>
        
        {/* Competitions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compétitions</Text>
          
          {adherentData.competitions && adherentData.competitions.length > 0 ? (
            adherentData.competitions.map((comp, index) => (
              <View key={index} style={styles.competitionCard}>
                <View style={styles.competitionHeader}>
                  <Text style={styles.competitionName}>{comp.name}</Text>
                  <Text style={styles.competitionResult}>{comp.result}</Text>
                </View>
                
                <View style={styles.competitionDetails}>
                  <View style={styles.competitionDetailItem}>
                    <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                    <Text style={styles.competitionDetailText}>{comp.date}</Text>
                  </View>
                  <View style={styles.competitionDetailItem}>
                    <Ionicons name="location-outline" size={16} color="#6B7280" />
                    <Text style={styles.competitionDetailText}>{comp.location}</Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyStateText}>Aucune compétition enregistrée</Text>
          )}
        </View>
        
        {/* Next Sessions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prochaines Séances</Text>
          
          {adherentData.nextSessions && adherentData.nextSessions.length > 0 ? (
            adherentData.nextSessions.map((session, index) => (
              <View key={index} style={styles.sessionCard}>
                <View style={styles.sessionActivity}>
                  <Text style={styles.sessionActivityText}>{session.activity}</Text>
                </View>
                
                <View style={styles.sessionDetails}>
                  <View style={styles.sessionDetailItem}>
                    <Ionicons name="time-outline" size={16} color="#6B7280" />
                    <Text style={styles.sessionDetailText}>{session.date}</Text>
                  </View>
                  <View style={styles.sessionDetailItem}>
                    <Ionicons name="location-outline" size={16} color="#6B7280" />
                    <Text style={styles.sessionDetailText}>{session.location}</Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyStateText}>Aucune séance planifiée</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  // Layout & Container Styles
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    paddingBottom: 60, // Increased padding for better scroll experience
  },
  
  // Header Styles - Amélioré avec un dégradé et des ombres plus subtiles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 12, // Légèrement plus grand
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EDE9FE',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 20, // Légèrement plus grand
    fontWeight: 'bold',
    color: '#4C1D95', // Violet plus foncé pour un meilleur contraste
    letterSpacing: 0.3, // Espacement des lettres
  },
  backButton: {
    padding: 10, // Zone de toucher plus grande
    borderRadius: 8, // Aspect plus arrondi
    backgroundColor: '#F5F3FF', // Fond léger
  },
  
  // Section Styles - Contours et ombres améliorés
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24, // Plus arrondi
    padding: 22, // Plus d'espace intérieur
    marginHorizontal: 20,
    marginBottom: 22, // Plus d'espace entre les sections
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F5F3FF', // Bordure subtile
  },
  sectionTitle: {
    fontSize: 19, // Légèrement plus grand
    fontWeight: 'bold',
    color: '#4C1D95', // Violet plus foncé
    marginBottom: 18, // Plus d'espace sous le titre
    letterSpacing: 0.5, // Espacement des lettres
  },
  
  // Adherent Info Card Styles - Design plus élégant
  adherentInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24, // Plus arrondi
    padding: 24, // Plus d'espace intérieur
    margin: 20,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F5F3FF', // Bordure subtile
  },
  avatarContainer: {
    marginBottom: 20, // Plus d'espace
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  avatar: {
    width: 100, // Plus grand
    height: 100, // Plus grand
    borderRadius: 50, // Doit être la moitié de width/height
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4, // Bordure plus épaisse
    borderColor: '#EDE9FE', // Couleur plus claire
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50, // Doit correspondre au borderRadius du avatar
  },
  adherentInitials: {
    color: '#FFFFFF',
    fontSize: 38, // Plus grand
    fontWeight: 'bold',
    letterSpacing: 1, // Espacement des lettres
  },
  adherentName: {
    fontSize: 24, // Plus grand
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 6, // Plus d'espace
    letterSpacing: 0.5, // Espacement des lettres
  },
  adherentAge: {
    fontSize: 17, // Légèrement plus grand
    color: '#6B7280',
    marginBottom: 24, // Plus d'espace
  },
  
  // Info Row Styles - Plus d'espace et meilleure lisibilité
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 18, // Plus d'espace
    paddingHorizontal: 8, // Espace horizontal
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4, // Espace vertical
  },
  infoLabel: {
    fontSize: 13, // Légèrement plus grand
    color: '#6B7280',
    marginBottom: 6, // Plus d'espace
    fontWeight: '500', // Semi-bold
  },
  infoValue: {
    fontSize: 15, // Légèrement plus grand
    fontWeight: '600',
    color: '#1F2937',
    letterSpacing: 0.2, // Espacement des lettres
  },
  
  // Activities Styles - Design plus moderne
  activitiesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center', // Centre les activités
    marginTop: 6, // Espace en haut
  },
  activityTag: {
    backgroundColor: '#F5F3FF',
    borderRadius: 14, // Plus arrondi
    paddingVertical: 9, // Plus d'espace
    paddingHorizontal: 16, // Plus d'espace
    marginRight: 10,
    marginBottom: 12, // Plus d'espace
    borderWidth: 1,
    borderColor: '#DDD6FE',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  activityText: {
    color: '#7C3AED', // Violet plus vif
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3, // Espacement des lettres
  },
  
  // Performance Styles - Cartes plus élégantes
  performanceCard: {
    backgroundColor: '#FFFFFF', // Blanc au lieu de gris
    borderRadius: 16, // Plus arrondi
    padding: 18, // Plus d'espace
    marginBottom: 18, // Plus d'espace
    borderWidth: 1,
    borderColor: '#EDE9FE', // Bordure violette claire
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14, // Plus d'espace
  },
  performanceActivity: {
    fontSize: 17, // Plus grand
    fontWeight: 'bold',
    color: '#4C1D95', // Violet plus foncé
    letterSpacing: 0.3, // Espacement des lettres
  },
  levelBadge: {
    backgroundColor: '#DDD6FE',
    paddingVertical: 5, // Plus d'espace
    paddingHorizontal: 12, // Plus d'espace
    borderRadius: 12,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  levelText: {
    color: '#6D28D9',
    fontSize: 13, // Légèrement plus grand
    fontWeight: '600',
    letterSpacing: 0.2, // Espacement des lettres
  },
  progressSubtitle: {
    fontSize: 15, // Légèrement plus grand
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 10, // Plus d'espace
    letterSpacing: 0.2, // Espacement des lettres
  },
  progressContainer: {
    height: 10, // Plus épais
    backgroundColor: '#F3F4F6',
    borderRadius: 5, // La moitié de la hauteur
    marginBottom: 10, // Plus d'espace
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB', // Bordure subtile
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 5, // La moitié de la hauteur
  },
  progressTextContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 2, // Espace horizontal
  },
  progressText: {
    color: '#7C3AED', // Violet plus vif
    fontSize: 15, // Légèrement plus grand
    fontWeight: '600',
  },
  progressLabel: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500', // Semi-bold
  },
  achievementsTitle: {
    fontSize: 15, // Légèrement plus grand
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 10, // Plus d'espace
    marginTop: 4, // Espace en haut
    letterSpacing: 0.2, // Espacement des lettres
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10, // Plus d'espace
    backgroundColor: '#F9FAFB', // Fond léger
    padding: 8, // Espace intérieur
    borderRadius: 8, // Coins arrondis
    borderWidth: 1,
    borderColor: '#E5E7EB', // Bordure subtile
  },
  achievementText: {
    color: '#4B5563',
    fontSize: 14,
    marginLeft: 10, // Plus d'espace
    flex: 1, // Permet au texte de s'adapter
  },
  
  // Competition Styles - Design plus élégant
  competitionCard: {
    backgroundColor: '#FFFFFF', // Blanc au lieu de gris
    borderRadius: 16, // Plus arrondi
    padding: 18, // Plus d'espace
    marginBottom: 14, // Plus d'espace
    borderWidth: 1,
    borderColor: '#EDE9FE', // Bordure violette claire
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  competitionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14, // Plus d'espace
    paddingBottom: 10, // Espace supplémentaire
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6', // Séparateur subtil
  },
  competitionName: {
    fontSize: 17, // Plus grand
    fontWeight: 'bold',
    color: '#4C1D95', // Violet plus foncé
    letterSpacing: 0.3, // Espacement des lettres
    flex: 1, // Pour que le texte s'adapte
  },
  competitionResult: {
    color: '#7C3AED', // Violet plus vif
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 10, // Espace horizontal
    paddingVertical: 4, // Espace vertical
    backgroundColor: '#F5F3FF', // Fond léger
    borderRadius: 10, // Coins arrondis
  },
  competitionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4, // Espace en haut
  },
  competitionDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12, // Espace à droite
  },
  competitionDetailText: {
    color: '#6B7280',
    fontSize: 14,
    marginLeft: 8, // Plus d'espace
  },
  
  // Session Styles - Design plus moderne
  sessionCard: {
    backgroundColor: '#FFFFFF', // Blanc au lieu de gris
    borderRadius: 16, // Plus arrondi
    padding: 18, // Plus d'espace
    marginBottom: 14, // Plus d'espace
    borderWidth: 1,
    borderColor: '#EDE9FE', // Bordure violette claire
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  sessionActivity: {
    backgroundColor: '#EDE9FE',
    paddingVertical: 8, // Plus d'espace
    paddingHorizontal: 14, // Plus d'espace
    borderRadius: 12,
    marginRight: 14, // Plus d'espace
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  sessionActivityText: {
    color: '#6D28D9',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2, // Espacement des lettres
  },
  sessionDetails: {
    flex: 1,
  },
  sessionDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6, // Plus d'espace
    paddingVertical: 2, // Espace vertical
  },
  sessionDetailText: {
    color: '#6B7280',
    fontSize: 14,
    marginLeft: 8, // Plus d'espace
  },
  
  // Loading, Error, Empty State Styles - Améliorations visuelles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 17, // Légèrement plus grand
    color: '#6D28D9', // Couleur violette
    letterSpacing: 0.3, // Espacement des lettres
    fontWeight: '500', // Semi-bold
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 24, // Plus d'espace
  },
  errorText: {
    marginTop: 16,
    fontSize: 17, // Légèrement plus grand
    color: '#DC2626', // Rouge plus vif
    textAlign: 'center',
    marginBottom: 28, // Plus d'espace
    lineHeight: 24, // Hauteur de ligne
  },
  retryButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 14, // Plus d'espace
    paddingHorizontal: 28, // Plus d'espace
    borderRadius: 12, // Plus arrondi
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5, // Espacement des lettres
  },
  emptyStateText: {
    color: '#6B7280',
    fontSize: 15, // Légèrement plus grand
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 10, // Espace vertical
  },

  // Nouveaux styles pour dates et coach
  evaluationDate: {
    fontSize: 14,
    color: '#6B7280',
    marginVertical: 8,
    paddingVertical: 2, // Espace vertical
    letterSpacing: 0.2, // Espacement des lettres
  },
  coachText: {
    fontSize: 14,
    color: '#6B7280',
    marginVertical: 8,
    paddingVertical: 2, // Espace vertical
    letterSpacing: 0.2, // Espacement des lettres
  },
  
  // Sélecteur de mois amélioré
  monthChip: {
    paddingVertical: 8, // Plus d'espace
    paddingHorizontal: 14, // Plus d'espace
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    marginRight: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  monthChipActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#7C3AED', // Bordure plus foncée
    shadowColor: '#6D28D9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  monthChipText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500', // Semi-bold
    letterSpacing: 0.2, // Espacement des lettres
  },
  monthChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600', // Plus gras quand actif
  },
});