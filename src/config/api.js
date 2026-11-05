// src/config/api.js
//
// Cloud builds should set EXPO_PUBLIC_API_URL to the deployed HTTPS backend.
//
//  1. EXPO_PUBLIC_API_URL (e.g. in a .env file)      -> always wins (use this for a hosted server)
//  2. Expo web                                       -> same host the page was opened from, port 8000
//  3. Expo Go / dev build on a phone                 -> the computer running `expo start` (Metro host), port 8000
//  4. Android emulator fallback                      -> 10.0.2.2 (the emulator's alias for your computer)
//  5. iOS simulator fallback                         -> localhost
//
// Start the backend with:  uvicorn main:app --host 0.0.0.0 --port 8000
//                                           ^^^^^^^^^^^^^^ required so the phone can reach it
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const API_PORT = 8000;

function metroHost() {
  const raw =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    Constants.manifest?.debuggerHost ||
    '';
  const host = String(raw).split(':')[0].trim();
  if (!host) return null;
  // `expo start --tunnel` gives a public tunnel host that cannot reach your local backend.
  if (/\.(exp\.direct|ngrok[\w-]*\.\w+)$/i.test(host)) return null;
  return host;
}

function resolveBaseUrl() {
  const fromEnv = (process.env.EXPO_PUBLIC_API_URL || '').trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, '');

  if (Platform.OS === 'web') {
    const host = (typeof window !== 'undefined' && window.location?.hostname) || 'localhost';
    return `http://${host}:${API_PORT}`;
  }

  let host = metroHost();
  if (host) {
    if (Platform.OS === 'android' && (host === 'localhost' || host === '127.0.0.1')) host = '10.0.2.2';
    return `http://${host}:${API_PORT}`;
  }
  return Platform.OS === 'android' ? `http://10.0.2.2:${API_PORT}` : `http://localhost:${API_PORT}`;
}

export const BASE_URL = resolveBaseUrl();
if (__DEV__) console.log('[API] Using backend at', BASE_URL);

export const ENDPOINTS = {
  health: `${BASE_URL}/health`,
  todayByLocation: (loc, lang) => `${BASE_URL}/forecast/today/${encodeURIComponent(loc)}?lang=${encodeURIComponent(lang)}`,
  todayByCoords: (lat, lon, lang) => `${BASE_URL}/forecast/coords?lat=${lat}&lon=${lon}&lang=${encodeURIComponent(lang)}`,
  weekByLocation: (loc, lang) => `${BASE_URL}/forecast/location/${encodeURIComponent(loc)}?lang=${encodeURIComponent(lang)}`,
  locations: `${BASE_URL}/locations`,
  reverseLocation: (lat, lon) => `${BASE_URL}/locations/reverse?lat=${lat}&lon=${lon}`,
  register: `${BASE_URL}/auth/register`,
  login: `${BASE_URL}/auth/login`,
  verify: `${BASE_URL}/auth/verify`,
  resendCode: `${BASE_URL}/auth/resend`,
};

export const LANGUAGES = [
  { code: 'en',  name: 'English',      native: 'English' },
  { code: 'sw',  name: 'Swahili',      native: 'Kiswahili' },
  { code: 'lg',  name: 'Luganda',      native: 'Luganda' },
  { code: 'ach', name: 'Acholi',       native: 'Lwo/Acholi' },
  { code: 'nyn', name: 'Runyankole',   native: 'Runyankole' },
  { code: 'rw',  name: 'Kinyarwanda',  native: 'Ikinyarwanda' },
  { code: 'rn',  name: 'Kirundi',      native: 'Ikirundi' },
  { code: 'am',  name: 'Amharic',      native: 'አማርኛ' },
  { code: 'so',  name: 'Somali',       native: 'Soomaali' },
  { code: 'om',  name: 'Oromo',        native: 'Afaan Oromoo' },
  { code: 'ar',  name: 'Arabic',       native: 'العربية' },
];
export const APP_NAME = 'Climate Smart Farmer Advisory';
export const APP_TAGLINE = 'Localized climate advice for East African farmers';
