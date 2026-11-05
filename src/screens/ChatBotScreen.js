// src/screens/ChatBotScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { APP_NAME } from '../config/api';

// Local knowledge base derived from the Climate Smart Farmer Advisory docs
const KNOWLEDGE = [
  {
    keywords: ['plant', 'planting', 'when to plant', 'sow'],
    reply: 'Planting advice depends on your local forecast. Generally, wait for the start of reliable rains and avoid heavy rain days that cause waterlogging. For maize, plant when soil moisture is good after 2–3 consecutive rainy days. Check the 7-day forecast for dry spells before committing seed.',
  },
  {
    keywords: ['maize', 'corn'],
    reply: 'Maize needs consistent moisture during establishment and flowering. Avoid planting just before a predicted dry spell longer than 7–10 days. Side-dress nitrogen after the first weeding if rains are adequate. Watch for fall armyworm during warm, dry periods.',
  },
  {
    keywords: ['beans', 'bean'],
    reply: 'Beans are sensitive to waterlogging and prolonged dry spells at flowering. Prefer well-drained soils. Plant after the soil has received enough moisture but not during continuous heavy rain. Short-duration varieties help escape late-season drought.',
  },
  {
    keywords: ['coffee'],
    reply: 'Coffee benefits from mulching to conserve moisture during dry spells. Avoid heavy pruning just before drought. Watch for coffee berry disease in prolonged wet periods and apply recommended sprays only when conditions favour disease.',
  },
  {
    keywords: ['cassava'],
    reply: 'Cassava is relatively drought-tolerant once established. Plant at the beginning of the rains. Avoid waterlogged sites. During long dry spells, reduce weeding frequency to protect soil moisture.',
  },
  {
    keywords: ['banana', 'bananas'],
    reply: 'Bananas need regular moisture. Mulch heavily and maintain drainage channels to prevent waterlogging. During dry spells, prioritise irrigation or water harvesting for young plants.',
  },
  {
    keywords: ['rain', 'rainfall', 'heavy rain', 'flood'],
    reply: 'Heavy rain alerts mean prepare drainage, delay planting of sensitive crops, and protect harvested produce. Move livestock to higher ground if flooding is possible. After heavy rain, check for soil erosion and disease pressure.',
  },
  {
    keywords: ['dry', 'drought', 'dry spell'],
    reply: 'During dry spells: mulch, reduce tillage, prioritise water for critical growth stages, and consider drought-tolerant varieties next season. Avoid fertiliser application when soil is dry — it can burn roots.',
  },
  {
    keywords: ['wind', 'strong wind', 'storm'],
    reply: 'Strong winds can lodge maize and damage banana leaves. Stake young trees, harvest ripe fruit early if a storm is forecast, and secure temporary structures. After storms inspect for physical damage and disease entry points.',
  },
  {
    keywords: ['language', 'translate', 'luganda', 'swahili', 'acholi'],
    reply: 'This app supports English, Kiswahili, Luganda, Amharic, Kinyarwanda, Acholi and Runyankole. Change your preferred language in Settings. Alerts and forecasts will then appear in that language. Future updates will add text-to-speech for low-literacy users.',
  },
  {
    keywords: ['sms', 'alert', 'register', 'account', 'notification'],
    reply: 'Your account saves your town and language. The Today tab shows a colour-coded alert (critical, warning, caution, optimal) with a plain-language action, and the 7-day forecast shows the same for each day. SMS and email alert delivery is not available yet.',
  },
  {
    keywords: ['elnino', 'el nino', 'la nina', 'above normal', 'below normal'],
    reply: '“Above-normal rains” usually means higher flood and disease risk — improve drainage and watch for pests. “Below-normal” means plan for moisture stress: mulch, choose shorter varieties, and protect water sources. The app turns these technical terms into plain farming actions.',
  },
  {
    keywords: ['spray', 'pesticide', 'chemical'],
    reply: 'Only spray when weather conditions are suitable (low wind, no rain expected for several hours). Heavy rain soon after spraying washes chemicals away and pollutes water. Check the daily forecast before any chemical application.',
  },
  {
    keywords: ['hello', 'hi', 'hey', 'help', 'start'],
    reply: `Hello! I am the ${APP_NAME} advisory bot. Ask me about planting timing, maize, beans, coffee, cassava, bananas, rain, drought, winds, SMS alerts, or languages. I give practical East African farming advice based on climate information.`,
  },
];

