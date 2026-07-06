import React, { useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, Pressable } from "react-native";
import { useRouter, Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/store/auth";
import { useTheme } from "@/theme";
import { Logo } from "@/components/ui/Header";
import { Field } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuth((s) => s.login);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [phone, setPhone] = useState("+998");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await login(phone.trim(), password);
      const dest =
        user.role === "driver"
          ? "/(tabs)"
          : !user.profile_completed
          ? "/(tabs)"
          : "/(tabs)";
      router.replace(dest);
    } catch (err: any) {
      setError(err?.data?.detail || "Telefon yoki parol noto'g'ri");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.flex, { backgroundColor: colors.bg }]}
    >
      <View style={[styles.container, { paddingTop: insets.top + 30 }]}>
        <View style={styles.logoWrap}>
          <Logo size={42} />
          <Text style={[styles.tagline, { color: colors.inkMuted }]}>
            Toshkentdagi barcha taksilarni bir joyda taqqoslang
          </Text>
        </View>

        <Card padded>
          <Text style={[styles.title, { color: colors.ink }]}>Hisobingizga kiring</Text>
          <Text style={[styles.subtitle, { color: colors.inkMuted }]}>
            Telefon raqamingiz va parolingizni kiriting
          </Text>

          <View style={{ gap: 14, marginTop: 18 }}>
            <Field
              label="Telefon raqam"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="+998 90 123 45 67"
              leftIcon={<Ionicons name="call-outline" size={18} color={colors.inkMuted} />}
            />
            <Field
              label="Parol"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.inkMuted} />}
            />

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: colors.redBg }]}>
                <Text style={{ color: colors.red, fontSize: 13, fontWeight: "600" }}>{error}</Text>
              </View>
            ) : null}

            <Button title="Kirish" onPress={submit} loading={loading} />
          </View>

          <View style={styles.footer}>
            <Text style={{ color: colors.inkMuted, fontSize: 14 }}>Hisobingiz yo'qmi? </Text>
            <Link href="/(auth)/register" asChild>
              <Pressable>
                <Text style={{ color: colors.brandDark, fontWeight: "800", fontSize: 14 }}>
                  Ro'yhatdan o'tish
                </Text>
              </Pressable>
            </Link>
          </View>

          <View style={[styles.demo, { backgroundColor: colors.brand + "1A", borderColor: colors.brand + "44" }]}>
            <Text style={{ color: colors.inkMuted, fontSize: 12 }}>
              <Text style={{ fontWeight: "800", color: colors.ink }}>Sinov: </Text>
              +998900000000 / admin12345
            </Text>
          </View>
        </Card>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 20, justifyContent: "flex-start" },
  logoWrap: { alignItems: "center", marginBottom: 28 },
  tagline: { fontSize: 13, marginTop: 10, textAlign: "center", maxWidth: 260, lineHeight: 18 },
  title: { fontSize: 22, fontWeight: "900" },
  subtitle: { fontSize: 13, marginTop: 4 },
  errorBox: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  demo: { marginTop: 16, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
});
