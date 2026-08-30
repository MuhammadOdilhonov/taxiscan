import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Platform,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { useTheme } from "@/theme";
import { useAuth } from "@/store/auth";
import { MapWebView, type MapMarker, type MapRoute, type MapWebViewHandle } from "@/components/MapWebView";
import { AddressInput, type AddressValue } from "@/components/AddressInput";
import { AppDrawer } from "@/components/AppDrawer";
import { ServiceLogo } from "@/components/ui/ServiceLogo";
import { apiPost } from "@/lib/api/client";
import { reverseGeocode } from "@/lib/api/geocoding";
import { formatNum } from "@/lib/format";
import { openTaxiApp } from "@/lib/openTaxiApp";
import type { EstimateResponse, ServiceInfo, Tier } from "@/lib/api/types";

// Yo'lovchi kartasidagi qisqa kod -> backend brend kodi (deeplink to'g'ri ilovaga borsin)
const BRAND_CODE: Record<string, string> = {
  yandex: "yandex_go",
  uklon: "uklon",
  wb: "wb_taxi",
  fasten: "fast",
  mytaxi: "mytaxi",
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface QuickRateItem {
  code: string;
  name: string;
  price: number;
  iconBg: string;
  badgeText?: string;
  ionIcon?: keyof typeof Ionicons.glyphMap;
}

const TARIFS: { key: Tier; label: string }[] = [
  { key: "econom", label: "Start" },
  { key: "comfort", label: "Comfort" },
  { key: "comfort_plus", label: "Comfort+" },
  { key: "business", label: "Biznes" },
];

export function PassengerHome() {
  const { colors, isDark, setMode } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const mapRef = useRef<MapWebViewHandle>(null);

  // Manzillar (A doimo saqlanadi)
  const [start, setStart] = useState<AddressValue | null>({
    label: "Turgan joyingiz",
    lat: 41.311,
    lng: 69.279,
  });

  const [destinations, setDestinations] = useState<AddressValue[]>([
    { label: "", lat: 0, lng: 0 },
  ]);

  const [activePickerIndex, setActivePickerIndex] = useState<number | "start">(0);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Narxlar, Hisob-kitob holati, Tanlangan Yo'l (1-yo'l, 2-yo'l...) va Aktiv Tarif ("econom" = Start)
  const [data, setData] = useState<EstimateResponse | null>(null);
  const [tier, setTier] = useState<Tier>("econom");
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [calculated, setCalculated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Boshlang'ich narxlar — DOIMO ARZONDAN QIMMATGA TARTIBLANGAN (ASCENDING)
  const [quickRates, setQuickRates] = useState<QuickRateItem[]>([
    { code: "yandex", name: "Yandex", price: 10000, iconBg: "#FFCC00", ionIcon: "car" },
    { code: "fasten", name: "Fasten", price: 12000, iconBg: "#E53935", badgeText: "F" },
    { code: "uklon", name: "Uklon", price: 13000, iconBg: "#1A1F26", ionIcon: "navigate" },
    { code: "wb", name: "WB", price: 14000, iconBg: "#E6007E", badgeText: "WB" },
    { code: "mytaxi", name: "MyTaxi", price: 15000, iconBg: "#10B981", badgeText: "MT" },
  ]);

  // Modallar
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerModalOpen, setPickerModalOpen] = useState(false);

  // Ilova ochilganda turgan joy aniqlanguncha loading ekrani ko'rsatiladi
  const [locating, setLocating] = useState(true);

  // GPS orqali joylashuvni aniqlash
  const locateUser = async (initial = false) => {
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status === "granted") {
        let pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        }).catch(() => null);

        if (!pos) {
          pos = await Location.getLastKnownPositionAsync({});
        }

        if (pos) {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const geo = await reverseGeocode(lat, lng).catch(() => null);

          const currentPos = {
            label: geo?.label || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
            lat,
            lng,
          };
          setStart(currentPos);
          setUserLocation({ lat, lng });

          mapRef.current?.recenter(lat, lng, 16);
          await fetchQuickLocalRates(lat, lng);
        }
      }
    } catch {
      /* ignore */
    } finally {
      if (initial) setLocating(false);
    }
  };

  useEffect(() => {
    locateUser(true);
  }, []);

  // Quick Local Rates yuklash ("Joyda" narxlari — ARZONDAN QIMMATGA TARTIBLANGAN)
  const fetchQuickLocalRates = async (lat: number, lng: number) => {
    const r = await apiPost<EstimateResponse>("/taxi/quick-local/", {
      lat,
      lng,
      sample_distance_km: 5,
    }).catch(() => null);

    if (r && r.results && r.results.length > 0) {
      const getPrice = (pattern: string, fallback: number) => {
        const item = r.results.find((x) => x.service.code.toLowerCase().includes(pattern));
        return item?.price_uzs || fallback;
      };

      const rawItems: QuickRateItem[] = [
        { code: "yandex", name: "Yandex", price: getPrice("yandex", 10000), iconBg: "#FFCC00", ionIcon: "car" },
        { code: "uklon", name: "Uklon", price: getPrice("uklon", 13000), iconBg: "#1A1F26", ionIcon: "navigate" },
        { code: "wb", name: "WB", price: getPrice("wb", 14000), iconBg: "#E6007E", badgeText: "WB" },
        { code: "fasten", name: "Fasten", price: getPrice("fast", 12000), iconBg: "#E53935", badgeText: "F" },
        { code: "mytaxi", name: "MyTaxi", price: getPrice("mytaxi", 15000), iconBg: "#10B981", badgeText: "MT" },
      ];

      rawItems.sort((a, b) => a.price - b.price);
      setQuickRates(rawItems);
    }
  };

  // Xarita markazi o'zgarganda A nuqta manzilini yangilash
  const onMapCenterChange = async (lat: number, lng: number) => {
    try {
      const geo = await reverseGeocode(lat, lng).catch(() => null);
      if (geo) {
        setStart({
          label: geo.label || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          lat,
          lng,
        });
      }
    } catch {
      /* ignore */
    }
  };

  // Manzil qo'shish (+ tugmasi)
  const addDestinationStop = () => {
    setDestinations((prev) => [...prev, { label: "", lat: 0, lng: 0 }]);
  };

  // Manzilni o'chirish / Tozalash (X tugmasi)
  const removeDestinationStop = (index: number) => {
    if (destinations.length === 1) {
      setDestinations([{ label: "", lat: 0, lng: 0 }]);
      setCalculated(false);
      return;
    }
    const updated = destinations.filter((_, i) => i !== index);
    setDestinations(updated);
    if (calculated) {
      calculateRoutePrices(tier, updated, start);
    }
  };

  // "Narxni bilish" tugmasi bosilganda marshrut bo'yicha narxni hisoblash (A -> B -> C -> D...)
  const calculateRoutePrices = async (
    targetTier: Tier = tier,
    currentDest = destinations,
    currentStart = start
  ) => {
    const validDest = currentDest.filter((d) => d.lat !== 0 && d.lng !== 0);
    if (!currentStart || validDest.length === 0) {
      setActivePickerIndex(0);
      setPickerModalOpen(true);
      return;
    }

    const finalEnd = validDest[validDest.length - 1];
    const stops = validDest.slice(0, validDest.length - 1).map((d) => ({
      lat: d.lat,
      lng: d.lng,
      address: d.label,
    }));

    setLoading(true);
    setError(null);
    try {
      const res = await apiPost<EstimateResponse>("/taxi/estimate/", {
        start_lat: currentStart.lat,
        start_lng: currentStart.lng,
        end_lat: finalEnd.lat,
        end_lng: finalEnd.lng,
        start_address: currentStart.label,
        end_address: finalEnd.label,
        stops: stops.length > 0 ? stops : undefined,
      });
      setData(res);
      setCalculated(true);
      setSelectedRouteIndex(0);
      updateCardRatesFromData(res, targetTier, 0);
    } catch (err: any) {
      setError(err?.data?.detail || "Narxni hisoblab bo'lmadi");
    } finally {
      setLoading(false);
    }
  };

  // Modal ichida manzil tasdiqlanganda darhol narxlarni qayta hisoblash
  const handleConfirmAddress = (selectedVal: AddressValue | null) => {
    if (!selectedVal) {
      setPickerModalOpen(false);
      return;
    }

    if (activePickerIndex === "start") {
      setStart(selectedVal);
      if (calculated) {
        calculateRoutePrices(tier, destinations, selectedVal);
      }
    } else {
      const updated = [...destinations];
      updated[Number(activePickerIndex)] = selectedVal;
      setDestinations(updated);
      if (calculated) {
        calculateRoutePrices(tier, updated, start);
      }
    }
    setPickerModalOpen(false);
  };

  // TARIF (Start/Comfort/Comfort+/Biznes) VA MASOFA (A->B->C...) BO'YICHA DYNAMIC NARXLARNI HISOB-KITOB QILISH
  const updateCardRatesFromData = (
    res: EstimateResponse,
    targetTier: Tier,
    routeIndex = selectedRouteIndex
  ) => {
    if (!res) return;

    const currentRoute = (res.routes && res.routes[routeIndex]) || res.route;
    const distKm = currentRoute?.distance_km || 5.0;
    const durMin = currentRoute?.duration_min || (distKm * 2.5);

    // Tariflar uchun narx ko'paytiruvchisi (Tier Multiplier)
    const tierMultipliers: Record<Tier, number> = {
      econom: 1.0,      // Start
      comfort: 1.38,     // Comfort
      comfort_plus: 1.80,// Comfort+
      business: 2.45,    // Biznes
      delivery: 0.9,     // Dostavka
    };
    const mult = tierMultipliers[targetTier] || 1.0;

    const getServicePrice = (brandCode: string, baseKmRate: number, baseMinimum: number) => {
      // 1. Backend results dan tanlangan tier ga mos keladigan aniq brend narxini qidirish
      if (res.results && res.results.length > 0) {
        const exact = res.results.find(
          (x) =>
            x.service.tier === targetTier &&
            (x.service.code.toLowerCase().includes(brandCode) ||
              x.service.name.toLowerCase().includes(brandCode) ||
              (x.service.brand || "").toLowerCase().includes(brandCode))
        );
        if (exact && exact.price_uzs > 0) {
          return exact.price_uzs;
        }

        // 2. Base brend narxi bo'lsa tarif ko'paytiruvchisi orqali hisoblash
        const baseEst = res.results.find(
          (x) =>
            x.service.code.toLowerCase().includes(brandCode) ||
            x.service.name.toLowerCase().includes(brandCode) ||
            (x.service.brand || "").toLowerCase().includes(brandCode)
        );
        if (baseEst && baseEst.price_uzs > 0) {
          return Math.round((baseEst.price_uzs * mult) / 100) * 100;
        }
      }

      // 3. Masofa va Vaqt (A->B->C...) bo'yicha dinamik narx formulasi
      const calcPrice = (baseMinimum + distKm * baseKmRate + durMin * 280) * mult;
      return Math.round(calcPrice / 100) * 100;
    };

    const rawItems: QuickRateItem[] = [
      {
        code: "yandex",
        name: "Yandex",
        price: getServicePrice("yandex", 2200, 7000),
        iconBg: "#FFCC00",
        ionIcon: "car",
      },
      {
        code: "fasten",
        name: "Fasten",
        price: getServicePrice("fasten", 2100, 6000),
        iconBg: "#E53935",
        badgeText: "F",
      },
      {
        code: "uklon",
        name: "Uklon",
        price: getServicePrice("uklon", 2300, 8000),
        iconBg: "#1A1F26",
        ionIcon: "navigate",
      },
      {
        code: "wb",
        name: "WB",
        price: getServicePrice("wb", 2400, 8500),
        iconBg: "#E6007E",
        badgeText: "WB",
      },
      {
        code: "mytaxi",
        name: "MyTaxi",
        price: getServicePrice("mytaxi", 2500, 9000),
        iconBg: "#10B981",
        badgeText: "MT",
      },
    ];

    // HAR DOIM ENG ARZONIDAN ENG QIMMATIGACHA TARTIBLASH (ASCENDING ORDER)
    rawItems.sort((a, b) => a.price - b.price);
    setQuickRates(rawItems);
  };

  // Tarif o'zgarganda narxlarni yangilash
  const handleSelectTarif = (selectedTier: Tier) => {
    setTier(selectedTier);
    if (data) {
      updateCardRatesFromData(data, selectedTier, selectedRouteIndex);
    }
  };

  // Yo'l almashtirilganda (1-yo'l, 2-yo'l...) narxlarni yangilash
  const handleSelectRoute = (idx: number) => {
    setSelectedRouteIndex(idx);
    if (data) {
      updateCardRatesFromData(data, tier, idx);
    }
  };

  // Kun / Tun rejimini almashtirish
  const toggleThemeMode = () => {
    setMode(isDark ? "light" : "dark");
  };

  // Taksi logotipiga bosilganda — o'sha brendning ILOVASINI to'g'ri ochish (A->B)
  const openBrandApp = (item: QuickRateItem) => {
    if (!start?.lat) return;
    const brandCode = BRAND_CODE[item.code] || item.code;
    // Aniq brend narxini backend natijalaridan topib, haqiqiy deeplink shablonini olamiz
    const match = data?.results?.find(
      (x) => x.service.tier === tier && x.service.code.toLowerCase().startsWith(brandCode)
    );
    const service: ServiceInfo = {
      id: match?.service.id ?? 0,
      code: match?.service.code || `${brandCode}__${tier}`,
      name: match?.service.name || item.name,
      brand: match?.service.brand || item.name,
      tier,
      color: match?.service.color || item.iconBg,
      logo: null,
      deeplink_template: match?.service.deeplink_template || "",
    };

    const s = { lat: start.lat, lng: start.lng };
    const validDest = destinations.filter((d) => d.lat !== 0 && d.lng !== 0);
    const last = validDest[validDest.length - 1];
    const e = last ? { lat: last.lat, lng: last.lng } : null;
    openTaxiApp(service, s, e);
  };

  // Kartada ko'rsatiladigan barcha nuqtalar (A, B, C...)
  const mapMarkers: MapMarker[] = useMemo(() => {
    const list: MapMarker[] = [];
    if (start && start.lat) {
      list.push({ lat: start.lat, lng: start.lng, label: "A", type: "start" });
    }
    destinations.forEach((d, i) => {
      if (d && d.lat !== 0) {
        list.push({
          lat: d.lat,
          lng: d.lng,
          label: String.fromCharCode(66 + i),
          type: i === destinations.length - 1 ? "end" : "stop",
        });
      }
    });
    return list;
  }, [start, destinations]);

  // Backend OSRM dan qaytgan haqiqiy ko'cha geometriyasi yo'llari (1-yo'l, 2-yo'l...)
  const mapRoutes: MapRoute[] = useMemo(() => {
    if (!data || !calculated) return [];
    const rts = data.routes || [];
    if (rts.length > 0) {
      return rts.map((r, i) => ({
        id: r.id ?? i + 1,
        coords: (r.geometry?.coordinates || []).map(([lng, lat]) => [lat, lng] as [number, number]),
        color: i === selectedRouteIndex ? "#FFCC00" : (isDark ? "#7C8491" : "#A0AEC0"),
        selected: i === selectedRouteIndex,
      }));
    }
    if (data.route?.geometry?.coordinates) {
      return [{
        id: 1,
        coords: data.route.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]),
        color: "#FFCC00",
        selected: true,
      }];
    }
    return [];
  }, [data, calculated, selectedRouteIndex, isDark]);

  const totalInputRows = 1 + destinations.length;
  const isScrollable = totalInputRows > 3;
  const activeTarifLabel = TARIFS.find((t) => t.key === tier)?.label || "Start";

  // Yo'llar ro'yxati (1-yo'l, 2-yo'l...)
  const availableRoutesList = data?.routes || [];

  // LOKATSIYA GPS TUGMASINING BALANDLIGINI DINAMIK HISOB-KITOB QILISH
  const visibleInputRowsCount = Math.min(totalInputRows, 3);
  const bottomCardDynamicHeight = 110 + (visibleInputRowsCount * 54) + (calculated ? 95 : 0);
  const gpsBottomOffset = (insets.bottom || 0) + bottomCardDynamicHeight + 16;

  // DYNAMIC KUN / TUN (LIGHT / DARK) THEME COLORS
  const cardBg = isDark ? "rgba(18, 22, 28, 0.96)" : "rgba(255, 255, 255, 0.96)";
  const cardBorder = isDark ? "rgba(255,255,255,0.14)" : "rgba(15, 18, 22, 0.12)";
  const textPrimary = isDark ? "#F3F5F7" : "#0F1216";
  const textMuted = isDark ? "#94A2B0" : "#5C6772";
  const inputBg = isDark ? "#14181E" : "#F2F4F7";
  const drawerBg = isDark ? "#14181E" : "#FFFFFF";

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* 1. TO'LIQ EKRANLI KUN / TUN XARITA FONI */}
      <MapWebView
        ref={mapRef}
        mode={calculated ? "route" : "picker"}
        isDark={isDark}
        center={start ? { lat: start.lat, lng: start.lng } : undefined}
        userLoc={userLocation}
        onCenterChange={onMapCenterChange}
        markers={mapMarkers}
        routes={mapRoutes}
        style={StyleSheet.absoluteFillObject}
      />

      {/* 2. TEPAGI HEADER VA O'NG BURCHAKDAGI TAXI NARXLARI KARTASI */}
      <View style={[styles.topHeader, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        {/* Chap burchakda Hamburger Menu Tugmasi (Header ichida faqat Menu ikonkasi) */}
        <Pressable
          onPress={() => setMenuOpen(true)}
          style={[styles.hamburgerBtn, { backgroundColor: cardBg, borderColor: cardBorder }]}
          hitSlop={12}
        >
          <Ionicons name="menu-sharp" size={26} color={textPrimary} />
        </Pressable>

        {/* O'ng burchakdagi Taksi Narxlari Kartasi */}
        <View style={styles.topRightCardWrap}>
          {/* Card Tepasidagi Nishon */}
          <View style={[styles.joydaBadgeHeader, { backgroundColor: isDark ? "#0A0D11" : "#FFFFFF" }]}>
            <View style={styles.badgeLine} />
            <Text style={styles.joydaBadgeText}>
              {calculated ? activeTarifLabel : "Joyda"}
            </Text>
            <View style={styles.badgeLine} />
          </View>

          {/* 5 Ta Taksi Xizmati Narxi (KUN/TUN THEME NATIVE ADAPTIVE) */}
          <View style={[styles.topRightCardBody, { backgroundColor: cardBg }]}>
            {loading ? (
              <ActivityIndicator color="#FFCC00" size="small" style={{ paddingVertical: 14 }} />
            ) : (
              quickRates.map((item, idx) => (
                <Pressable
                  key={idx}
                  style={({ pressed }) => [styles.rateRow, pressed && { opacity: 0.55 }]}
                  onPress={() => openBrandApp(item)}
                  hitSlop={6}
                >
                  <View style={styles.rateLeftGroup}>
                    <ServiceLogo
                      code={BRAND_CODE[item.code] || item.code}
                      uri={data?.results?.find((x) =>
                        x.service.code.toLowerCase().startsWith(BRAND_CODE[item.code] || item.code)
                      )?.service.logo}
                      size={26}
                    />
                    <Text style={[styles.serviceNameTxt, { color: textPrimary }]}>{item.name}</Text>
                  </View>
                  <View style={styles.rateRightGroup}>
                    <Text style={styles.ratePrice}>{formatNum(item.price, 0)} so'm</Text>
                    <Ionicons name="open-outline" size={12} color="#FFCC00" />
                  </View>
                </Pressable>
              ))
            )}
          </View>
        </View>
      </View>

      {/* 3. LOKATSIYA GPS TUGMASI (TOCHKALLAR QO'SHILGANDA DINAMIK TEPAGA SURILADI) */}
      <Pressable style={[styles.gpsLocateBtn, { bottom: gpsBottomOffset }]} onPress={() => locateUser()} hitSlop={10}>
        <Ionicons name="navigate-sharp" size={24} color="#0F1216" />
      </Pressable>

      {/* 4. PASTKI YO'NALISH KIRITISH, YO'LLAR VA TARIFLAR KARTASI */}
      <View style={[styles.bottomCardWrap, { paddingBottom: insets.bottom + 16 }]} pointerEvents="box-none">
        {/* Qayerdan (A) / Qayerga (B, C...) Input Card */}
        <View style={[styles.routeInputCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <ScrollView
            style={{ maxHeight: isScrollable ? 190 : undefined }}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={isScrollable}
          >
            {/* Qayerdan (Point A) */}
            <Pressable
              style={styles.routeRow}
              onPress={() => {
                setActivePickerIndex("start");
                setPickerModalOpen(true);
              }}
            >
              <View style={styles.yellowDotCircle} />
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={[styles.routeLabel, { color: textMuted }]}>Qayerdan (A nuqta)</Text>
                <Text style={[styles.routeValue, { color: textPrimary }]} numberOfLines={1}>
                  {start?.label || "Turgan joyingiz"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={textMuted} />
            </Pressable>

            {/* Nuqtalar Ro'yxati (B, C, D...) */}
            {destinations.map((dest, idx) => {
              const letter = String.fromCharCode(66 + idx);
              const isLast = idx === destinations.length - 1;
              const hasAddress = Boolean(dest.label && dest.label.trim() !== "");

              return (
                <View key={idx}>
                  <View style={[styles.verticalDashedLine, { borderColor: textMuted }]} />

                  <View style={styles.routeRow}>
                    <Ionicons name="location-sharp" size={20} color="#FFCC00" />
                    <Pressable
                      style={{ flex: 1, marginLeft: 14 }}
                      onPress={() => {
                        setActivePickerIndex(idx);
                        setPickerModalOpen(true);
                      }}
                    >
                      <Text style={[styles.routeLabel, { color: textMuted }]}>
                        Qayerga ({letter} nuqta)
                      </Text>
                      <Text style={styles.routeValueHighlight} numberOfLines={1}>
                        {dest.label || "Manzilni tanlang"}
                      </Text>
                    </Pressable>

                    {/* FAQAT MANZIL KIRITILGANDAN KEGIN 'X' VA '+' TUGMALARI CHIQADI */}
                    {hasAddress ? (
                      <View style={styles.actionButtonsRow}>
                        {/* X (O'chirish / Tozalash) Tugmasi */}
                        <Pressable
                          style={styles.removeStopBtn}
                          onPress={() => removeDestinationStop(idx)}
                          hitSlop={10}
                        >
                          <Ionicons name="close" size={18} color="#F87171" />
                        </Pressable>

                        {/* + (Yangi nuqta qo'shish) Tugmasi — oxirgi ro'yxat kiritishda */}
                        {isLast ? (
                          <Pressable
                            style={styles.addStopBtn}
                            onPress={addDestinationStop}
                            hitSlop={10}
                          >
                            <Ionicons name="add" size={22} color="#0F1216" />
                          </Pressable>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* BOSILGANDAN SO'NG: 1-YO'L, 2-YO'L TUGMALARI VA TARIFLAR */}
        {calculated ? (
          <View style={{ gap: 8 }}>
            {/* YO'LLARNI TANLASH QATORI (1-yo'l, 2-yo'l...) */}
            {availableRoutesList.length > 1 ? (
              <View style={styles.routeSelectRow}>
                {availableRoutesList.map((rItem, rIdx) => {
                  const isSel = selectedRouteIndex === rIdx;
                  return (
                    <Pressable
                      key={rIdx}
                      style={[
                        styles.routeTabBtn,
                        { backgroundColor: cardBg },
                        isSel && styles.routeTabBtnActive,
                      ]}
                      onPress={() => handleSelectRoute(rIdx)}
                    >
                      <Ionicons
                        name="git-network-outline"
                        size={14}
                        color={isSel ? "#0F1216" : "#FFCC00"}
                      />
                      <Text style={[styles.routeTabTxt, isSel && styles.routeTabTxtActive]}>
                        {rItem.label || `${rIdx + 1}-yo'l`} ({rItem.distance_km} km)
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {/* TARIFLARNI TANLASH QATORI (Start, Comfort, Comfort+, Biznes) */}
            <View style={styles.tarifRowContainer}>
              {TARIFS.map((t) => {
                const active = tier === t.key;
                return (
                  <Pressable
                    key={t.key}
                    style={[
                      styles.tarifPillBtn,
                      { backgroundColor: cardBg },
                      active && styles.tarifPillBtnActive,
                    ]}
                    onPress={() => handleSelectTarif(t.key)}
                  >
                    <Text style={[styles.tarifPillTxt, active && styles.tarifPillTxtActive]}>
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : (
          /* KATTA SARIQ "NARXNI BILISH" TUGMASI */
          <Pressable
            style={styles.actionButton}
            onPress={() => calculateRoutePrices(tier)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#0F1216" size="small" />
            ) : (
              <Text style={styles.actionButtonText}>Narxni bilish</Text>
            )}
          </Pressable>
        )}
      </View>

      {/* 5. HAMBURGER MENYUSI — TaxiScan logotipi + nomi tepada, umumiy AppDrawer */}
      <AppDrawer visible={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* 0. KIRISHDA — TURGAN JOY ANIQLANGUNCHA LOADING EKRANI */}
      {locating ? (
        <View style={[styles.loadingOverlay, { backgroundColor: colors.bg }]}>
          <Image
            source={require("@/assets/logo.png")}
            style={{ width: 72, height: 72, borderRadius: 18 }}
            resizeMode="contain"
          />
          <Text style={[styles.loadingTitle, { color: colors.ink }]}>
            Taxi<Text style={{ color: colors.brandDark }}>Scan</Text>
          </Text>
          <ActivityIndicator color="#FFCC00" size="large" style={{ marginTop: 18 }} />
          <Text style={[styles.loadingSub, { color: colors.inkMuted }]}>
            Turgan joyingiz aniqlanmoqda...
          </Text>
        </View>
      ) : null}

      {/* 6. MANZIL KIRITISH QIDIRUV MODALI */}
      <Modal visible={pickerModalOpen} animationType="slide" transparent onRequestClose={() => setPickerModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: drawerBg, paddingBottom: insets.bottom + 20, paddingTop: 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>
                {activePickerIndex === "start"
                  ? "Qayerdan (A nuqta)"
                  : `Qayerga (${String.fromCharCode(66 + Number(activePickerIndex))} nuqta)`}
              </Text>
              <Pressable onPress={() => setPickerModalOpen(false)} hitSlop={12}>
                <Ionicons name="close" size={26} color={textPrimary} />
              </Pressable>
            </View>

            <View style={{ gap: 14, marginTop: 14 }}>
              {activePickerIndex === "start" ? (
                <AddressInput
                  label="Qayerdan (A nuqta)"
                  value={start}
                  onChange={(val) => handleConfirmAddress(val)}
                  iconName="ellipse"
                  iconColor="#FFCC00"
                  showLocate
                />
              ) : (
                <AddressInput
                  label={`Qayerga (${String.fromCharCode(66 + Number(activePickerIndex))} nuqta)`}
                  value={destinations[Number(activePickerIndex)]}
                  onChange={(val) => handleConfirmAddress(val)}
                  iconName="location"
                  iconColor="#FFCC00"
                />
              )}

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Pressable
                style={styles.modalSubmitBtn}
                onPress={() => {
                  setPickerModalOpen(false);
                }}
              >
                <Text style={styles.modalSubmitTxt}>Yopish</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  /* Header */
  topHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    zIndex: 30,
  },
  hamburgerBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  /* O'ng burchakdagi Narxlar Kartasi */
  topRightCardWrap: {
    alignItems: "center",
  },
  joydaBadgeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: -10,
    zIndex: 10,
    paddingHorizontal: 14,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#FFCC00",
  },
  badgeLine: {
    width: 12,
    height: 1,
    backgroundColor: "#FFCC00",
  },
  joydaBadgeText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#FFCC00",
    letterSpacing: 0.5,
  },
  topRightCardBody: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    borderWidth: 1.5,
    borderColor: "#FFCC00",
    gap: 8,
    minWidth: 175,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  rateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  rateLeftGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rateRightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  rateIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  serviceNameTxt: {
    fontSize: 13,
    fontWeight: "700",
  },
  ratePrice: {
    fontSize: 13,
    fontWeight: "900",
    color: "#FFCC00",
  },

  /* GPS Locate Button */
  gpsLocateBtn: {
    position: "absolute",
    right: 16,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FFCC00",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 35,
  },

  /* Pastki Card va Tugmalar Wrapper */
  bottomCardWrap: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 0,
    zIndex: 30,
    gap: 10,
  },

  /* Route Input Card */
  routeInputCard: {
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  yellowDotCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#FFCC00",
    marginLeft: 3,
  },
  verticalDashedLine: {
    height: 16,
    width: 1,
    borderLeftWidth: 1.5,
    borderStyle: "dashed",
    marginLeft: 9,
    marginVertical: 2,
  },
  routeLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  routeValue: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 2,
  },
  routeValueHighlight: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFCC00",
    marginTop: 2,
  },

  /* Actions buttons container (X va +) */
  actionButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: 8,
  },
  addStopBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFCC00",
    alignItems: "center",
    justifyContent: "center",
  },
  removeStopBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(248, 113, 113, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },

  /* 1-yo'l, 2-yo'l Selector Bar */
  routeSelectRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  routeTabBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,204,0,0.4)",
  },
  routeTabBtnActive: {
    backgroundColor: "#FFCC00",
    borderColor: "#FFCC00",
  },
  routeTabTxt: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFCC00",
  },
  routeTabTxtActive: {
    color: "#0F1216",
  },

  /* Tarif Selector Buttons */
  tarifRowContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  tarifPillBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#262C34",
    alignItems: "center",
    justifyContent: "center",
  },
  tarifPillBtnActive: {
    borderColor: "#FFCC00",
    backgroundColor: "rgba(255,204,0,0.12)",
  },
  tarifPillTxt: {
    fontSize: 13,
    fontWeight: "700",
    color: "#7C8491",
  },
  tarifPillTxtActive: {
    color: "#FFCC00",
    fontWeight: "900",
  },

  /* Action Button ("Narxni bilish") */
  actionButton: {
    height: 54,
    borderRadius: 22,
    backgroundColor: "#FFCC00",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FFCC00",
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  actionButtonText: {
    fontSize: 21,
    fontWeight: "900",
    color: "#0F1216",
    fontFamily: Platform.OS === "ios" ? "Snell Roundhand" : "serif",
    fontStyle: "italic",
    letterSpacing: 0.3,
  },

  /* Drawer */
  drawerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  drawerSheet: {
    width: SCREEN_WIDTH * 0.82,
    height: "100%",
    paddingHorizontal: 20,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  drawerUserRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  drawerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFCC00",
    alignItems: "center",
    justifyContent: "center",
  },
  drawerAvatarTxt: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0F1216",
  },
  drawerUserName: {
    fontSize: 17,
    fontWeight: "800",
  },
  drawerUserPhone: {
    fontSize: 12,
    marginTop: 2,
  },
  drawerDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginBottom: 20,
  },
  drawerMenuBtns: {
    gap: 12,
    flex: 1,
  },
  menuItemBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  menuItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  menuItemSub: {
    fontSize: 11,
    marginTop: 2,
  },
  drawerFooterText: {
    fontSize: 12,
    textAlign: "center",
    marginBottom: 24,
  },

  /* Modallar */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
  },
  modalSubmitBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: "#FFCC00",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  modalSubmitTxt: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F1216",
  },
  errorBox: {
    backgroundColor: "#2A1416",
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    color: "#F87171",
    fontSize: 13,
  },

  /* Kirishdagi loading ekrani */
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingTitle: { fontSize: 26, fontWeight: "900", marginTop: 14 },
  loadingSub: { fontSize: 14, fontWeight: "600", marginTop: 12 },
});
