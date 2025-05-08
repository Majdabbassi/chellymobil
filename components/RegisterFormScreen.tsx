import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ImageBackground } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { AxiosError } from 'axios';
import API from '@/services/api';
export default function RegisterFormScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [specialite, setSpecialite] = useState('');
  const [dateEmbauche, setDateEmbauche] = useState(''); // Format: 'YYYY-MM-DD'
  
  const handleRegister = async () => {
    try {
      const response = await API.post('/auth/register', {
        nom: name,
        prenom: firstName || 'Prénom',
        email,
        telephone: phone,
        motDePasse: password,
        role: 'PARENT',
        imageBase64: '', // ou une image encodée si besoin
        specialite: specialite || '',
        dateEmbauche: dateEmbauche || null // doit être au format 'YYYY-MM-DD'
      });
  
      console.log('✅ Inscription réussie :', response.data);
      router.push('/auth/login');
    } catch (error) {
      const err = error as AxiosError;
      console.error('❌ Erreur API :', err.response?.data || err.message);
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
          <Text style={styles.title}>Créer un compte parent</Text>
        </MotiView>

        <MotiView
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: 800, delay: 200 }}
          style={styles.formContainer}
        >
          <View style={styles.inputRow}>
            <View style={[styles.inputContainer, styles.halfInput]}>
              <Feather name="user" size={20} color="#6D28D9" style={styles.icon} />
              <TextInput
                placeholder="Nom"
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholderTextColor="#9CA3AF"
              />
            </View>
            
            <View style={[styles.inputContainer, styles.halfInput]}>
              <TextInput
                placeholder="Prénom"
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

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
            <Feather name="phone" size={20} color="#6D28D9" style={styles.icon} />
            <TextInput
              placeholder="Numéro de téléphone"
              style={styles.input}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
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

          <View style={styles.inputContainer}>
            <Feather name="shield" size={20} color="#6D28D9" style={styles.icon} />
            <TextInput
              placeholder="Confirmer le mot de passe"
              style={styles.input}
              secureTextEntry={!showPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.optionsRow}>
            <TouchableOpacity onPress={() => setRememberMe(!rememberMe)} style={styles.checkboxRow}>
              <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                {rememberMe && <Feather name="check" size={12} color="#fff" />}
              </View>
              <Text style={styles.rememberText}>J'accepte les conditions d'utilisation</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.signupButton} onPress={handleRegister}>
            <Feather name="user-plus" size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.signupText}>Créer un compte</Text>
          </TouchableOpacity>
        </MotiView>

        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'timing', duration: 800, delay: 400 }}
          style={styles.loginContainer}
        >
          <TouchableOpacity onPress={() => router.push('/auth/login')}>
            <Text style={styles.loginText}>
              Déjà inscrit ? <Text style={styles.loginLink}>Connectez-vous</Text>
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
    marginBottom: 20,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#6D28D9',
    textAlign: 'center',
    marginBottom: 10,
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
    marginBottom: 15,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  halfInput: {
    flex: 0.48,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
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
    marginBottom: 15,
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
  signupButton: {
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
  signupText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loginContainer: {
    alignItems: 'center',
    marginTop: 5,
  },
  loginText: {
    fontSize: 15,
    color: '#374151',
    textAlign: 'center',
  },
  loginLink: {
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