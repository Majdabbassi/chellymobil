import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  StatusBar,
  Alert,
  Modal,
  TextInput,
  SafeAreaView,
  Platform,
  Animated,
  BackHandler,
  Keyboard
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useRouter } from 'expo-router';
import { getAllProducts } from '@/services/products';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useCart } from '../../../contexts/CartContext';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import API from '@/services/api';

const { width, height } = Dimensions.get('window');
const numColumns = 2;
const cardWidth = (width - 48) / numColumns;

// Constants for better maintainability
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const SIZE_GUIDE_DATA = [
  { size: 'XS', chest: '84-86', waist: '68-70', hips: '90-92' },
  { size: 'S', chest: '88-90', waist: '72-74', hips: '94-96' },
  { size: 'M', chest: '92-94', waist: '76-78', hips: '98-100' },
  { size: 'L', chest: '96-98', waist: '80-82', hips: '102-104' },
  { size: 'XL', chest: '100-102', waist: '84-86', hips: '106-108' },
  { size: 'XXL', chest: '104-106', waist: '88-90', hips: '110-112' }
];

const COLORS = {
  primary: '#8B5CF6',
  primaryDark: '#6D42D9',
  secondary: '#F3F0FF',
  background: '#f8f8fc',
  card: '#ffffff',
  text: '#333333',
  textSecondary: '#666666',
  textLight: '#999999',
  error: '#FF3B30',
  warning: '#FFC107',
  success: '#28A745',
  border: '#eeeeee'
};

// Custom hooks for better code organization
const useAnimations = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [Platform.OS === 'ios' ? 100 : 64, Platform.OS === 'ios' ? 70 : 60],
    extrapolate: 'clamp',
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [1, 0.9],
    extrapolate: 'clamp',
  });

  const startFadeAnimation = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true
    }).start();
  }, [fadeAnim]);

  return { fadeAnim, scrollY, headerHeight, headerOpacity, startFadeAnimation };
};

const useProductFiltering = (products, selectedCategory, searchQuery) => {
  return useMemo(() => {
    return products
      .filter(product => {
        const matchesCategory = selectedCategory === 'Tous' || 
          product.categorie?.designation === selectedCategory;
        
        const matchesSearch = searchQuery === '' || 
          product.designation.toLowerCase().includes(searchQuery.toLowerCase());
        
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        // Priority sorting: promotion > stock > alphabetical
        if (a.promotion && !b.promotion) return -1;
        if (!a.promotion && b.promotion) return 1;
        if (a.quantite > 0 && b.quantite === 0) return -1;
        if (a.quantite === 0 && b.quantite > 0) return 1;
        return a.designation.localeCompare(b.designation);
      });
  }, [products, selectedCategory, searchQuery]);
};

// Utility functions
const getImageSource = (imageBase64) => {
  if (!imageBase64) return require('@/assets/images/adaptive-icon.png'); // Add fallback
  return imageBase64.startsWith('data:')
    ? { uri: imageBase64 }
    : { uri: `data:image/jpeg;base64,${imageBase64}` };
};

const calculateFinalPrice = (price, promotion) => {
  return promotion ? Math.round(price * (1 - promotion / 100)) : price;
};

const getStockStatus = (quantity) => {
  if (quantity === 0) return { text: 'Épuisé', color: COLORS.error };
  if (quantity <= 5) return { text: `${quantity} restants`, color: COLORS.warning };
  return { text: 'En stock', color: COLORS.success };
};

interface Product {
  id: number;
  designation: string;
  prix: number;
  imageBase64: string;
  quantite: number;
  promotion?: number;
  categorie?: {
    designation: string;
  };
  sexe?: string;
}

