import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider, useTheme } from "@/theme";
import { useAuth } from "@/store/auth";
import { NotificationProvider } from "@/lib/notifications";

function RootNavigator() {
  const { isDark, colors } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: "fade",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const bootstrap = useAuth((s) => s.bootstrap);

  useEffect(() => {
    bootstrap();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <NotificationProvider>
          <RootNavigator />
        </NotificationProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
