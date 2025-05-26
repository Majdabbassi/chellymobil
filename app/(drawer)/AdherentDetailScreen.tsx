import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
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

const getGraviteColor = (gravite: string) => {
  switch (gravite.toLowerCase()) {
    case 'grave': return { color: '#DC2626' };       // rouge
    case 'modérée': return { color: '#F59E0B' };     // orange
    case 'légère': return { color: '#16A34A' };      // vert
    default: return { color: '#6B7280' };
  }
};

  useEffect(() => {
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
            evaluationDate: p.evaluationDate, // keep raw for filtering
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
    fetchBlessures(Number(id)); // ✅ use `Number(id)`
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
    <ScrollView style={styles.container} contentContainerStyle={{ alignItems: 'stretch' }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/ChildrenListScreen')}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détails de l'Adhérent</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.section}>
        <InfoCard data={data} />
      </View>
      <View style={styles.section}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Activités</Text>
          <TagList items={data.activities} />
          <ReserveButton />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Équipes</Text>
          {data.equipes.length ? data.equipes.map((e, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.label}>{e.name}</Text>
              <Text style={styles.value}>{e.coach}</Text>
            </View>
          )) : <Text style={styles.empty}>Aucune équipe</Text>}
        </View>
      </View>

<View style={styles.section}>
  <View style={styles.card}>
    <Text style={styles.sectionTitle}>Performances</Text>
    <MonthFilter month={month} setMonth={setMonth} />
    {(() => {


const filtered = data.performances.filter(p => {
  const date = new Date(p.evaluationDate);
  const perfMonth = date.getMonth(); // 0 = Janvier
  return month === null || perfMonth === month;
});

      return filtered.length ? (
        filtered.map((p, i) => <PerformanceCard key={i} perf={p} />)
      ) : (
        <Text style={styles.empty}>Aucune performance disponible pour ce mois</Text>
      );
    })()}
  </View>
</View>

<View style={styles.section}>
  <View style={styles.card}>
    <Text style={styles.sectionTitle}>Compétitions</Text>

    {data.competitions.length ? data.competitions.map((c, i) => (
      <View key={i} style={styles.competitionCard}>
        <Text style={styles.competitionTitle}>{c.name}</Text>
        
        <Text style={styles.competitionDetail}>
          📅 {c.date} {new Date(c.date) > new Date() ? '⏳ À venir' : '✅ Jouée'}
        </Text>

        <Text style={styles.competitionDetail}>📍 {c.location}</Text>

        {c.result && c.result !== '—' && (
          <Text style={styles.competitionResult}>🏆 Résultat : {c.result}</Text>
        )}

        {typeof c.winningPercentage === 'number' && c.winningPercentage > 50 && (
          <Text style={styles.competitionBadge}>
            🎖 Victoire ! {Math.round(c.winningPercentage)}%
          </Text>
        )}

        {Array.isArray(c.trophies) && c.trophies.length > 0 && (
          <Text style={styles.competitionDetail}>
            🏅 Trophées : {c.trophies.join(', ')}
          </Text>
        )}
      </View>
    )) : (
      <Text style={styles.empty}>Aucune compétition</Text>
    )}
  </View>
</View>

<View style={styles.section}>
  <View style={styles.card}>
    <Text style={styles.sectionTitle}>Historique de présence</Text>
    {presenceHistory.length > 0 ? (
      presenceHistory.map((p, i) => (
        <View key={i} style={styles.row}>
          <Text style={styles.label}>
            {new Date(p.sessionDateTime).toLocaleDateString()} 
          </Text>
          <Text style={{ color: p.present ? '#16A34A' : '#DC2626' }}>
            {p.present ? '✅ Présent' : '❌ Absent'}
          </Text>
        </View>
      ))
    ) : (
      <Text style={styles.empty}>Aucune donnée de présence</Text>
    )}
  </View>
</View>

<View style={styles.section}>
  <View style={styles.card}>
    <Text style={styles.sectionTitle}>Blessures</Text>
    {blessures.length > 0 ? (
      blessures.map((b, i) => (
        <View key={i} style={styles.blessureCard}>
          <View style={styles.blessureHeader}>
            <Text style={[styles.blessureDate, getGraviteColor(b.gravite)]}>
              📅 {format(b.date)} ({b.gravite})
            </Text>
            <Text style={styles.blessureStatus}>
              {b.resolved ? '✅ Résolue' : '❌ En cours'}
            </Text>
          </View>
          <Text style={styles.blessureDesc}>
            📝 {b.description} — 🩺 {b.methode}
          </Text>
          <Text style={styles.blessureFooter}>
            ⏳ Durée : {b.duree} | 🏃 Retour prévu : {b.retour ? format(b.retour) : '—'}
          </Text>
        </View>
      ))
    ) : (
      <Text style={styles.empty}>Aucune blessure enregistrée</Text>
    )}
  </View>
</View>
      
    </ScrollView>
  );
}

const Loader = () => (
  <View style={styles.center}><ActivityIndicator size="large" /><Text>Chargement...</Text></View>
);
const Error = () => (
  <View style={styles.center}><Ionicons name="alert" size={32} color="red" /><Text>Erreur</Text></View>
);
const InfoCard = ({ data }) => (
  <View style={[styles.card, { alignItems: 'center' }]}>  
    <Image source={data.image ? { uri: data.image } : require('@/assets/images/adaptive-icon.png')} style={styles.avatar} />
    <Text style={styles.name}>{data.fullName}</Text>
    <Text>{data.age} ans</Text>
    <InfoRow label="Naissance" value={data.birthDate} />
    <InfoRow label="Inscription" value={data.registrationDate} />
    <InfoRow label="Présence" value={data.presence} />
  </View>
);
const InfoRow = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value}</Text>
  </View>
);

