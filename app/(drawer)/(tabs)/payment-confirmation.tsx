import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function PaymentConfirmationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [status, setStatus] = useState<'success' | 'failed' | 'unknown'>('unknown');

  useEffect(() => {
    if (params?.status === 'success' || params?.status === 'failed') {
      setStatus(params.status as 'success' | 'failed');
    } else {
      setStatus('unknown');
    }
  }, [params]);

  const handleGoHome = () => {
    router.replace('/(drawer)/ParentDashboardScreen');
  };

  return (
    <View style={styles.container}>
      {status === 'success' ? (
        <View style={styles.centered}>
          <Text style={styles.successText}>✅ Paiement réussi !</Text>
          <Text style={styles.text}>Merci pour votre réservation.</Text>
          <Image source={require('@/assets/images/confirmation.png')} style={styles.image} resizeMode="contain" />
          <TouchableOpacity style={styles.button} onPress={handleGoHome}>
            <Text style={styles.buttonText}>Retour à l'accueil</Text>
          </TouchableOpacity>
        </View>
      ) : status === 'failed' ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>❌ Paiement échoué.</Text>
          <Text style={styles.text}>Veuillez réessayer ou utiliser un autre moyen de paiement.</Text>
          <TouchableOpacity style={styles.button} onPress={handleGoHome}>
            <Text style={styles.buttonText}>Retour à l'accueil</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#6B46C1" />
          <Text style={styles.text}>Chargement du statut...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  text: {
    fontSize: 18,
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
  },
  successText: {
    fontSize: 22,
    color: '#22C55E',
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 20,
    color: '#EF4444',
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  button: {
    marginTop: 24,
    backgroundColor: '#6B46C1',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  image: {
    width: 200,
    height: 200,
    marginTop: 20,
    marginBottom: 20,
  },
});
