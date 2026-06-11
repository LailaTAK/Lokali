// mobile/app/_layout.tsx

import React, { useEffect } from 'react';
import { Stack, useSegments, router } from 'expo-router';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '../src/stores/auth.store';
import { useAuth } from '../src/hooks/useAuth';
import { notificationsService } from '../src/services/notifications.service';
import { colors } from '../src/constants/colors';
import { fontWeight } from '../src/constants/spacing';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const { initializeAuth } = useAuth();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const segments = useSegments();

  // 1. Initial startup runs (fonts & authentication restoration)
  useEffect(() => {
    async function prepare() {
      try {
        await initializeAuth();
      } catch (e) {
        console.warn('Error during auth initialization:', e);
      } finally {
        if (fontsLoaded || fontError) {
          await SplashScreen.hideAsync();
        }
      }
    }
    prepare();
  }, [fontsLoaded, fontError]);

  // 2. Setup notifications subscription handlers
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      // Setup push token on server
      notificationsService.registerForPushNotifications(user.id);
    }
    
    // Subscribe to foreground/background callbacks
    const unsubscribeNotifications = notificationsService.setupNotificationHandlers();
    return () => {
      unsubscribeNotifications();
    };
  }, [isAuthenticated, user?.id]);

  // 3. Routing guards and redirection logic depending on authentication and role
  useEffect(() => {
    // If fonts are not loaded yet, wait to prevent routing issues
    if (!fontsLoaded && !fontError) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inClientGroup = segments[0] === '(client)';
    const inLoueurGroup = segments[0] === '(loueur)';
    const inAdminGroup = segments[0] === '(admin)';

    if (!isAuthenticated) {
      // Force unauthenticated users to Login screen
      if (!inAuthGroup) {
        router.replace('/login');
      }
    } else if (user) {
      // Redirect authenticated users trying to access login screens or incorrect group sections
      if (inAuthGroup) {
        if (user.role === 'ADMINISTRATEUR') {
          router.replace('/stats');
        } else if (user.role === 'LOUEUR') {
          router.replace('/dashboard');
        } else {
          router.replace('/');
        }
      } else if (user.role === 'CLIENT' && (inLoueurGroup || inAdminGroup)) {
        // CLIENT attempts to enter LOUEUR/ADMIN directories → bounce back
        router.replace('/');
      } else if (user.role === 'LOUEUR' && (inClientGroup || inAdminGroup)) {
        // LOUEUR attempts to enter CLIENT/ADMIN directories → redirect to host dashboard
        router.replace('/dashboard');
      } else if (user.role === 'ADMINISTRATEUR' && (inClientGroup || inLoueurGroup)) {
        // ADMINISTRATEUR attempts to enter CLIENT/HOST directories → redirect to admin dashboard
        router.replace('/stats');
      }
    }
  }, [isAuthenticated, user, segments, fontsLoaded, fontError]);

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.light.surface,
        },
        headerTintColor: colors.light.primary,
        headerTitleStyle: {
          fontWeight: fontWeight.bold,
          color: colors.light.text,
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: colors.light.background,
        },
      }}
    >
      {/* Root Navigation paths */}
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(client)" options={{ headerShown: false }} />
      <Stack.Screen name="(loueur)" options={{ headerShown: false }} />
      <Stack.Screen name="(admin)" options={{ headerShown: false }} />
    </Stack>
  );
}
