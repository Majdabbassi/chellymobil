import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { height } = Dimensions.get('window');

interface CustomDrawerProps {
  user: {
    nom: string;
    prenom: string;
    email: string;
  };
  [key: string]: any;
}

const MenuItem = ({ icon, text, onPress, isLogout = false }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.9)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
        tension: 150,
        friction: 8,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 150,
        friction: 8,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.9,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.View
        style={[
          styles.menuItem,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <View style={[styles.iconContainer, isLogout && styles.logoutIconContainer]}>
          <Ionicons 
            name={icon} 
            size={22} 
            color={isLogout ? "#FF6B6B" : "#8B5CF6"} 
          />
        </View>
        <Text style={[styles.menuText, isLogout && styles.logoutText]}>
          {text}
        </Text>
        <View style={styles.chevron}>
          <Ionicons name="chevron-forward" size={16} color="rgba(139, 92, 246, 0.4)" />
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function CustomDrawerContent({ user, ...props }: CustomDrawerProps) {
  const slideAnim = useRef(new Animated.Value(-50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const menuItems = [
    { icon: "home-outline", text: "Dashboard", action: () => props.navigation.navigate('ParentDashboardScreen') },
    { icon: "calendar-outline", text: "Calendrier", action: () => props.navigation.navigate('calendar') },
    { icon: "barbell-outline", text: "Activités", action: () => props.navigation.navigate('activities') },
    { icon: "trophy-outline", text: "Compétitions", action: () => props.navigation.navigate('competition') },
    { icon: "card-outline", text: "Paiements", action: () => props.navigation.navigate('PaymentSelectionScreen') },
    { icon: "chatbubbles-outline", text: "Messages", action: () => props.navigation.navigate('messagess') },
    { icon: "notifications-outline", text: "Notifications", action: () => router.push('/NotificationsScreen') },
    { icon: "settings-outline", text: "Paramètres", action: () => props.navigation.navigate('ParametresScreen') },
    { icon: "people-outline", text: "Mes enfants", action: () => props.navigation.navigate('ChildrenListScreen') },
  ];

  return (
    <DrawerContentScrollView 
      {...props} 
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={['rgba(139, 92, 246, 0.1)', 'rgba(168, 85, 247, 0.05)', 'transparent']}
        style={styles.gradientOverlay}
      />
      
      <Animated.View 
        style={[
          styles.header,
          {
            transform: [{ translateY: slideAnim }],
            opacity: fadeAnim,
          },
        ]}
      >
        <View style={styles.avatarContainer}>
          <LinearGradient
            colors={['#8B5CF6', '#A855F7', '#C084FC']}
            style={styles.avatarGradient}
          >
            <Text style={styles.avatarText}>
              {user.prenom.charAt(0)}{user.nom.charAt(0)}
            </Text>
          </LinearGradient>
          <View style={styles.onlineIndicator} />
        </View>
        
        <View style={styles.userInfo}>
          <Text style={styles.username}>{user.prenom} {user.nom}</Text>
          <Text style={styles.email}>{user.email}</Text>
        </View>
      </Animated.View>

      <View style={styles.divider} />

      <Animated.View 
        style={[
          styles.menuContainer,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        {menuItems.map((item, index) => (
          <Animated.View
            key={index}
            style={{
              transform: [{
                translateX: slideAnim.interpolate({
                  inputRange: [-50, 0],
                  outputRange: [-30, 0],
                })
              }],
              opacity: fadeAnim,
            }}
          >
            <MenuItem
              icon={item.icon}
              text={item.text}
              onPress={item.action}
            />
          </Animated.View>
        ))}

        <View style={styles.logoutSection}>
          <MenuItem
            icon="log-out-outline"
            text="Se déconnecter"
            onPress={() => {
              props.navigation.reset({ index: 0, routes: [{ name: 'login' }] });
            }}
            isLogout={true}
          />
        </View>
      </Animated.View>

    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    paddingTop: 60,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 25,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  userInfo: {
    alignItems: 'center',
  },
  username: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  email: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  menuContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginVertical: 2,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#8B5CF6',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: 'rgba(139, 92, 246, 0.3)',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutIconContainer: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  menuText: {
    marginLeft: 16,
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
    flex: 1,
    letterSpacing: 0.3,
  },
  logoutText: {
    color: '#FF6B6B',
  },
  chevron: {
    opacity: 0.6,
  },
  logoutSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 92, 246, 0.1)',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
});