export default function BoutiqueScreen() {
  // State management
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [categories, setCategories] = useState(['Tous']);
  const [wishlist, setWishlist] = useState<number[]>([]);
  
  // Modal states
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [size, setSize] = useState('M');
  const [showModal, setShowModal] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  const router = useRouter();
  const { addToCart, cartItems } = useCart();
  const { fadeAnim, scrollY, headerHeight, headerOpacity, startFadeAnimation } = useAnimations();
  
  // Memoized filtered products
  const filteredProducts = useProductFiltering(products, selectedCategory, searchQuery);

  // Refs for performance optimization
  const searchInputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);

  // Data fetching
  const fetchProducts = useCallback(async () => {
    try {
      setError(null);
      const result = await getAllProducts();
      setProducts(result || []);
      
      // Extract unique categories
      const uniqueCategories = [...new Set(
        result.map(item => item.categorie?.designation || 'Autre').filter(Boolean)
      )];
      setCategories(['Tous', ...uniqueCategories]);
      
      startFadeAnimation();
    } catch (err) {
      const errorMessage = 'Impossible de charger les produits. Veuillez réessayer plus tard.';
      setError(errorMessage);
      Alert.alert('Erreur', errorMessage);
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [startFadeAnimation]);

  // Effects
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);
useEffect(() => {
  const fetchWishlist = async () => {
    try {
      const code = await getOrCreateWishlistCode();
      const res = await API.get(`/wishlist/by-code/${code}`);
      const produitIds = res.data.items?.map(item => item.produitId) || [];
      setWishlist(produitIds);
    } catch (err) {
      console.error("❌ Erreur chargement wishlist:", err);
    }
  };


  fetchWishlist();
}, []);
const logVisit = async () => {
  try {
    await API.post('/visits/log');
    console.log("📈 Visite enregistrée");
  } catch (err) {
    console.warn("⚠️ Impossible d'enregistrer la visite :", err);
  }
};
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showModal || showSizeGuide) {
        setShowModal(false);
        setShowSizeGuide(false);
        return true;
      }
      if (showSearch) {
        setShowSearch(false);
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [showModal, showSizeGuide, showSearch]);

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [showSearch]);
useEffect(() => {
  logVisit();
}, []);

  // Event handlers
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts();
  }, [fetchProducts]);

  const handleBuyPress = useCallback((item: Product) => {
    if (item.quantite === 0) return;
    
    setSelectedProduct(item);
    setQuantity(1);
    setSize('M');
    setShowModal(true);
  }, []);

  const navigateToProduct = useCallback((item: Product) => {
    router.push(`/product/${item.id}`);
  }, [router]);

const toggleWishlist = useCallback(async (productId: number) => {
  try {
    const code = await getOrCreateWishlistCode();

    const newWishlist = wishlist.includes(productId)
      ? wishlist.filter(id => id !== productId)
      : [...wishlist, productId];

    setWishlist(newWishlist); // mise à jour locale

    // Synchronisation backend
    const payload = {
      codeWishlist: code,
      dto: {
        items: newWishlist.map(id => ({ produitId: id }))
      }
    };

    await API.post('/wishlist/sync', payload);
    console.log('🧡 Wishlist sync sent:', payload);
  } catch (err) {
    console.error("❌ Erreur de sync wishlist :", err);
  }
}, [wishlist]);


  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);
    // Reset to first category if searching
    if (text.trim() && selectedCategory !== 'Tous') {
      setSelectedCategory('Tous');
    }
  }, [selectedCategory]);
const getOrCreateWishlistCode = async () => {
  let code = await AsyncStorage.getItem('wishlistCode');
  if (!code) {
    code = `wishlist-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    await AsyncStorage.setItem('wishlistCode', code);
  }
  return code;
};

  const handleCategorySelect = useCallback((category: string) => {
    setSelectedCategory(category);
    // Clear search when selecting category
    if (searchQuery.trim()) {
      setSearchQuery('');
    }
    // Scroll to top
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [searchQuery]);

  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory('Tous');
    Keyboard.dismiss();
  }, []);


const getOrCreatePanierCode = async () => {
  let code = await AsyncStorage.getItem('panierCode');
  if (!code) {
    code = `panier-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    await AsyncStorage.setItem('panierCode', code);
  }
  return code;
};

