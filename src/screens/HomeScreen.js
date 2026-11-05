
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import AlertCard from '../components/AlertCard';
import {
  getTodayByLocation,
  getCachedToday,
  loadPrefs,
  getLastError,
} from '../services/weatherService';
import { useTheme } from '../theme/colors';

function Metric({ icon, label, value, unit, c, styles }) {
  return (
    <View
      style={[
        styles.metric,
        {
          backgroundColor: c.surfaceSolid,
          borderColor: c.border,
        },
      ]}
    >
      <View
        style={[
          styles.metricIcon,
          { backgroundColor: c.primaryLight },
        ]}
      >
        <Ionicons name={icon} size={19} color={c.primary} />
      </View>

      <Text style={[styles.metricValue, { color: c.textDark }]}>
        {value}
        <Text style={[styles.metricUnit, { color: c.textMid }]}>
          {unit || ''}
        </Text>
      </Text>

      <Text style={[styles.metricLabel, { color: c.textLight }]}>
        {label}
      </Text>
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const { Colors: c } = useTheme();

  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [prefs, setPrefs] = useState({
    location: 'kampala',
    lang: 'en',
  });
  const [errorMsg, setErrorMsg] = useState('');

  const styles = makeStyles(c);

  const load = async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const p = await loadPrefs();
      setPrefs(p);

      const fresh = await getTodayByLocation(p.location, p.lang);

      if (fresh) {
        setForecast(fresh);
        setOffline(false);
        setErrorMsg('');
      } else {
        const cached = await getCachedToday(p.location, p.lang);
        setErrorMsg(getLastError());
        setForecast(cached);
        setOffline(!!cached);
      }
    } catch (error) {
      console.error('[HOME] Forecast loading failed:', error);

      const cached = await getCachedToday(prefs.location, prefs.lang);
      setForecast(cached);
      setOffline(!!cached);
      setErrorMsg('Unable to load weather data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  if (loading) {
    return (
      <View
        style={[
          styles.center,
          { backgroundColor: c.background },
        ]}
      >
        <ActivityIndicator size="large" color={c.primary} />
        <Text style={[styles.muted, { marginTop: 12 }]}>
          Loading your farm forecast…
        </Text>
      </View>
    );
  }

  if (!forecast) {
    return (
      <View
        style={[
          styles.center,
          {
            backgroundColor: c.background,
            padding: 28,
          },
        ]}
      >
        <Ionicons
          name="cloud-offline-outline"
          size={54}
          color={c.textLight}
        />

        <Text style={[styles.errorTitle, { color: c.textDark }]}>
          No forecast available
        </Text>

        <Text
          style={[
            styles.muted,
            { textAlign: 'center', marginBottom: 18 },
          ]}
        >
          {errorMsg || 'Could not reach the forecast server.'}
        </Text>

        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => load()}
        >
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const f = forecast;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => load(true)}
          colors={[c.primary]}
          tintColor={c.primary}
        />
      }
    >
      {/* WEATHER HERO */}
      <LinearGradient colors={c.gradientHero} style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.locationPill}>
            <Ionicons name="location" size={15} color="#FFFFFF" />
            <Text style={styles.location}>
              {f.location || prefs.location}
            </Text>
          </View>

          <Text style={styles.date}>
            {f.date || 'Today'}
          </Text>
        </View>

        <Text style={styles.eyebrow}>
          CLIMATE SMART FARMER
        </Text>

        <View style={styles.weatherMain}>
          <View style={{ flex: 1 }}>
            <Text style={styles.temp}>
              {Math.round(f.temp_max_c ?? 0)}°
            </Text>

            <Text style={styles.condition}>
              {f.condition || 'Local conditions'}
            </Text>

            <Text style={styles.range}>
              High {Math.round(f.temp_max_c ?? 0)}°
              {'  ·  '}
              Low {Math.round(f.temp_min_c ?? 0)}°
            </Text>
          </View>

          <View style={styles.weatherIcon}>
            <Ionicons
              name="partly-sunny"
              size={58}
              color="#FFF2C5"
            />
          </View>
        </View>

        <View style={styles.heroFooter}>
          <Ionicons
            name="leaf-outline"
            size={15}
            color="#D6F5E2"
          />
          <Text style={styles.heroFooterText}>
            Weather guidance for your farm
          </Text>
        </View>
      </LinearGradient>

      {/* OFFLINE INDICATOR */}
      {offline && (
        <View style={styles.offline}>
          <Ionicons
            name="cloud-offline"
            size={15}
            color={c.warning}
          />
          <Text
            style={{
              color: c.warning,
              fontSize: 12,
              fontWeight: '600',
            }}
          >
            Offline · showing saved forecast
          </Text>
        </View>
      )}

      {/* FARM ADVISORY */}
      <View style={styles.sectionHead}>
        <Text style={[styles.sectionTitle, { color: c.textDark }]}>
          Farm advisory
        </Text>

        <Text style={[styles.sectionCaption, { color: c.textLight }]}>
          What the weather means for you
        </Text>
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        <AlertCard
          level={f.alert_level}
          action={f.action}
          detail={f.detail}
        />
      </View>

      {/* WEATHER METRICS */}
      <View style={styles.sectionHead}>
        <Text style={[styles.sectionTitle, { color: c.textDark }]}>
          Weather details
        </Text>

        <Text style={[styles.sectionCaption, { color: c.textLight }]}>
          Today’s key conditions
        </Text>
      </View>

      <View style={styles.metricsGrid}>
        <Metric
          styles={styles}
          c={c}
          icon="rainy-outline"
          label="Rainfall"
          value={Math.round(f.rain_mm ?? 0)}
          unit=" mm"
        />

        <Metric
          styles={styles}
          c={c}
          icon="water-outline"
          label="Rain chance"
          value={Math.round(f.rain_prob_pct ?? 0)}
          unit="%"
        />

        <Metric
          styles={styles}
          c={c}
          icon="thermometer-outline"
          label="Temperature"
          value={`${Math.round(f.temp_min_c ?? 0)}–${Math.round(f.temp_max_c ?? 0)}`}
          unit="°C"
        />

        <Metric
          styles={styles}
          c={c}
          icon="speedometer-outline"
          label="Wind speed"
          value={Math.round(f.wind_kmh ?? 0)}
          unit=" km/h"
        />
      </View>

      {/* WEEKLY FORECAST BUTTON */}
      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() =>
          navigation.navigate('Week', {
            location: prefs.location,
            lang: prefs.lang,
          })
        }
        activeOpacity={0.86}
      >
        <LinearGradient
          colors={c.gradientPrimary}
          style={styles.btnGradient}
        >
          <Ionicons name="calendar-outline" size={19} color="#fff" />

          <Text style={styles.btnText}>
            Explore 7-day forecast
          </Text>

          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* FARM ADVISOR BUTTON */}
      <TouchableOpacity
        style={[
          styles.advisorBtn,
          {
            backgroundColor: c.primaryLight,
            borderColor: c.border,
          },
        ]}
        onPress={() => navigation.getParent()?.navigate('Chat')}
      >
        <Ionicons
          name="chatbubble-ellipses-outline"
          size={19}
          color={c.primary}
        />

        <Text
          style={{
            color: c.primary,
            fontWeight: '800',
            marginLeft: 9,
          }}
        >
          Ask the farm advisor
        </Text>
      </TouchableOpacity>

      {/* FEATURES */}
      <View style={styles.sectionHead}>
        <Text style={[styles.sectionTitle, { color: c.textDark }]}>
          Made for your farm
        </Text>
      </View>

      <View style={styles.features}>
        {[
          [
            'sunny-outline',
            'Planting windows',
            'Know when to plant or wait',
          ],
          [
            'water-outline',
            'Rain & dry spells',
            'Prepare for wet and dry periods',
          ],
          [
            'leaf-outline',
            'Crop guidance',
            'Practical crop-care suggestions',
          ],
          [
            'earth-outline',
            'Local focus',
            'Forecasts for East African towns',
          ],
        ].map(([icon, title, sub]) => (
          <View
            key={title}
            style={[
              styles.feature,
              {
                backgroundColor: c.surfaceSolid,
                borderColor: c.border,
              },
            ]}
          >
            <View
              style={[
                styles.featureIcon,
                { backgroundColor: c.primaryLight },
              ]}
            >
              <Ionicons name={icon} size={19} color={c.primary} />
            </View>

            <Text style={[styles.featureTitle, { color: c.textDark }]}>
              {title}
            </Text>

            <Text style={[styles.featureSub, { color: c.textMid }]}>
              {sub}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const makeStyles = c =>
  StyleSheet.create({
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    muted: {
      color: c.textMid,
      fontSize: 14,
    },
    errorTitle: {
      fontSize: 19,
      fontWeight: '800',
      marginVertical: 12,
    },
    retryBtn: {
      backgroundColor: c.primary,
      borderRadius: 13,
      paddingHorizontal: 24,
      paddingVertical: 12,
    },
    retryText: {
      color: '#fff',
      fontWeight: '800',
    },
    hero: {
      paddingHorizontal: 21,
      paddingTop: 18,
      paddingBottom: 22,
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
    },
    heroTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    locationPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: 'rgba(255,255,255,0.16)',
      paddingHorizontal: 11,
      paddingVertical: 7,
      borderRadius: 20,
    },
    location: {
      color: '#fff',
      fontWeight: '800',
      fontSize: 14,
      textTransform: 'capitalize',
    },
    date: {
      color: '#E0F4E8',
      fontSize: 12,
      fontWeight: '600',
    },
    eyebrow: {
      color: '#C7EBD5',
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1.6,
      marginTop: 26,
    },
    weatherMain: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 5,
    },
    temp: {
      fontSize: 66,
      color: '#fff',
      fontWeight: '800',
      letterSpacing: -3,
    },
    condition: {
      fontSize: 17,
      color: '#fff',
      fontWeight: '700',
      marginTop: -3,
    },
    range: {
      fontSize: 12,
      color: '#D8F0E1',
      marginTop: 7,
    },
    weatherIcon: {
      width: 104,
      height: 104,
      borderRadius: 30,
      backgroundColor: 'rgba(255,255,255,0.13)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      marginTop: 15,
    },
    heroFooterText: {
      color: '#D6F5E2',
      fontSize: 12,
      fontWeight: '600',
    },
    offline: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      margin: 12,
    },
    sectionHead: {
      paddingHorizontal: 18,
      marginTop: 22,
      marginBottom: 11,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '900',
    },
    sectionCaption: {
      fontSize: 12,
      marginTop: 3,
    },
    metricsGrid: {
      paddingHorizontal: 16,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    metric: {
      width: '48%',
      flexGrow: 1,
      borderRadius: 18,
      borderWidth: 1,
      padding: 14,
      minHeight: 125,
    },
    metricIcon: {
      width: 34,
      height: 34,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 9,
    },
    metricValue: {
      fontSize: 21,
      fontWeight: '900',
    },
    metricUnit: {
      fontSize: 12,
      fontWeight: '700',
    },
    metricLabel: {
      fontSize: 11,
      marginTop: 3,
      fontWeight: '600',
    },
    primaryBtn: {
      marginHorizontal: 16,
      marginTop: 22,
      borderRadius: 16,
      overflow: 'hidden',
    },
    btnGradient: {
      paddingVertical: 16,
      paddingHorizontal: 17,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    btnText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '800',
    },
    advisorBtn: {
      marginHorizontal: 16,
      marginTop: 10,
      borderRadius: 15,
      borderWidth: 1,
      padding: 15,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    features: {
      paddingHorizontal: 13,
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    feature: {
      width: '47%',
      margin: '1.5%',
      borderWidth: 1,
      borderRadius: 17,
      padding: 14,
    },
    featureIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    featureTitle: {
      fontSize: 13,
      fontWeight: '800',
    },
    featureSub: {
      fontSize: 11,
      marginTop: 4,
      lineHeight: 16,
    },
  });
