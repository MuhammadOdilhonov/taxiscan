import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, radius } from "@/theme";
import { formatUzs } from "@/lib/format";
import type { Tier, PriceRow } from "@/lib/api/types";

const TIERS: {
  code: Tier;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  desc: string;
}[] = [
  { code: "econom", label: "Start", icon: "car-outline", desc: "Eng arzon" },
  { code: "comfort", label: "Comfort", icon: "car-sport-outline", desc: "Qulayroq" },
  { code: "comfort_plus", label: "Comfort+", icon: "ribbon-outline", desc: "Yangi mashina" },
  { code: "business", label: "Business", icon: "briefcase-outline", desc: "Premium" },
];

export function TierPicker({
  rows,
  selected,
  onSelect,
}: {
  rows?: PriceRow[];
  selected: Tier;
  onSelect: (t: Tier) => void;
}) {
  const { colors } = useTheme();

  const minByTier = useMemo(() => {
    const acc: Record<string, number | null> = {};
    for (const t of TIERS) {
      if (!rows || rows.length === 0) {
        acc[t.code] = null;
        continue;
      }
      const xs = rows.filter((r) => r.service.tier === t.code).map((r) => r.price_uzs);
      acc[t.code] = xs.length ? Math.min(...xs) : null;
    }
    return acc;
  }, [rows]);

  return (
    <View style={styles.grid}>
      {TIERS.map((t) => {
        const isSel = selected === t.code;
        const min = minByTier[t.code];
        return (
          <Pressable
            key={t.code}
            onPress={() => onSelect(t.code)}
            style={[
              styles.cell,
              {
                backgroundColor: isSel ? colors.brand : colors.card,
                borderColor: isSel ? colors.ink : colors.line,
              },
            ]}
          >
            <View style={styles.cellTop}>
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: isSel ? colors.ink : colors.cardAlt },
                ]}
              >
                <Ionicons
                  name={t.icon}
                  size={15}
                  color={isSel ? colors.brand : colors.inkMuted}
                />
              </View>
              <Text style={[styles.label, { color: isSel ? "#0F1216" : colors.ink }]}>
                {t.label}
              </Text>
            </View>
            <Text
              style={[
                styles.desc,
                { color: isSel ? "rgba(15,18,22,0.6)" : colors.inkMuted },
              ]}
            >
              {t.desc.toUpperCase()}
            </Text>
            <Text style={[styles.price, { color: isSel ? "#0F1216" : colors.ink }]}>
              {min != null ? (
                <>
                  <Text style={styles.dan}>dan </Text>
                  {formatUzs(min)}
                </>
              ) : (
                <Text style={{ color: isSel ? "rgba(15,18,22,0.6)" : colors.inkMuted, fontSize: 12 }}>
                  manzil kerak
                </Text>
              )}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  cell: {
    width: "47.5%",
    flexGrow: 1,
    borderWidth: 2,
    borderRadius: radius.lg,
    padding: 12,
  },
  cellTop: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  label: { fontSize: 14, fontWeight: "900" },
  desc: { fontSize: 9, fontWeight: "700", letterSpacing: 0.5 },
  price: { fontSize: 15, fontWeight: "900", marginTop: 6 },
  dan: { fontSize: 10, fontWeight: "700" },
});