const handleAddToCart = useCallback(async () => {
  if (!selectedProduct) return;

  try {
    const codePanier = await getOrCreatePanierCode();

    const newItem = {
      id: selectedProduct.id,
      designation: selectedProduct.designation,
      prix: calculateFinalPrice(selectedProduct.prix, selectedProduct.promotion),
      quantity,
      size,
      image: selectedProduct.imageBase64,
    };

    addToCart(newItem); // 👈 local update

    const dtoItems = [...cartItems, newItem].map(item => ({
      produitId: item.id,
      quantite: item.quantity,
      taille: item.size
    }));

    const payload = {
      codePanier,
      dto: {
        items: dtoItems
      }
    };

    console.log("📦 Payload envoyé au backend :", payload);

    await API.post('/panier/sync', payload);

    setShowModal(false);

    Alert.alert(
      "✅ Ajouté au panier", 
      `${quantity} × "${selectedProduct.designation}" (taille ${size}) a été ajouté.`,
      [
        { text: "Voir le panier", onPress: () => router.push('/cart') },
        { text: "Continuer les achats", style: "cancel" }
      ]
    );
  } catch (error) {
    Alert.alert('Erreur', 'Impossible d\'ajouter le produit au panier.');
    console.error('Erreur ajout panier :', error);
  }
}, [selectedProduct, quantity, size, cartItems, addToCart, router]);



  // Render functions
  const renderItem = useCallback(({ item, index }: { item: Product; index: number }) => {
    const isInWishlist = wishlist.includes(item.id);
    const imageSource = getImageSource(item.imageBase64);
    const finalPrice = calculateFinalPrice(item.prix, item.promotion);
    const stockStatus = getStockStatus(item.quantite);
    
    const animatedStyle = {
      opacity: fadeAnim,
      transform: [{ 
        translateY: fadeAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [50 + (index % 4) * 10, 0] // Staggered animation
        })
      }]
    };

    return (
      <Animated.View style={animatedStyle}>
        <ProductCard
          product={item}
          imageSource={imageSource}
          finalPrice={finalPrice}
          stockStatus={stockStatus}
          isInWishlist={isInWishlist}
          onPress={() => navigateToProduct(item)}
          onBuyPress={() => handleBuyPress(item)}
          onWishlistPress={() => toggleWishlist(item.id)}
        />
      </Animated.View>
    );
  }, [wishlist, fadeAnim, navigateToProduct, handleBuyPress, toggleWishlist]);

  const renderHeader = () => (
    <HeaderComponent
      headerHeight={headerHeight}
      headerOpacity={headerOpacity}
      showSearch={showSearch}
      searchQuery={searchQuery}
      wishlistCount={wishlist.length}
      cartCount={cartItems?.length || 0}
      categories={categories}
      selectedCategory={selectedCategory}
      onSearchToggle={() => setShowSearch(!showSearch)}
      onSearchChange={handleSearch}
      onCategorySelect={handleCategorySelect}
      onWishlistPress={() => router.push('/wishlist')}
      onCartPress={() => router.push('/cart')}
      searchInputRef={searchInputRef}
    />
  );

  const renderFooter = () => {
    if (loading) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.footerText}>Chargement...</Text>
        </View>
      );
    }
    return <View style={styles.footerSpacer} />;
  };

  const renderEmpty = () => (
    <EmptyState
      hasFilters={searchQuery !== '' || selectedCategory !== 'Tous'}
      onReset={resetFilters}
    />
  );

  // Loading state
  if (loading && !refreshing) {
    return <LoadingScreen />;
  }

  // Error state
  if (error && !refreshing) {
    return <ErrorScreen error={error} onRetry={fetchProducts} />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      {renderHeader()}
      
      <Animated.FlatList
        ref={flatListRef}
        data={filteredProducts}
        keyExtractor={(item) => `product-${item.id}`}
        renderItem={renderItem}
        numColumns={numColumns}
        contentContainerStyle={[
          styles.list,
          filteredProducts.length === 0 && styles.emptyList
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
            progressBackgroundColor="#fff"
          />
        }
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={8}
        getItemLayout={(data, index) => ({
          length: cardWidth + 16,
          offset: (cardWidth + 16) * Math.floor(index / 2),
          index,
        })}
      />
      
      <ProductModal 
        visible={showModal} 
        product={selectedProduct}
        quantity={quantity}
        setQuantity={setQuantity}
        size={size}
        setSize={setSize}
        onClose={() => setShowModal(false)}
        onAddToCart={handleAddToCart}
        onOpenSizeGuide={() => setShowSizeGuide(true)}
      />
      
      <SizeGuideModal
        visible={showSizeGuide}
        onClose={() => setShowSizeGuide(false)}
      />
    </View>
  );
}

// Component extractions for better organization
interface ProductCardProps {
  product: Product;
  imageSource: any;
  finalPrice: number;
  stockStatus: { text: string; color: string };
  isInWishlist: boolean;
  onPress: () => void;
  onBuyPress: () => void;
  onWishlistPress: () => void;
}

