const { withAndroidManifest } = require("@expo/config-plugins");

/**
 * Android 11+ (targetSdk 30+) da boshqa ilovalar "ko'rinmaydi" — ularni
 * ochish/aniqlash uchun AndroidManifest'ga <queries> qo'shish SHART. Aks holda
 * Linking.openURL taksi ilovasini topolmay xato beradi va Play Store'ga o'tib
 * ketadi. Shu yerda taksi ilovalarining paketlari va scheme'larini ro'yxatga olamiz.
 */
const TAXI_PACKAGES = [
  "ru.yandex.taxi",              // Yandex Go
  "ua.com.uklontaxi",           // Uklon
  "com.fasten.rider",           // Fasten
  "uz.wildberries.taxi.client", // WB Taxi
  "com.uznewmax.mytaxi",        // MyTaxi
  "net.mytaxi.passenger",
  "uz.mytaxi.client",
];

const TAXI_SCHEMES = [
  "yandextaxi",
  "fasten",
  "uklon",
  "uklonpassenger",
  "mytaxi",
  "wbtaxi",
];

const withTaxiQueries = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    if (!Array.isArray(manifest.queries)) {
      manifest.queries = [];
    }

    manifest.queries.push({
      package: TAXI_PACKAGES.map((name) => ({ $: { "android:name": name } })),
      intent: TAXI_SCHEMES.map((scheme) => ({
        action: [{ $: { "android:name": "android.intent.action.VIEW" } }],
        data: [{ $: { "android:scheme": scheme } }],
      })),
    });

    return config;
  });
};

module.exports = withTaxiQueries;
