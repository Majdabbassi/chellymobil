import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Image, SafeAreaView, Alert, ActivityIndicator, Linking
} from 'react-native';
import { useCart } from '../../contexts/CartContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import { useNavigation } from '@react-navigation/native';

const API_BASE_URL = Constants?.expoConfig?.extra?.apiUrl ?? 'http://192.168.100.4:8080';

const getImageSource = (image?: string) => {
  if (!image) {
    return require('../../assets/images/adaptive-icon.png');
  }
  if (image.startsWith('http')) {
    return { uri: image };
  }
  // Si c'est juste un nom de fichier, construit l'URL complète
  return { uri: `${API_BASE_URL}/uploads/${image}` };
};

export default function CartScreen() {
  const { cartItems, removeFromCart, updateQuantity, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const total = cartItems.reduce((sum, item) => sum + item.prix * item.quantity, 0);
  const shippingFee = total > 100 ? 0 : 7;
  const finalTotal = total + shippingFee;
  const handleCreateCommande = async () => {
    if (cartItems.length === 0) {
      Alert.alert("Panier vide", "Ajoutez des produits avant de payer.");
      return;
    }
  
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("Session expirée");
  
      const commandePayload = {
        statutCommande: "EN_ATTENTE", // ou "PAYEE" si tu veux marquer comme payé immédiatement
        produits: cartItems.map(item => ({
          id: item.id,
          quantite: item.quantity,
        })),
      };
  
      const response = await axios.post(`${API_BASE_URL}/api/commandes`, commandePayload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
  
      Alert.alert("✅ Succès", "Commande enregistrée avec succès !");
      clearCart();
  
    } catch (error) {
      console.error(error);
      if (axios.isAxiosError(error) && error.response) {
        Alert.alert("❌ Erreur", error.response.data?.error || "Impossible de créer la commande.");
      } else {
        Alert.alert("❌ Erreur", "Une erreur inconnue s'est produite.");
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleKonnectProductPayment = async () => {
    if (cartItems.length === 0) {
      Alert.alert("Panier vide", "Ajoutez des produits avant de payer.");
      return;
    }

    setLoading(true);

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("Session expirée");

      const response = await axios.post(
        `${API_BASE_URL}/api/konnect/product-pay`,
        {
          products: cartItems.map(item => ({
            id: item.id,
            name: item.designation,
            quantity: item.quantity,
            size: item.size,
            price: item.prix
          })),
          total: Math.round(finalTotal * 100),
          description: `Paiement produits (${cartItems.length} article${cartItems.length > 1 ? 's' : ''})`
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const konnectUrl = response.data?.payment_url;
      if (typeof konnectUrl === 'string' && konnectUrl.startsWith("http")) {
        Linking.openURL(konnectUrl);
      } else {
        throw new Error("Lien de paiement invalide");
      }

    } catch (error) {
      console.error(error);
      if (axios.isAxiosError(error) && error.response) {
        Alert.alert("Erreur", error.response.data?.error || "Échec du paiement Konnect");
      } else {
        Alert.alert("Erreur", "Une erreur inconnue s'est produite");
      }
    } finally {
      setLoading(false);
    }
  };

  const decreaseQuantity = (item: CartItem) => {
    item.quantity > 1
      ? updateQuantity(item.id, item.size, item.quantity - 1)
      : removeFromCart(item.id, item.size);
  };

  const increaseQuantity = (item: CartItem) => {
    updateQuantity(item.id, item.size, item.quantity + 1);
  };

  const renderEmptyCart = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="cart-outline" size={80} color="#d1d1d1" />
      <Text style={styles.emptyTitle}>Votre panier est vide</Text>
      <Text style={styles.emptySubtitle}>Ajoutez des articles pour commencer vos achats</Text>
      <TouchableOpacity
        style={styles.continueShopping}
        onPress={() => navigation.navigate('boutique')}
      >
        <Text style={styles.continueShoppingText}>Continuer mes achats</Text>
      </TouchableOpacity>
    </View>
  );

  interface CartItem {
    id: number; // Changed from string to number to match CartContext
    designation: string;
    size: string;
    prix: number;
    quantity: number;
    image?: string;
  }
  
  const renderItem = ({ item }: { item: CartItem }) => {
    // Ajoute ce console.log pour voir la valeur de l'image reçue
    console.log('Image du produit dans le panier:', item.image);

    const imageSource = getImageSource(item.image);
  
    return (
      <View style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <Image
            source={imageSource}
            style={styles.itemImage}
          />
          <View style={styles.itemDetails}>
            <Text style={styles.itemName}>{item.designation}</Text>
            <Text style={styles.itemSize}>
              Taille: <Text style={styles.itemSizeValue}>{item.size}</Text>
            </Text>
            <Text style={styles.itemPrice}>{item.prix} TND</Text>
          </View>
        </View>
  
        <View style={styles.itemFooter}>
          <View style={styles.quantityContainer}>
            <TouchableOpacity style={styles.quantityButton} onPress={() => decreaseQuantity(item)}>
              <Text style={styles.quantityButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.quantityText}>{item.quantity}</Text>
            <TouchableOpacity style={styles.quantityButton} onPress={() => increaseQuantity(item)}>
              <Text style={styles.quantityButtonText}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.itemTotal}>{(item.prix * item.quantity).toFixed(2)} TND</Text>
          <TouchableOpacity style={styles.removeButton} onPress={() => removeFromCart(item.id, item.size)}>
            <Ionicons name="trash-outline" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mon Panier</Text>
        {cartItems.length > 0 && (
          <Text style={styles.itemCount}>{cartItems.length} article{cartItems.length > 1 ? 's' : ''}</Text>
        )}
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={{ marginTop: 10 }}>Traitement du paiement...</Text>
        </View>
      )}

      {!loading && (cartItems.length === 0 ? renderEmptyCart() : (
        <View style={styles.contentContainer}>
          <FlatList
            data={cartItems}
            keyExtractor={(item) => `${item.id}-${item.size}`}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />

          <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Sous-total</Text>
              <Text style={styles.summaryValue}>{total.toFixed(2)} TND</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Frais de livraison</Text>
              <Text style={styles.summaryValue}>
                {shippingFee === 0 ? (
                  <Text style={styles.freeShipping}>Gratuit</Text>
                ) : (
                  `${shippingFee.toFixed(2)} TND`
                )}
              </Text>
            </View>

            {total < 100 && (
              <Text style={styles.shippingNote}>
                Ajoutez {(100 - total).toFixed(2)} TND pour livraison gratuite
              </Text>
            )}

            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{finalTotal.toFixed(2)} TND</Text>
            </View>
            <TouchableOpacity style={styles.checkoutButton} onPress={handleCreateCommande}>
  <Text style={styles.checkoutButtonText}>Payer à ChellySport</Text>
  <Ionicons name="arrow-forward" size={20} color="white" />
</TouchableOpacity>

            <TouchableOpacity style={[styles.checkoutButton, { backgroundColor: '#0EA5E9' }]} onPress={handleKonnectProductPayment}>
              <Text style={styles.checkoutButtonText}>Payer avec Konnect</Text>
              <Ionicons name="link-outline" size={20} color="white" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.clearButton} onPress={clearCart}>
              <Text style={styles.clearButtonText}>Vider le panier</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9fb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  itemCount: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
  },
  listContent: {
    padding: 15,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    color: '#333',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 25,
  },
  continueShopping: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
  },
  continueShoppingText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  itemHeader: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 15,
    backgroundColor: '#f5f5f5',
  },
  itemDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  itemSize: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  itemSizeValue: {
    fontWeight: '600',
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
  },
  quantityButton: {
    padding: 8,
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
  },
  quantityText: {
    fontSize: 14,
    fontWeight: 'bold',
    minWidth: 30,
    textAlign: 'center',
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  removeButton: {
    backgroundColor: '#EF4444',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 15,
    color: '#666',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  freeShipping: {
    color: '#10B981',
    fontWeight: 'bold',
  },
  shippingNote: {
    fontSize: 13,
    color: '#8B5CF6',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 15,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B5CF6',
  },
  checkoutButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 10,
    paddingVertical: 15,
    marginTop: 20,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 5,
  },
  clearButton: {
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    color: '#EF4444',
    fontWeight: '600',
  },
});