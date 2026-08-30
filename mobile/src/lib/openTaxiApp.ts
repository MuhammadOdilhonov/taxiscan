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
      const q = `start-lat=${s.lat}&start-lon=${s.lng}` +
        (e ? `&end-lat=${e.lat}&end-lon=${e.lng}` : "") +
        (lvl ? `&level=${lvl}` : "");
      return [
        `yandextaxi://route?${q}`,
        `intent://route?${q}#Intent;scheme=yandextaxi;package=ru.yandex.taxi;end`,
        `intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=ru.yandex.taxi;end`,
      ];
    },
    androidPackages: ["ru.yandex.taxi"],
    iosAppId: "472650686",
    website: "https://taxi.yandex.uz",
  },
  fasten: {
    name: "Fasten",
    deeplinks: (s, e) => {
      const q = `start-lat=${s.lat}&start-lon=${s.lng}` + (e ? `&end-lat=${e.lat}&end-lon=${e.lng}` : "");
      return [
        `fasten://route?${q}`,
        `intent://route?${q}#Intent;scheme=fasten;package=com.fasten.rider;end`,
        `yandextaxi://route?${q}`,
        `intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.fasten.rider;end`,
      ];
    },
    androidPackages: ["com.fasten.rider", "ru.yandex.fasten"],
    website: "https://fasten.com/uz_uz",
  },
  uklon: {
    name: "Uklon",
    deeplinks: (s, e) => {
      const q = `start_lat=${s.lat}&start_lng=${s.lng}` + (e ? `&end_lat=${e.lat}&end_lng=${e.lng}` : "");
      return [
        `uklon://route?${q}`,
        `intent://route?${q}#Intent;scheme=uklon;package=ua.com.uklontaxi;end`,
        `uklonpassenger://route?${q}`,
        `intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=ua.com.uklontaxi;end`,
      ];
    },
    androidPackages: ["ua.com.uklontaxi", "ua.com.uklon"],
    website: "https://uklon.uz",
  },
  mytaxi: {
    name: "MyTaxi",
    deeplinks: (s, e) => {
      const q = `start_lat=${s.lat}&start_lng=${s.lng}` + (e ? `&end_lat=${e.lat}&end_lng=${e.lng}` : "");
      return [
        `mytaxi://route?${q}`,
        `intent://route?${q}#Intent;scheme=mytaxi;package=com.uznewmax.mytaxi;end`,
        `mytaxi://`,
        `intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.uznewmax.mytaxi;end`,
      ];
    },
    androidPackages: ["com.uznewmax.mytaxi", "net.mytaxi.passenger", "uz.mytaxi.client"],
    iosAppId: "865012817",
    website: "https://mytaxi.uz",
  },
  wb_taxi: {
    name: "WB Taxi",
    deeplinks: (s, e) => {
      const q = `start_lat=${s.lat}&start_lng=${s.lng}` + (e ? `&end_lat=${e.lat}&end_lng=${e.lng}` : "");
      return [
        `wbtaxi://route?${q}`,
        `intent://route?${q}#Intent;scheme=wbtaxi;package=uz.wildberries.taxi.client;end`,
        `wbtaxi://`,
        `intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=uz.wildberries.taxi.client;end`,
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
};

function brandKey(code: string): string {
  const clean = (code || "").split("__")[0].toLowerCase().replace(/[^a-z_]/g, "");
  return ALIASES[clean] || clean;
}

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
  const meta = BRANDS[key] || BRANDS.yandex_go;
  const brandName = meta.name || code;

  const candidateUrls: string[] = [];

  // Prioritize native app schemes first
  if (meta.deeplinks) {
    candidateUrls.push(...meta.deeplinks(start, end, tier));
  }

  // Only use custom template if it's a native scheme (not broken http/https redirects)
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
      candidateUrls.unshift(filled);
    }
  }

  // Try each candidate URL until one successfully launches the app
  for (const url of candidateUrls) {
    const success = await tryDirectOpen(url);
    if (success) {
      return;
    }
  }

  // If no native app opened, show installer prompt
  Alert.alert(
    `${brandName} ilovasi`,
    `Telefoningizda ${brandName} ilovasi topilmadi. Play Marketdan yuklab olasizmi?`,
    [
      { text: "Yo'q", style: "cancel" },
      {
        text: "Yuklab olish",
        onPress: () => {
          const pkg = meta.androidPackages[0];
          const storeUrl = Platform.OS === "android"
            ? `https://play.google.com/store/apps/details?id=${pkg}`
            : `https://apps.apple.com/app/id${meta.iosAppId || ""}`;
          Linking.openURL(storeUrl).catch(() => {});
        },
      },
    ]
  );
}
