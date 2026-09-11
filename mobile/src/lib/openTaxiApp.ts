import { Alert, Linking, Platform } from "react-native";
import type { ServiceInfo } from "@/lib/api/types";

export type LatLng = { lat: number; lng: number };

// Bizdagi tarif kodi -> Yandex'ning ichki tarif (level) slug'i
const YANDEX_LEVEL: Record<string, string> = {
  econom: "econom",
  comfort: "business",
  comfort_plus: "comfortplus",
  business: "vip",
};

interface BrandConfig {
  name: string;
  deeplinks: (s: LatLng, e: LatLng | null, tier?: string) => string[];
  androidPackages: string[];
  iosAppId?: string;
  website?: string;
}

const BRANDS: Record<string, BrandConfig> = {
  yandex_go: {
    name: "Yandex Go",
    deeplinks: (s, e, tier) => {
      const lvl = tier ? YANDEX_LEVEL[tier] : undefined;
      const q =
        `start-lat=${s.lat}&start-lon=${s.lng}` +
        (e ? `&end-lat=${e.lat}&end-lon=${e.lng}` : "") +
        (lvl ? `&level=${lvl}` : "");
      return [
        `yandextaxi://route?${q}`,
        `yandexgo://route?${q}`,
        `yandextaxi://`,
        `yandexgo://`,
      ];
    },
    androidPackages: ["ru.yandex.taxi", "com.yandex.taxi", "ru.yandex.go"],
    iosAppId: "472650686",
    website: "https://taxi.yandex.uz",
  },
  fasten: {
    name: "Fasten",
    deeplinks: (s, e) => {
      const q =
        `start-lat=${s.lat}&start-lon=${s.lng}` +
        (e ? `&end-lat=${e.lat}&end-lon=${e.lng}` : "");
      return [
        `fasten://route?${q}`,
        `fastentashkent://route?${q}`,
        `fasten://`,
        `fastentashkent://`,
        `fasten-rider://`,
      ];
    },
    androidPackages: ["com.fasten.tashkent", "com.fasten.rider", "ru.yandex.fasten"],
    iosAppId: "1558231268",
    website: "https://fasten.com/uz_uz",
  },
  uklon: {
    name: "Uklon",
    deeplinks: (s, e) => {
      const q =
        `start_lat=${s.lat}&start_lng=${s.lng}` +
        (e ? `&end_lat=${e.lat}&end_lng=${e.lng}` : "");
      return [
        `uklon://route?${q}`,
        `uklonpassenger://route?${q}`,
        `uklon://`,
        `uklonpassenger://`,
      ];
    },
    androidPackages: ["ua.com.uklontaxi", "ua.com.uklon"],
    iosAppId: "509015707",
    website: "https://uklon.uz",
  },
  mytaxi: {
    name: "MyTaxi",
    deeplinks: (s, e) => {
      const q =
        `start_lat=${s.lat}&start_lng=${s.lng}` +
        (e ? `&end_lat=${e.lat}&end_lng=${e.lng}` : "");
      const q2 =
        `start-lat=${s.lat}&start-lon=${s.lng}` +
        (e ? `&end-lat=${e.lat}&end-lon=${e.lng}` : "");
      return [
        `mytaxi://route?${q}`,
        `mytaxi://order?${q}`,
        `mytaxi://route?${q2}`,
        `mytaxi://`,
      ];
    },
    androidPackages: ["com.uznewmax.mytaxi", "uz.mytaxi.client", "net.mytaxi.passenger"],
    iosAppId: "865012817",
    website: "https://mytaxi.uz",
  },
  wb_taxi: {
    name: "WB Taxi",
    deeplinks: (s, e) => {
      const q =
        `start_lat=${s.lat}&start_lng=${s.lng}` +
        (e ? `&end_lat=${e.lat}&end_lng=${e.lng}` : "");
      return [
        `wbtaxi://route?${q}`,
        `wbtaxi://`,
        `wb-taxi://`,
        `wildberries-taxi://`,
      ];
    },
    androidPackages: ["uz.wildberries.taxi.client", "ru.wildberries.client"],
    website: "https://wbtaxi.uz",
  },
};

