// services/api.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
const API = axios.create({
  baseURL: 'http://192.168.100.4:8080/api', // ← Mettez ici votre IP locale
  headers: {
    'Content-Type': 'application/json',
  },
});

// Fonction pour récupérer le token
const getToken = async (): Promise<string | null> => {
  try {
    const token = await AsyncStorage.getItem('token'); // ← même clé partout
    return token;
  } catch (error) {
    console.error('Erreur de récupération du token :', error);
    return null;
  }
};

// Intercepteur pour ajouter automatiquement le header Authorization
API.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers!['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default API;
