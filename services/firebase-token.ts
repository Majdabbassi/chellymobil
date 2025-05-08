import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function sendTokenToBackend(token: string) {
  const authToken = await AsyncStorage.getItem('jwt');
  if (!authToken) return;

  await axios.post('http://192.168.100.4:8080/api/notifications/token', { token }, {
        headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });
}
