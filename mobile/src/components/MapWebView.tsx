import React, { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { StyleProp, ViewStyle } from "react-native";
import { WebView } from "react-native-webview";

const TASHKENT = { lat: 41.311, lng: 69.279 };

export interface MapMarker {
  lat: number;
  lng: number;
  type?: "start" | "end";
  /** Pin markazida ko'rsatiladigan harf (masalan "A" / "B") */
  label?: string;
}

export interface MapRoute {
  id: number;
  coords: [number, number][]; // [lat, lng] juftliklar
  color?: string;
  selected?: boolean;
}

export interface MapZone {
  id: number;
  name?: string;
  rings: [number, number][][]; // har bir ring [lat,lng] nuqtalar
  highlighted?: boolean;
  color?: string;
}

export interface MapWebViewHandle {
  /** Xaritani berilgan koordinataga markazlash */
  recenter: (lat: number, lng: number, zoom?: number) => void;
}

interface Props {
  mode: "picker" | "route" | "zones";
  isDark?: boolean;
  center?: { lat: number; lng: number } | null;
  zoom?: number;
  markers?: MapMarker[];
  routes?: MapRoute[];
  zones?: MapZone[];
  /** zones rejimida "siz shu yerdasiz" nuqtasi — atrofga yaqinlashtiriladi */
  userLoc?: { lat: number; lng: number } | null;
  /** picker: xarita to'xtaganda markaz koordinatasi */
  onCenterChange?: (lat: number, lng: number) => void;
  /** route: bir yo'l chizig'i bosilganda */
  onRoutePress?: (id: number) => void;
  /** zones: bir tuman bosilganda */
  onZonePress?: (id: number) => void;
  style?: StyleProp<ViewStyle>;
}

function buildHtml(props: Props): string {
  const { mode, isDark, center, zoom = 15, markers = [], routes = [], zones = [], userLoc = null } = props;
  const c = center || TASHKENT;
  const tiles = isDark
    ? "https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

  const markersJson = JSON.stringify(markers);
  const routesJson = JSON.stringify(routes);
  const zonesJson = JSON.stringify(zones);

  // Markaziy pin (faqat picker rejimida) — Yandex uslubida.
  // Kunduzi: qora pin. Tunda: o'rtasi oq, cheti sariq.
  const pinOuter = isDark ? "#FFCC00" : "#0F1216";
  const pinInner = isDark ? "#FFFFFF" : "#FFCC00";
  const pinCore = isDark ? "#FFCC00" : "#0F1216";
  const pinHtml =
    mode === "picker"
      ? `<div id="pin">
           <svg width="40" height="52" viewBox="0 0 40 52" xmlns="http://www.w3.org/2000/svg">
             <path d="M20 0C9 0 0 9 0 20c0 14 20 32 20 32s20-18 20-32C40 9 31 0 20 0z" fill="${pinOuter}"/>
             <circle cx="20" cy="20" r="13" fill="${pinInner}"/>
             <circle cx="20" cy="20" r="5" fill="${pinCore}"/>
           </svg>
           <div id="pin-shadow"></div>
         </div>`
      : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; background: ${isDark ? "#0A0D11" : "#e8eaed"}; }
  .leaflet-control-attribution { font-size: 9px; }
  #pin {
    position: fixed; left: 50%; top: 50%;
    transform: translate(-50%, -100%);
    margin-top: 6px; z-index: 1000; pointer-events: none;
    filter: drop-shadow(0 4px 6px rgba(0,0,0,.35));
  }
  #pin-shadow {
    position: absolute; left: 50%; bottom: -3px; transform: translateX(-50%);
    width: 14px; height: 5px; background: rgba(0,0,0,.25); border-radius: 50%;
  }
  .tn-dot {
    border-radius: 50%; border: 3px solid #fff;
    box-shadow: 0 2px 6px rgba(0,0,0,.4);
  }
  .tn-zone-label {
    background: transparent; border: 0; box-shadow: none;
    color: ${isDark ? "#F3F5F7" : "#0F1216"};
    font-weight: 800; font-size: 11px;
    text-shadow: 0 1px 3px ${isDark ? "rgba(0,0,0,.8)" : "rgba(255,255,255,.9)"};
  }
  .tn-zone-label::before { display: none; }
