import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ImageBackground, Alert } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import API from '@/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginFormScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();
  const handleLogin = async () => {
    try {
      // 🔄 Vider le stockage uniquement s’il y a des clés
      const keys = await AsyncStorage.getAllKeys();
      if (keys.length > 0) {
        await AsyncStorage.clear();
        console.log('✅ AsyncStorage vidé avec succès');
      }
  
      // 🔐 Connexion API
      const response = await API.post('/auth/login', {
        email,
        motDePasse: password,
      });
      console.log('LOGIN RESPONSE', response.data); // Ajoute ceci
  
      const { token, role, id } = response.data;
  
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('role', role);
      await AsyncStorage.setItem('userId', id.toString());
  
      if (role === 'PARENT') {
        const parentResponse = await API.get(`/parents/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        interface ParentData {
          id: number;
          nom: string;
          prenom: string;
          email: string;
          telephone: string;
        }

        const { id: parentId, nom, prenom, email, telephone } = parentResponse.data as ParentData;

        const minimalParentData = { id: parentId, nom, prenom, email, telephone };

        await AsyncStorage.setItem('parent', JSON.stringify(minimalParentData));
      }
  
      router.replace('/(tabs)/ParentDashboardScreen');
  
    } catch (error: any) {
      console.error('❌ Erreur login:', error.response?.data || error.message);
      Alert.alert('Erreur de connexion', error.response?.data?.message || 'Impossible de se connecter.');
    }
  };
  
  
  
  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={require('../assets/images/background-pattern.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityLabel="Retour à l'écran précédent"
        >
          <Ionicons name="arrow-back-circle" size={36} color="#6D28D9" />
        </TouchableOpacity>

        <MotiView
          from={{ opacity: 0, translateY: -20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 800 }}
          style={styles.headerContainer}
        >
          <Text style={styles.logoText}>ChellySport</Text>
          <Text style={styles.title}>Connexion à votre compte</Text>
        </MotiView>

        <MotiView
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: 800, delay: 200 }}
          style={styles.formContainer}
        >
          <View style={styles.inputContainer}>
            <Feather name="mail" size={20} color="#6D28D9" style={styles.icon} />
            <TextInput
              placeholder="Email"
              style={styles.input}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputContainer}>
            <Feather name="lock" size={20} color="#6D28D9" style={styles.icon} />
            <TextInput
              placeholder="Mot de passe"
              style={styles.input}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Feather name={showPassword ? 'eye' : 'eye-off'} size={20} color="#6D28D9" />
            </TouchableOpacity>
          </View>

          <View style={styles.optionsRow}>
            <TouchableOpacity onPress={() => setRememberMe(!rememberMe)} style={styles.checkboxRow}>
              <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                {rememberMe && <Feather name="check" size={12} color="#fff" />}
              </View>
              <Text style={styles.rememberText}>Se souvenir de moi</Text>
            </TouchableOpacity>

            <TouchableOpacity>
              <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Feather name="log-in" size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.loginText}>Se connecter</Text>
          </TouchableOpacity>
        </MotiView>

        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'timing', duration: 800, delay: 400 }}
          style={styles.registerContainer}
        >
          <TouchableOpacity onPress={() => router.push('/auth/register')}>
            <Text style={styles.registerText}>
              Pas encore inscrit ? <Text style={styles.registerLink}>Créez un compte</Text>
            </Text>
          </TouchableOpacity>
        </MotiView>

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
    backgroundColor: '#EEF2FF',
  },
  backgroundImage: {
    flex: 1,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    padding: 5,
    zIndex: 10,
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#6D28D9',
    textAlign: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
    height: 50,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    color: '#111827',
    fontSize: 15,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    alignItems: 'center',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  checkboxActive: {
    backgroundColor: '#6D28D9',
    borderColor: '#6D28D9',
  },
  rememberText: {
    fontSize: 14,
    color: '#374151',
  },
  forgotText: {
    fontSize: 14,
    color: '#6D28D9',
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#6D28D9',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonIcon: {
    marginRight: 8,
  },
  loginText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  registerContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  registerText: {
    fontSize: 15,
    color: '#374151',
    textAlign: 'center',
  },
  registerLink: {
    color: '#6D28D9',
    fontWeight: '600',
  },
  footer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#D1D5DB',
    paddingTop: 12,
    marginTop: 'auto',
  },
  footerText: {
    fontSize: 12,
    color: '#6B7280',
  },
  footerLink: {
    fontSize: 12,
    color: '#6D28D9',
    fontWeight: '500',
  },
});