const ProductCard: React.FC<ProductCardProps> = React.memo(({ 
  product, imageSource, finalPrice, stockStatus, isInWishlist, 
  onPress, onBuyPress, onWishlistPress 
}) => (
  <TouchableOpacity 
    style={[styles.card, { width: cardWidth }]} 
    onPress={onPress}
    activeOpacity={0.9}
  >
    <View style={styles.imageContainer}>
      <Image
        source={imageSource}
        style={styles.image}
        resizeMode="cover"
      />
      {typeof product.promotion === 'number' && product.promotion > 0 && (
        <View style={styles.promotionBadge}>
          <Text style={styles.promotionText}>-{product.promotion}%</Text>
        </View>
      )}
      <TouchableOpacity 
        style={styles.wishlistButton}
        onPress={onWishlistPress}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons 
          name={isInWishlist ? "heart" : "heart-outline"} 
          size={20} 
          color={isInWishlist ? COLORS.error : "#fff"} 
        />
      </TouchableOpacity>
      
      {product.quantite <= 5 && product.quantite > 0 && (
        <View style={styles.limitedStockBadge}>
          <Text style={styles.limitedStockText}>Stock limité</Text>
        </View>
      )}
      
      {product.quantite === 0 && (
        <View style={styles.soldOutOverlay}>
          <Text style={styles.soldOutText}>ÉPUISÉ</Text>
        </View>
      )}
    </View>

    <View style={styles.cardContent}>
      <Text style={styles.category}>{product.categorie?.designation || 'Autre'}</Text>
      <Text style={styles.name} numberOfLines={2}>{product.designation}</Text>

      <View style={styles.priceRow}>
        <Text style={styles.price}>{finalPrice} TND</Text>
        {product.promotion > 0 && (
          <Text style={styles.oldPrice}>{product.prix} TND</Text>
        )}
      </View>

      <View style={styles.attributeRow}>
        <View style={styles.attributeBadge}>
          <Ionicons name="transgender-outline" size={14} color={COLORS.primary} />
          <Text style={styles.attributeText}>{product.sexe || 'Unisexe'}</Text>
        </View>
        
        <View style={[styles.attributeBadge, { backgroundColor: `${stockStatus.color}15` }]}>
          <MaterialCommunityIcons name="warehouse" size={14} color={stockStatus.color} />
          <Text style={[styles.attributeText, { color: stockStatus.color }]}>
            {stockStatus.text}
          </Text>
        </View>
      </View>

      <LinearGradient
        colors={product.quantite === 0 
          ? ['#d1d1d1', '#a1a1a1'] 
          : [COLORS.primary, COLORS.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.buyButton, product.quantite === 0 && styles.disabledButton]}
      >
        <TouchableOpacity 
          style={styles.buyButtonTouchable}
          onPress={(e) => {
            e.stopPropagation();
            onBuyPress();
          }}
          disabled={product.quantite === 0}
        >
          <Text style={styles.buyText}>
            {product.quantite === 0 ? 'Indisponible' : 'Ajouter au panier'}
          </Text>
          {product.quantite > 0 && (
            <Ionicons name="cart-outline" size={16} color="white" />
          )}
        </TouchableOpacity>
      </LinearGradient>
    </View>
  </TouchableOpacity>
));

