import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  Image, 
  TouchableOpacity,
  Animated,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import {
  getAdherentById, getActivitiesByAdherent, getPerformancesByAdherent,
  getNextSessionByAdherent, getEquipesByAdherent,
  getCompetitionsByAdherent
} from '@/services/adherent';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import API from '@/services/api';

const { width } = Dimensions.get('window');

interface Blessure {
  id: number;
  description: string;
  resolved: boolean;
  date: string;
  retour: string | null;
  gravite: string;
  methode: string;
  duree: string;
}

export default function AdherentDetailScreen() {
  const { adherentId } = useLocalSearchParams();
  const id = Array.isArray(adherentId) ? adherentId[0] : adherentId;
  console.log("🆔 adherentId utilisé pour fetch =", id);
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState<number | null>(null);
  const [blessures, setBlessures] = useState<Blessure[]>([]);
  const [presenceHistory, setPresenceHistory] = useState([]);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const getGraviteColor = (gravite: string) => {
    switch (gravite.toLowerCase()) {
      case 'grave': return { color: '#F43F5E' };
      case 'modérée': return { color: '#F97316' };
      case 'légère': return { color: '#10B981' };
      default: return { color: '#64748B' };
    }
  };

  useEffect(() => {
    // Start animations
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
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();

    (async () => {
      try {
        const [a, acts, perfs, sess, comps, teams] = await Promise.all([
          getAdherentById(id),
          getActivitiesByAdherent(id),
          getPerformancesByAdherent(id),
          getNextSessionByAdherent(id),
          getCompetitionsByAdherent(id),
          getEquipesByAdherent(id),
        ]);

        setData({
          fullName: `${a.prenom} ${a.nom}` || 'Nom inconnu',
          age: calcAge(a.dateNaissance),
          birthDate: format(a.dateNaissance),
          registrationDate: format(a.dateInscriptionClub),
          coach: a.coach?.nom ?? 'Non assigné',
          image: a.imageBase64 ?? null,
          presence: a.tauxPresence ? `${a.tauxPresence}%` : 'N/A',
          activities: acts.length ? acts.map(act => act.nom) : ['Aucune activité'],
          performances: perfs.map(p => ({
            ...p,
            progress: p.progress || 0,
            evaluationDate: p.evaluationDate,
            formattedDate: format(p.evaluationDate),
            assignedCoach: p.assignedCoach || 'Non assigné',
            activity: p.activity || 'Inconnue',
            achievements: p.achievements || []
          })),
          competitions: comps.map(c => ({
            name: c.nom || 'Inconnue',
            date: format(c.date),
            location: c.lieu || 'Lieu inconnu',
            result: c.resultat || '—',
            winningPercentage: c.winningPercentage ?? null,
            trophies: c.trophies || []
          })),
          sessions: sess ? [{
            activity: sess.activity || '—',
            date: format(sess.date),
            location: sess.location || '—'
          }] : [],
          equipes: teams.length ? teams.map(t => ({
            name: t.nomEquipe || '—',
            coach: t.coachNom || '—'
          })) : []
        });

      } finally { setLoading(false); }
    })();
  }, [id]);

  const calcAge = d => d ? new Date().getFullYear() - new Date(d).getFullYear() : '?';
  const format = d => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

  useEffect(() => {
    if (adherentId) {
      API.get(`/presences/adherent/${adherentId}/history`)
        .then(res => setPresenceHistory(res.data))
        .catch(err => console.error("❌ Erreur récupération historique des présences", err));
    }
  }, [adherentId]);

  useEffect(() => {
    if (adherentId) {
      fetchBlessures(Number(id));
    }
  }, [adherentId]);

  const fetchBlessures = async (id: number) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`http://localhost:8080/api/blessures/adherent/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setBlessures(response.data);
    } catch (error) {
      console.error("❌ Erreur lors du chargement des blessures", error);
    }
  };

  if (loading) return <Loader />;
  if (!data) return <Error />;

  return (
    <View style={styles.container}>
      {/* Gradient Background */}
      <View style={styles.gradientBackground} />
      
      {/* Header */}
      <Animated.View 
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.push('/ChildrenListScreen')}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil Adhérent</Text>
        <View style={{ width: 40 }} />
      </Animated.View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <Animated.View 
          style={[
            styles.profileCard,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim }
              ]
            }
          ]}
        >
          <InfoCard data={data} />
        </Animated.View>

        {/* Activities Section */}
        <AnimatedSection delay={200}>
          <SectionCard title="Activités" icon="fitness">
            <TagList items={data.activities} />
            <ReserveButton />
          </SectionCard>
        </AnimatedSection>

        {/* Teams Section */}
        <AnimatedSection delay={300}>
          <SectionCard title="Équipes" icon="people">
            {data.equipes.length ? data.equipes.map((e, i) => (
              <View key={i} style={styles.teamRow}>
                <View style={styles.teamIcon}>
                  <Ionicons name="trophy" size={16} color="#8B5CF6" />
                </View>
                <View style={styles.teamInfo}>
                  <Text style={styles.teamName}>{e.name}</Text>
                  <Text style={styles.teamCoach}>Coach: {e.coach}</Text>
                </View>
              </View>
            )) : <EmptyState text="Aucune équipe" />}
          </SectionCard>
        </AnimatedSection>

        {/* Performances Section */}
        <AnimatedSection delay={400}>
          <SectionCard title="Performances" icon="analytics">
            <MonthFilter month={month} setMonth={setMonth} />
            {(() => {
              const filtered = data.performances.filter(p => {
                const date = new Date(p.evaluationDate);
                const perfMonth = date.getMonth();
                return month === null || perfMonth === month;
              });

              return filtered.length ? (
                filtered.map((p, i) => <PerformanceCard key={i} perf={p} />)
              ) : (
                <EmptyState text="Aucune performance disponible pour ce mois" />
              );
            })()}
          </SectionCard>
        </AnimatedSection>

        {/* Competitions Section */}
        <AnimatedSection delay={500}>
          <SectionCard title="Compétitions" icon="medal">
            {data.competitions.length ? data.competitions.map((c, i) => (
              <CompetitionCard key={i} competition={c} />
            )) : <EmptyState text="Aucune compétition" />}
          </SectionCard>
        </AnimatedSection>

        {/* Presence History Section */}
        <AnimatedSection delay={600}>
          <SectionCard title="Historique de présence" icon="calendar">
            {presenceHistory.length > 0 ? (
              presenceHistory.map((p, i) => (
                <PresenceRow key={i} presence={p} />
              ))
            ) : (
              <EmptyState text="Aucune donnée de présence" />
            )}
          </SectionCard>
        </AnimatedSection>

        {/* Injuries Section */}
        <AnimatedSection delay={700}>
          <SectionCard title="Blessures" icon="medical">
            {blessures.length > 0 ? (
              blessures.map((b, i) => (
                <InjuryCard key={i} injury={b} getGraviteColor={getGraviteColor} format={format} />
              ))
            ) : (
              <EmptyState text="Aucune blessure enregistrée" />
            )}
          </SectionCard>
        </AnimatedSection>
      </ScrollView>
    </View>
  );
}

// Animated Section Component
const AnimatedSection = ({ children, delay = 0 }) => {
  const animValue = useRef(new Animated.Value(0)).current;
  const slideValue = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(animValue, {
        toValue: 1,
        duration: 600,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideValue, {
        toValue: 0,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity: animValue,
        transform: [{ translateY: slideValue }]
      }}
    >
      {children}
    </Animated.View>
  );
};

// Components
const Loader = () => (
  <View style={styles.centerContainer}>
    <View style={styles.loadingCard}>
      <ActivityIndicator size="large" color="#8B5CF6" />
      <Text style={styles.loadingText}>Chargement...</Text>
    </View>
  </View>
);

const Error = () => (
  <View style={styles.centerContainer}>
    <View style={styles.errorCard}>
      <Ionicons name="alert-circle" size={48} color="#F43F5E" />
      <Text style={styles.errorText}>Erreur de chargement</Text>
    </View>
  </View>
);

const InfoCard = ({ data }) => (
  <View style={styles.infoCardContent}>
    <View style={styles.avatarContainer}>
      <Image 
        source={data.image ? { uri: data.image } : require('@/assets/images/adaptive-icon.png')} 
        style={styles.avatar} 
      />
      <View style={styles.avatarGlow} />
    </View>
    <Text style={styles.fullName}>{data.fullName}</Text>
    <Text style={styles.age}>{data.age} ans</Text>
    
    <View style={styles.infoGrid}>
      <InfoRow label="Naissance" value={data.birthDate} />
      <InfoRow label="Inscription" value={data.registrationDate} />
      <InfoRow label="Présence" value={data.presence} />
    </View>
  </View>
);

const InfoRow = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const SectionCard = ({ title, icon, children }) => (
  <View style={styles.sectionCard}>
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={20} color="#8B5CF6" />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

const TagList = ({ items }) => (
  <View style={styles.tagContainer}>
    {items.map((item, i) => (
      <View key={i} style={styles.tag}>
        <Text style={styles.tagText}>{item}</Text>
      </View>
    ))}
  </View>
);

const MonthFilter = ({ month, setMonth }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.monthFilterContainer}
    style={styles.monthFilter}
  >
    {['Tous', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'].map((m, i) => (
      <TouchableOpacity 
        key={i} 
        onPress={() => setMonth(i === 0 ? null : i - 1)}
        style={[
          styles.monthChip,
          month === (i - 1) && styles.monthChipActive
        ]}
      >
        <Text style={[
          styles.monthChipText,
          month === (i - 1) && styles.monthChipTextActive
        ]}>
          {m}
        </Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
);

const getNoteColor = (note: number) => {
  if (note >= 8) return '#10B981';
  if (note >= 5) return '#F59E0B';
  return '#F43F5E';
};

const PerformanceCard = ({ perf }) => (
  <View style={styles.performanceCard}>
    <View style={styles.performanceHeader}>
      <Text style={styles.performanceActivity}>{perf.activity}</Text>
      <View style={[styles.scoreChip, { backgroundColor: getNoteColor(perf.progress) + '20' }]}>
        <Text style={[styles.scoreText, { color: getNoteColor(perf.progress) }]}>
          {perf.progress}/10
        </Text>
      </View>
    </View>
    <Text style={styles.performanceCoach}>Coach: {perf.assignedCoach}</Text>
    <Text style={styles.performanceDate}>{perf.formattedDate}</Text>
    
    {perf.achievements.length ? perf.achievements.map((a, i) => (
      <Text key={i} style={styles.achievement}>💬 {a}</Text>
    )) : (
      <Text style={styles.emptyAchievement}>Aucun commentaire</Text>
    )}
  </View>
);

const CompetitionCard = ({ competition }) => (
  <View style={styles.competitionCard}>
    <Text style={styles.competitionTitle}>{competition.name}</Text>
    
    <View style={styles.competitionDetails}>
      <View style={styles.competitionRow}>
        <Ionicons name="calendar-outline" size={16} color="#8B5CF6" />
        <Text style={styles.competitionText}>
          {competition.date} {new Date(competition.date) > new Date() ? '⏳ À venir' : '✅ Jouée'}
        </Text>
      </View>
      
      <View style={styles.competitionRow}>
        <Ionicons name="location-outline" size={16} color="#8B5CF6" />
        <Text style={styles.competitionText}>{competition.location}</Text>
      </View>

      {competition.result && competition.result !== '—' && (
        <View style={styles.competitionRow}>
          <Ionicons name="trophy-outline" size={16} color="#F59E0B" />
          <Text style={[styles.competitionText, { color: '#F59E0B', fontWeight: '600' }]}>
            {competition.result}
          </Text>
        </View>
      )}

      {typeof competition.winningPercentage === 'number' && competition.winningPercentage > 50 && (
        <View style={styles.winBadge}>
          <Text style={styles.winBadgeText}>
            🎖 Victoire ! {Math.round(competition.winningPercentage)}%
          </Text>
        </View>
      )}

      {Array.isArray(competition.trophies) && competition.trophies.length > 0 && (
        <View style={styles.competitionRow}>
          <Ionicons name="medal-outline" size={16} color="#8B5CF6" />
          <Text style={styles.competitionText}>
            {competition.trophies.join(', ')}
          </Text>
        </View>
      )}
    </View>
  </View>
);

const PresenceRow = ({ presence }) => (
  <View style={styles.presenceRow}>
    <Text style={styles.presenceDate}>
      {new Date(presence.sessionDateTime).toLocaleDateString()}
    </Text>
    <View style={[
      styles.presenceStatus,
      { backgroundColor: presence.present ? '#10B981' + '20' : '#F43F5E' + '20' }
    ]}>
      <Text style={[
        styles.presenceStatusText,
        { color: presence.present ? '#10B981' : '#F43F5E' }
      ]}>
        {presence.present ? '✅ Présent' : '❌ Absent'}
      </Text>
    </View>
  </View>
);

const InjuryCard = ({ injury, getGraviteColor, format }) => (
  <View style={styles.injuryCard}>
    <View style={styles.injuryHeader}>
      <Text style={[styles.injuryDate, getGraviteColor(injury.gravite)]}>
        📅 {format(injury.date)} ({injury.gravite})
      </Text>
      <View style={[
        styles.injuryStatus,
        { backgroundColor: injury.resolved ? '#10B981' + '20' : '#F43F5E' + '20' }
      ]}>
        <Text style={[
          styles.injuryStatusText,
          { color: injury.resolved ? '#10B981' : '#F43F5E' }
        ]}>
          {injury.resolved ? '✅ Résolue' : '❌ En cours'}
        </Text>
      </View>
    </View>
    <Text style={styles.injuryDescription}>
      📝 {injury.description} — 🩺 {injury.methode}
    </Text>
    <Text style={styles.injuryFooter}>
      ⏳ Durée : {injury.duree} | 🏃 Retour prévu : {injury.retour ? format(injury.retour) : '—'}
    </Text>
  </View>
);

const ReserveButton = () => (
  <TouchableOpacity 
    style={styles.reserveButton} 
    onPress={() => router.push('/activities')}
  >
    <Text style={styles.reserveButtonText}>Réserver Plus</Text>
    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
  </TouchableOpacity>
);

const EmptyState = ({ text }) => (
  <View style={styles.emptyState}>
    <Ionicons name="information-circle-outline" size={24} color="#8B5CF6" />
    <Text style={styles.emptyText}>{text}</Text>
  </View>
);

const TeamRow = ({ team }) => (
  <View style={styles.teamRow}>
    <View style={styles.teamIcon}>
      <Ionicons name="trophy" size={16} color="#8B5CF6" />
    </View>
    <View style={styles.teamInfo}>
      <Text style={styles.teamName}>{team.name}</Text>
      <Text style={styles.teamCoach}>Coach: {team.coach}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F23',
  },
gradientBackground: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: '#8B5CF6',
  zIndex: -1,
},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  profileCard: {
    marginTop: 10,
    marginBottom: 20,
    zIndex: 5,
  },
  infoCardContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 40,
    elevation: 10,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#8B5CF6',
    backgroundColor: '#F3F4F6',
  },
  avatarGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 60,
    backgroundColor: '#8B5CF6',
    opacity: 0.1,
    zIndex: -1,
  },
  fullName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
    textAlign: 'center',
  },
  age: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 20,
  },
  infoGrid: {
    width: '100%',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 8,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  tag: {
    backgroundColor: '#8B5CF6' + '15',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#8B5CF6' + '30',
  },
  tagText: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '600',
  },
  monthFilter: {
    marginBottom: 16,
  },
  monthFilterContainer: {
    paddingHorizontal: 8,
  },
  monthChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  monthChipActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  monthChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  monthChipTextActive: {
    color: '#FFFFFF',
  },
  performanceCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeft: 4,
    borderLeftColor: '#8B5CF6',
  },
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  performanceActivity: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  scoreChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '700',
  },
  performanceCoach: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  performanceDate: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  achievement: {
    fontSize: 14,
    color: '#1F2937',
    fontStyle: 'italic',
    marginTop: 4,
  },
  emptyAchievement: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  competitionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  competitionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#7C3AED',
    marginBottom: 12,
  },
  competitionDetails: {
    gap: 8,
  },
  competitionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  competitionText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  winBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  winBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D97706',
  },
  presenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  presenceDate: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  presenceStatus: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  presenceStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
injuryCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeft: 4,
    borderLeftColor: '#F43F5E',
  },
  injuryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  injuryDate: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  injuryStatus: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  injuryStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  injuryDescription: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    lineHeight: 20,
  },
  injuryFooter: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  reserveButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  reserveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  teamIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8B5CF6' + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  teamCoach: {
    fontSize: 14,
    color: '#6B7280',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F0F23',
  },
  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  errorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#F43F5E',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#F43F5E',
    fontWeight: '600',
  },
});