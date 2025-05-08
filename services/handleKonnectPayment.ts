import axios from 'axios';
import * as Linking from 'expo-linking';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface KonnectPaymentParams {
  adherentName: string;
  activityName: string;
  amount: number;
}

export const handleKonnectPayment = async ({
  adherentName,
  activityName,
  amount,
}: KonnectPaymentParams): Promise<void> => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      Alert.alert('Erreur', 'Session expirée. Veuillez vous reconnecter.');
      return;
    }

    const [firstName, lastName = ''] = adherentName.split(' ');

    const requestBody = {
      firstName: firstName || adherentName,
      lastName: lastName || 'Inconnu',
      email: 'client@example.com',
      phoneNumber: '20000000',
      description: `Paiement pour l'activité ${activityName}`,
      total: amount
    };
    console.log("test",requestBody);
    
    // URL du backend exposé via ngrok (mise à jour le 03/05/2025)
    const response = await axios.post(
      'https://16ed-102-31-203-191.ngrok-free.app/api/konnect/pay',
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const paymentUrl = response.data?.payment_url;

    if (typeof paymentUrl === 'string' && paymentUrl.startsWith('http')) {
      Linking.openURL(paymentUrl);
    } else {
      Alert.alert('Erreur', 'Lien de paiement Konnect invalide ou manquant.');
    }
  } catch (error: any) {
    console.error('Erreur Konnect:', error?.response?.data || error);
    Alert.alert(
      'Erreur',
      error?.response?.data?.message || 'Échec lors de la création du lien de paiement.'
    );
  }
};
