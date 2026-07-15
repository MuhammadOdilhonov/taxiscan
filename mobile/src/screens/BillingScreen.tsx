import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, Modal, Alert, Animated, Easing, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, radius } from "@/theme";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Header } from "@/components/ui/Header";
import { apiGet, apiPost } from "@/lib/api/client";
import { formatUzs, formatUzsShort, formatDateTime } from "@/lib/format";
import type { Subscription, Transaction, PaymeCheckout } from "@/lib/api/types";

export function BillingScreen() {
  const { colors } = useTheme();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [checkout, setCheckout] = useState<PaymeCheckout | null>(null);

  // Sparkles iconi uchun pulslanuvchi animatsiya
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);
  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.25] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

  const load = async () => {
    try {
      const [s, t] = await Promise.all([
        apiGet<Subscription>("/billing/subscription/"),
        apiGet<{ results: Transaction[] }>("/billing/transactions/"),
      ]);
      setSub(s);
      setTxns(t.results || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const priceUzs = sub?.monthly_price_uzs || 0;

  const subscribe = async () => {
    setBusy(true);
    try {
      const co = await apiPost<PaymeCheckout>("/billing/payme/checkout/", {});
      setCheckout(co);
    } catch (err: any) {
      Alert.alert("Xatolik", err?.data?.detail || "Qayta urinib ko'ring");
    } finally {
      setBusy(false);
    }
  };

  const onPaid = () => {
    setCheckout(null);
    load();
    Alert.alert("Muvaffaqiyatli", "To'lov qabul qilindi — obuna 30 kunga uzaytirildi!");
  };

  const cancel = () => {
    Alert.alert("Obunani bekor qilish", "Avtomatik yangilanish o'chiriladi. Davom etamizmi?", [
      { text: "Yo'q", style: "cancel" },
      {
        text: "Ha, bekor qil",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            await apiPost("/billing/cancel/", {});
            await load();
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  return (
    <Screen refreshing={loading} onRefresh={load}>
      <Header
        title="Obuna"
        subtitle={priceUzs ? `Premium — oyiga ${formatUzs(priceUzs)}` : "Premium obuna"}
      />

      <View style={[styles.premium, { backgroundColor: colors.black }]}>
        <View style={styles.premiumHead}>
          <View style={styles.premiumLabel}>
            <Ionicons name="diamond" size={16} color={colors.brand} />
            <Text style={[styles.premiumLabelTxt, { color: colors.brand }]}>PREMIUM OBUNA</Text>
          </View>
          <Animated.View style={{ transform: [{ scale: pulseScale }], opacity: pulseOpacity }}>
            <Ionicons name="sparkles" size={24} color={colors.brand} />
          </Animated.View>
        </View>
        <Text style={styles.premiumPrice}>
          {formatUzsShort(priceUzs)}
          <Text style={styles.premiumPer}> so'm/oy</Text>
        </Text>
        <Text style={styles.premiumSub}>Payme orqali xavfsiz to'lov · Istalgan vaqt bekor qilish</Text>

        {sub ? (
          <View style={styles.subBox}>
            <SubRow label="Holat" value={sub.status_display} />
            <SubRow label="Qoldi" value={`${sub.days_left} kun`} />
            <SubRow label="Tugaydi" value={formatDateTime(sub.expires_at)} />
          </View>
        ) : null}

        {/* To'lash — faqat obuna faol bo'lmaganda yoki 3 kundan kam qolganda */}
        {(!sub || !sub.is_active || sub.days_left <= 3) ? (
          <Button
            title={`Payme orqali to'lash (${formatUzs(priceUzs)})`}
            onPress={subscribe}
            loading={busy}
            style={{ marginTop: 16 }}
          />
        ) : (
          <View style={styles.activeBox}>
            <Ionicons name="checkmark-circle" size={18} color={colors.brand} />
            <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>
              Obuna faol — {sub.days_left} kun qoldi
            </Text>
          </View>
        )}
        {sub?.auto_renew ? (
          <Pressable onPress={cancel} style={styles.cancelBtn}>
            <Text style={{ color: "rgba(255,255,255,0.8)", fontWeight: "700", fontSize: 13 }}>
              Avtomatik yangilanishni bekor qilish
            </Text>
          </Pressable>
        ) : null}

        <View style={styles.secure}>
          <Ionicons name="shield-checkmark" size={14} color={colors.brand} />
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>
            Karta ma'lumotlari ilovada saqlanmaydi — to'lov Payme sahifasida amalga oshiriladi
          </Text>
        </View>
      </View>

      <Card padded>
        <Text style={[styles.blockTitle, { color: colors.ink, marginBottom: 12 }]}>
          Tranzaksiyalar tarixi
        </Text>
        {txns.length === 0 ? (
          <Text style={{ color: colors.inkMuted, fontSize: 13, textAlign: "center", paddingVertical: 14 }}>
            Hech qanday tranzaksiya yo'q
          </Text>
        ) : (
          txns.map((t) => {
            const icon =
              t.status === "success" ? "checkmark-circle" : t.status === "failed" ? "close-circle" : "time";
            const color =
              t.status === "success" ? colors.green : t.status === "failed" ? colors.red : colors.orange;
            return (
              <View key={t.id} style={[styles.txn, { borderBottomColor: colors.line }]}>
                <Ionicons name={icon as any} size={20} color={color} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={{ color: colors.ink, fontWeight: "700", fontSize: 13 }} numberOfLines={1}>
                    {t.description}
                  </Text>
                  <Text style={{ color: colors.inkMuted, fontSize: 11, marginTop: 1 }}>
                    {formatDateTime(t.created_at)} · {t.status_display}
                  </Text>
                  {t.error_message ? (
                    <Text style={{ color: colors.red, fontSize: 11, marginTop: 1 }}>{t.error_message}</Text>
                  ) : null}
                </View>
                <Text style={{ color: colors.ink, fontWeight: "900", fontSize: 14 }}>
                  {formatUzs(t.amount_uzs)}
                </Text>
              </View>
            );
          })
        )}
      </Card>

      <PaymeModal
        checkout={checkout}
        onClose={() => { setCheckout(null); load(); }}
        onPaid={onPaid}
      />
    </Screen>
  );
}

function SubRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.subRow}>
      <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>{label}</Text>
      <Text style={{ color: "#fff", fontSize: 13, fontWeight: "800" }}>{value}</Text>
    </View>
  );
}

/** Payme checkout oynasi — WebView ochiq turganda backend'dan to'lov holati so'rab turiladi. */
function PaymeModal({
  checkout,
  onClose,
  onPaid,
}: {
  checkout: PaymeCheckout | null;
  onClose: () => void;
  onPaid: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!checkout) return;
    const timer = setInterval(async () => {
      try {
        const s = await apiGet<{ paid: boolean }>(
          `/billing/payme/status/?order_id=${checkout.order_id}`
        );
        if (s.paid) {
          clearInterval(timer);
          onPaid();
        }
      } catch {
        /* ignore */
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [checkout]);

  return (
    <Modal visible={!!checkout} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <View style={[styles.paymeHead, { borderBottomColor: colors.line }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="card" size={20} color={colors.ink} />
            <Text style={{ color: colors.ink, fontSize: 16, fontWeight: "900" }}>
              Payme — {checkout ? formatUzs(checkout.amount_uzs) : ""}
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={26} color={colors.ink} />
          </Pressable>
        </View>
        {checkout ? (
          <WebView
            source={{ uri: checkout.checkout_url }}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.webLoading}>
                <ActivityIndicator size="large" color={colors.brand} />
                <Text style={{ color: colors.inkMuted, marginTop: 12, fontSize: 13 }}>
                  Payme yuklanmoqda...
                </Text>
              </View>
            )}
            style={{ flex: 1 }}
          />
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  premium: { borderRadius: radius.lg, padding: 18 },
  premiumHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  premiumLabel: { flexDirection: "row", alignItems: "center", gap: 6 },
  premiumLabelTxt: { fontSize: 11, fontWeight: "900", letterSpacing: 0.5 },
  premiumPrice: { color: "#fff", fontSize: 40, fontWeight: "900", marginTop: 8 },
  premiumPer: { fontSize: 18, fontWeight: "600", color: "rgba(255,255,255,0.7)" },
  premiumSub: { color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 2 },
  subBox: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: radius.md,
    padding: 12,
    marginTop: 16,
    gap: 8,
  },
  subRow: { flexDirection: "row", justifyContent: "space-between" },
  activeBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  cancelBtn: { alignItems: "center", paddingVertical: 12, marginTop: 4 },
  blockTitle: { fontSize: 15, fontWeight: "800" },
  secure: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14 },
  txn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  paymeHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  webLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
});
