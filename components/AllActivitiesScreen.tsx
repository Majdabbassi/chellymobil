import React from 'react';
import { View, Text, ScrollView, Image, StyleSheet, Pressable, Button } from 'react-native';
import { useRouter } from 'expo-router';

const activities = [
    {
      title: 'Football',
      image: { uri: 'https://cdn-icons-png.flaticon.com/256/7294/7294965.png' },
      count: 'Hebdomadaire',
    },
    {
      title: 'Natation',
      image: { uri: 'https://cdn-icons-png.flaticon.com/256/7647/7647861.png' },
      count: '3 fois/semaine',
    },
    {
      title: 'Handball',
      image: { uri: 'https://cdn-icons-png.flaticon.com/128/6836/6836853.png' },
      count: '2 fois/mois',
    },
    {
      title: 'Basketball',
      image: { uri: 'https://cdn-icons-png.flaticon.com/256/5784/5784073.png' },
      count: 'Chaque samedi',
    },
    {
      title: 'Gym',
      image: { uri: 'https://cdn-icons-png.flaticon.com/256/6935/6935795.png' },
      count: 'Tous les matins',
    },
    {
      title: 'Tennis',
      image: { uri: 'https://cdn-icons-png.flaticon.com/256/9768/9768625.png' },
      count: 'Mercredi et samedi',
    },
    {
      title: 'Judo',
      image: { uri: 'https://cdn-icons-png.flaticon.com/256/12548/12548021.png' },
      count: '1 fois/semaine',
    },
    {
      title: 'Tchoukball',
      image: { uri: 'https://cdn-icons-png.flaticon.com/128/9937/9937421.png' },
      count: 'Club compétitif',
    },
    {
      title: 'JSF',
      image: { uri: 'https://cdn-icons-png.flaticon.com/128/2314/2314698.png' },
      count: 'Programme annuel',
    },
  ];
  

export default function AllActivitiesScreen() {
  const router = useRouter();

  const handleRegister = (activityTitle: string) => {
    // Pour l'instant on log, tu peux ajouter une navigation ou modal ici
    console.log(`Inscrire un adhérant pour : ${activityTitle}`);
    // Exemple : router.push(`/register?activity=${encodeURIComponent(activityTitle)}`);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </Pressable>
        <Text style={styles.title}>Categories</Text>
      </View>

      <View style={styles.grid}>
        {activities.map((item, i) => (
          <View key={i} style={styles.card}>
            <Image source={item.image} style={styles.image} />
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardSubtitle}>{item.count}</Text>

            <Pressable
              onPress={() => handleRegister(item.title)}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Inscrire un adhérant</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fff', padding: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  back: {
    fontSize: 22,
    marginRight: 10,
    color: '#F97316',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '47%',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
    paddingBottom: 10,
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  button: {
    backgroundColor: '#F97316',
    marginHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: 100,
    resizeMode: 'contain',
    backgroundColor: '#fff',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  
});
