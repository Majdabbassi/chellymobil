import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// ✅ Choix intelligent de l'IP : localhost pour web, IP locale pour mobile
const LOCAL_IP = Constants.expoConfig?.extra?.apiIp || '192.168.64.138'; // modifiable dans app.json
const IP_ADDRESS = Platform.OS === 'web' ? 'localhost' : LOCAL_IP;
const PORT = '8080';
const API_BASE_URL = `http://${IP_ADDRESS}:${PORT}/api`;

// ✅ Création de l’instance Axios
const API = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ✅ Récupération du token JWT de manière sécurisée
const getToken = async (): Promise<string | null> => {
  try {
    const token = await AsyncStorage.getItem('token');
    return token;
  } catch (error) {
    console.error('❌ Erreur de récupération du token :', error);
    return null;
  }
};

// ✅ Intercepteur pour attacher automatiquement le token aux requêtes
API.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default API;
