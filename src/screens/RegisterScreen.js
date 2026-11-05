// src/screens/RegisterScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { LANGUAGES, APP_NAME } from '../config/api';
import { registerFarmer, getLocations } from '../services/weatherService';

export default function RegisterScreen() {
  const [name,     setName]     = useState('');
  const [phone,    setPhone]    = useState('');
  const [email,    setEmail]    = useState('');
  const [lang,     setLang]     = useState('en');
  const [channel,  setChannel]  = useState('sms');
  const [location, setLocation] = useState(null);
  const [locations,setLocations]= useState([]);
  const [loadingLocs, setLoadingLocs] = useState(true);
  const [loading,   setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [farmerId,  setFarmerId]  = useState(null);
  const [error,     setError]     = useState(null);

  useEffect(() => {
    async function fetchLocs() {
      setLoadingLocs(true);
      const data = await getLocations();
      setLocations(data);
      setLoadingLocs(false);
      
      if (!location && data.length > 0) {
        const kampala = data.find(l => l.key === 'kampala') || data[0];
        setLocation(kampala);
        setLang(kampala.default_lang || 'en');
      }
    }
    fetchLocs();
  }, []);

  async function handleSubmit() {
    setError(null);
    
    if (!name.trim()) { 
      setError('Please enter your name.'); 
      return; 
    }
    if (!location) { 
      setError('Please select your nearest town.'); 
      return; 
    }
    if ((channel === 'sms'  || channel === 'both') && !phone.trim()) {
      setError('Phone number required for SMS alerts.'); 
      return;
    }
    if ((channel === 'email' || channel === 'both') && !email.trim()) {
      setError('Email address required for email alerts.'); 
      return;
    }

    setLoading(true);
    
    const body = {
      name          : name.trim(),
      latitude      : location.latitude,
      longitude     : location.longitude,
      location_name : location.name,
      language_code : lang,
      channel,
      ...(phone ? { phone: phone.trim() } : {}),
      ...(email ? { email: email.trim() } : {}),
    };

    const result = await registerFarmer(body);
    setLoading(false);

    if (result) {
      setFarmerId(result.farmer_id || result.id || 'registered');
      setSubmitted(true);
    } else {
      setError('Registration failed. Check your internet connection and try again.');
    }
  }

  if (submitted) {
    return (
      <View style={styles.successContainer}>
        <LinearGradient colors={Colors.gradientPrimary} style={styles.successCircle}>
          <Ionicons name="checkmark" size={48} color="#fff" />
        </LinearGradient>
        <Text style={styles.successTitle}>You're Registered!</Text>
        <Text style={styles.successSub}>
          Welcome, {name.split(' ')[0]}.{'\n'}
          You will receive daily weather alerts at 6AM via {channel.toUpperCase()}.
        </Text>
        
        {farmerId && (
          <View style={styles.idBox}>
            <Text style={styles.idLabel}>Your Farmer ID</Text>
            <Text style={styles.idValue}>{farmerId}</Text>
          </View>
        )}
        
        <TouchableOpacity 
          style={styles.doneBtn} 
          onPress={() => setSubmitted(false)}
        >
          <Text style={styles.doneBtnText}>Back to Form</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flexFill}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.appLabel}>{APP_NAME}</Text>
        <Text style={styles.subtitle}>
          Get localized weather alerts and farming advice before you head to the field. Supports SMS for users with limited internet.
        </Text>

        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Nakato Grace"
          autoCapitalize="words"
          placeholderTextColor={Colors.textLight}
        />

        <Text style={styles.label}>Nearest Town / Location</Text>
        <View style={styles.pickerBox}>
          {loadingLocs ? (
            <View style={styles.loadingWrapper}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={styles.loadingTextSmall}>Connecting to server...</Text>
            </View>
          ) : locations.length === 0 ? (
            <View style={styles.errorPicker}>
              <Ionicons name="cloud-offline-outline" size={20} color={Colors.danger} />
              <Text style={styles.errorPickerText}>
                Could not load locations. {'\n'}Check IP in api.js.
              </Text>
            </View>
          ) : (
            locations.map(loc => (
              <TouchableOpacity
                key={loc.key}
                style={[
                  styles.pill,
                  location?.key === loc.key && styles.pillActive,
                ]}
                onPress={() => {
                  setLocation(loc);
                  setLang(loc.default_lang || 'en');
                }}
              >
                <Text style={[
                  styles.pillText,
                  location?.key === loc.key && styles.pillTextActive,
                ]}>
                  {loc.name}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        <Text style={styles.label}>Alert Language</Text>
        <View style={styles.pickerBox}>
          {LANGUAGES.map(l => (
            <TouchableOpacity
              key={l.code}
              style={[styles.pill, lang === l.code && styles.pillActive]}
              onPress={() => setLang(l.code)}
            >
              <Text style={[
                styles.pillText,
                lang === l.code && styles.pillTextActive,
              ]}>
                {l.native}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Delivery Method</Text>
        <View style={styles.channelRow}>
          {[
            { value: 'sms',   label: 'SMS', icon: 'chatbubble-ellipses-outline' },
            { value: 'email', label: 'Email', icon: 'mail-outline' },
            { value: 'both',  label: 'Both', icon: 'layers-outline' },
          ].map(c => (
            <TouchableOpacity
              key={c.value}
              style={[
                styles.channelBtn,
                channel === c.value && styles.channelBtnActive,
              ]}
              onPress={() => setChannel(c.value)}
            >
              <Ionicons 
                name={c.icon} 
                size={20} 
                color={channel === c.value ? Colors.primary : Colors.textMid} 
                style={{ marginBottom: 4 }}
              />
              <Text style={[
                styles.channelText,
                channel === c.value && styles.channelTextActive,
              ]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {(channel === 'sms' || channel === 'both') && (
          <>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+256700000000"
              keyboardType="phone-pad"
              placeholderTextColor={Colors.textLight}
            />
          </>
        )}

        {(channel === 'email' || channel === 'both') && (
          <>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="farmer@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={Colors.textLight}
            />
          </>
        )}

        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={Colors.danger} style={styles.errorIconInline} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, (loading || loadingLocs) && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={loading || loadingLocs}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={Colors.gradientPrimary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitGrad}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.submitText}>Complete Registration</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
        
        <Text style={styles.hint}>
          By registering, you agree to receive automated weather and farming updates.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flexFill: { flex: 1 },
  container : { flex: 1, backgroundColor: Colors.background },
  content   : { padding: 20, paddingBottom: 40 },
  appLabel: {
    fontSize: 13, fontWeight: '600', color: Colors.primary, marginBottom: 6,
  },
  subtitle: {
    fontSize: 15, color: Colors.textMid,
    marginBottom: 20, lineHeight: 22,
  },
  label: {
    fontSize: 14, fontWeight: '600',
    color: Colors.textDark, marginBottom: 8, marginTop: 16,
  },
  input: {
    backgroundColor: Colors.surfaceSolid, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: Colors.textDark,
  },
  pickerBox: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    minHeight: 40,
  },
  pill: {
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: Colors.surfaceSolid,
  },
  pillActive: {
    backgroundColor: Colors.primary, borderColor: Colors.primary,
  },
  pillText      : { fontSize: 13, color: Colors.textMid, fontWeight: '500' },
  pillTextActive: { color: '#fff', fontWeight: '600' },
  loadingWrapper: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    width: '100%', paddingVertical: 10,
  },
  loadingTextSmall: { marginLeft: 8, fontSize: 12, color: Colors.textMid },
  errorPicker: {
    width: '100%', padding: 12, backgroundColor: '#FFF5F5',
    borderRadius: 10, borderWidth: 1, borderColor: '#FFEBEE',
    alignItems: 'center',
  },
  errorPickerText: { fontSize: 12, color: Colors.danger, textAlign: 'center', marginTop: 4 },
  channelRow: { flexDirection: 'row', gap: 10 },
  channelBtn: {
    flex: 1, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: 14, paddingVertical: 12, alignItems: 'center',
    backgroundColor: Colors.surfaceSolid,
  },
  channelBtnActive: {
    borderColor: Colors.primary, backgroundColor: Colors.primaryLight,
  },
  channelText      : { fontSize: 12, color: Colors.textMid, fontWeight: '500' },
  channelTextActive: { color: Colors.primary, fontWeight: '700' },
  errorBox: {
    backgroundColor: '#FDECEA', borderRadius: 10,
    borderWidth: 1, borderColor: '#F5C6CB',
    padding: 12, marginTop: 16, flexDirection: 'row', alignItems: 'center',
  },
  errorIconInline: { marginRight: 8 },
  errorText: { color: Colors.danger, fontSize: 13, flex: 1 },
  submitBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 24 },
  submitGrad: {
    padding: 16, alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center',
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  hint: {
    textAlign: 'center', fontSize: 11,
    color: Colors.textLight, marginTop: 16, lineHeight: 16,
  },
  successContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 32, backgroundColor: Colors.background,
  },
  successCircle: {
    width: 100, height: 100, borderRadius: 50,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 26, fontWeight: '800',
    marginBottom: 12, color: Colors.textDark,
  },
  successSub: {
    textAlign: 'center', color: Colors.textMid,
    lineHeight: 24, marginBottom: 28, fontSize: 16,
  },
  idBox: {
    backgroundColor: Colors.surfaceSolid, borderRadius: 14,
    padding: 16, width: '100%', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
    marginBottom: 24,
  },
  idLabel: { fontSize: 12, color: Colors.textLight, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  idValue: { fontSize: 20, fontWeight: '700', color: Colors.primary },
  doneBtn: {
    paddingVertical: 12, paddingHorizontal: 24,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.border,
  },
  doneBtnText: { color: Colors.textMid, fontWeight: '600' },
});
