import React, { useEffect } from "react";
import { Platform, Text } from "react-native";
import { Tabs, Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/store/auth";
import { useTheme } from "@/theme";
import { registerPushToken } from "@/lib/push";

export default function TabsLayout() {
  const { user, hydrated } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // Foydalanuvchi kirgach push tokenni ro'yxatdan o'tkazamiz
  useEffect(() => {
    if (user) registerPushToken();
  }, [user?.id]);

  if (hydrated && !user) return <Redirect href="/(auth)/login" />;

  const isDriver = user?.role === "driver";

  // Navbar foni: kunduzi qora, tunda oq (foydalanuvchi so'rovi)
  const barBg = isDark ? "#FFFFFF" : "#0F1216";
  const activeColor = colors.brand; // sariq
  const inactiveColor = isDark ? "#8A93A0" : "#9AA3AE";

  // Yorliq doim bitta qatorda — uzun nom ("Statistika") tepaga chiqib ketmasligi uchun
  const tabLabel = (label: string) =>
    ({ color }: { color: string; focused: boolean }) =>
      (
        <Text
          numberOfLines={1}
          allowFontScaling={false}
          style={{ color, fontSize: 11, fontWeight: "800", textAlign: "center", width: 72 }}
        >
          {label}
        </Text>
      );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarItemStyle: { paddingTop: 10, paddingBottom: 10, justifyContent: "center" },
        // iPhone uslubidagi suzuvchi navbar — pastdan uzilgan, chetlardan qochgan
        tabBarStyle: {
          position: "absolute",
          left: 16,
          right: 16,
          bottom: insets.bottom > 0 ? insets.bottom + 4 : 14,
          height: 64,
          borderRadius: 22,
          backgroundColor: barBg,
          borderTopWidth: 0,
          paddingHorizontal: 6,
          elevation: 12,
          shadowColor: "#000",
          shadowOpacity: 0.25,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
        },
        tabBarHideOnKeyboard: Platform.OS === "android",
      }}
      // Suzuvchi navbar kontentni yopib qo'ymasligi uchun ekranlarga pastki bo'shliq
      // beradigan sceneContainerStyle (ekranlar ScrollView ichida pastki padding qo'shadi)
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Asosiy",
          tabBarLabel: tabLabel("Asosiy"),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: "Statistika",
          tabBarLabel: tabLabel("Statistika"),
          href: isDriver ? "/(tabs)/stats" : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "stats-chart" : "stats-chart-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="billing"
        options={{
          title: "Obuna",
          tabBarLabel: tabLabel("Obuna"),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "card" : "card-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarLabel: tabLabel("Profil"),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
