import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, radius } from "@/theme";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { Header, IconButton } from "@/components/ui/Header";
import { ServiceLogo } from "@/components/ui/ServiceLogo";
import { TierPicker } from "@/components/TierPicker";
import { PriceList } from "@/components/PriceList";
import { MapWebView, type MapZone } from "@/components/MapWebView";
import { NotificationBell } from "@/components/NotificationBell";
import { apiGet, apiPost } from "@/lib/api/client";
import { formatUzs, formatNum } from "@/lib/format";
import type { EstimateResponse, Region, Tier, DemandResponse, DemandRegion } from "@/lib/api/types";

const DEFAULT = { lat: 41.311, lng: 69.279 };

const LEVEL_LABEL: Record<string, string> = { high: "Yuqori talab", medium: "O'rtacha", low: "Past talab" };

/** GeoJSON geometry -> [lat,lng] ringlar (MapWebView zonasi uchun) */
function geometryToRings(geom: Region["geometry"]): [number, number][][] {
  if (!geom) return [];
  const toRing = (ring: any[]) => ring.map(([lng, lat]: number[]) => [lat, lng] as [number, number]);
  if (geom.type === "Polygon") return [toRing(geom.coordinates[0])];
  if (geom.type === "MultiPolygon") return geom.coordinates.map((poly: any[]) => toRing(poly[0]));
  return [];
}

