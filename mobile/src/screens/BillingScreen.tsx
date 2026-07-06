import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, Modal, Alert, Animated, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, radius } from "@/theme";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Header } from "@/components/ui/Header";
import { Field } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { apiGet, apiPost, apiDelete } from "@/lib/api/client";
import { formatUzs, formatDateTime } from "@/lib/format";
import type { Card as CardType, Subscription, Transaction } from "@/lib/api/types";

export function BillingScreen() {
  const { colors } = useTheme();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [cards, setCards] = useState<CardType[]>([]);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

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
      const [s, c, t] = await Promise.all([
        apiGet<Subscription>("/billing/subscription/"),
        apiGet<{ results: CardType[] }>("/billing/cards/"),
        apiGet<{ results: Transaction[] }>("/billing/transactions/"),
      ]);
      setSub(s);
      setCards(c.results || []);
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

  const subscribe = async () => {
    if (cards.length === 0) {
      setShowAdd(true);
      return;
    }
    setBusy(true);
    try {
      await apiPost("/billing/subscribe/", {});
      await load();
      Alert.alert("Muvaffaqiyatli", "Obuna 30 kunga uzaytirildi!");
    } catch (err: any) {
      Alert.alert("Xatolik", err?.data?.detail || "Qayta urinib ko'ring");
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    Alert.alert("Obunani bekor qilish", "Avtomatik to'lov o'chiriladi. Davom etamizmi?", [
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

  const removeCard = (id: number) => {
    Alert.alert("Kartani o'chirish", "Ushbu kartani o'chirasizmi?", [
      { text: "Yo'q", style: "cancel" },
      {
        text: "O'chirish",
        style: "destructive",
        onPress: async () => {
          try {
            await apiDelete(`/billing/cards/${id}/`);
            await load();
          } catch {
            /* ignore */
          }
        },
      },
    ]);
  };

  return (
    <Screen refreshing={loading} onRefresh={load}>
      <Header title="Obuna" subtitle="Premium — oyiga atigi $1" />

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
          $1<Text style={styles.premiumPer}>/oy</Text>
        </Text>
        <Text style={styles.premiumSub}>~12 500 so'm · Istalgan vaqt bekor qilish</Text>

        {sub ? (
          <View style={styles.subBox}>
            <SubRow label="Holat" value={sub.status_display} />
            <SubRow label="Qoldi" value={`${sub.days_left} kun`} />
            <SubRow label="Tugaydi" value={formatDateTime(sub.expires_at)} />
          </View>
        ) : null}

        {/* "30 kunga uzaytirish" — faqat obuna faol bo'lmaganda yoki 3 kundan kam qolganda */}
        {(!sub || !sub.is_active || sub.days_left <= 3) ? (
          <Button
            title="30 kunga uzaytirish ($1)"
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
              Avtomatik to'lovni bekor qilish
            </Text>
          </Pressable>
        ) : null}
      </View>

      <Card padded>
        <View style={styles.rowBetween}>
          <View style={styles.rowCenter}>
            <Ionicons name="card-outline" size={18} color={colors.ink} />
            <Text style={[styles.blockTitle, { color: colors.ink }]}>Kartalarim ({cards.length})</Text>
          </View>
          <Pressable onPress={() => setShowAdd(true)} style={styles.rowCenter} hitSlop={8}>
            <Ionicons name="add" size={16} color={colors.brandDark} />
            <Text style={{ color: colors.brandDark, fontWeight: "800", fontSize: 14 }}>Qo'shish</Text>
          </Pressable>
        </View>

        <View style={{ gap: 10, marginTop: 14 }}>
          {cards.length === 0 ? (
            <Text style={{ color: colors.inkMuted, fontSize: 13, textAlign: "center", paddingVertical: 10 }}>
              Hozircha karta yo'q. "Qo'shish" tugmasini bosing.
            </Text>
          ) : (
            cards.map((c) => (
              <View key={c.id} style={[styles.cardItem, { backgroundColor: colors.cardAlt }]}>
                <View style={[styles.cardType, { backgroundColor: colors.ink }]}>
                  <Text style={{ color: colors.brand, fontSize: 9, fontWeight: "900" }}>
                    {c.card_type.toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ color: colors.ink, fontWeight: "700", fontSize: 14 }}>
                    •••• {c.card_last4}
                  </Text>
                  <Text style={{ color: colors.inkMuted, fontSize: 11, marginTop: 2 }}>
                    {c.holder_name} · {String(c.expiry_month).padStart(2, "0")}/{c.expiry_year}
                  </Text>
                </View>
                {c.is_default ? <Badge label="Asosiy" bg={colors.brand} color="#0F1216" /> : null}
                <Pressable onPress={() => removeCard(c.id)} hitSlop={8} style={{ marginLeft: 10 }}>
                  <Ionicons name="trash-outline" size={18} color={colors.red} />
                </Pressable>
              </View>
            ))
          )}
        </View>

        <View style={styles.secure}>
          <Ionicons name="shield-checkmark" size={14} color={colors.green} />
          <Text style={{ color: colors.inkMuted, fontSize: 11 }}>
            Karta ma'lumotlari shifrlangan holda saqlanadi
          </Text>
        </View>
      </Card>

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
                    {formatDateTime(t.created_at)} · •••• {t.card_last4}
                  </Text>
                  {t.error_message ? (
                    <Text style={{ color: colors.red, fontSize: 11, marginTop: 1 }}>{t.error_message}</Text>
                  ) : null}
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ color: colors.ink, fontWeight: "900", fontSize: 14 }}>${t.amount_usd}</Text>
                  <Text style={{ color: colors.inkMuted, fontSize: 11 }}>{formatUzs(t.amount_uzs)}</Text>
                </View>
              </View>
            );
          })
        )}
      </Card>

      <AddCardModal visible={showAdd} onClose={() => setShowAdd(false)} onDone={() => { setShowAdd(false); load(); }} />
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

