import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useLocalSearchParams } from 'expo-router';
import { getActivitiesByAdherent, getPerformanceByAdherentAndActivity } from '@/services/performanceService';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// 🔠 Types
interface Activite {
  id: number;
  nom: string;
}

interface Performance {
  id: number;
  date: string;
  note: number;
  commentaire: string;
  activiteNom: string;
}

export default function PerformanceDetailScreen() {
  const { adherentId, adherentNom } = useLocalSearchParams<{ adherentId: string, adherentNom: string }>();
  const [activities, setActivities] = useState<Activite[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState<number | null>(null);
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const navigation = useNavigation();
  const screenWidth = Dimensions.get('window').width;

  // Récupère les activités de l'adhérent
  useEffect(() => {
    if (adherentId) {
      setLoading(true);
      getActivitiesByAdherent(Number(adherentId))
        .then(data => {
          setActivities(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [adherentId]);

  // Charge les performances filtrées par activité
  useEffect(() => {
    if (adherentId && selectedActivityId) {
      setLoading(true);
      getPerformanceByAdherentAndActivity(Number(adherentId), selectedActivityId)
        .then(setPerformances)
        .finally(() => setLoading(false));
    } else {
      setPerformances([]); // Réinitialiser si aucune activité sélectionnée
    }
  }, [selectedActivityId]);

  // Calcule la performance moyenne
  const averagePerformance = performances.length > 0
    ? (performances.reduce((sum, perf) => sum + perf.note, 0) / performances.length).toFixed(1)
    : null;

  // Rendu d'une carte de performance
  const renderPerformanceCard = (perf: Performance, index: number) => {
    const scoreColor = perf.note >= 8 ? '#34D399' : perf.note >= 5 ? '#FBBF24' : '#EF4444';
    
    return (
      <View key={index} style={[
        styles.card,
        viewMode === 'grid' && {
          width: (screenWidth - 50) / 2,
          marginRight: index % 2 === 0 ? 10 : 0
        }
      ]}>
        <View style={styles.dateContainer}>
          <Text style={styles.dateText}>
            {new Date(perf.date).toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}
          </Text>
        </View>
        
        <View style={styles.scoreContainer}>
          <Text style={[styles.scoreText, { color: scoreColor }]}>{perf.note}</Text>
          <Text style={styles.scoreLabel}>/10</Text>
        </View>
        
        <View style={styles.divider} />
        
        <Text style={styles.commentLabel}>COMMENTAIRE</Text>
        <Text style={styles.commentText}>{perf.commentaire || 'Aucun commentaire'}</Text>
      </View>
    );
  };

  return (
    <View style={styles.mainContainer}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#8B5CF6" />
        </TouchableOpacity>
        <Text style={styles.title}>Performances</Text>
        <View style={styles.backButton} />
      </View>

      {/* Nom de l'adhérent */}
      {adherentNom && (
        <View style={styles.adherentBadge}>
          <Ionicons name="person" size={16} color="#8B5CF6" />
          <Text style={styles.adherentName}>{adherentNom}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.container}>
        {/* Sélecteur d'activité */}
        <Text style={styles.label}>SÉLECTIONNER UNE ACTIVITÉ</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedActivityId}
            onValueChange={(itemValue) => setSelectedActivityId(itemValue)}
            mode="dropdown"
            style={styles.picker}
          >
            <Picker.Item label="Choisir une activité..." value={null} color="#6B7280" />
            {activities.map((act) => (
              <Picker.Item key={act.id} label={act.nom} value={act.id} color="#374151" />
            ))}
          </Picker>
        </View>

        {/* Résumé des performances */}
        {selectedActivityId && performances.length > 0 && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{averagePerformance}</Text>
                <Text style={styles.summaryLabel}>NOTE MOYENNE</Text>
              </View>
              <View style={styles.dividerVertical} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{performances.length}</Text>
                <Text style={styles.summaryLabel}>ÉVALUATIONS</Text>
              </View>
            </View>
          </View>
        )}

        {/* Toggle view mode */}
        {selectedActivityId && performances.length > 0 && (
          <View style={styles.viewToggle}>
            <TouchableOpacity 
              style={[styles.viewButton, viewMode === 'list' && styles.viewButtonActive]} 
              onPress={() => setViewMode('list')}
            >
              <Ionicons name="list" size={20} color={viewMode === 'list' ? "#8B5CF6" : "#9CA3AF"} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.viewButton, viewMode === 'grid' && styles.viewButtonActive]} 
              onPress={() => setViewMode('grid')}
            >
              <MaterialCommunityIcons name="view-grid" size={20} color={viewMode === 'grid' ? "#8B5CF6" : "#9CA3AF"} />
            </TouchableOpacity>
          </View>
        )}

        {/* Liste des performances */}
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.loadingText}>Chargement des données...</Text>
          </View>
        ) : performances.length === 0 && selectedActivityId ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="chart-line-variant" size={60} color="#D1D5DB" />
            <Text style={styles.noData}>Aucune performance enregistrée pour cette activité</Text>
            <Text style={styles.noDataSubtitle}>Les performances seront affichées ici une fois ajoutées</Text>
          </View>
        ) : (
          <View style={[styles.performancesContainer, viewMode === 'grid' && styles.gridContainer]}>
            {performances.map((perf, index) => renderPerformanceCard(perf, index))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  container: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6D28D9',
  },
  adherentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'center',
    marginVertical: 12,
  },
  adherentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
    marginLeft: 6,
  },
  pickerContainer: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  picker: {
    height: 50,
  },
  label: {
    marginBottom: 8,
    fontWeight: '600',
    color: '#6B7280',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#FFF',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6D28D9',
    textTransform: 'capitalize',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  scoreText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  dividerVertical: {
    width: 1,
    backgroundColor: '#E5E7EB',
    height: '80%',
  },
  commentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  commentText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  summaryCard: {
    backgroundColor: '#F9F5FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8B5CF6',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  loaderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  noData: {
    marginTop: 16,
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  noDataSubtitle: {
    marginTop: 8,
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  viewToggle: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  viewButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginLeft: 8,
  },
  viewButtonActive: {
    backgroundColor: '#EDE9FE',
  },
  performancesContainer: {
    marginBottom: 20,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  }
});