</style>
</head>
<body>
<div id="map"></div>
${pinHtml}
<script>
  var post = function(o){ if(window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(o)); };
  var map = L.map('map', { zoomControl: ${mode === "picker" ? "false" : "true"}, attributionControl: true })
            .setView([${c.lat}, ${c.lng}], ${zoom});
  L.tileLayer('${tiles}', { subdomains: ['a','b','c','d'], maxZoom: 19,
      attribution: '&copy; OpenStreetMap &copy; CARTO' }).addTo(map);

  var MODE = '${mode}';
  var markers = ${markersJson};
  var routes = ${routesJson};
  var zones = ${zonesJson};
  var userLoc = ${userLoc ? JSON.stringify(userLoc) : "null"};
  var DARK = ${isDark ? "true" : "false"};

  function makeDot(color, size){
    return L.divIcon({ className: '', iconSize: [size, size], iconAnchor: [size/2, size/2],
      html: '<div class="tn-dot" style="width:'+size+'px;height:'+size+'px;background:'+color+'"></div>' });
  }

  // Manzil pin'i — kartaga tushadigan klassik pin, o'rtasida harf (A/B)
  function makePin(fill, letter){
    var w = 34, h = 44;
    var svg = '<svg width="'+w+'" height="'+h+'" viewBox="0 0 34 44" xmlns="http://www.w3.org/2000/svg">'
      + '<path d="M17 0C7.6 0 0 7.6 0 17c0 12 17 27 17 27s17-15 17-27C34 7.6 26.4 0 17 0z" fill="'+fill+'"/>'
      + '<circle cx="17" cy="17" r="11" fill="#FFFFFF"/>'
      + '<text x="17" y="22" text-anchor="middle" font-size="15" font-weight="bold" fill="'+fill+'" font-family="system-ui,Arial">'+(letter||'')+'</text>'
      + '</svg>';
    return L.divIcon({ className: 'tn-pin', iconSize: [w, h], iconAnchor: [w/2, h], html: svg });
  }

  if (MODE === 'zones') {
    var zbounds = [];
    var selBounds = null;
    zones.forEach(function(z){
      var stroke = z.color || (z.highlighted ? '#0F1216' : (DARK ? '#8b949e' : '#5C6772'));
      var fill = z.highlighted ? '#FFCC00' : (z.color || (DARK ? '#3a4150' : '#5C6772'));
      (z.rings || []).forEach(function(ring){
        if (!ring || ring.length < 3) return;
        var poly = L.polygon(ring, {
          color: stroke,
          weight: z.highlighted ? 3 : 1.2,
          opacity: z.highlighted ? 1 : 0.6,
          fillColor: fill,
          fillOpacity: z.highlighted ? 0.45 : (DARK ? 0.18 : 0.12)
        }).addTo(map);
        poly.on('click', function(){ post({ type: 'zone', id: z.id }); });
        // Zona nomi doimiy yorliq sifatida markazda ko'rinib tursin
        if (z.name) poly.bindTooltip(z.name, {
          permanent: true, direction: 'center', className: 'tn-zone-label'
        });
        ring.forEach(function(p){ zbounds.push(p); });
        if (z.highlighted) {
          if (!selBounds) selBounds = [];
          ring.forEach(function(p){ selBounds.push(p); });
        }
      });
    });

    // "Siz shu yerdasiz" nuqtasi — DOIM ko'rinib turadi (zona tanlansa ham yo'qolmaydi)
    if (userLoc) {
      L.marker([userLoc.lat, userLoc.lng], { icon: makeDot('#FF3B30', 18), zIndexOffset: 1000 })
        .addTo(map).bindTooltip('Siz shu yerda', { direction: 'top' });
    }

    // Markazlash: zona tanlangan bo'lsa — o'sha zonaga; aks holda joriy joyga; bo'lmasa barcha zonalar
    if (selBounds && selBounds.length) {
      try { map.fitBounds(selBounds, { padding: [40, 40], maxZoom: 13 }); } catch(e){}
    } else if (userLoc) {
      try { map.setView([userLoc.lat, userLoc.lng], 13); } catch(e){}
    } else if (zbounds.length > 0) {
      try { map.fitBounds(zbounds, { padding: [30, 30], maxZoom: 13 }); } catch(e){}
    }
  }

  if (MODE === 'route') {
    var bounds = [];
    routes.forEach(function(rt){
      if (!rt.coords || rt.coords.length < 2) return;
      var line = L.polyline(rt.coords, {
        color: rt.color || '#FFCC00',
        weight: rt.selected ? 6 : 4,
        opacity: rt.selected ? 1 : 0.55,
        dashArray: rt.selected ? null : '8 6'
      }).addTo(map);
      line.on('click', function(){ post({ type: 'route', id: rt.id }); });
      rt.coords.forEach(function(p){ bounds.push(p); });
    });
    markers.forEach(function(m){
      var isEnd = m.type === 'end';
      var color = isEnd ? '#0F1216' : '#FFCC00';
      var letter = m.label || (isEnd ? 'B' : 'A');
      L.marker([m.lat, m.lng], { icon: makePin(color, letter) }).addTo(map);
      bounds.push([m.lat, m.lng]);
    });
    if (bounds.length > 0) {
      try { map.fitBounds(bounds, { padding: [45, 45], maxZoom: 16 }); } catch(e){}
    }
  }

  if (MODE === 'picker') {
    // Markaz o'zgarganda emit qilamiz, lekin:
    //  - faqat sezilarli siljishda (mayda titrashlarni e'tiborsiz qoldiramiz)
    //  - moveend ketma-ket yonganda debounce bilan bir martagina yuboramiz
    var lastLat = null, lastLng = null, emitTimer = null;
    var emit = function(){
      var ctr = map.getCenter();
      // ~5 metrdan kichik siljishni o'tkazib yuboramiz (qayta-qayta geokodlashni oldini oladi)
      if (lastLat !== null) {
        var dLat = Math.abs(ctr.lat - lastLat);
        var dLng = Math.abs(ctr.lng - lastLng);
        if (dLat < 0.00005 && dLng < 0.00005) return;
      }
      lastLat = ctr.lat; lastLng = ctr.lng;
      post({ type: 'center', lat: ctr.lat, lng: ctr.lng });
    };
    var debouncedEmit = function(){
      if (emitTimer) clearTimeout(emitTimer);
      emitTimer = setTimeout(emit, 250);
    };
    map.on('moveend', debouncedEmit);
    setTimeout(emit, 300);
  }

  // RN dan markazni o'zgartirish
  window.recenter = function(lat, lng, z){ map.setView([lat, lng], z || map.getZoom()); };
  post({ type: 'ready' });
