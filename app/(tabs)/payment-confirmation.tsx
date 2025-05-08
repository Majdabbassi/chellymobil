import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import Constants from 'expo-constants';

const API_BASE_URL = Constants?.expoConfig?.extra?.apiUrl ?? 'http://192.168.100.199:8080';

export default function PaymentConfirmationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [status, setStatus] = useState<'pending' | 'paid' | 'failed' | 'unknown'>('pending');
  const [loading, setLoading] = useState(true);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Récupère reservationId depuis l'URL (deep link ou navigation)
  useEffect(() => {
    if (params?.reservationId) {
      setReservationId(params.reservationId as string);
    } else {
      // fallback: tente de parser l'URL manuellement
      const url = Linking.useURL();
      if (url) {
        const parsed = Linking.parse(url);
        if (parsed.queryParams && parsed.queryParams.reservationId) {
          setReservationId(parsed.queryParams.reservationId as string);
        }
      }
    }
  }, [params]);

  // Recharge le statut de la réservation si reservationId change
  useEffect(() => {
    const fetchStatus = async () => {
      if (!reservationId) {
        setLoading(false);
        setStatus('unknown');
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get(`${API_BASE_URL}/api/reservations/${reservationId}`);
        const reservation = res.data;
        if (reservation.status === 'PAID') {
          setStatus('paid');
        } else if (reservation.status === 'FAILED') {
          setStatus('failed');
        } else {
          setStatus('pending');
        }
      } catch (err: any) {
        setError('Erreur lors de la vérification du paiement.');
        setStatus('unknown');
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, [reservationId]);

  const handleGoHome = () => {
    router.replace('/(tabs)/ParentDashboardScreen');
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#6B46C1" />
          <Text style={styles.text}>Vérification du paiement...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.button} onPress={handleGoHome}>
            <Text style={styles.buttonText}>Retour à l'accueil</Text>
          </TouchableOpacity>
        </View>
      ) : status === 'paid' ? (
        <View style={styles.centered}>
          <Text style={styles.successText}>✅ Paiement confirmé !</Text>
          <Text style={styles.text}>Merci pour votre paiement.</Text>
          <TouchableOpacity style={styles.button} onPress={handleGoHome}>
            <Text style={styles.buttonText}>Retour à l'accueil</Text>
          </TouchableOpacity>
        </View>
      ) : status === 'failed' ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>❌ Paiement échoué.</Text>
          <TouchableOpacity style={styles.button} onPress={handleGoHome}>
            <Text style={styles.buttonText}>Retour à l'accueil</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.centered}>
          <Text style={styles.text}>Statut du paiement : {status}</Text>
          <TouchableOpacity style={styles.button} onPress={handleGoHome}>
            <Text style={styles.buttonText}>Retour à l'accueil</Text>
          </TouchableOpacity>
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
});