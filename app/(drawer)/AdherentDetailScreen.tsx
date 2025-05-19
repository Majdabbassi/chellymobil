import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import {
  getAdherentById, getActivitiesByAdherent, getPerformancesByAdherent,
  getNextSessionByAdherent, getParentCompetitions, getEquipesByAdherent
} from '@/services/adherent';

export default function AdherentDetailScreen() {
  const { adherentId } = useLocalSearchParams();
  const id = Array.isArray(adherentId) ? adherentId[0] : adherentId;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [a, acts, perfs, sess, comps, teams] = await Promise.all([
          getAdherentById(id), getActivitiesByAdherent(id),
          getPerformancesByAdherent(id), getNextSessionByAdherent(id),
          getParentCompetitions(), getEquipesByAdherent(id)
        ]);

        setData({
          fullName: `${a.prenom} ${a.nom}`,
          age: calcAge(a.dateNaissance),
          birthDate: format(a.dateNaissance),
          registrationDate: format(a.dateInscriptionClub),
          coach: a.coach?.nom ?? 'Non assigné',
          image: a.imageBase64 ?? null,
          presence: a.tauxPresence ? `${a.tauxPresence}%` : 'N/A',
          activities: acts.map(act => act.nom),
          performances: perfs.map(p => ({
            ...p,
            progress: p.progress || 0,
            evaluationDate: format(p.evaluationDate),
            assignedCoach: p.assignedCoach || 'Non assigné'
          })),
          competitions: comps.map(c => ({
            name: c.nom,
            date: format(c.date),
            location: c.lieu || 'Lieu inconnu',
            result: c.resultat || '—'
          })),
          sessions: sess ? [{
            activity: sess.activity,
            date: format(sess.date),
            location: sess.location || '—'
          }] : [],
          equipes: teams.map(t => ({
            name: t.nomEquipe,
            coach: t.coachNom || '—'
          }))
        });
      } finally { setLoading(false); }
    })();
  }, [id]);

  const calcAge = d => d ? new Date().getFullYear() - new Date(d).getFullYear() : '?';
  const format = d => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

  if (loading) return <Loader />;
  if (!data) return <Error />;

  return (
    <ScrollView style={styles.container}>
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.push('/ChildrenListScreen')}>
        <Ionicons name="arrow-back" size={24} color="#FFF" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Détails de l'Adhérent</Text>
      <View style={{ width: 24 }} /> {/* Spacer to center the title */}
    </View>
      <InfoCard data={data} />

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
          {data.equipes.map((e, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.label}>{e.name}</Text>
              <Text style={styles.value}>{e.coach}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Performances</Text>
          <MonthFilter month={month} setMonth={setMonth} />
          {data.performances.filter(p =>
            month === null || new Date(p.evaluationDate).getMonth() === month
          ).map((p, i) => (
            <PerformanceCard key={i} perf={p} />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Compétitions</Text>
          {data.competitions.map((c, i) => (
            <InfoRow key={i} label={`${c.name} - ${c.result}`} value={`${c.date}, ${c.location}`} />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Prochaines séances</Text>
          {data.sessions.map((s, i) => (
            <InfoRow key={i} label={s.activity} value={`${s.date} - ${s.location}`} />
          ))}
        </View>
      </View>

    </ScrollView>
  );
}

// Components
const Loader = () => (
  <View style={styles.center}><ActivityIndicator size="large" /><Text>Chargement...</Text></View>
);
const Error = () => (
  <View style={styles.center}><Ionicons name="alert" size={32} color="red" /><Text>Erreur</Text></View>
);
const Header = ({ title }) => (
  <View style={styles.header}><Ionicons name="arrow-back" size={24} onPress={() => router.back()} /><Text style={styles.title}>{title}</Text></View>
);
const InfoCard = ({ data }) => (
  <View style={styles.card}>
    <Image source={data.image ? { uri: data.image } : require('@/assets/images/adaptive-icon.png')} style={styles.avatar} />
    <Text style={styles.name}>{data.fullName}</Text>
    <Text>{data.age} ans</Text>
    <InfoRow label="Naissance" value={data.birthDate} />
    <InfoRow label="Inscription" value={data.registrationDate} />
    <InfoRow label="Présence" value={data.presence} />
    <InfoRow label="Coach" value={data.coach} />
  </View>
);
const Section = ({ title, children }) => (
  <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>
);
const InfoRow = ({ label, value }) => (
  <View style={styles.row}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>
);
const TagList = ({ items }) => (
  <View style={styles.tagList}>{items.map((t, i) => (
    <Text key={i} style={styles.tag}>{t}</Text>))}
  </View>
);
const ReserveButton = () => (
  <TouchableOpacity style={styles.button} onPress={() => router.push('/activities')}>
    <Text style={styles.buttonText}>Réserver Plus</Text>
  </TouchableOpacity>
);
const MonthFilter = ({ month, setMonth }) => (
  <ScrollView horizontal style={{ marginVertical: 10 }}>
    {['Tous', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
      .map((m, i) => (
        <TouchableOpacity key={i} onPress={() => setMonth(i === 0 ? null : i - 1)}>
          <Text style={[styles.chip, month === (i - 1) && styles.chipActive]}>{m}</Text>
        </TouchableOpacity>
      ))}
  </ScrollView>
);
const PerformanceCard = ({ perf }) => (
  <View style={styles.card}>
    <Text style={styles.label}>{perf.activity}</Text>
    <Text style={styles.value}>Niveau: {perf.level}</Text>
    <Text>Coach: {perf.assignedCoach}</Text>
    <Text>Évalué le: {perf.evaluationDate}</Text>
    <View style={styles.progress}>
      <View style={[styles.bar, { width: `${perf.progress}%` }]} />
    </View>
    {perf.achievements.length ? perf.achievements.map((a, i) => <Text key={i}>🏆 {a}</Text>) :
      <Text style={styles.empty}>Aucune réalisation</Text>}
  </View>
);

const styles = StyleSheet.create({
  container: { backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
header: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: 16,
  backgroundColor: '#7C3AED', // Purple header
  borderBottomLeftRadius: 16,
  borderBottomRightRadius: 16,
},
headerTitle: {
  fontSize: 18,
  fontWeight: 'bold',
  color: '#FFF',
},
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 6,
  },
  avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 10 },
  name: { fontSize: 18, fontWeight: 'bold' },
  section: { padding: 16 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#6D28D9',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    color: '#6B7280',
    fontSize: 14,
  },
  value: {
    fontWeight: '600',
    color: '#111827',
  },
  tagList: { flexDirection: 'row', flexWrap: 'wrap' },
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
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    marginHorizontal: 4,
    color: '#6B7280',
    backgroundColor: '#F5F3FF',
    fontSize: 14,
    fontWeight: '500',
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
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  progress: { height: 8, backgroundColor: '#DDD', borderRadius: 4, marginVertical: 10 },
  bar: { height: '100%', backgroundColor: '#6D28D9' },
  empty: { color: '#888', fontStyle: 'italic' }
});