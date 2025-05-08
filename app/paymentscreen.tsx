import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

export default function PaymentScreen() {
  const { adherentName, activityName, amount } = useLocalSearchParams<{
    adherentName?: string;
    activityName?: string;
    amount?: string;
  }>();

  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cardType, setCardType] = useState<string | null>(null);

  const formatCardNumber = (text: string) => {
    let cleaned = text.replace(/\s/g, '');
    let formatted = cleaned.replace(/(\d{4})/g, '$1 ').trim();
    setCardNumber(formatted);

    if (cleaned.startsWith('4')) setCardType('visa');
    else if (/^5[1-5]/.test(cleaned)) setCardType('mastercard');
    else if (/^3[47]/.test(cleaned)) setCardType('amex');
    else setCardType(null);
  };

  const formatExpiryDate = (text: string) => {
    let cleaned = text.replace(/\D/g, '');
    setExpiryDate(cleaned.length > 2 ? `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}` : cleaned);
  };

  const handlePay = () => {
    if (!cardNumber || !cardHolder || !expiryDate || !cvv) {
      Alert.alert('Informations manquantes', 'Veuillez remplir tous les champs pour continuer.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      router.push('/payment-confirmation');
    }, 1500);
  };

  const goBack = () => router.back();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.mainContainer}
    >
      <StatusBar barStyle="light-content" backgroundColor="#6B46C1" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Paiement</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.courseInfoCard}>
          <Text style={styles.courseTitle}>
            {activityName ? `Activité : ${activityName}` : 'Activité sélectionnée'}
          </Text>
          <Text style={styles.courseTitle}>
            {adherentName ? `Adhérent : ${adherentName}` : ''}
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Prix total</Text>
            <Text style={styles.priceValue}>{amount ? `${amount}€` : '—'}</Text>
          </View>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Informations de paiement</Text>

          <Text style={styles.label}>Numéro de carte</Text>
          <View style={styles.cardNumberContainer}>
            <TextInput
              style={styles.cardNumberInput}
              placeholder="1234 5678 9012 3456"
              keyboardType="number-pad"
              maxLength={19}
              value={cardNumber}
              onChangeText={formatCardNumber}
            />
            {cardType && (
              <Ionicons
                name="card"
                size={24}
                color="#6B46C1"
                style={{ marginLeft: 8 }}
              />
            )}
          </View>

          <Text style={styles.label}>Titulaire de la carte</Text>
          <TextInput
            style={styles.input}
            placeholder="Hsan Hosni"
            value={cardHolder}
            onChangeText={setCardHolder}
            autoCapitalize="words"
          />

          <View style={styles.row}>
            <View style={styles.halfInputWrapper}>
              <Text style={styles.label}>Date d'expiration</Text>
              <TextInput
                style={styles.input}
                placeholder="MM/AA"
                maxLength={5}
                value={expiryDate}
                onChangeText={formatExpiryDate}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.halfInputWrapper}>
              <Text style={styles.label}>CVV</Text>
              <TextInput
                style={styles.input}
                placeholder="123"
                keyboardType="number-pad"
                maxLength={3}
                value={cvv}
                onChangeText={setCvv}
                secureTextEntry
              />
            </View>
          </View>
        </View>

        <View style={styles.securityContainer}>
          <Ionicons name="lock-closed" size={16} color="#6B46C1" />
          <Text style={styles.securityText}>
            Paiement sécurisé avec cryptage bancaire
          </Text>
        </View>
      </ScrollView>

      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.payButton, isLoading && styles.payButtonDisabled]}
          onPress={handlePay}
          disabled={isLoading}
        >
          {isLoading ? (
            <Text style={styles.payText}>Traitement...</Text>
          ) : (
            <>
              <Ionicons name="card" size={20} color="white" />
              <Text style={styles.payText}>Payer {amount ? `${amount}€` : ''}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F9F7FF',
  },
  header: {
    backgroundColor: '#6B46C1',
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  container: {
    padding: 20,
    backgroundColor: '#F9F7FF',
    flexGrow: 1,
  },
  courseInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#6B46C1',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6B46C1',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#6B46C1',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    color: '#4B5563',
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
    color: '#6B7280',
    fontWeight: '500',
  },
  cardNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    marginBottom: 16,
  },
  cardNumberInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  cardTypeIconContainer: {
    paddingRight: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInputWrapper: {
    width: '48%',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#6B46C1',
    borderRadius: 4,
    marginRight: 12,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#4B5563',
  },
  paymentMethodsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#6B46C1',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  paymentMethodsTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
    color: '#6B7280',
  },
  paymentMethodsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  paymentMethodIcon: {
    width: 50,
    height: 40,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  securityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  securityText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 6,
  },
  bottomContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  payButton: {
    backgroundColor: '#6B46C1',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    elevation: 2,
    shadowColor: '#6B46C1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  payButtonDisabled: {
    backgroundColor: '#9F7AEA',
  },
  payText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});