const HeaderComponent = React.memo(({ 
  headerHeight, headerOpacity, showSearch, searchQuery, wishlistCount, cartCount,
  categories, selectedCategory, onSearchToggle, onSearchChange, onCategorySelect,
  onWishlistPress, onCartPress, searchInputRef
}) => (
  <Animated.View 
    style={[
      styles.headerContainer, 
      { height: headerHeight, opacity: headerOpacity }
    ]}
  >
    <LinearGradient
      colors={[`${COLORS.primary}F2`, `${COLORS.primaryDark}E6`]}
      style={styles.headerGradient}
    >
      <SafeAreaView style={styles.headerSafeArea}>
        <View style={styles.headerTop}>
          <View style={styles.headerTitleContainer}>
            <FontAwesome5 name="tshirt" size={22} color="#fff" style={styles.headerIcon} />
            <Text style={styles.headerTitle}>ChellySport</Text>
          </View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={[styles.headerButton, showSearch && styles.headerButtonActive]}
              onPress={onSearchToggle}
            >
              <Ionicons name="search" size={22} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={onWishlistPress}
            >
              <Ionicons name="heart-outline" size={22} color="#fff" />
              {wishlistCount > 0 && (
                <View style={styles.badgeSmall}>
                  <Text style={styles.badgeTextSmall}>{wishlistCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={onCartPress}
            >
              <Ionicons name="cart-outline" size={22} color="#fff" />
              {cartCount > 0 && (
                <View style={styles.badgeSmall}>
                  <Text style={styles.badgeTextSmall}>{cartCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
        
        {showSearch && (
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={18} color={COLORS.primary} style={styles.searchIcon} />
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                placeholder="Rechercher des produits..."
                placeholderTextColor={COLORS.textLight}
                value={searchQuery}
                onChangeText={onSearchChange}
                returnKeyType="search"
                autoCorrect={false}
                autoCapitalize="none"
              />
              {searchQuery !== '' && (
                <TouchableOpacity onPress={() => onSearchChange('')}>
                  <Ionicons name="close-circle" size={18} color={COLORS.primary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        
      </SafeAreaView>
    </LinearGradient>
  </Animated.View>
));

const LoadingScreen = () => (
  <View style={styles.centerContainer}>
    <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
    <View style={styles.loadingAnimation}>
      <FontAwesome5 name="tshirt" size={50} color={COLORS.primary} />
    </View>
    <Text style={styles.loadingText}>Chargement de la boutique...</Text>
  </View>
);

const ErrorScreen = ({ error, onRetry }) => (
  <View style={styles.centerContainer}>
    <StatusBar barStyle="dark-content" backgroundColor="#fff" />
    <Ionicons name="cloud-offline-outline" size={80} color={COLORS.primary} />
    <Text style={styles.errorTitle}>Oops!</Text>
    <Text style={styles.errorText}>{error}</Text>
    <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
      <Text style={styles.retryText}>Réessayer</Text>
      <Ionicons name="refresh" size={18} color="white" />
    </TouchableOpacity>
  </View>
);

const EmptyState = ({ hasFilters, onReset }) => (
  <View style={styles.emptyContainer}>
    <Ionicons name="basket-outline" size={60} color={COLORS.primary} />
    <Text style={styles.emptyText}>
      {hasFilters 
        ? "Aucun produit ne correspond à votre recherche" 
        : "Aucun produit disponible pour le moment"}
    </Text>
    {hasFilters && (
      <TouchableOpacity style={styles.resetButton} onPress={onReset}>
        <Text style={styles.resetButtonText}>Réinitialiser les filtres</Text>
      </TouchableOpacity>
    )}
  </View>
);

const ScrollableCategoryFilter = React.memo(({ categories, selectedCategory, onSelect }) => (
  <View style={styles.categoryContainer}>
    <FlatList
      data={categories}
      keyExtractor={(item) => `category-${item}`}
      horizontal
      showsHorizontalScrollIndicator={false}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[
            styles.categoryButton,
            selectedCategory === item && styles.categoryButtonActive
          ]}
          onPress={() => onSelect(item)}
        >
          <Text
            style={[
              styles.categoryText,
              selectedCategory === item && styles.categoryTextActive
            ]}
          >
            {item}
          </Text>
        </TouchableOpacity>
      )}
      contentContainerStyle={styles.categoryList}
    />
  </View>
));

const ProductModal = ({ 
  visible, product, quantity, setQuantity, size, setSize, 
  onClose, onAddToCart, onOpenSizeGuide 
}) => {
  if (!product) return null;
  
  const imageSource = getImageSource(product.imageBase64);
  const finalPrice = calculateFinalPrice(product.prix, product.promotion);
  const totalPrice = finalPrice * quantity;
  
  const incrementQuantity = () => {
    if (quantity < product.quantite) {
      setQuantity(prev => prev + 1);
    }
  };
  
  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };
  
  return (
    <Modal visible={visible} transparent={true} animationType="slide">
      <BlurView intensity={50} style={styles.modalOverlay} tint="dark">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Ajouter au panier</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <View style={styles.modalProductInfo}>
              <Image source={imageSource} style={styles.modalImage} />
              <View style={styles.modalProductDetails}>
                <Text style={styles.modalProductName}>{product.designation}</Text>
                <View style={styles.modalPriceContainer}>
                  <Text style={styles.modalPrice}>{finalPrice} TND</Text>
                  {product.promotion > 0 && (
                    <Text style={styles.modalOldPrice}>{product.prix} TND</Text>
                  )}
                </View>
                <Text style={styles.modalProductCategory}>
                  {product.categorie?.designation || 'Autre'} • {product.sexe || 'Unisexe'}
                </Text>
              </View>
            </View>
            
            <View style={styles.separator} />
            
            <View style={styles.modalSizeContainer}>
              <View style={styles.modalSectionHeader}>
                <Text style={styles.modalSectionTitle}>Taille</Text>
                <TouchableOpacity onPress={onOpenSizeGuide}>
                  <Text style={styles.sizeGuideText}>Guide des tailles</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.sizeButtons}>
                {SIZES.map(sizeOption => (
                  <TouchableOpacity
                    key={sizeOption}
                    style={[
                      styles.sizeButton,
                      size === sizeOption && styles.sizeButtonActive
                    ]}
                    onPress={() => setSize(sizeOption)}
                  >
                    <Text 
                      style={[
                        styles.sizeButtonText,
                        size === sizeOption && styles.sizeButtonTextActive
                      ]}
                    >
                      {sizeOption}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.modalQuantityContainer}>
              <Text style={styles.modalSectionTitle}>Quantité</Text>
              <View style={styles.quantitySelector}>
                <TouchableOpacity 
                  style={[
                    styles.quantityButton,
                    quantity <= 1 && styles.quantityButtonDisabled
                  ]} 
                  onPress={decrementQuantity}
                  disabled={quantity <= 1}
                >
                  <Ionicons 
                    name="remove" 
                    size={20} 
                    color={quantity <= 1 ? "#ccc" : COLORS.primary} 
                  />
                </TouchableOpacity>
                
                <Text style={styles.quantityText}>{quantity}</Text>
                

                <TouchableOpacity 
                  style={[
                    styles.quantityButton,
                    quantity >= product.quantite && styles.quantityButtonDisabled
                  ]} 
                  onPress={incrementQuantity}
                  disabled={quantity >= product.quantite}
                >
                  <Ionicons 
                    name="add" 
                    size={20} 
                    color={quantity >= product.quantite ? "#ccc" : COLORS.primary} 
                  />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.stockInfo}>
                Stock disponible: {product.quantite}
              </Text>
            </View>
            
            <View style={styles.separator} />
            
            <View style={styles.modalTotalContainer}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total:</Text>
                <Text style={styles.totalPrice}>{totalPrice} TND</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={styles.addToCartButton}
            >
              <TouchableOpacity 
                style={styles.addToCartButtonTouchable}
                onPress={onAddToCart}
              >
                <Text style={styles.addToCartButtonText}>
                  Ajouter {totalPrice} TND
                </Text>
                <Ionicons name="cart" size={18} color="white" />
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
};

const SizeGuideModal = ({ visible, onClose }) => (
  <Modal visible={visible} transparent={true} animationType="slide">
    <BlurView intensity={50} style={styles.modalOverlay} tint="dark">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Guide des tailles</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.sizeGuideContent}>
          <Text style={styles.sizeGuideDescription}>
            Toutes les mesures sont en centimètres (cm)
          </Text>
          
          <View style={styles.sizeGuideTable}>
            <View style={styles.sizeGuideHeader}>
              <Text style={styles.sizeGuideHeaderText}>Taille</Text>
              <Text style={styles.sizeGuideHeaderText}>Poitrine</Text>
              <Text style={styles.sizeGuideHeaderText}>Taille</Text>
              <Text style={styles.sizeGuideHeaderText}>Hanches</Text>
            </View>
            
            {SIZE_GUIDE_DATA.map((item, index) => (
              <View 
                key={item.size} 
                style={[
                  styles.sizeGuideRow,
                  index % 2 === 0 && styles.sizeGuideRowEven
                ]}
              >
                <Text style={styles.sizeGuideCell}>{item.size}</Text>
                <Text style={styles.sizeGuideCell}>{item.chest}</Text>
                <Text style={styles.sizeGuideCell}>{item.waist}</Text>
                <Text style={styles.sizeGuideCell}>{item.hips}</Text>
              </View>
            ))}
          </View>
          
          <View style={styles.sizeGuideNote}>
            <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
            <Text style={styles.sizeGuideNoteText}>
              Ces mesures sont indicatives. En cas de doute, nous recommandons de choisir la taille supérieure.
            </Text>
          </View>
        </View>
      </View>
    </BlurView>
  </Modal>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  
  // Header Styles
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  headerGradient: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight,
    paddingHorizontal: 16,
  },
  headerSafeArea: {
    flex: 1,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    marginLeft: 16,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
  },
  headerButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  badgeSmall: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeTextSmall: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  // Search Styles
  searchContainer: {
    paddingVertical: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    height: '100%',
  },
  
  // Category Styles
  categoryContainer: {
    paddingVertical: 8,
  },
  categoryList: {
    paddingRight: 16,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  categoryButtonActive: {
    backgroundColor: '#fff',
  },
  categoryText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
  },
  categoryTextActive: {
    color: COLORS.primary,
  },
  
  // List Styles
  list: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 120 : 104,
    paddingBottom: 20,
  },
  emptyList: {
    flexGrow: 1,
  },
  
  // Card Styles
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    marginBottom: 16,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    height: 180,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  promotionBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: COLORS.error,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  promotionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  wishlistButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    padding: 8,
  },
  limitedStockBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: COLORS.warning,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  limitedStockText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  soldOutOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  soldOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardContent: {
    padding: 12,
  },
  category: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    lineHeight: 20,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginRight: 8,
  },
  oldPrice: {
    fontSize: 14,
    color: COLORS.textLight,
    textDecorationLine: 'line-through',
  },
  attributeRow: {
    flexDirection: 'row',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  attributeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.primary}15`,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 4,
  },
  attributeText: {
    fontSize: 12,
    color: COLORS.primary,
    marginLeft: 4,
    fontWeight: '500',
  },
  buyButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  buyButtonTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  buyText: {
    color: '#fff',
    fontWeight: '600',
    marginRight: 8,
    fontSize: 14,
  },
  disabledButton: {
    opacity: 0.6,
  },
  
  // Loading & Error Styles
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 32,
  },
  loadingAnimation: {
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
    marginRight: 8,
  },
  
  // Empty State Styles
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
    lineHeight: 22,
  },
  resetButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  resetButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  
  // Footer Styles
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  footerText: {
    marginLeft: 8,
    color: COLORS.textSecondary,
  },
  footerSpacer: {
    height: 20,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.85,
    paddingBottom: Platform.OS === 'ios' ? 34 : 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalProductInfo: {
    flexDirection: 'row',
    paddingVertical: 16,
  },
  modalImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 16,
  },
  modalProductDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  modalProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  modalPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginRight: 8,
  },
  modalOldPrice: {
    fontSize: 14,
    color: COLORS.textLight,
    textDecorationLine: 'line-through',
  },
  modalProductCategory: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },
  modalSizeContainer: {
    marginBottom: 20,
  },
  modalSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  sizeGuideText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  sizeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sizeButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    minWidth: 50,
    alignItems: 'center',
  },
  sizeButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}10`,
  },
  sizeButtonText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  sizeButtonTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  modalQuantityContainer: {
    marginBottom: 20,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  quantityButton: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonDisabled: {
    borderColor: '#ccc',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 20,
    minWidth: 30,
    textAlign: 'center',
  },
  stockInfo: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  modalTotalContainer: {
    paddingVertical: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginRight: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  addToCartButton: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  addToCartButtonTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  addToCartButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  
  // Size Guide Modal Styles
  sizeGuideContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sizeGuideDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  sizeGuideTable: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 20,
  },
  sizeGuideHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.secondary,
    paddingVertical: 12,
  },
  sizeGuideHeaderText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    color: COLORS.text,
  },
  sizeGuideRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sizeGuideRowEven: {
    backgroundColor: '#f9f9f9',
  },
  sizeGuideCell: {
    flex: 1,
    fontSize: 14,
    textAlign: 'center',
    color: COLORS.text,
  },
  sizeGuideNote: {
    flexDirection: 'row',
    backgroundColor: `${COLORS.primary}10`,
    padding: 16,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  sizeGuideNoteText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    marginLeft: 12,
    lineHeight: 20,
  },
});


