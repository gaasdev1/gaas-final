import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

export const api = axios.create({ baseURL: API_BASE_URL, timeout: 15000 });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('gaas_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function saveToken(token: string) {
  await AsyncStorage.setItem('gaas_token', token);
  api.defaults.headers.common.Authorization = `Bearer ${token}`;
}
