import React, { useEffect, useState, useCallback } from 'react';
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
  Animated
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { getAllProducts } from '@/services/products';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useCart } from '../../contexts/CartContext';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const numColumns = 2;
const cardWidth = (width - 48) / numColumns;

export default function BoutiqueScreen() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const router = useRouter();
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

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [size, setSize] = useState('M');
  const [showModal, setShowModal] = useState(false);
  const { addToCart, cartItems } = useCart();

  // Nouvelles fonctionnalités
  const [categories, setCategories] = useState(['Tous']);
  const [wishlist, setWishlist] = useState([]);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [scrollY] = useState(new Animated.Value(0));
  
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [Platform.OS === 'ios' ? 100 : 84, Platform.OS === 'ios' ? 70 : 60],
    extrapolate: 'clamp',
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [1, 0.9],
    extrapolate: 'clamp',
  });

  const fetchProducts = async () => {
    try {
      setError(null);
      const result = await getAllProducts();
      setProducts(result);
      
      // Extraire et définir les catégories uniques
      const uniqueCategories = [...new Set(result.map(item => 
        item.categorie?.designation || 'Autre').filter(Boolean))];
      setCategories(['Tous', ...uniqueCategories]);
      
      // Animation pour l'apparition des produits
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true
      }).start();
      
    } catch (err) {
      setError('Impossible de charger les produits. Veuillez réessayer plus tard.');
      Alert.alert('Erreur', 'Impossible de charger les produits. Veuillez réessayer plus tard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts();
  }, []);

  const handleBuyPress = useCallback((item) => {
    setSelectedProduct(item);
    setQuantity(1);
    setSize('M');
    setShowModal(true);
  }, []);

  const navigateToProduct = useCallback((item) => {
    router.push(`/product/${item.id}`);
  }, [router]);

  const toggleWishlist = useCallback((productId) => {
    setWishlist(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
  }, []);

  const filteredProducts = products
    .filter(product => {
      const matchesCategory = selectedCategory === 'Tous' || 
        product.categorie?.designation === selectedCategory;
      
      const matchesSearch = searchQuery === '' || 
        product.designation.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      // Mettre les produits en promotion en premier
      if (a.promotion && !b.promotion) return -1;
      if (!a.promotion && b.promotion) return 1;
      return 0;
    });

  const renderItem = useCallback(({ item, index }) => {
    const isInWishlist = wishlist.includes(item.id);
    const imageSource = item.imageBase64?.startsWith('data:')
      ? { uri: item.imageBase64 }
      : { uri: `data:image/jpeg;base64,${item.imageBase64}` };
    
    const animatedStyle = {
      opacity: fadeAnim,
      transform: [{ 
        translateY: fadeAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [50, 0]
        })
      }]
    };

    // Calculer le prix après promotion si applicable
    const finalPrice = item.promotion 
      ? Math.round(item.prix * (1 - item.promotion/100)) 
      : item.prix;

    return (
      <Animated.View 
        style={[
          animatedStyle, 
          { 
            transform: [
              ...animatedStyle.transform,
              { 
                translateY: Animated.multiply(
                  new Animated.Value(1),
                  new Animated.Value(index * 10)
                )
              }
            ]
          }
        ]}
      >
        <TouchableOpacity 
          style={[styles.card, { width: cardWidth }]} 
          onPress={() => navigateToProduct(item)}
          activeOpacity={0.9}
        >
          <View style={styles.imageContainer}>
            <Image
              source={imageSource}
              style={styles.image}
              resizeMode="cover"
            />
            {item.promotion > 0 && (
              <View style={styles.promotionBadge}>
                <Text style={styles.promotionText}>-{item.promotion}%</Text>
              </View>
            )}
            <TouchableOpacity 
              style={styles.wishlistButton}
              onPress={() => toggleWishlist(item.id)}
            >
              <Ionicons 
                name={isInWishlist ? "heart" : "heart-outline"} 
                size={20} 
                color={isInWishlist ? "#FF3B30" : "#fff"} 
              />
            </TouchableOpacity>
            
            {item.quantite <= 5 && item.quantite > 0 && (
              <View style={styles.limitedStockBadge}>
                <Text style={styles.limitedStockText}>Stock limité</Text>
              </View>
            )}
            
            {item.quantite === 0 && (
              <View style={styles.soldOutOverlay}>
                <Text style={styles.soldOutText}>ÉPUISÉ</Text>
              </View>
            )}
          </View>

          <View style={styles.cardContent}>
            <Text style={styles.category}>{item.categorie?.designation || 'Autre'}</Text>
            <Text style={styles.name} numberOfLines={2}>{item.designation}</Text>

            <View style={styles.priceRow}>
              <Text style={styles.price}>{finalPrice} TND</Text>
              {item.promotion > 0 && (
                <Text style={styles.oldPrice}>{item.prix} TND</Text>
              )}
            </View>

            <View style={styles.attributeRow}>
              <View style={styles.attributeBadge}>
                <Ionicons name="transgender-outline" size={14} color="#8B5CF6" />
                <Text style={styles.attributeText}>{item.sexe || 'Unisexe'}</Text>
              </View>
              
              <View style={styles.attributeBadge}>
                <MaterialCommunityIcons name="warehouse" size={14} color="#8B5CF6" />
                <Text style={styles.attributeText}>
                  {item.quantite > 10 
                    ? 'En stock' 
                    : item.quantite > 0 
                      ? `${item.quantite} restants` 
                      : 'Épuisé'}
                </Text>
              </View>
            </View>

            <LinearGradient
              colors={item.quantite === 0 
                ? ['#d1d1d1', '#a1a1a1'] 
                : ['#8B5CF6', '#6D42D9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.buyButton, 
                item.quantite === 0 && styles.disabledButton
              ]}
            >
              <TouchableOpacity 
                style={styles.buyButtonTouchable}
                onPress={(e) => {
                  e.stopPropagation();
                  if (item.quantite > 0) {
                    handleBuyPress(item);
                  }
                }}
                disabled={item.quantite === 0}
              >
                <Text style={styles.buyText}>
                  {item.quantite === 0 ? 'Indisponible' : 'Ajouter au panier'}
                </Text>
                {item.quantite > 0 && (
                  <Ionicons name="cart-outline" size={16} color="white" />
                )}
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [wishlist, fadeAnim, navigateToProduct, handleBuyPress]);

  const renderHeader = () => (
    <Animated.View 
      style={[
        styles.headerContainer, 
        { 
          height: headerHeight,
          opacity: headerOpacity
        }
      ]}
    >
      <LinearGradient
        colors={['rgba(139,92,246,0.95)', 'rgba(76,29,149,0.9)']}
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
                style={styles.headerButton}
                onPress={() => setShowSearch(!showSearch)}
              >
                <Ionicons name="search" size={22} color="#fff" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.headerButton}
                onPress={() => router.push('/wishlist')}
              >
                <Ionicons name="heart-outline" size={22} color="#fff" />
                {wishlist.length > 0 && (
                  <View style={styles.badgeSmall}>
                    <Text style={styles.badgeTextSmall}>{wishlist.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.headerButton}
                onPress={() => router.push('/cart')}
              >
                <Ionicons name="cart-outline" size={22} color="#fff" />
                {cartItems?.length > 0 && (
                  <View style={styles.badgeSmall}>
                    <Text style={styles.badgeTextSmall}>{cartItems.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
          
          {showSearch && (
            <View style={styles.searchContainer}>
              <View style={styles.searchBar}>
                <Ionicons name="search-outline" size={18} color="#8B5CF6" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Rechercher des produits..."
                  placeholderTextColor="#999"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery !== '' && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color="#8B5CF6" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
          
          <ScrollableCategoryFilter 
            categories={categories}
            selectedCategory={selectedCategory}
            onSelect={setSelectedCategory}
          />
        </SafeAreaView>
      </LinearGradient>
    </Animated.View>
  );

  const renderFooter = () => {
    if (loading) return <ActivityIndicator size="small" color="#8B5CF6" style={{ marginVertical: 20 }} />;
    return null;
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="basket-outline" size={60} color="#8B5CF6" />
      <Text style={styles.emptyText}>
        {searchQuery || selectedCategory !== 'Tous' 
          ? "Aucun produit ne correspond à votre recherche" 
          : "Aucun produit disponible pour le moment"}
      </Text>
      {(searchQuery || selectedCategory !== 'Tous') && (
        <TouchableOpacity 
          style={styles.resetButton}
          onPress={() => {
            setSearchQuery('');
            setSelectedCategory('Tous');
          }}
        >
          <Text style={styles.resetButtonText}>Réinitialiser les filtres</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#8B5CF6" />
        <View style={styles.loadingAnimation}>
          <Animated.View style={[styles.pulse, {
            opacity: fadeAnim,
            transform: [{scale: fadeAnim.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [1, 1.2, 1]
            })}]
          }]}>
            <FontAwesome5 name="tshirt" size={50} color="#8B5CF6" />
          </Animated.View>
        </View>
        <Text style={styles.loadingText}>Chargement de la boutique...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <Ionicons name="cloud-offline-outline" size={80} color="#8B5CF6" />
        <Text style={styles.errorTitle}>Oops!</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchProducts}>
          <Text style={styles.retryText}>Réessayer</Text>
          <Ionicons name="refresh" size={18} color="white" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#8B5CF6" />
      
      {renderHeader()}
      
      <Animated.FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id.toString()}
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
            colors={['#8B5CF6']}
            tintColor="#8B5CF6"
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
      />
      
      <ProductModal 
        visible={showModal} 
        product={selectedProduct}
        quantity={quantity}
        setQuantity={setQuantity}
        size={size}
        setSize={setSize}
        onClose={() => setShowModal(false)}
        onAddToCart={() => {
          if (selectedProduct) {
            addToCart({
              id: selectedProduct.id,
              designation: selectedProduct.designation,
              prix: selectedProduct.prix,
              quantity,
              size,
              image: selectedProduct.imageBase64,
            });
          }
          setShowModal(false);
          Alert.alert(
            "Ajouté au panier", 
            `${quantity} × "${selectedProduct?.designation}" (taille ${size}) a été ajouté à votre panier.`,
            [
              { 
                text: "Voir le panier", 
                onPress: () => router.push('/cart'),
                style: "default"
              },
              { 
                text: "Continuer les achats", 
                style: "cancel" 
              }
            ]
          );
        }}
        onOpenSizeGuide={() => setShowSizeGuide(true)}
      />
      
      <SizeGuideModal
        visible={showSizeGuide}
        onClose={() => setShowSizeGuide(false)}
      />
    </View>
  );
}

const ScrollableCategoryFilter = ({ categories, selectedCategory, onSelect }) => {
  return (
    <View style={styles.categoryContainer}>
      <FlatList
        data={categories}
        keyExtractor={(item) => item}
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
  );
};

const ProductModal = ({ 
  visible, product, quantity, setQuantity, size, setSize, 
  onClose, onAddToCart, onOpenSizeGuide 
}) => {
  if (!product) return null;
  
  const imageSource = product.imageBase64?.startsWith('data:')
    ? { uri: product.imageBase64 }
    : { uri: `data:image/jpeg;base64,${product.imageBase64}` };
  
  // Calculer le prix après promotion si applicable
  const finalPrice = product.promotion 
    ? Math.round(product.prix * (1 - product.promotion/100)) 
    : product.prix;
  
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
              <Ionicons name="close" size={24} color="#333" />
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
                {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(sizeOption => (
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
                    color={quantity <= 1 ? "#ccc" : "#8B5CF6"} 
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
                    color={quantity >= product.quantite ? "#ccc" : "#8B5CF6"} 
                  />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.stockInfo}>
                {product.quantite} disponibles
              </Text>
            </View>
          </View>
          
          <View style={styles.modalFooter}>
            <View style={styles.totalPriceContainer}>
              <Text style={styles.totalPriceLabel}>Total:</Text>
              <Text style={styles.totalPriceValue}>{totalPrice} TND</Text>
            </View>
            
            <LinearGradient
              colors={['#8B5CF6', '#6D42D9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.addToCartButton}
            >
              <TouchableOpacity 
                style={styles.addToCartButtonTouchable}
                onPress={onAddToCart}
              >
                <Text style={styles.addToCartButtonText}>
                  Ajouter au panier
                </Text>
                <Ionicons name="cart-outline" size={18} color="white" />
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
};

const SizeGuideModal = ({ visible, onClose }) => {
  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <BlurView intensity={50} style={styles.modalOverlay} tint="dark">
        <View style={styles.sizeGuideContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Guide des tailles</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.sizeGuideContent}>
            <Text style={styles.sizeGuideIntro}>
              Trouvez votre taille parfaite avec notre guide de mesures. Les mesures sont indiquées en centimètres.
            </Text>
            
            <View style={styles.sizeTable}>
              <View style={styles.sizeTableHeader}>
                <Text style={[styles.sizeTableHeaderCell, { flex: 1.5 }]}>Taille</Text>
                <Text style={styles.sizeTableHeaderCell}>Poitrine</Text>
                <Text style={styles.sizeTableHeaderCell}>Taille</Text>
                <Text style={styles.sizeTableHeaderCell}>Hanches</Text>
              </View>
              
              {[
                { size: 'XS', chest: '84-86', waist: '68-70', hips: '90-92' },
                { size: 'S', chest: '88-90', waist: '72-74', hips: '94-96' },
                { size: 'M', chest: '92-94', waist: '76-78', hips: '98-100' },
                { size: 'L', chest: '96-98', waist: '80-82', hips: '102-104' },
                { size: 'XL', chest: '100-102', waist: '84-86', hips: '106-108' },
                { size: 'XXL', chest: '104-106', waist: '88-90', hips: '110-112' }
              ].map((row, index) => (
                <View key={row.size} style={[
                  styles.sizeTableRow,
                  index % 2 === 0 && styles.sizeTableRowEven
                ]}>
                  <Text style={[styles.sizeTableCell, { flex: 1.5, fontWeight: '600' }]}>{row.size}</Text>
                  <Text style={styles.sizeTableCell}>{row.chest}</Text>
                  <Text style={styles.sizeTableCell}>{row.waist}</Text>
                  <Text style={styles.sizeTableCell}>{row.hips}</Text>
                </View>
              ))}
            </View>
            
            <Text style={styles.sizeGuideHint}>
              Astuce : Si vous êtes entre deux tailles, prenez la taille supérieure pour un ajustement plus confortable.
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.sizeGuideCloseButton}
            onPress={onClose}
          >
            <Text style={styles.sizeGuideCloseText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f8fc'
  },
  headerContainer: {
    width: '100%',
    zIndex: 10,
  },
  headerGradient: {
    flex: 1,
  },
  headerSafeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
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
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    position: 'relative',
  },
  badgeSmall: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  badgeTextSmall: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#333',
    fontSize: 14,
  },
  categoryContainer: {
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  categoryList: {
    paddingHorizontal: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 4,
  },
  categoryButtonActive: {
    backgroundColor: 'white',
  },
  categoryText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#8B5CF6',
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  promotionBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  promotionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  wishlistButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  limitedStockBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(255, 193, 7, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  limitedStockText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  soldOutOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  soldOutText: {
    color: '#FF3B30',
    fontSize: 20,
    fontWeight: 'bold',
    transform: [{ rotate: '-15deg' }],
  },
  cardContent: {
    padding: 12,
  },
  category: {
    color: '#8B5CF6',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  name: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    height: 36,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  price: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  oldPrice: {
    color: '#999',
    fontSize: 12,
    textDecorationLine: 'line-through',
  },
  attributeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  attributeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F0FF',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  attributeText: {
    color: '#8B5CF6',
    fontSize: 10,
    marginLeft: 4,
  },
  buyButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  buyButtonTouchable: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  buyText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 6,
  },
  disabledButton: {
    opacity: 0.7,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingAnimation: {
    marginBottom: 24,
  },
  pulse: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8B5CF6',
    marginTop: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B5CF6',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
  },
  resetButton: {
    marginTop: 16,
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  resetButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    width: width * 0.9,
    maxHeight: height * 0.8,
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    padding: 16,
  },
  modalProductInfo: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  modalImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
  },
  modalProductDetails: {
    flex: 1,
  },
  modalProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  modalPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B5CF6',
    marginRight: 8,
  },
  modalOldPrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  modalProductCategory: {
    fontSize: 12,
    color: '#666',
  },
  separator: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 16,
  },
  modalSizeContainer: {
    marginBottom: 16,
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
    color: '#333',
  },
  sizeGuideText: {
    fontSize: 12,
    color: '#8B5CF6',
    textDecorationLine: 'underline',
  },
  sizeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  sizeButton: {
    width: (width * 0.9 - 64) / 3,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    margin: 4,
  },
  sizeButtonActive: {
    borderColor: '#8B5CF6',
    backgroundColor: '#F3F0FF',
  },
  sizeButtonText: {
    fontSize: 14,
    color: '#666',
  },
  sizeButtonTextActive: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
  modalQuantityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  quantityButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonDisabled: {
    opacity: 0.5,
  },
  quantityText: {
    width: 40,
    textAlign: 'center',
    fontSize: 16,
    color: '#333',
  },
  stockInfo: {
    fontSize: 12,
    color: '#666',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalPriceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  totalPriceLabel: {
    fontSize: 16,
    color: '#666',
  },
  totalPriceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B5CF6',
  },
  addToCartButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  addToCartButtonTouchable: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  addToCartButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  sizeGuideContainer: {
    width: width * 0.9,
    maxHeight: height * 0.8,
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
  },
  sizeGuideContent: {
    padding: 16,
  },
  sizeGuideIntro: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  sizeTable: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  sizeTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',
    paddingVertical: 10,
  },
  sizeTableHeaderCell: {
    flex: 1,
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#333',
    fontSize: 12,
  },
  sizeTableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
  },
  sizeTableRowEven: {
    backgroundColor: '#fafafa',
  },
  sizeTableCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    color: '#666',
  },
  sizeGuideHint: {
    fontSize: 12,
    color: '#8B5CF6',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  sizeGuideCloseButton: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'center',
  },
  sizeGuideCloseText: {
    color: '#8B5CF6',
    fontSize: 16,
    fontWeight: '600',
  },
});