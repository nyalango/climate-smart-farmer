// src/services/weatherService.js
// Forecasts are cached on-device so the app can show the last successful data offline.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENDPOINTS } from '../config/api';
import { fetchJson } from './http';

const TODAY_CACHE_KEY = 'cached_today_v2';
const WEEK_CACHE_PREFIX = 'cached_week_v1:';
const CACHE_MAX_MS = 7 * 24 * 60 * 60 * 1000; // show saved forecasts for up to 7 days

let lastError = '';
let weeklyWasCached = false;
export const getLastError = () => lastError;
export const getWeeklyWasCached = () => weeklyWasCached;

async function safeGet(url) {
  try {
    const data = await fetchJson(url);
    lastError = '';
    return data;
  } catch (e) {
    lastError = e?.message || 'Request failed.';
    console.warn('[API]', url, '->', lastError);
    return null;
  }
}

// Today's forecast
export async function getTodayByLocation(location, lang) {
  const data = await safeGet(ENDPOINTS.todayByLocation(location, lang));
  if (data) await cacheToday(location, lang, data);
  return data;
}

async function cacheToday(location, lang, data) {
  try {
    await AsyncStorage.setItem(TODAY_CACHE_KEY, JSON.stringify({
      location, lang, savedAt: Date.now(), data,
    }));
  } catch (e) {
    console.warn('[Cache] today write failed', e);
  }
}

export async function getCachedToday(location, lang = 'en') {
  try {
    let raw = await AsyncStorage.getItem(TODAY_CACHE_KEY);
    if (!raw) raw = await AsyncStorage.getItem('cached_today');
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (cached.location !== location) return null;
    if (cached.lang && cached.lang !== lang) return null;
    if (!cached.savedAt || Date.now() - cached.savedAt > CACHE_MAX_MS) return null;
    return cached.data || null;
  } catch {
    return null;
  }
}

// Weekly forecast
export async function getWeekly(location, lang = 'en') {
  weeklyWasCached = false;
  const data = await safeGet(ENDPOINTS.weekByLocation(location, lang));
  if (data) {
    try {
      await AsyncStorage.setItem(`${WEEK_CACHE_PREFIX}${location}:${lang}`, JSON.stringify({
        savedAt: Date.now(), data,
      }));
    } catch (e) {
      console.warn('[Cache] weekly write failed', e);
    }
    return data;
  }

  try {
    const raw = await AsyncStorage.getItem(`${WEEK_CACHE_PREFIX}${location}:${lang}`);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (!cached.savedAt || Date.now() - cached.savedAt > CACHE_MAX_MS) return null;
    weeklyWasCached = true;
    return cached.data || null;
  } catch {
    return null;
  }
}

export async function getLocations() {
  const data = await safeGet(ENDPOINTS.locations);
  return Array.isArray(data) ? data : [];
}

// Preferences
export async function savePrefs(location, lang) {
  await AsyncStorage.multiSet([['location', location], ['lang', lang]]);
}

export async function loadPrefs() {
  const [[, location], [, lang]] = await AsyncStorage.multiGet(['location', 'lang']);
  return { location: location || 'kampala', lang: lang || 'en' };
}

// Onboarding flag
export async function hasSeenWelcome() {
  return (await AsyncStorage.getItem('has_seen_welcome')) === 'true';
}
export async function setSeenWelcome() {
  await AsyncStorage.setItem('has_seen_welcome', 'true');
}
