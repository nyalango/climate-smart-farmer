// src/screens/WelcomeScreen.js
import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity,
  FlatList, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { APP_NAME } from '../config/api';
import { setSeenWelcome } from '../services/weatherService';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    icon: 'partly-sunny',
    title: 'Localized Forecasts',
    body: 'Get 1-day and 7-day weather tailored to your district or village — not distant city averages.',
  },
  {
    id: '2',
    icon: 'leaf',
    title: 'Farming Advice, Not Jargon',
    body: 'We turn “above-normal rains” and technical terms into clear actions: when to plant, delay, mulch or protect livestock.',
  },
  {
    id: '3',
    icon: 'chatbubbles',
    title: 'Languages & Alerts',
    body: 'English, Kiswahili, Luganda, Acholi, Runyankole and more. Create a free account to save your town and language.',
  },
  {
    id: '4',
    icon: 'people',
    title: 'Ask the Advisory Bot',
    body: 'Have a question about maize, coffee, dry spells or spraying? Chat with the in-app advisor any time.',
  },
];

export default function WelcomeScreen({ onDone }) {
  const [index, setIndex] = useState(0);
  const listRef = useRef(null);

  async function finish() {
    await setSeenWelcome();
    onDone?.();
  }

  function next() {
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
      setIndex(index + 1);
    } else {
      finish();
    }
  }

  function renderSlide({ item }) {
    return (
      <View style={styles.slide}>
        <View style={styles.iconWrap}>
          <LinearGradient colors={Colors.gradientPrimary} style={styles.iconGrad}>
            <Ionicons name={item.icon} size={42} color="#fff" />
          </LinearGradient>
        </View>
        <Text style={styles.slideTitle}>{item.title}</Text>
        <Text style={styles.slideBody}>{item.body}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#E6F7EF', '#F4F7F5']} style={StyleSheet.absoluteFill} />

      <View style={styles.topBar}>
        <Text style={styles.brand}>{APP_NAME}</Text>
        <TouchableOpacity onPress={finish} hitSlop={12}>
          <Text style={styles.skip}>Skip</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onMomentumScrollEnd={e => {
          const i = Math.round(e.nativeEvent.contentOffset.x / width);
          setIndex(i);
        }}
        renderItem={renderSlide}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === index && styles.dotActive]}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.cta} onPress={next} activeOpacity={0.85}>
          <LinearGradient
            colors={Colors.gradientPrimary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGrad}
          >
            <Text style={styles.ctaText}>
              {index === SLIDES.length - 1 ? 'Get Started' : 'Next'}
            </Text>
            <Ionicons
              name={index === SLIDES.length - 1 ? 'checkmark' : 'arrow-forward'}
              size={18}
              color="#fff"
              style={{ marginLeft: 8 }}
            />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 52,
    paddingBottom: 8,
  },
  brand: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  skip: { fontSize: 14, color: Colors.textMid, fontWeight: '600' },
  slide: {
    width,
    paddingHorizontal: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  iconWrap: { marginBottom: 32 },
  iconGrad: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  slideTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textDark,
    textAlign: 'center',
    marginBottom: 14,
  },
  slideBody: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.textMid,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.borderStrong,
  },
  dotActive: {
    backgroundColor: Colors.primary,
    width: 22,
  },
  cta: { borderRadius: 16, overflow: 'hidden' },
  ctaGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
