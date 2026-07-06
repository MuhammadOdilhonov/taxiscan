import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
} from "react-native";
import { useRouter, Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/store/auth";
import { useTheme, radius } from "@/theme";
import { Logo } from "@/components/ui/Header";
import { Field } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function RegisterScreen() {
  const router = useRouter();
  const register = useAuth((s) => s.register);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [role, setRole] = useState<"passenger" | "driver">("passenger");
  const [phone, setPhone] = useState("+998");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (password !== password2) {
      setError("Parollar mos kelmaydi");
      return;
    }
    if (password.length < 6) {
      setError("Parol kamida 6 ta belgidan iborat bo'lsin");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await register({
        phone: phone.trim(),
        password,
        password2,
        role,
        first_name: "",
        last_name: "",
        city: "Tashkent",
      });
      router.replace("/(tabs)");
    } catch (err: any) {
      const data = err?.data;
      const first =
        (data && typeof data === "object" && Object.values(data)[0]) ||
        "Ro'yhatdan o'tishda xatolik";
      setError(Array.isArray(first) ? first[0] : String(first));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.flex, { backgroundColor: colors.bg }]}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 30 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoWrap}>
          <Logo size={38} />
        </View>

        <Card padded>
          <Text style={[styles.title, { color: colors.ink }]}>Ro'yhatdan o'tish</Text>
          <Text style={[styles.subtitle, { color: colors.inkMuted }]}>
            Telefon va parolni kiriting. Qolgan ma'lumotlarni keyin to'ldirasiz.
          </Text>

          <View style={[styles.roleTabs, { backgroundColor: colors.cardAlt }]}>
            {([
              { key: "passenger", label: "Yo'lovchi", icon: "person-outline" },
              { key: "driver", label: "Haydovchi", icon: "car-outline" },
            ] as const).map((r) => {
              const sel = role === r.key;
              return (
                <Pressable
                  key={r.key}
                  onPress={() => setRole(r.key)}
                  style={[styles.roleTab, sel && { backgroundColor: colors.card }]}
                >
                  <Ionicons name={r.icon} size={16} color={sel ? colors.ink : colors.inkMuted} />
                  <Text style={[styles.roleTxt, { color: sel ? colors.ink : colors.inkMuted }]}>
                    {r.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={{ gap: 14, marginTop: 16 }}>
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
              placeholder="kamida 6 ta belgi"
              leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.inkMuted} />}
            />
            <Field
              label="Parolni tasdiqlang"
              value={password2}
              onChangeText={setPassword2}
              secureTextEntry
              placeholder="••••••"
              leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.inkMuted} />}
            />

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: colors.redBg }]}>
                <Text style={{ color: colors.red, fontSize: 13, fontWeight: "600" }}>{error}</Text>
              </View>
            ) : null}

            <Button title="Davom etish" onPress={submit} loading={loading} />
          </View>

          <View style={styles.footer}>
            <Text style={{ color: colors.inkMuted, fontSize: 14 }}>Hisobingiz bormi? </Text>
            <Link href="/(auth)/login" asChild>
              <Pressable>
                <Text style={{ color: colors.brandDark, fontWeight: "800", fontSize: 14 }}>Kirish</Text>
              </Pressable>
            </Link>
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { paddingHorizontal: 20 },
  logoWrap: { alignItems: "center", marginBottom: 20 },
  title: { fontSize: 22, fontWeight: "900" },
  subtitle: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  roleTabs: {
    flexDirection: "row",
    padding: 4,
    borderRadius: radius.md,
    marginTop: 18,
    gap: 4,
  },
  roleTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.sm,
  },
  roleTxt: { fontSize: 14, fontWeight: "800" },
  errorBox: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
});
