// src/services/locationService.js
import * as Location from 'expo-location';
import { ENDPOINTS } from '../config/api';
import { fetchJson } from './http';

export async function requestDeviceLocation() {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') {
    throw new Error('Location permission was not granted. You can still choose a town manually.');
  }
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const { latitude, longitude } = pos.coords;

  let place = null;
  try {
    place = await fetchJson(ENDPOINTS.reverseLocation(latitude, longitude), { timeout: 10000 });
  } catch { /* offline: we still have the coordinates */ }
  return { latitude, longitude, place };
}