export function DriverHome() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [mapFull, setMapFull] = useState(false);
  const [regions, setRegions] = useState<Region[]>([]);
  const [selected, setSelected] = useState<Region | null>(null);
  const [myLoc, setMyLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [data, setData] = useState<EstimateResponse | null>(null);
  const [stats, setStats] = useState<Record<number, number>>({});
  const [demand, setDemand] = useState<DemandResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [regionsError, setRegionsError] = useState(false);
  const [tier, setTier] = useState<Tier>("econom");

  const loadRegions = () => {
    setRegionsError(false);
    apiGet<{ results: Region[] }>("/taxi/regions/")
      .then((r) => setRegions(r.results || []))
      .catch(() => setRegionsError(true));
  };

  useEffect(() => {
    loadRegions();
    apiGet<any>("/stats/regions/?days=7")
      .then((r) => {
        const map: Record<number, number> = {};
        for (const x of r.regions || []) map[x.region_id] = x.avg_price;
        setStats(map);
      })
      .catch(() => {});

    (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.status === "granted") {
          const pos = await Location.getCurrentPositionAsync({});
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setMyLoc(loc);
          load(loc.lat, loc.lng);
          return;
        }
      } catch {
        /* fall through */
      }
      load(DEFAULT.lat, DEFAULT.lng);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async (lat: number, lng: number) => {
    setLoading(true);
    setError(null);
    try {
      const r = await apiPost<EstimateResponse>("/taxi/quick-local/", {
        lat,
        lng,
        sample_distance_km: 5,
      });
      setData(r);
    } catch (err: any) {
      setError(err?.data?.detail || "Ma'lumot olib bo'lmadi");
    } finally {
      setLoading(false);
    }
    // Talab (demand) — alohida, narx yuklanishiga to'sqinlik qilmasin
    apiPost<DemandResponse>("/taxi/demand/", { lat, lng })
      .then(setDemand)
      .catch(() => {});
  };

  // Tanlangan zona talabi (yoki hozirgi joy talabi)
  const activeDemand: DemandRegion | null = useMemo(() => {
    if (!demand) return null;
    if (selected) return demand.regions.find((r) => r.region_id === selected.id) || demand.here;
    return demand.here;
  }, [demand, selected]);

  const onRegion = (r: Region) => {
    setSelected(r);
    load(r.center_lat, r.center_lng);
  };

  const refresh = () => {
    if (selected) load(selected.center_lat, selected.center_lng);
    else if (myLoc) load(myLoc.lat, myLoc.lng);
    else load(DEFAULT.lat, DEFAULT.lng);
  };

  const tierRows = useMemo(
    () => (data?.results || []).filter((r) => r.service.tier === tier),
    [data, tier]
  );
  const sorted = useMemo(() => [...tierRows].sort((a, b) => b.price_uzs - a.price_uzs), [tierRows]);
  const top = sorted[0];
  const low = sorted[sorted.length - 1];

  // Xarita zonalari — barcha tumanlar (tanlangani ajratiladi)
  const zones: MapZone[] = useMemo(
    () =>
      regions
        .filter((r) => r.geometry)
        .map((r) => ({
          id: r.id,
          name: r.name,
          rings: geometryToRings(r.geometry),
          highlighted: selected?.id === r.id,
        })),
    [regions, selected]
  );

  return (
    <Screen refreshing={loading} onRefresh={refresh}>
      <Header
        title="Haydovchi paneli"
        subtitle="Qaysi xizmat qaysi zonada ko'p to'laydi"
        right={
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <NotificationBell />
            <IconButton name="refresh" onPress={refresh} />
          </View>
        }
      />

      {/* Tarif tanlovi — ixcham card, eng tepada */}
      <Card padded style={styles.tierCard}>
        <Text style={[styles.tierLabel, { color: colors.inkMuted }]}>TARIFNI TANLANG</Text>
        <TierPicker rows={data?.results} selected={tier} onSelect={setTier} />
      </Card>

      <View>
        <Text style={[styles.sectionTitle, { color: colors.inkMuted }]}>ZONANI TANLANG</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
        >
          {regions.map((r) => {
            const sel = selected?.id === r.id;
            return (
              <Pressable
                key={r.id}
                onPress={() => onRegion(r)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: sel ? colors.ink : colors.card,
                    borderColor: sel ? colors.ink : colors.line,
                  },
                ]}
              >
                <Ionicons name="location" size={11} color={sel ? colors.brand : colors.inkMuted} />
                <Text style={{ color: sel ? colors.card : colors.ink, fontSize: 12, fontWeight: "700" }}>
                  {r.name}
                </Text>
                {stats[r.id] ? (
                  <Text style={{ color: sel ? colors.brand : colors.inkMuted, fontSize: 10, fontWeight: "700" }}>
                    {formatUzs(stats[r.id]).replace(" so'm", "")}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
          {regions.length === 0 ? (
            regionsError ? (
              <Pressable onPress={loadRegions} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 6 }}>
                <Ionicons name="refresh" size={14} color={colors.brandDark} />
                <Text style={{ color: colors.brandDark, fontSize: 13, fontWeight: "700" }}>
                  Zonalar yuklanmadi — qayta urinish
                </Text>
              </Pressable>
            ) : (
              <Text style={{ color: colors.inkMuted, fontSize: 13, paddingVertical: 8 }}>
                Zonalar yuklanmoqda...
              </Text>
            )
          ) : null}
        </ScrollView>
      </View>

      {/* Toshkent tumanlari xaritasi — bosib zona tanlang.
          Zona nomi va narxlar overlay'i FAQAT to'liq ekran kartada ko'rinadi. */}
      {zones.length > 0 ? (
        <View style={[styles.mapWrap, { borderColor: colors.line }]}>
          <MapWebView
            mode="zones"
            isDark={isDark}
            zones={zones}
            userLoc={myLoc}
            onZonePress={(id) => {
              const reg = regions.find((x) => x.id === id);
              if (!reg) return;
              // Allaqachon tanlangan zonani qayta bossa — to'liq ekran ochiladi
              if (selected?.id === reg.id) setMapFull(true);
              else onRegion(reg);
            }}
            style={{ flex: 1 }}
          />
          {/* Kartani kattalashtirish tugmasi */}
          <Pressable
            onPress={() => setMapFull(true)}
            style={[styles.expandBtn, { backgroundColor: colors.card, borderColor: colors.line }]}
            hitSlop={6}
          >
            <Ionicons name="expand" size={18} color={colors.ink} />
          </Pressable>
        </View>
      ) : null}

      {/* To'liq ekran xarita — zona nomi (tepada) va narxlar (pastda) shu yerda ICHIDA turadi */}
      <Modal visible={mapFull} animationType="slide" onRequestClose={() => setMapFull(false)}>
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          <MapWebView
            mode="zones"
            isDark={isDark}
            zones={zones}
            userLoc={myLoc}
            onZonePress={(id) => {
              const reg = regions.find((x) => x.id === id);
              if (reg) onRegion(reg);
            }}
            style={{ flex: 1 }}
          />

          {/* Yopish tugmasi */}
          <Pressable
            onPress={() => setMapFull(false)}
            style={[styles.closeFull, { top: insets.top + 10, backgroundColor: colors.card, borderColor: colors.line }]}
            hitSlop={8}
          >
            <Ionicons name="close" size={22} color={colors.ink} />
          </Pressable>

          {/* Tepada — zona nomi yoki "Zonani tanlang" */}
          <View pointerEvents="none" style={[styles.fullTopOverlay, { top: insets.top + 12 }]}>
            <View style={[styles.zonePill, { backgroundColor: colors.card + "F2", borderColor: colors.line }]}>
              <Ionicons name="location" size={15} color={colors.brandDark} />
              <Text style={{ color: colors.ink, fontSize: 14, fontWeight: "900" }} numberOfLines={1}>
                {selected ? selected.name : data?.region?.name || "Zonani tanlang"}
              </Text>
              {selected && stats[selected.id] ? (
                <Text style={{ color: colors.brandDark, fontSize: 13, fontWeight: "900" }}>
                  · {formatUzs(stats[selected.id]).replace(" so'm", "")}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Pastda — karta ICHIDA yonga suriladigan taxi narxlari */}
          {data && tierRows.length > 0 ? (
            <View style={[styles.fullBottomOverlay, { bottom: insets.bottom + 16 }]}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingHorizontal: 14 }}
              >
                {[...tierRows].sort((a, b) => b.price_uzs - a.price_uzs).map((r) => (
                  <View key={r.service.id} style={[styles.priceChip, { backgroundColor: colors.card + "F2", borderColor: colors.line }]}>
                    <ServiceLogo code={r.service.code} color={r.service.color} size={30} />
                    <Text style={{ color: colors.ink, fontSize: 11, fontWeight: "800", marginTop: 4 }} numberOfLines={1}>
                      {r.service.brand}
                    </Text>
                    <Text style={{ color: colors.ink, fontSize: 13, fontWeight: "900", marginTop: 1 }}>
                      {formatUzs(r.price_uzs).replace(" so'm", "")}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : null}
        </View>
      </Modal>

      {demand?.enabled && activeDemand ? (
        <View style={[styles.demandCard, { backgroundColor: colors.card, borderColor: levelColor(activeDemand.level, colors) }]}>
          <View style={styles.demandHead}>
            <Ionicons name="pulse" size={16} color={levelColor(activeDemand.level, colors)} />
            <Text style={[styles.demandTitle, { color: colors.ink }]} numberOfLines={1}>
              {activeDemand.region_name}
              {activeDemand.rank ? <Text style={{ color: colors.inkMuted, fontWeight: "700" }}>  #{activeDemand.rank}</Text> : null}
            </Text>
            <View style={[styles.levelBadge, { backgroundColor: levelColor(activeDemand.level, colors) + "22" }]}>
              <Text style={{ color: levelColor(activeDemand.level, colors), fontSize: 11, fontWeight: "900" }}>
                {LEVEL_LABEL[activeDemand.level]}
              </Text>
            </View>
          </View>
          <View style={styles.demandStatsRow}>
            <DemandStat icon="people" value={activeDemand.searches.toLocaleString()} label={`qidiruv (${demand?.window || "7 kun"})`} color={colors.brandDark} colors={colors} />
            <View style={[styles.demandDivider, { backgroundColor: colors.line }]} />
            <DemandStat
              icon="cash-outline"
              value={activeDemand.avg_price ? formatUzs(activeDemand.avg_price).replace(" so'm", "") : "—"}
              label="o'rtacha narx"
              color={colors.ink}
              colors={colors}
            />
          </View>
          <Text style={[styles.demandHint, { color: colors.inkMuted }]}>
            Bu rayon barcha qidiruvlarning {activeDemand.share_pct}%ini tashkil etadi.{" "}
            {activeDemand.level === "high"
              ? "Yo'lovchilar shu yerda ko'p — shu zonada bo'ling!"
              : activeDemand.level === "low"
              ? activeDemand.searches > 0 ? "Talab past — faolroq zonaga o'ting." : "Bu rayonda hali ma'lumot yo'q."
              : "Talab o'rtacha."}
          </Text>
        </View>
      ) : null}

      {demand?.enabled && demand.destination ? (
        <Card padded style={styles.diffCard}>
          <Text style={{ color: colors.inkMuted, fontSize: 12, flex: 1 }}>
            Manzilda (<Text style={{ color: colors.ink, fontWeight: "800" }}>{demand.destination.region_name}</Text>):{" "}
            {demand.destination.searches.toLocaleString()} qidiruv
          </Text>
          <View style={[styles.levelBadge, { backgroundColor: levelColor(demand.destination.level, colors) + "22" }]}>
            <Text style={{ color: levelColor(demand.destination.level, colors), fontSize: 11, fontWeight: "900" }}>
              {LEVEL_LABEL[demand.destination.level]}
            </Text>
          </View>
        </Card>
      ) : null}

      {demand?.enabled && demand.regions.filter((r) => r.searches > 0).length > 0 ? (
        <View>
          <Text style={[styles.sectionTitle, { color: colors.inkMuted }]}>QAYERDA YO'LOVCHI KO'P ({demand.window})</Text>
          <View style={{ gap: 8 }}>
            {demand.regions.filter((r) => r.searches > 0).slice(0, 6).map((r, i) => {
              const sel = selected?.id === r.region_id;
              return (
                <Pressable
                  key={r.region_id}
                  onPress={() => {
                    const reg = regions.find((x) => x.id === r.region_id);
                    if (reg) onRegion(reg);
                  }}
                  style={[
                    styles.hotRow,
                    {
                      backgroundColor: colors.card,
                      borderColor: sel ? colors.ink : colors.line,
                      borderWidth: sel ? 2 : StyleSheet.hairlineWidth,
                    },
                  ]}
                >
                  <Text style={[styles.hotRank, { color: colors.inkMuted }]}>{i + 1}</Text>
                  <Text style={[styles.hotName, { color: colors.ink }]} numberOfLines={1}>
                    {r.region_name}
                  </Text>
                  <Text style={{ color: colors.inkMuted, fontSize: 12 }}>
                    {r.searches.toLocaleString()} ({r.share_pct}%)
                  </Text>
                  <View style={[styles.dotLevel, { backgroundColor: levelColor(r.level, colors) }]} />
                </Pressable>
              );
            })}
          </View>
          {demand.totals ? (
            <Text style={{ color: colors.inkMuted, fontSize: 11, marginTop: 8, textAlign: "center" }}>
              Tizimda {demand.totals.searches.toLocaleString()} qidiruv · {demand.totals.drivers} haydovchi · {demand.totals.passengers} yo'lovchi
            </Text>
          ) : null}
        </View>
      ) : null}

      {top ? (
        <View style={[styles.topCard, { backgroundColor: colors.brand }]}>
          <View style={styles.topRow}>
            <ServiceLogo code={top.service.code} color={top.service.color} size={50} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={styles.topLabelRow}>
                <Ionicons name="cash-outline" size={12} color="rgba(15,18,22,0.7)" />
                <Text style={styles.topLabel}>ENG KO'P TO'LAYDI</Text>
              </View>
              <Text style={styles.topName}>{top.service.name}</Text>
              <Text style={styles.topPrice}>{formatUzs(top.price_uzs)}</Text>
            </View>
            <Ionicons name="trophy" size={26} color="rgba(15,18,22,0.55)" />
          </View>
        </View>
      ) : null}

      {top && low && low.service.id !== top.service.id ? (
        <Card padded style={styles.diffCard}>
          <Text style={{ color: colors.inkMuted, fontSize: 12, flex: 1 }}>
            Eng past: <Text style={{ color: colors.ink, fontWeight: "800" }}>{low.service.name}</Text> —{" "}
            {formatUzs(low.price_uzs)}
          </Text>
          <Text style={{ color: colors.green, fontWeight: "900", fontSize: 13 }}>
            +{formatUzs(top.price_uzs - low.price_uzs)}
          </Text>
        </Card>
      ) : null}

      <Card padded>
        <InfoLine label="Hozirgi joy" value={data?.region?.name || "Sample yo'nalish"} colors={colors} />
        <InfoLine
          label="Sample masofa"
          value={data ? `${formatNum(data.results[0]?.distance_km || 0, 1)} km` : "—"}
          colors={colors}
        />
        <InfoLine label="Surge hozir" value={`x${formatNum(data?.current_surge || 1, 1)}`} colors={colors} last />
      </Card>

      {error ? (
        <Card padded style={{ backgroundColor: colors.redBg }}>
          <Text style={{ color: colors.red, fontSize: 13 }}>{error}</Text>
        </Card>
      ) : null}

      <View>
        <View style={styles.listHead}>
          <Ionicons name="trending-up" size={15} color={colors.ink} />
          <Text style={[styles.listTitle, { color: colors.ink }]}>
            Qaysi xizmat qancha to'laydi (qimmatdan)
          </Text>
        </View>
        {data ? (
          <PriceList rows={tierRows} start={data.start} end={data.end} sortMode="expensive-first" />
        ) : null}
      </View>
    </Screen>
  );
}

function levelColor(level: string, colors: any): string {
  return level === "high" ? colors.green : level === "medium" ? colors.orange : colors.inkMuted;
}

function DemandStat({
  icon,
  value,
  label,
  color,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string | number;
  label: string;
  color: string;
  colors: any;
}) {
  return (
    <View style={styles.demandStat}>
      <View style={styles.demandStatTop}>
        <Ionicons name={icon} size={16} color={color} />
        <Text style={[styles.demandValue, { color: colors.ink }]}>{value}</Text>
      </View>
      <Text style={{ color: colors.inkMuted, fontSize: 11, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function InfoLine({
  label,
  value,
  colors,
  last,
}: {
  label: string;
  value: string;
  colors: any;
  last?: boolean;
}) {
  return (
    <View style={[styles.infoLine, !last && { marginBottom: 8 }]}>
      <Text style={{ color: colors.inkMuted, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: colors.ink, fontSize: 13, fontWeight: "800" }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5, marginBottom: 8, marginLeft: 2 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tierCard: { paddingVertical: 10 },
  tierLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5, marginBottom: 8, marginLeft: 2 },
  mapWrap: {
    height: 360,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    position: "relative",
  },
  fullTopOverlay: {
    position: "absolute",
    left: 16,
    right: 64,
    alignItems: "flex-start",
  },
  zonePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: "100%",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  fullBottomOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  expandBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  closeFull: {
    position: "absolute",
    right: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 4,
  },
  fullZoneCard: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 6,
  },
  zoneCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
  zoneCardLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  priceChip: {
    width: 84,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  demandCard: { borderRadius: radius.lg, padding: 16, borderWidth: 1.5 },
  demandHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  demandTitle: { flex: 1, fontSize: 15, fontWeight: "900" },
  levelBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  demandStatsRow: { flexDirection: "row", alignItems: "center", marginTop: 14 },
  demandStat: { flex: 1, alignItems: "center" },
  demandStatTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  demandValue: { fontSize: 24, fontWeight: "900" },
  demandDivider: { width: StyleSheet.hairlineWidth, height: 36 },
  demandHint: { fontSize: 12, lineHeight: 17, marginTop: 12 },
  hotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  hotRank: { fontSize: 13, fontWeight: "900", width: 16 },
  hotName: { flex: 1, fontSize: 14, fontWeight: "700" },
  dotLevel: { width: 10, height: 10, borderRadius: 5 },
  topCard: { borderRadius: radius.lg, padding: 16 },
  topRow: { flexDirection: "row", alignItems: "center" },
  topLabelRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  topLabel: { fontSize: 10, fontWeight: "900", color: "rgba(15,18,22,0.7)", letterSpacing: 0.5 },
  topName: { fontSize: 20, fontWeight: "900", color: "#0F1216", marginTop: 2 },
  topPrice: { fontSize: 14, fontWeight: "700", color: "rgba(15,18,22,0.8)", marginTop: 1 },
  diffCard: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  infoLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  listHead: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  listTitle: { fontSize: 14, fontWeight: "800", flex: 1 },
});
