import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";

export default function SelectModeScreen() {
  const { subjectId, subjectName } = useLocalSearchParams<{ subjectId: string; subjectName: string }>();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 67) : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.light.text} />
        </Pressable>
        <View style={styles.headerTitles}>
          <Text style={styles.parentLabel} numberOfLines={1}>{subjectName}</Text>
          <Text style={styles.screenTitle}>Select Mode</Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.prompt}>How would you like to study?</Text>

        {/* Practice Mode */}
        <Pressable
          style={({ pressed }) => [styles.modeCard, { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] }]}
          onPress={() => router.push({ pathname: "/chapters-list/[subjectId]", params: { subjectId, subjectName } })}
        >
          <View style={[styles.modeIconBox, { backgroundColor: Colors.light.primary + "18" }]}>
            <Ionicons name="book-outline" size={28} color={Colors.light.primary} />
          </View>
          <View style={styles.modeText}>
            <Text style={styles.modeTitle}>Practice Mode</Text>
            <Text style={styles.modeSubtitle}>Browse chapters and practise questions at your own pace, no time pressure</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.light.primary} />
        </Pressable>

        {/* Custom Test Mode */}
        <Pressable
          style={({ pressed }) => [styles.modeCard, styles.modeCardAlt, { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] }]}
          onPress={() => router.push({ pathname: "/custom-test/[subjectId]", params: { subjectId, subjectName } })}
        >
          <View style={[styles.modeIconBox, { backgroundColor: "#7C3AED18" }]}>
            <Ionicons name="options-outline" size={28} color="#7C3AED" />
          </View>
          <View style={styles.modeText}>
            <Text style={[styles.modeTitle, { color: "#7C3AED" }]}>Custom Test</Text>
            <Text style={styles.modeSubtitle}>Pick chapters, choose difficulty, set question count and get instant results</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#7C3AED" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8, gap: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.light.card,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  headerTitles: { flex: 1 },
  parentLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.light.textMuted },
  screenTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.light.text },

  body: { flex: 1, paddingHorizontal: 16, paddingTop: 8, gap: 14 },
  prompt: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.light.textSecondary, marginBottom: 4 },

  modeCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: Colors.light.card,
    borderRadius: 18, padding: 18,
    borderWidth: 1.5, borderColor: Colors.light.primary + "30",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  modeCardAlt: {
    borderColor: "#7C3AED30",
  },
  modeIconBox: {
    width: 54, height: 54, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
  },
  modeText: { flex: 1, gap: 4 },
  modeTitle: {
    fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.light.primary,
  },
  modeSubtitle: {
    fontSize: 13, fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary, lineHeight: 19,
  },
});
