import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// ✅ Centraliser l'IP ici (priorité à app.json / app.config.js si défini)
const IP_ADDRESS = Constants.expoConfig?.extra?.apiIp || '192.168.1.249';
const PORT = '8080';
const API_BASE_URL = `http://${IP_ADDRESS}:${PORT}/api`;

// ✅ Création d'une instance Axios
const API = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ✅ Récupération sécurisée du token JWT stocké
const getToken = async (): Promise<string | null> => {
  try {
    const token = await AsyncStorage.getItem('token');
    return token;
  } catch (error) {
    console.error('❌ Erreur de récupération du token :', error);
    return null;
  }
};

// ✅ Intercepteur : Ajout automatique du token dans les headers
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
