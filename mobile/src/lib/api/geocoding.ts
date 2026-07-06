import { apiGet } from "./client";

export interface GeocodeResult {
  label: string;
  full?: string;
  address?: Record<string, string>;
}

export interface SearchResult {
  label: string;
  lat: number;
  lng: number;
  type?: string;
  importance?: number;
}

let lastReverseAt = 0;

export async function reverseGeocode(lat: number, lng: number): Promise<GeocodeResult> {
  // Nominatim — 1 req/sek, throttle
  const now = Date.now();
  const wait = Math.max(0, lastReverseAt + 1100 - now);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastReverseAt = Date.now();
  return apiGet<GeocodeResult>(`/taxi/geocode/reverse/?lat=${lat}&lng=${lng}`, { auth: false });
}

export function searchAddress(q: string): Promise<{ results: SearchResult[] }> {
  return apiGet<{ results: SearchResult[] }>(
    `/taxi/geocode/search/?q=${encodeURIComponent(q)}`,
    { auth: false }
  );
}

let searchTimer: ReturnType<typeof setTimeout> | null = null;

/** Debounced address search */
export function debouncedSearch(
  q: string,
  callback: (results: SearchResult[]) => void,
  delay = 500
) {
  if (searchTimer) clearTimeout(searchTimer);
  if (q.trim().length < 2) {
    callback([]);
    return;
  }
  searchTimer = setTimeout(async () => {
    try {
      const r = await searchAddress(q);
      callback(r.results || []);
    } catch {
      callback([]);
    }
  }, delay);
}

export function shortenLabel(s: string): string {
  const parts = s.split(",").map((p) => p.trim());
  return parts.slice(0, 3).join(", ");
}

/** Toshkentdagi mashhur joylar (offline preset) */
export const TASHKENT_PRESETS: SearchResult[] = [
  { label: "Mirobod tumani", lat: 41.296, lng: 69.281 },
  { label: "Yunusobod tumani", lat: 41.366, lng: 69.288 },
  { label: "Chilonzor tumani", lat: 41.275, lng: 69.203 },
  { label: "Mirzo Ulug'bek tumani", lat: 41.336, lng: 69.336 },
  { label: "Toshkent xalqaro aeroporti", lat: 41.257, lng: 69.281 },
  { label: "Chorsu bozori", lat: 41.327, lng: 69.232 },
  { label: "Tashkent City parki", lat: 41.317, lng: 69.272 },
  { label: "Magic City parki", lat: 41.341, lng: 69.205 },
];
