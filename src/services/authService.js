// src/services/authService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENDPOINTS } from '../config/api';
import { fetchJson } from './http';

const TOKEN_KEY = 'auth_token';
const PROFILE_KEY = 'farmer_profile';

const post = (url, body) => fetchJson(url, { method: 'POST', body, timeout: 30000 }); // email sending can take a few seconds

async function saveSession(data) {
  if (data?.access_token) await AsyncStorage.setItem(TOKEN_KEY, data.access_token);
  if (data?.farmer) await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(data.farmer));
}

export const signUp = payload => post(ENDPOINTS.register, payload);
export const resendVerification = email => post(ENDPOINTS.resendCode, { email });

export async function verifyEmail(email, code) {
  const data = await post(ENDPOINTS.verify, { email, code });
  await saveSession(data);
  return data;
}

export async function signIn(email, password) {
  const data = await post(ENDPOINTS.login, { email, password });
  await saveSession(data);
  return data;
}

export async function isSignedIn() {
  try { return !!(await AsyncStorage.getItem(TOKEN_KEY)); } catch { return false; }
}

export async function getFarmerProfile() {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function signOut() {
  await AsyncStorage.multiRemove([TOKEN_KEY, PROFILE_KEY]);
}
