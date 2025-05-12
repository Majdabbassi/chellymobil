import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { getAllActivities, ActivityDTO } from '../services/avtivities' // path depends on your structure
import { router } from 'expo-router';


export default function ActivitiesScreen() {
 
  const [activities, setActivities] = useState<ActivityDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const data = await getAllActivities();
        setActivities(data);
      } catch (err) {
        console.error('❌ Erreur de chargement des activités:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);
 
 
 if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200EE" />
        <Text style={{ marginTop: 10 }}>Chargement des activités...</Text>
      </View>
    );
  }
 
 
 
 
 
 
   return (
    <View style={styles.container}>
    <View style={styles.headerContainer}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backArrow}>←</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Choisir une activité</Text>
    </View>

      <FlatList
        data={activities}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.activityCard}
          onPress={() => router.push(`/activity-details/${item.id}`)}
          >
            <Image
              source={{
                uri: item.imageBase64
                  ? `data:image/png;base64,${item.imageBase64}`
                  : 'https://via.placeholder.com/60',
              }}
              style={styles.activityImage}
            />
            <Text style={styles.activityText}>{item.nom}</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#6D28D9',
  paddingVertical: 14,
  paddingHorizontal: 16,
  width: '100%',
  elevation: 3,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  borderRadius:10,
  marginBottom:20,
},
backButton: {
  marginRight: 12,
},
backArrow: {
  fontSize: 22,
  color: 'white',
},
headerTitle: {
  fontSize: 18,
  color: 'white',
  fontWeight: 'bold',
},

  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#6200EE',
    alignSelf: 'center',
  },
  listContainer: {
    paddingBottom: 20,
  },
  activityCard: {
  backgroundColor: '#F8F6FF',
  paddingVertical: 14,
  paddingHorizontal: 12,
  borderRadius: 20,
  alignItems: 'center',
  width: '48%', // ✅ Two cards side by side
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
},


  activityText: {
  fontSize: 15,
  color: '#6200EE',
  fontWeight: '500',
},
activityImage: {
  width: 60,
  height: 60,
  marginBottom: 8,
  resizeMode: 'contain',
},
row: {
  justifyContent: 'space-between',
  marginBottom: 12,
},
loadingContainer: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#fff',
},


});
