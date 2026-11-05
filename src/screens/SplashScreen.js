// src/screens/SplashScreen.js
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { APP_NAME, APP_TAGLINE } from '../config/api';

const { width } = Dimensions.get('window');

export default function SplashScreen({ onFinish }) {
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;
  const slide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 6, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      onFinish?.();
    }, 2600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient colors={Colors.gradientHero} style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fade,
            transform: [{ scale }, { translateY: slide }],
          },
        ]}
      >
        <View style={styles.iconCircle}>
          <Ionicons name="leaf" size={52} color="#fff" />
        </View>
        <Text style={styles.title}>{APP_NAME}</Text>
        <Text style={styles.tagline}>{APP_TAGLINE}</Text>
        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      </Animated.View>
      <Text style={styles.footer}>Climate-smart decisions for East African farmers</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  content: { alignItems: 'center' },
  iconCircle: {
    width: 110,
    height: 110,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.3,
    marginBottom: 10,
  },
  tagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: width * 0.8,
  },
  dots: {
    flexDirection: 'row',
    marginTop: 36,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 22,
  },
  footer: {
    position: 'absolute',
    bottom: 48,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    textAlign: 'center',
  },
});
