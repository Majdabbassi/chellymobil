import { useLocalSearchParams } from 'expo-router';
import { View, Text } from 'react-native';

export default function CheckoutScreen() {
  const { id } = useLocalSearchParams();

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 18 }}>Écran de paiement pour le produit #{id}</Text>
    </View>
  );
}
