import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useTheme, radius } from "@/theme";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Header } from "@/components/ui/Header";
import { AddressInput, type AddressValue } from "@/components/AddressInput";
import { TierPicker } from "@/components/TierPicker";
import { PriceList } from "@/components/PriceList";
import { MapWebView, type MapRoute } from "@/components/MapWebView";
import { NotificationBell } from "@/components/NotificationBell";
import { apiPost } from "@/lib/api/client";
import { reverseGeocode } from "@/lib/api/geocoding";
import { formatNum } from "@/lib/format";
import type { EstimateResponse, Tier } from "@/lib/api/types";

export function PassengerHome() {
  const { colors, isDark } = useTheme();
  const [start, setStart] = useState<AddressValue | null>(null);
  const [end, setEnd] = useState<AddressValue | null>(null);
  const [data, setData] = useState<EstimateResponse | null>(null);
  const [pickup, setPickup] = useState<EstimateResponse | null>(null);
  const [tier, setTier] = useState<Tier>("econom");
  const [loading, setLoading] = useState(false);
  const [pickupLoading, setPickupLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculate = async () => {
    if (!start || !end) {
      setError("Boshlang'ich va manzil kiriting");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await apiPost<EstimateResponse>("/taxi/estimate/", {
        start_lat: start.lat,
        start_lng: start.lng,
        end_lat: end.lat,
        end_lng: end.lng,
        start_address: start.label,
        end_address: end.label,
      });
      setData(r);
      setPickup(null);
    } catch (err: any) {
      setError(err?.data?.detail || "Narxni hisoblab bo'lmadi");
    } finally {
      setLoading(false);
    }
  };

  const quickPickup = async () => {
    setPickupLoading(true);
    setError(null);
    try {
      let lat = start?.lat;
      let lng = start?.lng;
      if (lat == null || lng == null) {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.status !== "granted") {
          setError("Joylashuvga ruxsat berilmadi");
          return;
        }
        const pos = await Location.getCurrentPositionAsync({});
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        const geo = await reverseGeocode(lat, lng).catch(() => null);
        setStart({ label: geo?.label || `${lat.toFixed(4)}, ${lng.toFixed(4)}`, lat, lng });
      }
      const r = await apiPost<EstimateResponse>("/taxi/quick-local/", {
        lat,
        lng,
        sample_distance_km: 5,
      });
      setPickup(r);
    } catch (err: any) {
      setError(err?.data?.detail || "Xatolik yuz berdi");
    } finally {
      setPickupLoading(false);
    }
  };

  const swap = () => {
    setStart(end);
    setEnd(start);
  };

  // Narx qatorlari — yagona (asosiy) yo'l bo'yicha
  const tierRows = useMemo(
    () => (data?.results || []).filter((r) => r.service.tier === tier),
    [data, tier]
  );

  // Xarita uchun yo'l chiziqlari — faqat 1 va 2-yo'l ([lng,lat] -> [lat,lng]).
  const mapRoutes: MapRoute[] = useMemo(() => {
    const rts = (data?.routes || []).slice(0, 2);
    return rts.map((r, i) => ({
      id: r.id,
      coords: (r.geometry?.coordinates || []).map(
        ([lng, lat]) => [lat, lng] as [number, number]
      ),
      color: i === 0 ? "#FFCC00" : "#0066FF",
      selected: i === 0,
    }));
  }, [data]);

  return (
    <Screen>
      <Header
        title="Narxni hisoblang"
        subtitle="Eng arzon taksi variantini 1 soniyada toping"
        right={<NotificationBell />}
      />

      <Card padded>
        <AddressInput
          label="Qayerdan"
          value={start}
          onChange={setStart}
          iconName="ellipse"
          iconColor={colors.brandDark}
          showLocate
        />

        <View style={styles.swapWrap}>
          <View style={[styles.dottedLine, { borderColor: colors.line }]} />
          <Pressable
            onPress={swap}
            disabled={!start && !end}
            style={[styles.swapBtn, { backgroundColor: colors.cardAlt, borderColor: colors.line }]}
          >
            <Ionicons name="swap-vertical" size={20} color={colors.ink} />
          </Pressable>
        </View>

        <AddressInput
          label="Qayerga"
          value={end}
          onChange={setEnd}
          iconName="location"
          iconColor={colors.ink}
        />

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: colors.redBg }]}>
            <Text style={{ color: colors.red, fontSize: 13, fontWeight: "600" }}>{error}</Text>
          </View>
        ) : null}

        <Button
          title="Narxlarni ko'rish"
          onPress={calculate}
          loading={loading}
          style={{ marginTop: 16 }}
          icon={<Ionicons name="search" size={18} color="#0F1216" />}
        />
        <Button
          title="Hozirgi joyimdan chaqirsam qancha?"
          onPress={quickPickup}
          loading={pickupLoading}
          variant="outline"
          style={{ marginTop: 10 }}
          icon={<Ionicons name="locate" size={16} color={colors.ink} />}
        />
      </Card>

      {data && start && end ? (
        <View style={[styles.mapWrap, { borderColor: colors.line }]}>
          <MapWebView
            mode="route"
            isDark={isDark}
            markers={[
              { lat: start.lat, lng: start.lng, type: "start", label: "A" },
              { lat: end.lat, lng: end.lng, type: "end", label: "B" },
            ]}
            routes={mapRoutes}
            style={{ flex: 1 }}
          />
        </View>
      ) : null}

      {data ? (
        <Card padded style={styles.routeCard}>
          <View style={styles.routeRow}>
            {data.region ? (
              <RouteStat label="Tuman" value={data.region.name} colors={colors} />
            ) : null}
            <RouteStat label="Masofa" value={`${formatNum(data.route.distance_km, 1)} km`} colors={colors} />
            <RouteStat label="Vaqt" value={`${formatNum(data.route.duration_min, 0)} daq`} colors={colors} />
            {data.current_surge > 1.05 ? (
              <RouteStat label="Surge" value={`x${formatNum(data.current_surge, 1)}`} colors={colors} />
            ) : null}
          </View>
        </Card>
      ) : null}

      <View>
        <Text style={[styles.sectionTitle, { color: colors.inkMuted }]}>TARIFNI TANLANG</Text>
        <TierPicker rows={data?.results} selected={tier} onSelect={setTier} />
      </View>

      {pickup && pickup.results.length > 0 ? (
        <View>
          <Text style={[styles.sectionTitle, { color: colors.inkMuted }]}>
            HOZIRGI JOYDAN ~5 KM (TAXMINIY)
          </Text>
          <PriceList
            rows={pickup.results.filter((r) => r.service.tier === tier)}
            start={pickup.start}
            end={pickup.end}
            showBreakdown={false}
          />
        </View>
      ) : null}

      <View>
        <View style={styles.resultsHead}>
          <Text style={[styles.resultsTitle, { color: colors.ink }]}>Natijalar</Text>
          {tierRows.length > 0 ? (
            <Text style={{ color: colors.inkMuted, fontSize: 12 }}>{tierRows.length} ta tarif</Text>
          ) : null}
        </View>
        <PriceList
          rows={tierRows}
          start={start ? { lat: start.lat, lng: start.lng } : { lat: 0, lng: 0 }}
          end={end ? { lat: end.lat, lng: end.lng } : null}
        />
      </View>

      <Text style={[styles.disclaimer, { color: colors.inkMuted }]}>
        ⓘ Toshkent tariflari va real yo'l asosida hisoblangan taxminiy summa
      </Text>
    </Screen>
  );
}

function RouteStat({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: colors.inkMuted, fontSize: 10 }} numberOfLines={1}>{label}</Text>
      <Text style={{ color: colors.ink, fontSize: 13, fontWeight: "800", marginTop: 2 }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  swapWrap: { alignItems: "center", justifyContent: "center", height: 44, marginVertical: 8 },
  dottedLine: {
    position: "absolute",
    left: 16,
    width: 1,
    height: 44,
    borderLeftWidth: 1.5,
    borderStyle: "dashed",
  },
  swapBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  errorBox: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginTop: 12 },
  mapWrap: {
    height: 260,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  routeCard: { paddingVertical: 12 },
  routeRow: { flexDirection: "row", gap: 10 },
  sectionTitle: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5, marginBottom: 8, marginLeft: 2 },
  resultsHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  resultsTitle: { fontSize: 18, fontWeight: "900" },
  disclaimer: { fontSize: 11, textAlign: "center", marginTop: 4 },
});