function findReply(question) {
  const q = question.toLowerCase().trim();
  if (!q) return 'Please type a question about weather or farming.';

  // Match whole words/phrases so "hi" does not fire inside "which" or "rain" inside "train".
  const has = k => new RegExp('(^|[^a-z])' + k + '(s|es)?([^a-z]|$)').test(q);
  for (const item of KNOWLEDGE) {
    if (item.keywords.some(has)) {
      return item.reply;
    }
  }
  return 'I can help with planting timing, crop-specific advice (maize, beans, coffee, cassava, bananas), rain/drought/wind alerts, languages, and your account. Try asking about one of those topics, or check the 7-day forecast for location-specific actions.';
}

export default function ChatBotScreen() {
  const [messages, setMessages] = useState([
    {
      id: '0',
      from: 'bot',
      text: `Welcome to the Climate Smart Farmer Advisory bot. Ask me anything about planting, crops, rain, dry spells, or how to use the app. I speak plain language for East African farmers.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    if (messages.length) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages, typing]);

  function send() {
    const text = input.trim();
    if (!text) return;

    const userMsg = { id: Date.now().toString(), from: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    // Simulate thinking then reply
    setTimeout(() => {
      const reply = findReply(text);
      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), from: 'bot', text: reply },
      ]);
      setTyping(false);
    }, 600 + Math.random() * 400);
  }

  function renderItem({ item }) {
    const isBot = item.from === 'bot';
    return (
      <View style={[styles.bubbleRow, isBot ? styles.botRow : styles.userRow]}>
        {isBot && (
          <View style={styles.avatar}>
            <Ionicons name="leaf" size={16} color="#fff" />
          </View>
        )}
        <View style={[styles.bubble, isBot ? styles.botBubble : styles.userBubble]}>
          <Text style={[styles.bubbleText, isBot ? styles.botText : styles.userText]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 80}
    >
      <LinearGradient colors={Colors.gradientSoft} style={styles.headerBg}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="chatbubbles" size={22} color={Colors.primary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Farm Advisory Bot</Text>
            <Text style={styles.headerSub}>Ask about weather • crops • planting</Text>
          </View>
        </View>
      </LinearGradient>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      {typing && (
        <View style={styles.typingRow}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.typingText}>Advisor is typing…</Text>
        </View>
      )}

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask about planting, maize, rain…"
          placeholderTextColor={Colors.textLight}
          multiline
          maxLength={400}
          onSubmitEditing={send}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
          onPress={send}
          disabled={!input.trim() || typing}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  headerBg: {
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  header: { flexDirection: 'row', alignItems: 'center' },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textDark },
  headerSub: { fontSize: 12, color: Colors.textMid, marginTop: 2 },
  list: { padding: 16, paddingBottom: 8 },
  bubbleRow: { flexDirection: 'row', marginBottom: 12, maxWidth: '92%' },
  botRow: { alignSelf: 'flex-start' },
  userRow: { alignSelf: 'flex-end', justifyContent: 'flex-end' },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 4,
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 11,
    maxWidth: '100%',
  },
  botBubble: {
    backgroundColor: Colors.surfaceSolid,
    borderWidth: 1,
    borderColor: Colors.border,
    borderTopLeftRadius: 6,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderTopRightRadius: 6,
  },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  botText: { color: Colors.textDark },
  userText: { color: '#fff' },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  typingText: { marginLeft: 8, fontSize: 12, color: Colors.textMid },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surfaceSolid,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: Colors.background,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.textDark,
    marginRight: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.45 },
});
