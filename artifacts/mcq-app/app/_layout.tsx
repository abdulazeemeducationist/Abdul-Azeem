import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { Ionicons } from "@expo/vector-icons";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/context/AuthContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const isLoggedIn = !!user;

  useEffect(() => {
    if (!isLoading) {
      if (isLoggedIn) {
        router.replace("/(tabs)");
      } else {
        router.replace("/auth/signin");
      }
    }
  }, [isLoggedIn, isLoading]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="auth/signin" options={{ headerShown: false }} />
      <Stack.Screen name="auth/signup" options={{ headerShown: false }} />
      <Stack.Screen name="auth/reset" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="levels/[courseId]" options={{ headerShown: false }} />
      <Stack.Screen name="papers/[levelId]" options={{ headerShown: false }} />
      <Stack.Screen name="subjects/[courseId]" options={{ headerShown: false }} />
      <Stack.Screen name="chapters/[subjectId]" options={{ headerShown: false }} />
      <Stack.Screen name="chapters-list/[subjectId]" options={{ headerShown: false }} />
      <Stack.Screen name="topics/[chapterId]" options={{ headerShown: false }} />
      <Stack.Screen name="practice/[topicId]" options={{ headerShown: false }} />
      <Stack.Screen name="results/[topicId]" options={{ headerShown: false }} />
      <Stack.Screen name="admin/index" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    ...Ionicons.font,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  const isWeb = Platform.OS === "web";

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <GestureHandlerRootView style={styles.root}>
              <KeyboardProvider>
                {isWeb ? (
                  <View style={styles.webWrapper}>
                    <View style={styles.webContainer}>
                      <RootLayoutNav />
                    </View>
                  </View>
                ) : (
                  <RootLayoutNav />
                )}
              </KeyboardProvider>
            </GestureHandlerRootView>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  webWrapper: {
    flex: 1,
    backgroundColor: "#E8EDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  webContainer: {
    width: "100%",
    maxWidth: 430,
    height: "100%",
    backgroundColor: "#F8FAFC",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
  },
});
