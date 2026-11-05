// src/screens/AuthScreen.js
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';
import { LANGUAGES, APP_NAME } from '../config/api';
import { getLocations, savePrefs } from '../services/weatherService';
import { signUp, signIn, verifyEmail, resendVerification } from '../services/authService';
import { requestDeviceLocation } from '../services/locationService';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RESEND_SECONDS = 30;

export default function AuthScreen({ onAuthenticated }) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState('login'); // login | signup | verify
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [code, setCode] = useState('');
  const [lang, setLang] = useState('en');
  const [locations, setLocations] = useState([]);
  const [location, setLocation] = useState('kampala');
  const [coords, setCoords] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const timer = useRef(null);

  useEffect(() => {
    getLocations().then(items => {
      setLocations(items);
      if (items.length && !items.some(x => x.key === 'kampala')) setLocation(items[0].key);
    });
    return () => clearInterval(timer.current);
  }, []);

  function startCooldown() {
    clearInterval(timer.current);
    setCooldown(RESEND_SECONDS);
    timer.current = setInterval(() => {
      setCooldown(c => {
        if (c <= 1) { clearInterval(timer.current); return 0; }
        return c - 1;
      });
    }, 1000);
  }

  function switchMode(next) {
    setMode(next);
    setError('');
    setNotice('');
  }

  async function useGPS() {
    setError(''); setNotice('');
    try {
      const result = await requestDeviceLocation();
      setCoords({ latitude: result.latitude, longitude: result.longitude });
      if (result.place?.key) setLocation(result.place.key);
      setNotice('Using your device location for local forecasts.');
    } catch (e) {
      setError(e.message || 'Could not read device location. Choose a town below.');
    }
  }

  async function sendCodeNotice(delivery) {
    setNotice(
      delivery === 'console'
        ? 'Developer mode: the code was printed in the backend console instead of being emailed.'
        : `We sent a 6-digit code to ${email.trim().toLowerCase()}. Check your inbox and spam folder.`,
    );
  }

  async function submit() {
    setError(''); setNotice('');
    const cleanEmail = email.trim().toLowerCase();

    if (!EMAIL_RE.test(cleanEmail)) return setError('Enter a valid email address.');
    if (mode === 'signup' && !name.trim()) return setError('Enter your name.');
    if (mode === 'verify' && !/^\d{6}$/.test(code.trim())) return setError('Enter the 6-digit code sent to your email.');
    if (mode !== 'verify' && password.length < 8) return setError('Password must be at least 8 characters.');

    setBusy(true);
    try {
      if (mode === 'signup') {
        const res = await signUp({
          name: name.trim(), email: cleanEmail, password,
          language_code: lang, location_key: location, ...(coords || {}),
        });
        setMode('verify'); setCode('');
        startCooldown();
        await sendCodeNotice(res?.delivery);
      } else if (mode === 'verify') {
        const data = await verifyEmail(cleanEmail, code.trim());
        await savePrefs(data.farmer?.location_key || location, data.farmer?.language_code || lang);
        onAuthenticated?.();
      } else {
        try {
          const data = await signIn(cleanEmail, password);
          await savePrefs(data.farmer?.location_key || location, data.farmer?.language_code || lang);
          onAuthenticated?.();
        } catch (e) {
          if (e.status === 403) {
            // Account exists but the email was never verified: send a fresh code and continue.
            setMode('verify'); setCode('');
            try {
              const res = await resendVerification(cleanEmail);
              startCooldown();
              await sendCodeNotice(res?.delivery);
            } catch (e2) { setError(e2.message); }
          } else {
            throw e;
          }
        }
      }
    } catch (e) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (cooldown > 0 || busy) return;
    setError(''); setNotice(''); setBusy(true);
    try {
      const res = await resendVerification(email.trim().toLowerCase());
      startCooldown();
      await sendCodeNotice(res?.delivery);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const ctaLabel = mode === 'verify' ? 'Verify and continue' : mode === 'signup' ? 'Create account' : 'Sign in';

  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={[s.content, { paddingTop: insets.top + 28 }]} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={Colors.gradientPrimary} style={s.logo}>
          <Ionicons name="leaf" size={34} color="#fff" />
        </LinearGradient>
        <Text style={s.brand}>{APP_NAME}</Text>
        <Text style={s.sub}>Local weather and practical advice for your farm.</Text>

        {mode !== 'verify' && (
          <View style={s.tabs}>
            {['login', 'signup'].map(m => (
              <TouchableOpacity key={m} onPress={() => switchMode(m)} style={[s.tab, mode === m && s.tabOn]}>
                <Text style={[s.tabText, mode === m && s.tabTextOn]}>{m === 'login' ? 'Sign in' : 'Create account'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {mode === 'verify' ? (
          <>
            <Text style={s.title}>Verify your email</Text>
            <Text style={s.sub}>Enter the 6-digit code we sent to {email.trim().toLowerCase()}.</Text>
            <TextInput
              style={[s.input, s.codeInput]}
              value={code}
              onChangeText={t => setCode(t.replace(/\D/g, '').slice(0, 6))}
              placeholder="······"
              placeholderTextColor={Colors.textLight}
              keyboardType="number-pad"
              maxLength={6}
              autoComplete="sms-otp"
              textContentType="oneTimeCode"
            />
            <TouchableOpacity onPress={resend} disabled={cooldown > 0 || busy} style={s.link}>
              <Text style={[s.linkText, (cooldown > 0 || busy) && s.linkDisabled]}>
                {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {mode === 'signup' && (
              <>
                <Text style={s.label}>Full name</Text>
                <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={Colors.textLight} autoCapitalize="words" />
              </>
            )}
            <Text style={s.label}>Email address</Text>
            <TextInput
              style={s.input} value={email} onChangeText={setEmail}
              placeholder="you@gmail.com" placeholderTextColor={Colors.textLight}
              keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
              autoComplete="email" textContentType="emailAddress"
            />
            <Text style={s.label}>Password</Text>
            <View style={s.pwRow}>
              <TextInput
                style={[s.input, s.pwInput]} value={password} onChangeText={setPassword}
                placeholder="At least 8 characters" placeholderTextColor={Colors.textLight}
                secureTextEntry={!showPw} autoCapitalize="none" autoCorrect={false}
                textContentType={mode === 'signup' ? 'newPassword' : 'password'}
              />
              <TouchableOpacity onPress={() => setShowPw(v => !v)} style={s.eye} hitSlop={10}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textMid} />
              </TouchableOpacity>
            </View>

            {mode === 'signup' && (
              <>
                <Text style={s.label}>Farm location</Text>
                <TouchableOpacity style={s.gps} onPress={useGPS}>
                  <Ionicons name="locate" size={18} color={Colors.primary} />
                  <Text style={s.gpsText}>Use my device location (optional)</Text>
                </TouchableOpacity>
                <View style={s.pills}>
                  {locations.map(l => (
                    <TouchableOpacity key={l.key} onPress={() => { setLocation(l.key); setCoords(null); setLang(l.default_lang || lang); }} style={[s.pill, location === l.key && s.pillOn]}>
                      <Text style={[s.pillText, location === l.key && s.pillTextOn]}>{l.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {locations.length === 0 && <Text style={s.hint}>Towns could not be loaded yet. Check the server connection, or just continue with Kampala.</Text>}
                <Text style={s.label}>Language</Text>
                <View style={s.pills}>
                  {LANGUAGES.map(l => (
                    <TouchableOpacity key={l.code} onPress={() => setLang(l.code)} style={[s.pill, lang === l.code && s.pillOn]}>
                      <Text style={[s.pillText, lang === l.code && s.pillTextOn]}>{l.native}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </>
        )}

        {!!notice && (
          <View style={s.notice}>
            <Ionicons name="checkmark-circle" size={18} color={Colors.primaryDark} />
            <Text style={s.noticeText}>{notice}</Text>
          </View>
        )}
        {!!error && (
          <View style={s.error}>
            <Ionicons name="alert-circle" size={18} color="#b42318" />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity disabled={busy} onPress={submit} style={[s.cta, busy && { opacity: 0.8 }]}>
          <LinearGradient colors={Colors.gradientPrimary} style={s.ctaInner}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.ctaText}>{ctaLabel}</Text>}
          </LinearGradient>
        </TouchableOpacity>

        {mode === 'verify' && (
          <TouchableOpacity style={s.link} onPress={() => switchMode('signup')}>
            <Text style={s.linkText}>Wrong email? Back to sign up</Text>
          </TouchableOpacity>
        )}
        <Text style={s.privacy}>Your device location is optional. You can choose a town manually at any time.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 24, paddingBottom: 48 },
  logo: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 14 },
  brand: { fontSize: 21, fontWeight: '800', color: Colors.textDark, textAlign: 'center' },
  sub: { fontSize: 14, color: Colors.textMid, textAlign: 'center', lineHeight: 21, marginTop: 8, marginBottom: 20 },
  tabs: { flexDirection: 'row', backgroundColor: '#e8efeb', padding: 4, borderRadius: 14, marginBottom: 22 },
  tab: { flex: 1, padding: 12, borderRadius: 11, alignItems: 'center' },
  tabOn: { backgroundColor: '#fff' },
  tabText: { color: Colors.textMid, fontWeight: '600' },
  tabTextOn: { color: Colors.primary },
  title: { fontSize: 21, fontWeight: '800', color: Colors.textDark, textAlign: 'center', marginBottom: 2 },
  label: { fontSize: 13, fontWeight: '700', color: Colors.textDark, marginBottom: 7, marginTop: 13 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.borderStrong, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: Colors.textDark },
  codeInput: { textAlign: 'center', fontSize: 28, letterSpacing: 10, fontWeight: '700' },
  pwRow: { justifyContent: 'center' },
  pwInput: { paddingRight: 46 },
  eye: { position: 'absolute', right: 14 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 5, marginBottom: 8 },
  pill: { borderWidth: 1, borderColor: Colors.borderStrong, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff' },
  pillOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pillText: { color: Colors.textMid, fontSize: 12 },
  pillTextOn: { color: '#fff', fontWeight: '700' },
  gps: { flexDirection: 'row', gap: 8, alignItems: 'center', padding: 12, borderWidth: 1, borderColor: Colors.borderStrong, borderRadius: 12, backgroundColor: '#fff', marginBottom: 8 },
  gpsText: { color: Colors.primary, fontWeight: '700' },
  hint: { fontSize: 12, color: Colors.textMid, lineHeight: 18 },
  notice: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: Colors.primaryLight, padding: 12, borderRadius: 10, marginTop: 14 },
  noticeText: { flex: 1, color: Colors.primaryDark, fontSize: 13, lineHeight: 18 },
  error: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#fff0ef', padding: 12, borderRadius: 10, marginTop: 14 },
  errorText: { flex: 1, color: '#b42318', fontSize: 13, lineHeight: 18 },
  cta: { borderRadius: 13, overflow: 'hidden', marginTop: 20 },
  ctaInner: { padding: 16, alignItems: 'center', minHeight: 52, justifyContent: 'center' },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  link: { alignItems: 'center', padding: 12 },
  linkText: { color: Colors.primary, fontWeight: '700' },
  linkDisabled: { color: Colors.textLight },
  privacy: { fontSize: 11, color: Colors.textLight, textAlign: 'center', lineHeight: 17, marginTop: 20 },
});
