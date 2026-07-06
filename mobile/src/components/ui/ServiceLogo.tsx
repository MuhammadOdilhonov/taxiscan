import React from "react";
import { View, Text, StyleSheet } from "react-native";

const INITIALS: Record<string, string> = {
  yandex_go: "Y",
  yango: "Y!",
  mytaxi: "M",
  uzum_taxi: "U",
  on_taxi: "ON",
};

/** Tekst kontrastini fonga qarab tanlaydi (oq yoki qora) */
function contrastText(hex: string): string {
  const c = hex.replace("#", "");
  if (c.length < 6) return "#FFFFFF";
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.65 ? "#0F1216" : "#FFFFFF";
}

export function ServiceLogo({
  code,
  color,
  size = 44,
}: {
  code: string;
  color: string;
  size?: number;
}) {
  const initial = INITIALS[code] || (code ? code.charAt(0).toUpperCase() : "?");
  return (
    <View
      style={[
        styles.box,
        {
          width: size,
          height: size,
          borderRadius: size * 0.28,
          backgroundColor: color || "#888",
        },
      ]}
    >
      <Text style={{ color: contrastText(color || "#888"), fontWeight: "900", fontSize: size * 0.4 }}>
        {initial}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: "center",
    justifyContent: "center",
  },
});
