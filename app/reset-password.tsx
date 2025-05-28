import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams  } from 'expo-router';
import axios from 'axios';


export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams();
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  useEffect(() => {
    console.log('Received token:', token);
  }, [token]);

  const handleReset = async () => {
    if (!token) {
      Alert.alert('Erreur', 'Token manquant ou invalide.');
      return;
    }

    if (password !== confirm) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
      return;
    }

    try {
      await axios.post('http://192.168.110.138:8080/api/password-reset/confirm', {
        token: token, 
        newPassword: password,
      });
      Alert.alert('Succès', 'Mot de passe réinitialisé.');
      router.push('/');
    } catch (error) {
      console.error('Erreur axios:', error);
      Alert.alert('Erreur', "Impossible de réinitialiser le mot de passe.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Réinitialiser le mot de passe</Text>
      <TextInput
        placeholder="Nouveau mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      <TextInput
        placeholder="Confirmer le mot de passe"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        style={styles.input}
      />
      <TouchableOpacity style={styles.button} onPress={handleReset}>
        <Text style={styles.buttonText}>Réinitialiser</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#8B5CF6',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#F1F1F1',
    padding: 14,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#8B5CF6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
