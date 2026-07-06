import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  TextInput,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, radius } from "@/theme";
import {
  debouncedSearch,
  reverseGeocode,
  shortenLabel,
  TASHKENT_PRESETS,
  type SearchResult,
} from "@/lib/api/geocoding";
import { MapPicker } from "@/components/MapPicker";

export interface AddressValue {
  label: string;
  lat: number;
  lng: number;
}

export function AddressInput({
  label,
  value,
  onChange,
  iconName = "location-outline",
  iconColor,
  showLocate = false,
}: {
  label: string;
  value: AddressValue | null;
  onChange: (v: AddressValue | null) => void;
  iconName?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  showLocate?: boolean;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);

  const onTyping = (text: string) => {
    setQuery(text);
    if (!text) {
      setResults([]);
      return;
    }
    setSearching(true);
    debouncedSearch(text, (r) => {
      setResults(r);
      setSearching(false);
    });
  };

  const pick = (v: AddressValue) => {
    onChange(v);
    setOpen(false);
    setQuery("");
    setResults([]);
  };

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") {
        setLocating(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      const { latitude: lat, longitude: lng } = pos.coords;
      try {
        const geo = await reverseGeocode(lat, lng);
        pick({ label: geo.label || `${lat.toFixed(4)}, ${lng.toFixed(4)}`, lat, lng });
      } catch {
        pick({ label: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, lat, lng });
      }
    } catch {
      /* ignore */
    } finally {
      setLocating(false);
    }
  };

  const presets = query.trim()
    ? TASHKENT_PRESETS.filter((p) => p.label.toLowerCase().includes(query.toLowerCase()))
    : TASHKENT_PRESETS;

  return (
    <View>
      <Text style={[styles.label, { color: colors.inkMuted }]}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.field, { backgroundColor: colors.card, borderColor: colors.line }]}
      >
        <Ionicons name={iconName} size={18} color={iconColor || colors.inkMuted} />
        <Text
          style={[
            styles.fieldText,
            { color: value ? colors.ink : colors.inkMuted },
          ]}
          numberOfLines={1}
        >
          {value ? value.label : "Manzil yoki joy nomini tanlang..."}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={colors.inkMuted} />
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={[styles.modal, { backgroundColor: colors.bg, paddingTop: insets.top + 8 }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.ink }]}>{label}</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={10}>
              <Ionicons name="close" size={26} color={colors.ink} />
            </Pressable>
          </View>

          <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.line }]}>
            <Ionicons name="search" size={18} color={colors.inkMuted} />
            <TextInput
              autoFocus
              value={query}
              onChangeText={onTyping}
              placeholder="Qidiruv..."
              placeholderTextColor={colors.inkMuted}
              style={[styles.searchInput, { color: colors.ink }]}
            />
            {searching ? <ActivityIndicator size="small" color={colors.brandDark} /> : null}
          </View>

          <View style={styles.actionRow}>
            <Pressable
              onPress={() => setMapOpen(true)}
              style={[styles.actionBtn, { backgroundColor: colors.ink, borderColor: colors.ink }]}
            >
              <Ionicons name="map" size={16} color={colors.card} />
              <Text style={[styles.locateTxt, { color: colors.card }]}>
                Lokatsiyadan tanlash
              </Text>
            </Pressable>
            {showLocate ? (
              <Pressable
                onPress={useCurrentLocation}
                style={[styles.actionBtn, { backgroundColor: colors.brand + "22", borderColor: colors.brand }]}
              >
                {locating ? (
                  <ActivityIndicator size="small" color={colors.brandDark} />
                ) : (
                  <Ionicons name="navigate" size={16} color={colors.brandDark} />
                )}
                <Text style={[styles.locateTxt, { color: colors.brandDark }]}>
                  Joriy joyim
                </Text>
              </Pressable>
            ) : null}
          </View>

          <FlatList
            data={[...results, ...presets]}
            keyExtractor={(item, i) => `${item.label}-${i}`}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
            ListHeaderComponent={
              <Text style={[styles.sectionLabel, { color: colors.inkMuted }]}>
                {results.length > 0 ? "QIDIRUV NATIJASI" : "MASHHUR JOYLAR"}
              </Text>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => pick({ label: shortenLabel(item.label), lat: item.lat, lng: item.lng })}
                style={[styles.resultRow, { borderBottomColor: colors.line }]}
              >
                <Ionicons name="location" size={16} color={colors.brandDark} />
                <Text style={[styles.resultText, { color: colors.ink }]} numberOfLines={2}>
                  {shortenLabel(item.label)}
                </Text>
              </Pressable>
            )}
          />
        </View>
      </Modal>

      <MapPicker
        visible={mapOpen}
        title={label}
        initial={value}
        onClose={() => setMapOpen(false)}
        onConfirm={(v) => {
          setMapOpen(false);
          pick(v);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: "700", marginBottom: 6, marginLeft: 2 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 52,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: 12,
  },
  fieldText: { flex: 1, fontSize: 15, fontWeight: "500" },
  modal: { flex: 1, paddingHorizontal: 16 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  modalTitle: { fontSize: 20, fontWeight: "900" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 50,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, fontSize: 16 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 46,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  locateTxt: { fontSize: 13, fontWeight: "800" },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginTop: 18,
    marginBottom: 6,
    marginLeft: 2,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultText: { flex: 1, fontSize: 15, lineHeight: 20 },
});
