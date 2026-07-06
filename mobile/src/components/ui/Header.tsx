import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme";

export function Logo({ size = 30 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.logoRow}>
      <View style={[styles.logoMark, { width: size, height: size, backgroundColor: colors.brand }]}>
        <Ionicons name="car-sport" size={size * 0.58} color="#0F1216" />
      </View>
      <Text style={[styles.logoText, { color: colors.ink }]}>
        Taxi<Text style={{ color: colors.brandDark }}>Narx</Text>
      </Text>
    </View>
  );
}

export function Header({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.inkMuted }]}>{subtitle}</Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

export function IconButton({
  name,
  onPress,
  color,
}: {
  name: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  color?: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.iconBtn,
        { backgroundColor: colors.card, borderColor: colors.line, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Ionicons name={name} size={18} color={color || colors.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  logoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoMark: { borderRadius: 9, alignItems: "center", justifyContent: "center" },
  logoText: { fontSize: 19, fontWeight: "900" },
  header: { flexDirection: "row", alignItems: "center", marginTop: 4, marginBottom: 2 },
  title: { fontSize: 24, fontWeight: "900" },
  subtitle: { fontSize: 13, marginTop: 2, lineHeight: 18 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
});
