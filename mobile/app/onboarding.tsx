import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, radius } from "@/theme";
import { useAuth } from "@/store/auth";
import { Logo } from "@/components/ui/Header";
import { Button } from "@/components/ui/Button";

interface Slide {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
}

const SLIDES: Slide[] = [
  {
    icon: "car-sport",
    title: "TaxiNarx'ga xush kelibsiz",
    text:
      "Toshkentdagi barcha taksi xizmatlari narxini bitta joyda taqqoslang. " +
      "Yandex, My Taxi va boshqalarni alohida ochib o'tirmang — hammasi shu yerda.",
  },
  {
    icon: "map",
    title: "Manzilni oson tanlang",
    text:
      "Qayerdan va qayerga borishni yozib qidiring yoki xaritadan surib tanlang. " +
      "Nuqta markazda turadi — xaritani harakatlantirib aniq joyni belgilaysiz.",
  },
  {
    icon: "pricetags",
    title: "Narxlarni solishtiring",
    text:
      "Bir necha yo'l variantini, masofa va vaqtni ko'rasiz. " +
      "Eng arzon taksi avtomatik belgilanadi — ortiqcha to'lamaysiz.",
  },
  {
    icon: "rocket",
    title: "Tayyormisiz?",
    text:
      "Ro'yxatdan o'ting yoki hisobingizga kiring va bir soniyada eng arzon " +
      "taksi variantini toping. Keling, boshlaymiz!",
  },
];

export default function Onboarding() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const completeOnboarding = useAuth((s) => s.completeOnboarding);
  const { width } = useWindowDimensions();

  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  };

  const finish = async () => {
    await completeOnboarding();
    router.replace("/(auth)/login");
  };

  const next = () => {
    if (isLast) {
      finish();
      return;
    }
    scrollRef.current?.scrollTo({ x: width * (index + 1), animated: true });
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.bg }]}>
      {/* Top bar: logo + skip */}
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <Logo size={26} />
        {!isLast ? (
          <Pressable onPress={finish} hitSlop={10}>
            <Text style={[styles.skip, { color: colors.inkMuted }]}>O'tkazib yuborish</Text>
          </Pressable>
        ) : (
          <View style={{ width: 1 }} />
        )}
      </View>

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        scrollEventThrottle={16}
      >
        {SLIDES.map((s, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            <View style={[styles.iconCircle, { backgroundColor: colors.brand + "26", borderColor: colors.brand }]}>
              <Ionicons name={s.icon} size={64} color={colors.brandDark} />
            </View>
            <Text style={[styles.title, { color: colors.ink }]}>{s.title}</Text>
            <Text style={[styles.text, { color: colors.inkMuted }]}>{s.text}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i === index ? colors.brand : colors.line,
                width: i === index ? 24 : 8,
              },
            ]}
          />
        ))}
      </View>

      {/* Bottom action */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          title={isLast ? "Boshlash" : "Keyingisi"}
          onPress={next}
          icon={
            <Ionicons
              name={isLast ? "checkmark-circle" : "arrow-forward"}
              size={18}
              color="#0F1216"
            />
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  skip: { fontSize: 14, fontWeight: "700" },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    marginBottom: 40,
  },
  title: { fontSize: 26, fontWeight: "900", textAlign: "center", marginBottom: 16 },
  text: { fontSize: 16, lineHeight: 24, textAlign: "center" },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  dot: { height: 8, borderRadius: 4 },
  bottom: { paddingHorizontal: 20, paddingTop: 12 },
});
