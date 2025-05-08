import React, { useLayoutEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ImageBackground } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { MotiImage, MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
export default function ParentLoginScreen() {
  const router = useRouter();
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      tabBarStyle: { display: 'none' },
    });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      
      <ImageBackground
        source={require('../assets/images/background-pattern.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Bouton retour */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityLabel="Retour à l'écran précédent"
        >
          <Ionicons name="arrow-back-circle" size={36} color="#6D28D9" />
        </TouchableOpacity>

        {/* Logo */}
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'timing', duration: 800 }}
          style={styles.logoContainer}
        >
          <Text style={styles.logoText}>ChellySport</Text>
        </MotiView>

        {/* Illustration animée */}
        <MotiImage
          source={require('../assets/images/chellysport-parent.png')}
          style={styles.image}
          from={{ opacity: 0, translateY: -50 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 1000 }}
          resizeMode="contain"
        />

        {/* Titre avec animation */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 1000, delay: 300 }}
        >
          <Text style={styles.title}>Bienvenue sur ChellySport 👋</Text>
        </MotiView>

        {/* Paragraphe motivant */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 1000, delay: 500 }}
        >
          <Text style={styles.paragraph}>
            En tant que parent, vous pouvez suivre les performances de vos enfants, gérer les inscriptions aux activités sportives, et rester informé de toutes les nouveautés du club.
          </Text>
        </MotiView>

        {/* Avantages */}
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: 1000, delay: 700 }}
          style={styles.advantagesContainer}
        >
          <View style={styles.advantageItem}>
            <Ionicons name="calendar-outline" size={24} color="#6D28D9" />
            <Text style={styles.advantageText}>Gérez facilement les inscriptions</Text>
          </View>
          <View style={styles.advantageItem}>
            <Ionicons name="stats-chart-outline" size={24} color="#6D28D9" />
            <Text style={styles.advantageText}>Suivez les progrès sportifs</Text>
          </View>
          <View style={[styles.advantageItem, styles.advantageItemLast]}>
            <Ionicons name="notifications-outline" size={24} color="#6D28D9" />
            <Text style={styles.advantageText}>Recevez des alertes importantes</Text>
          </View>
        </MotiView>

        {/* Conteneur des boutons */}
        <View style={styles.buttonsGroup}>
          {/* Bouton "Se connecter" */}
          <MotiView
            style={styles.buttonContainer}
            from={{ opacity: 0, translateY: 50 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 1000, delay: 900 }}
          >
            <TouchableOpacity
              style={styles.button}
              onPress={() => router.push('/auth/login')}
              accessibilityLabel="Se connecter à votre compte"
            >
              <Ionicons name="shield-checkmark-outline" size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Se connecter</Text>
            </TouchableOpacity>
          </MotiView>
          
          {/* Bouton "Découvrir sans compte" */}
          <MotiView
            from={{ opacity: 0, translateY: 50 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 1000, delay: 1000 }}
          >
            <TouchableOpacity
              onPress={() => router.push('/auth/explore')}
              style={styles.textButton}
              accessibilityLabel="Découvrir l'application sans compte"
            >
              <Text style={styles.textButtonText}>
                <Ionicons name="search-outline" size={16} color="#6D28D9" /> Découvrir sans compte
              </Text>
            </TouchableOpacity>
          </MotiView>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2025 ChellySport</Text>
          <TouchableOpacity onPress={() => console.log('Besoin d\'aide')}>
            <Text style={styles.footerLink}>Besoin d'aide ?</Text>
          </TouchableOpacity>
        </View>
        
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF2FF', // Fond légèrement plus clair
  },
  backgroundImage: {
    flex: 1,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'space-between', // ✅ Ajoute cette ligne
  },
  
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    padding: 5,
    zIndex: 10,
  },
  logoContainer: {
    marginTop: 10,
    marginBottom: 5,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#6D28D9', // Violet plus vibrant
    textAlign: 'center',
  },
  image: {
    width: 200,
    height: 160,
    marginBottom: 10,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 15,
    color: '#374151',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
    marginBottom: 15,
  },
  advantagesContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 6,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  advantageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  advantageItemLast: {
    borderBottomWidth: 0,
  },
  advantageText: {
    marginLeft: 12,
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  buttonsGroup: {
    width: '100%',
    marginTop: 5,
    marginBottom: 5,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 5,
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6D28D9', // Violet plus vibrant
    paddingVertical: 14,
    borderRadius: 14,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  textButton: {
    paddingVertical: 12,
    alignItems: 'center',
    width: '100%',
  },
  textButtonText: {
    fontSize: 15,
    color: '#6D28D9', // Violet plus vibrant
    textAlign: 'center',
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  footer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#D1D5DB',
    paddingTop: 12,
  },
  footerText: {
    fontSize: 12,
    color: '#6B7280',
  },
  footerLink: {
    fontSize: 12,
    color: '#6D28D9', // Violet plus vibrant
    fontWeight: '500',
  },
});