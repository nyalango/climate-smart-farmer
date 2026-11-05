import 'react-native-gesture-handler';
import React, { useCallback, useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import SplashScreen from './src/screens/SplashScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import WeekScreen from './src/screens/WeekScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ChatBotScreen from './src/screens/ChatBotScreen';
import { ThemeProvider, useTheme } from './src/theme/colors';
import { hasSeenWelcome } from './src/services/weatherService';
import { isSignedIn, signOut } from './src/services/authService';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function HomeStack() {
  const { Colors: palette } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: palette.surfaceSolid },
        headerTintColor: palette.textDark,
        headerTitleStyle: { fontWeight: '800', fontSize: 17 },
        headerShadowVisible: false,
        cardStyle: { backgroundColor: palette.background },
      }}
    >
      <Stack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ title: 'Climate Smart Farmer' }}
      />
      <Stack.Screen
        name="Week"
        component={WeekScreen}
        options={{ title: '7-Day Forecast' }}
      />
    </Stack.Navigator>
  );
}

function MainTabs({ onSignOut }) {
  const { Colors: c } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: route.name !== 'Home',
        headerStyle: { backgroundColor: c.surfaceSolid },
        headerTintColor: c.textDark,
        headerTitleStyle: { fontWeight: '800' },
        headerShadowVisible: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textLight,
        tabBarStyle: {
          backgroundColor: c.surfaceSolid,
          borderTopColor: c.border,
          height: 62,
          paddingTop: 6,
          paddingBottom: 7,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Home: focused ? 'leaf' : 'leaf-outline',
            Chat: focused ? 'chatbubbles' : 'chatbubbles-outline',
            Settings: focused ? 'settings' : 'settings-outline',
          };

          return (
            <Ionicons
              name={icons[route.name]}
              size={size || 23}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{ title: 'Today' }}
      />

      <Tab.Screen
        name="Chat"
        component={ChatBotScreen}
        options={{ title: 'Advisor' }}
      />

      <Tab.Screen name="Settings" options={{ title: 'Settings' }}>
        {() => <SettingsScreen onSignOut={onSignOut} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

function AppContent() {
  const { theme } = useTheme();

  const [stage, setStage] = useState('splash');
  const [splashDone, setSplashDone] = useState(false);
  const [boot, setBoot] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [seenWelcome, signedIn] = await Promise.all([
          hasSeenWelcome(),
          isSignedIn(),
        ]);

        setBoot({ seenWelcome, signedIn });
      } catch {
        setBoot({ seenWelcome: false, signedIn: false });
      }
    })();
  }, []);

  useEffect(() => {
    if (!splashDone || !boot) return;

    setStage(
      !boot.seenWelcome
        ? 'welcome'
        : boot.signedIn
          ? 'main'
          : 'auth'
    );
  }, [splashDone, boot]);

  const afterWelcome = useCallback(async () => {
    setStage((await isSignedIn()) ? 'main' : 'auth');
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
    } catch (e) {
      console.error('[SIGNOUT]', e);
    }
    setStage('auth');
  }, []);

  let content;

  if (stage === 'splash') {
    content = <SplashScreen onFinish={() => setSplashDone(true)} />;
  } else if (stage === 'welcome') {
    content = <WelcomeScreen onDone={afterWelcome} />;
  } else if (stage === 'auth') {
    content = (
      <AuthScreen onAuthenticated={() => setStage('main')} />
    );
  } else {
    content = <MainTabs onSignOut={handleSignOut} />;
  }

  const isAuthLike = stage === 'welcome' || stage === 'auth';
  const navTheme = theme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <>
      <StatusBar
        style={
          isAuthLike
            ? 'dark'
            : theme === 'dark'
              ? 'light'
              : 'dark'
        }
      />
      {isAuthLike ? (
        content
      ) : (
        <NavigationContainer theme={navTheme}>
          {content}
        </NavigationContainer>
      )}
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}