const ALIASES: Record<string, string> = {
  yandex: "yandex_go",
  yandexgo: "yandex_go",
  yandex_go: "yandex_go",
  uklon: "uklon",
  fast: "fasten",
  fasten: "fasten",
  wb: "wb_taxi",
  wbtaxi: "wb_taxi",
  wb_taxi: "wb_taxi",
  mytaxi: "mytaxi",
  my_taxi: "mytaxi",
};

function brandKey(code: string): string {
  const clean = (code || "").split("__")[0].toLowerCase().replace(/[^a-z_]/g, "");
  return ALIASES[clean] || clean;
}

/**
 * Havolani to'g'ridan-to'g'ri ochish.
 * Android 11+ da canOpenURL tekshirmasdan to'g'ridan-to'g'ri openURL chaqiriladi.
 * Chunki canOpenURL <queries> yo'qligi sababli o'rnatilgan ilovalarga ham false qaytaradi.
 */
async function tryDirectOpen(url: string): Promise<boolean> {
  if (!url) return false;
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

export async function openTaxiApp(
  service: ServiceInfo,
  start: LatLng,
  end: LatLng | null
): Promise<void> {
  const key = brandKey(service.code || service.brand || service.name);
  await openTaxiAppByCode(key, start, end, service.deeplink_template, (service as any).tier);
}

export async function openTaxiAppByCode(
  code: string,
  start: LatLng,
  end: LatLng | null,
  customTemplate?: string,
  tier?: string
): Promise<void> {
  const key = brandKey(code);
  const meta = BRANDS[key];
  if (!meta) return;
  const brandName = meta.name || code;

  const candidateUrls: string[] = [];

  // 1) Agar backend custom shablon bergan bo'lsa va u faqat shu brendga tegishli bo'lsa
  if (customTemplate && !customTemplate.startsWith("http")) {
    let filled = customTemplate
      .replace("{start_lat}", String(start.lat))
      .replace("{start_lng}", String(start.lng));
    if (end) {
      filled = filled
        .replace("{end_lat}", String(end.lat))
        .replace("{end_lng}", String(end.lng));
    }
    if (!filled.includes("{end_")) {
      candidateUrls.push(filled);
    }
  }

  // 2) Faqat va faqat shu brendga tegishli deeplinklar
  if (meta.deeplinks) {
    candidateUrls.push(...meta.deeplinks(start, end, tier));
  }

  // 3) Har bir deeplinkni to'g'ridan-to'g'ri ochishga harakat qilamiz
  for (const url of candidateUrls) {
    const success = await tryDirectOpen(url);
    if (success) {
      return;
    }
  }

  // 4) Agar ilova o'rnatilmagan bo'lsa (barcha deeplinklar xato bergan bo'lsa) — Play Market / App Store taklifi
  const pkg = meta.androidPackages[0];
  Alert.alert(
    `${brandName} ilovasi`,
    `Telefoningizda ${brandName} ilovasi topilmadi. Play Marketdan yuklab olasizmi?`,
    [
      { text: "Yo'q", style: "cancel" },
      {
        text: "Yuklab olish",
        onPress: () => {
          if (Platform.OS === "android") {
            // Oldin market:// ilova do'konini ochadi, bo'lmasa veb-havola
            Linking.openURL(`market://details?id=${pkg}`).catch(() => {
              Linking.openURL(`https://play.google.com/store/apps/details?id=${pkg}`).catch(() => {});
            });
          } else {
            const storeUrl = `https://apps.apple.com/app/id${meta.iosAppId || ""}`;
            Linking.openURL(storeUrl).catch(() => {});
          }
        },
      },
    ]
  );
}
