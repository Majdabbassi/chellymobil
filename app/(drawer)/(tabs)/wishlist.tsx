import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image, Alert,
  StatusBar, ActivityIndicator, StyleSheet
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '@/services/api';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  primary: '#8B5CF6',
  background: '#f9f9fb',
  text: '#1e293b',
  muted: '#64748b',
  border: '#e2e8f0',
  error: '#EF4444'
};

interface Product {
  id: number;
  designation: string;
  prix: number;
  imageBase64?: string;
  promotion?: number;
}

export default function WishlistScreen() {
    const getImageSource = (image?: string) => {
  if (!image) {
    return { uri: 'https://via.placeholder.com/80x80?text=Image' };
  }

  if (image.startsWith('http')) {
    return { uri: image };
  }

  if (image.startsWith('data:')) {
    return { uri: image }; // base64 déjà préfixé
  }

  return { uri: `data:image/jpeg;base64,${image}` }; // base64 brut
};

  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const getOrCreateWishlistCode = async () => {
    let code = await AsyncStorage.getItem('wishlistCode');
    if (!code) {
      code = `wishlist-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      await AsyncStorage.setItem('wishlistCode', code);
    }
    return code;
  };
// ...

const fetchWishlist = useCallback(async () => {
  try {
    setLoading(true);
    const code = await getOrCreateWishlistCode();
    const res = await API.get(`/wishlist/by-code/${code}`); // ✅ corrigé

    const ids = res.data.items?.map((item: any) => item.produitId) || [];

    const products = await Promise.all(
      ids.map(async (id: number) => {
        const productRes = await API.get(`/produits/${id}`); // ✅ corrigé
        return productRes.data;
      })
    );

    setWishlistProducts(products);
  } catch (err) {
    console.error('Erreur de récupération de la wishlist :', err);
    Alert.alert("Erreur", "Impossible de charger votre liste de souhaits.");
  } finally {
    setLoading(false);
  }
}, []);




  useEffect(() => {
    fetchWishlist();
  }, []);

const removeFromWishlist = async (productId: number) => {
  try {
    const code = await getOrCreateWishlistCode();
    
    // Suppression côté backend (nouvelle API DELETE)
    await API.delete(`/wishlist/${code}/produit/${productId}`);

    // Mise à jour locale
    const newWishlist = wishlistProducts.filter(p => p.id !== productId);
    setWishlistProducts(newWishlist);
  } catch (err) {
    console.error("❌ Erreur lors de la suppression :", err);
    Alert.alert("Erreur", "Impossible de retirer le produit de la wishlist.");
  }
};


  const renderItem = ({ item }: { item: Product }) => {
    const finalPrice = item.promotion
      ? Math.round(item.prix * (1 - item.promotion / 100))
      : item.prix;

    return (
      <TouchableOpacity
        onPress={() => router.push(`/product/${item.id}`)}
        style={styles.card}
        activeOpacity={0.9}
      >
     <Image
  source={getImageSource(item.imageBase64)}
  style={styles.image}
/>

        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>{item.designation}</Text>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>{finalPrice} TND</Text>
            {item.promotion && (
              <Text style={styles.oldPrice}>{item.prix} TND</Text>
            )}
          </View>
        </View>
        <TouchableOpacity onPress={() => removeFromWishlist(item.id)}>
          <Ionicons name="trash-outline" size={22} color={COLORS.error} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <Text style={styles.header}>💜 Ma Wishlist</Text>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
      ) : wishlistProducts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-dislike-outline" size={80} color="#ccc" />
          <Text style={styles.emptyText}>Votre liste de souhaits est vide.</Text>
        </View>
      ) : (
        <FlatList
          data={wishlistProducts}
          keyExtractor={(item) => `wish-${item.id}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginVertical: 6,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  oldPrice: {
    fontSize: 14,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 80,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.muted,
    marginTop: 12,
    textAlign: 'center',
  },
});
