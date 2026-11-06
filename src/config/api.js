
// src/config/api.js

import { Platform } from 'react-native';
import Constants from 'expo-constants';

const API_PORT = 8000;

// Your deployed production backend
const PRODUCTION_API_URL =
  'https://climate-smart-farmer.onrender.com';

function normalizeUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

function metroHost() {
  const raw =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    Constants.manifest?.debuggerHost ||
    '';

  const host = String(raw).split(':')[0].trim();

  if (!host) return null;

  // Do not use an Expo or tunnelling hostname as a local API server.
  if (
    /\.exp\.direct$/i.test(host) ||
    /\.ngrok(?:-free)?\.(?:app|io)$/i.test(host)
  ) {
    return null;
  }

  return host;
}

function resolveBaseUrl() {
  // 1. Explicit Expo environment variable always takes priority.
  const fromEnv = normalizeUrl(
    process.env.EXPO_PUBLIC_API_URL
  );

  if (fromEnv) return fromEnv;

  // 2. Production builds must use the hosted backend.
  if (!__DEV__) {
    return PRODUCTION_API_URL;
  }

  // 3. Expo web development.
  if (Platform.OS === 'web') {
    const host =
      typeof window !== 'undefined'
        ? window.location.hostname
        : 'localhost';

    return `http://${host}:${API_PORT}`;
  }

  // 4. Local Android/iOS development.
  let host = metroHost();

  if (host) {
    if (
      Platform.OS === 'android' &&
      (host === 'localhost' || host === '127.0.0.1')
    ) {
      host = '10.0.2.2';
    }

    return `http://${host}:${API_PORT}`;
  }

  // 5. Development fallback.
  return Platform.OS === 'android'
    ? `http://10.0.2.2:${API_PORT}`
    : 'http://localhost:8000';
}

export const BASE_URL = resolveBaseUrl();

if (__DEV__) {
  console.log('[API] Using backend:', BASE_URL);
}

export const ENDPOINTS = {
  health: `${BASE_URL}/health`,

  todayByLocation: (loc, lang = 'en') =>
    `${BASE_URL}/forecast/today/${encodeURIComponent(loc)}?lang=${encodeURIComponent(lang)}`,

  todayByCoords: (lat, lon, lang = 'en') =>
    `${BASE_URL}/forecast/coords?lat=${lat}&lon=${lon}&lang=${encodeURIComponent(lang)}`,

  weekByLocation: (loc, lang = 'en') =>
    `${BASE_URL}/forecast/location/${encodeURIComponent(loc)}?lang=${encodeURIComponent(lang)}`,

  locations: `${BASE_URL}/locations`,

  reverseLocation: (lat, lon) =>
    `${BASE_URL}/locations/reverse?lat=${lat}&lon=${lon}`,

  register: `${BASE_URL}/auth/register`,

  login: `${BASE_URL}/auth/login`,

  verify: `${BASE_URL}/auth/verify`,

  resendCode: `${BASE_URL}/auth/resend`,
};

export const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'sw', name: 'Swahili', native: 'Kiswahili' },
  { code: 'lg', name: 'Luganda', native: 'Luganda' },
  { code: 'ach', name: 'Acholi', native: 'Lwo/Acholi' },
  { code: 'nyn', name: 'Runyankole', native: 'Runyankole' },
  { code: 'rw', name: 'Kinyarwanda', native: 'Ikinyarwanda' },
  { code: 'rn', name: 'Kirundi', native: 'Ikirundi' },
  { code: 'am', name: 'Amharic', native: 'አማርኛ' },
  { code: 'so', name: 'Somali', native: 'Soomaali' },
  { code: 'om', name: 'Oromo', native: 'Afaan Oromoo' },
  { code: 'ar', name: 'Arabic', native: 'العربية' },
];

export const APP_NAME = 'Climate Smart Farmer Advisory';

export const APP_TAGLINE =
  'Localized climate advice for East African farmers';