function AddCardModal({
  visible,
  onClose,
  onDone,
}: {
  visible: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [number, setNumber] = useState("");
  const [holder, setHolder] = useState("");
  const [exp, setExp] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardType, setCardType] = useState<"uzcard" | "humo" | "visa" | "mastercard">("uzcard");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const needsCvv = cardType === "visa" || cardType === "mastercard";

  const reset = () => {
    setNumber(""); setHolder(""); setExp(""); setCvv(""); setCardType("uzcard"); setErrors({});
  };

  const validate = () => {
    const e: Record<string, string> = {};
    const digits = number.replace(/\D/g, "");
    if (digits.length < 16) e.number = "16 raqam to'liq kiriting";
    if (!holder.trim() || holder.trim().length < 3) e.holder = "To'liq ism-familiya kerak";
    const m = exp.match(/^(\d{2})\/(\d{2})$/);
    if (!m) e.exp = "MM/YY formatida kiriting";
    else if (parseInt(m[1], 10) < 1 || parseInt(m[1], 10) > 12) e.exp = "Oy 01-12 oralig'ida";
    if (needsCvv && !/^\d{3,4}$/.test(cvv)) e.cvv = "CVV 3-4 raqam";
    return e;
  };

  const submit = async () => {
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) return;
    setBusy(true);
    try {
      const [mm, yy] = exp.split("/");
      await apiPost("/billing/cards/add/", {
        card_number: number.replace(/\s/g, ""),
        holder_name: holder.trim(),
        expiry_month: parseInt(mm, 10),
        expiry_year: 2000 + parseInt(yy, 10),
        ...(needsCvv ? { cvv } : {}),
        card_type: cardType,
      });
      reset();
      onDone();
    } catch (err: any) {
      const data = err?.data;
      if (data && typeof data === "object") {
        const first = Object.values(data)[0];
        setErrors({ _form: Array.isArray(first) ? first[0] : String(first) });
      } else {
        setErrors({ _form: "Karta qo'shishda xatolik" });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: colors.bg, paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.modalHead}>
            <Text style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>Karta qo'shish</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={26} color={colors.ink} />
            </Pressable>
          </View>

          <View style={styles.typeRow}>
            {(["uzcard", "humo", "visa", "mastercard"] as const).map((c) => {
              const sel = cardType === c;
              return (
                <Pressable
                  key={c}
                  onPress={() => { setCardType(c); if (c === "uzcard" || c === "humo") setCvv(""); }}
                  style={[
                    styles.typeBtn,
                    { backgroundColor: sel ? colors.ink : colors.card, borderColor: colors.line },
                  ]}
                >
                  <Text style={{ color: sel ? colors.card : colors.inkMuted, fontSize: 11, fontWeight: "800" }}>
                    {c.toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={{ gap: 12, marginTop: 14 }}>
            <Field
              placeholder="8600 1234 5678 9012"
              keyboardType="number-pad"
              maxLength={23}
              value={number}
              error={errors.number}
              onChangeText={(t) =>
                setNumber(t.replace(/\s/g, "").replace(/(\d{4})(?=\d)/g, "$1 "))
              }
            />
            <Field
              placeholder="ALI VALIYEV"
              autoCapitalize="characters"
              value={holder}
              error={errors.holder}
              onChangeText={(t) => setHolder(t.toUpperCase())}
            />
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Field
                containerStyle={{ flex: 1 }}
                placeholder="MM/YY"
                keyboardType="number-pad"
                maxLength={5}
                value={exp}
                error={errors.exp}
                onChangeText={(t) => {
                  let v = t.replace(/\D/g, "");
                  if (v.length >= 2) v = v.slice(0, 2) + "/" + v.slice(2, 4);
                  setExp(v);
                }}
              />
              {needsCvv ? (
                <Field
                  containerStyle={{ flex: 1 }}
                  placeholder="CVV"
                  keyboardType="number-pad"
                  maxLength={4}
                  secureTextEntry
                  value={cvv}
                  error={errors.cvv}
                  onChangeText={(t) => setCvv(t.replace(/\D/g, ""))}
                />
              ) : null}
            </View>

            {errors._form ? (
              <View style={[styles.errBox, { backgroundColor: colors.redBg }]}>
                <Text style={{ color: colors.red, fontSize: 13 }}>{errors._form}</Text>
              </View>
            ) : null}

            <Button title="Karta qo'shish" onPress={submit} loading={busy} />
            <Text style={{ color: colors.inkMuted, fontSize: 11, textAlign: "center" }}>
              ℹ️ Tasdiqlash uchun 1$ ushlab qaytariladi (yechilmaydi)
            </Text>
          </View>
        </View>
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
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowCenter: { flexDirection: "row", alignItems: "center", gap: 6 },
  blockTitle: { fontSize: 15, fontWeight: "800" },
  cardItem: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: radius.md },
  cardType: { width: 46, height: 30, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  secure: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14 },
  txn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  modalHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  typeRow: { flexDirection: "row", gap: 8 },
  typeBtn: {
    flex: 1,
    height: 38,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  errBox: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
});
