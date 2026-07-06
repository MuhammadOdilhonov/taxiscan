import { Alert, Linking, Platform } from "react-native";
import type { ServiceInfo } from "@/lib/api/types";

export type LatLng = { lat: number; lng: number };

// Bizdagi tarif kodi -> Yandex'ning ichki tarif (level) slug'i.
// Yandex deeplink'ida `level` parametri ilovani to'g'ri tarifda ochadi.
const YANDEX_LEVEL: Record<string, string> = {
  econom: "econom",
  comfort: "business",
  comfort_plus: "comfortplus",
  business: "vip",
};

/**
 * Brend kodi -> haqiqiy deeplink va do'kon/sayt ma'lumotlari.
 *
 * service.code "yandex_go__econom" ko'rinishida, brend kodi "__" gacha bo'lgan qism.
 * Faqat sxemasi aniq tasdiqlangan brendlar uchun `deeplink` beriladi; qolganlari
 * uchun o'rnatilgan ilova (Android intent) -> do'kon/sayt fallback ishlaydi.
 */
const BRANDS: Record<
  string,
  {
    /** Ilovani A->B yo'nalishi bilan to'g'ridan-to'g'ri ochuvchi haqiqiy deeplink(lar). */
    deeplinks?: (s: LatLng, e: LatLng | null, tier?: string) => string[];
    androidPackage?: string;
    iosAppId?: string;
    /** iOS uchun ilova URL sxemasi (bo'lsa) — o'rnatilgan ilovani ochish uchun. */
    iosScheme?: string;
    website?: string;
  }
> = {
  yandex_go: {
    // Yandex Go rasmiy deeplink'lari: avval ilova sxemasi, so'ng AppMetrica
    // universal link (ilova bo'lmasa veb/do'konga o'zi yo'naltiradi).
    deeplinks: (s, e, tier) => {
      const lvl = tier ? YANDEX_LEVEL[tier] : undefined;
      const q = (sep: string) =>
        `start-lat=${s.lat}&start-lon=${s.lng}` +
        (e ? `&end-lat=${e.lat}&end-lon=${e.lng}` : "") +
        (lvl ? `&level=${lvl}` : "") +
        `${sep}ref=taxinarx`;
      return [
        `yandextaxi://route?${q("&")}`,
        `https://3.redirect.appmetrica.yandex.com/route?${q("&")}`,
      ];
    },
    androidPackage: "ru.yandex.taxi",
    iosAppId: "472650686",
    iosScheme: "yandextaxi://",
    website: "https://taxi.yandex.uz",
  },
  uklon: {
    androidPackage: "ua.com.uklontaxi",
    website: "https://uklon.uz",
  },
  fast: {
    androidPackage: "com.fasten.rider",
    website: "https://fasten.com/en_uz",
  },
  wb_taxi: {
    androidPackage: "uz.wildberries.taxi.client",
    website: "https://wbtaxi.uz",
  },
  mytaxi: {
    androidPackage: "com.uznewmax.mytaxi",
    iosAppId: "865012817",
    website: "https://mytaxi.uz",
  },
};

function brandKey(service: ServiceInfo): string {
  return (service.code || "").split("__")[0];
}

/** Backend shablonidagi {start_lat} kabi joylarni real koordinatalar bilan to'ldiradi. */
function fillTemplate(tpl: string, s: LatLng, e: LatLng | null): string | null {
  if (!tpl) return null;
  let out = tpl
    .replace("{start_lat}", String(s.lat))
    .replace("{start_lng}", String(s.lng));
  if (e) {
    out = out
      .replace("{end_lat}", String(e.lat))
      .replace("{end_lng}", String(e.lng));
  }
  // Manzil yo'q, lekin shablon uni talab qilsa — bu deeplink yaroqsiz
  if (out.includes("{end_")) return null;
  return out;
}

async function tryOpen(url: string | null): Promise<boolean> {
  if (!url) return false;
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

/** Android'da paket bo'yicha o'rnatilgan ilovani to'g'ridan-to'g'ri ochadi
 *  (route deeplink'i yo'q brendlar uchun — hech bo'lmasa ilova ochiladi). */
async function tryOpenInstalledApp(meta: { androidPackage?: string; iosScheme?: string }): Promise<boolean> {
  if (Platform.OS === "android" && meta.androidPackage) {
    return tryOpen(`intent:#Intent;package=${meta.androidPackage};end`);
  }
  if (Platform.OS === "ios" && meta.iosScheme) {
    return tryOpen(meta.iosScheme);
  }
  return false;
}

/**
 * Taxi ilovasini A (boshlang'ich) va B (manzil) yo'nalishi bilan ochadi.
 *
 * Tartib:
 *   1) haqiqiy route-deeplink (manzil bilan to'ldirilgan) ->
 *   2) o'rnatilgan ilovani ochish (paket/sxema bo'yicha) ->
 *   3) ilova do'koni -> 4) brend sayti -> 5) xabar.
 */
export async function openTaxiApp(
  service: ServiceInfo,
  start: LatLng,
  end: LatLng | null
): Promise<void> {
  const key = brandKey(service);
  const meta = BRANDS[key] || {};
  const brandName = service.brand || service.name;
  const tier = (service as any).tier as string | undefined;

  // 1) Haqiqiy route-deeplink(lar) — manzil (va Yandex'da tarif) bilan
  const candidates: string[] = [
    ...(meta.deeplinks ? meta.deeplinks(start, end, tier) : []),
    fillTemplate(service.deeplink_template || "", start, end) || "",
  ].filter(Boolean);
  for (const url of candidates) {
    if (await tryOpen(url)) return;
  }

  // 2) Route deeplink'i yo'q — o'rnatilgan ilovani ochishga urinamiz
  if (await tryOpenInstalledApp(meta)) return;

  // 3) Ilova o'rnatilmagan bo'lishi mumkin — do'konga yo'naltiramiz
  if (Platform.OS === "android") {
    const pkg = meta.androidPackage;
    const market = pkg
      ? `market://details?id=${pkg}`
      : `market://search?q=${encodeURIComponent(brandName)}`;
    if (await tryOpen(market)) return;
    const playWeb = pkg
      ? `https://play.google.com/store/apps/details?id=${pkg}`
      : `https://play.google.com/store/search?q=${encodeURIComponent(brandName)}&c=apps`;
    if (await tryOpen(playWeb)) return;
  } else {
    const ios = meta.iosAppId
      ? `https://apps.apple.com/app/id${meta.iosAppId}`
      : `https://apps.apple.com/search?term=${encodeURIComponent(brandName)}`;
    if (await tryOpen(ios)) return;
  }

  // 4) Brend sayti
  if (await tryOpen(meta.website || null)) return;

  // 5) Hech narsa ochilmadi
  Alert.alert(
    service.name,
    "Ilovani ochib bo'lmadi. Ilova o'rnatilganini tekshiring yoki do'kondan yuklab oling."
  );
}
