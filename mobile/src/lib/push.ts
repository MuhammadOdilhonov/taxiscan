import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { apiPost } from "@/lib/api/client";

// Ilova ochiq bo'lganda ham bildirishnoma ko'rsatilsin.
// Import paytida xato bermasligi uchun try/catch ichida.
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch {
  /* Expo Go cheklovi — e'tiborsiz qoldiramiz */
}

/**
 * Telefon push tokenini olib backendga saqlaydi (ilova yopiq bo'lsa ham
 * bildirishnoma kelishi uchun). Xato bo'lsa jim o'tadi — in-app bildirishnoma baribir ishlaydi.
 *
 * Eslatma: Expo Go (Android, SDK 53+) remote push'ni qo'llab-quvvatlamaydi —
 * to'liq ishlashi uchun dev build / standalone APK kerak.
 */
export async function registerPushToken() {
  try {
    if (!Device.isDevice) return;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== "granted") {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== "granted") return;

    const projectId =
      (Constants.expoConfig as any)?.extra?.eas?.projectId ||
      (Constants as any)?.easConfig?.projectId;

    const tokenResp = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenResp.data;
    if (token) {
      await apiPost("/auth/push-token/", { token }).catch(() => {});
    }
  } catch {
    /* Expo Go yoki ruxsat yo'q — jim o'tamiz */
  }
}