const TagList = ({ items }) => (
  <View style={[styles.tagList, { justifyContent: 'center' }]}>{items.map((t, i) => (
    <Text key={i} style={styles.tag}>{t}</Text>))}
  </View>
);
const MonthFilter = ({ month, setMonth }) => (
<ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={{ paddingHorizontal: 8 }}
  style={{ width: '100%', marginVertical: 10 }}
>
    {['Tous', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'].map((m, i) => (
      <TouchableOpacity key={i} onPress={() => setMonth(i === 0 ? null : i - 1)}>
        <Text style={[styles.chip, month === (i - 1) && styles.chipActive]}>{m}</Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
);
const getNoteColor = (note: number) => {
  if (note >= 8) return { color: '#16A34A' }; // green
  if (note >= 5) return { color: '#F59E0B' }; // amber
  return { color: '#DC2626' };               // red
};

const PerformanceCard = ({ perf }) => (
  <View style={styles.card}>
    <Text style={styles.label}>Activité : {perf.activity}</Text>
    <Text style={[styles.value, getNoteColor(perf.progress)]}>
      Note : {perf.progress}/10
    </Text>    <Text style={styles.value}>Coach : {perf.assignedCoach}</Text>
    <Text style={styles.value}>Date : {perf.formattedDate}</Text>

    {perf.achievements.length ? perf.achievements.map((a, i) => (
      <Text key={i}>💬 : {a}</Text>
    )) : (
      <Text style={styles.empty}>Aucun commentaire</Text>
    )}
  </View>
);


const ReserveButton = () => (
  <TouchableOpacity style={styles.button} onPress={() => router.push('/activities')}>
    <Text style={styles.buttonText}>Réserver Plus</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F9FAFB',
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  competitionCard: {
  backgroundColor: '#F3F4F6',
  padding: 14,
  borderRadius: 12,
  marginBottom: 12,
  width: '100%',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 4,
  elevation: 2,
},
blessureCard: {
  backgroundColor: '#F9FAFB',
  padding: 12,
  borderRadius: 12,
  marginBottom: 12,
  width: '100%',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 2,
  elevation: 2,
},

blessureHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 4,
},

blessureDate: {
  fontSize: 14,
  fontWeight: '500',
},

blessureStatus: {
  fontSize: 14,
  fontWeight: '500',
},

blessureDesc: {
  fontSize: 15,
  fontWeight: 'bold',
  color: '#111827',
  marginBottom: 4,
},

blessureFooter: {
  fontSize: 13,
  color: '#6B7280',
},

competitionTitle: {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#4B0082',
  marginBottom: 4,
},

competitionDetail: {
  fontSize: 14,
  color: '#374151',
  marginBottom: 2,
},

competitionResult: {
  fontSize: 14,
  fontWeight: '600',
  color: '#16A34A',
  marginTop: 4,
},

competitionBadge: {
  fontSize: 14,
  fontWeight: 'bold',
  color: '#D97706',
  marginTop: 4,
},


  header: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: 16,     // small side padding
  paddingVertical: 12,       // vertical padding
  backgroundColor: '#7C3AED',
  borderBottomLeftRadius: 10,
  borderBottomRightRadius: 10,
  width: '100%',             // stretch to full width
  marginBottom:10,
},

  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  card: {
  backgroundColor: '#FFFFFF',
  borderRadius: 24,
  paddingVertical: 16,
  marginBottom: 30,
  shadowColor: '#8B5CF6',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.05,
  shadowRadius: 20,
  elevation: 6,
  alignItems: 'center',
  width: '100%',              // ← take full width
  paddingHorizontal: 16,
},

  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
    backgroundColor: '#EEE',
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 6,
  },
  section: {
  paddingHorizontal: 15,
},
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#6D28D9',
    marginBottom: 16,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  label: {
    color: '#6B7280',
    fontSize: 14,
    flex: 1,
  },
  value: {
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    textAlign: 'right',
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  tag: {
    borderRadius: 20,
    borderColor: '#E0D4FA',
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginRight: 10,
    marginBottom: 10,
    color: '#6D28D9',
    fontWeight: '500',
    fontSize: 13,
    backgroundColor: '#F5F3FF',
    textAlign: 'center',
  },
  chip: {
  paddingVertical: 6,
  paddingHorizontal: 16,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: '#DDD6FE',
  marginHorizontal: 6,
  color: '#6B7280',
  backgroundColor: '#F5F3FF',
  fontSize: 14,
  fontWeight: '500',
  overflow: 'hidden', // pour Android
},
chipActive: {
  backgroundColor: '#8B5CF6',
  borderColor: '#8B5CF6',
  color: '#FFF',
},

  button: {
    backgroundColor: '#6D28D9',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
    alignSelf: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  progress: {
    height: 8,
    backgroundColor: '#DDD',
    borderRadius: 4,
    marginVertical: 10,
    width: '100%',
  },
  bar: {
    height: '100%',
    backgroundColor: '#6D28D9',
    borderRadius: 4,
  },
  empty: {
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
  },

  infoRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  width: '100%',
  marginBottom: 6,
  paddingHorizontal: 10,
},

infoLabel: {
  fontSize: 14,
  color: '#6B7280',
  flex: 1,
},

infoValue: {
  fontSize: 14,
  color: '#111827',
  fontWeight: 'bold',
  textAlign: 'right',
  flex: 1,
},

});