</script>
</body>
</html>`;
}

export const MapWebView = forwardRef<MapWebViewHandle, Props>(function MapWebView(props, ref) {
  const webRef = useRef<WebView>(null);

  // HTML faqat mode/markers/routes/tema o'zgarganda qayta quriladi.
  // center o'zgarsa qayta yuklamaymiz — recenter() orqali harakatlantiramiz.
  const html = useMemo(
    () => buildHtml(props),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      props.mode,
      props.isDark,
      JSON.stringify(props.markers),
      JSON.stringify(props.routes),
      JSON.stringify(props.zones),
      JSON.stringify(props.userLoc),
    ]
  );

  useImperativeHandle(ref, () => ({
    recenter: (lat, lng, zoom) => {
      webRef.current?.injectJavaScript(
        `window.recenter && window.recenter(${lat}, ${lng}, ${zoom ?? "undefined"}); true;`
      );
    },
  }));

  return (
    <WebView
      ref={webRef}
      originWhitelist={["*"]}
      source={{ html }}
      style={props.style}
      javaScriptEnabled
      domStorageEnabled
      nestedScrollEnabled
      androidLayerType="hardware"
      onMessage={(e) => {
        try {
          const msg = JSON.parse(e.nativeEvent.data);
          if (msg.type === "center" && props.onCenterChange) {
            props.onCenterChange(msg.lat, msg.lng);
          } else if (msg.type === "route" && props.onRoutePress) {
            props.onRoutePress(msg.id);
          } else if (msg.type === "zone" && props.onZonePress) {
            props.onZonePress(msg.id);
          }
        } catch {
          /* ignore */
        }
      }}
    />
  );
});
