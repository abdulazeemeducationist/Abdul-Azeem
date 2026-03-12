import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { api, Level } from "@/hooks/useApi";

const LEVEL_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; desc: string }> = {
  "Foundation Level":   { icon: "leaf-outline",    color: "#059669", desc: "Entry-level introductory papers" },
  "Knowledge Level":    { icon: "bulb-outline",     color: "#2563EB", desc: "Core accounting and business knowledge" },
  "Skills Level":       { icon: "construct-outline",color: "#7C3AED", desc: "Technical skills and application" },
  "Professional Level": { icon: "trophy-outline",   color: "#D97706", desc: "Strategic and professional competencies" },
};

function LevelCard({ level, courseId, courseName, courseCode }: {
  level: Level;
  courseId: string;
  courseName: string;
  courseCode: string;
}) {
  const meta = LEVEL_META[level.name] ?? { icon: "layers-outline" as keyof typeof Ionicons.glyphMap, color: Colors.light.primary, desc: "" };

  return (
    <Pressable
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
      onPress={() => router.push({
        pathname: "/papers/[levelId]",
        params: { levelId: level.id, levelName: level.name, courseId, courseName, courseCode }
      })}
    >
      <View style={[styles.iconBox, { backgroundColor: meta.color + "14" }]}>
        <Ionicons name={meta.icon} size={28} color={meta.color} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.levelName}>{level.name}</Text>
        <Text style={styles.levelDesc} numberOfLines={1}>{meta.desc}</Text>
        <View style={styles.statsRow}>
          <View style={styles.chip}>
            <Ionicons name="document-text-outline" size={12} color={Colors.light.textMuted} />
            <Text style={styles.chipText}>{level.subjectCount} Papers</Text>
          </View>
        </View>
      </View>
      <View style={[styles.orderBadge, { backgroundColor: meta.color + "14" }]}>
        <Text style={[styles.orderNum, { color: meta.color }]}>{level.orderNumber}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.light.textMuted} />
    </Pressable>
  );
}

export default function LevelsScreen() {
  const { courseId, courseName, courseCode } = useLocalSearchParams<{
    courseId: string; courseName: string; courseCode: string;
  }>();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 67) : insets.top;

  const { data: levels, isLoading, error, refetch } = useQuery({
    queryKey: ["levels", courseId],
    queryFn: () => api.getLevels(Number(courseId)),
    enabled: !!courseId,
  });

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.light.text} />
        </Pressable>
        <View style={styles.headerTitles}>
          <Text style={styles.programLabel}>{courseCode}</Text>
          <Text style={styles.screenTitle}>Levels</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.light.error} />
          <Text style={styles.errorText}>Failed to load levels</Text>
          <Pressable style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={levels ?? []}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <LevelCard
              level={item}
              courseId={courseId}
              courseName={courseName}
              courseCode={courseCode ?? ""}
            />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: isWeb ? 34 : 30 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="layers-outline" size={64} color={Colors.light.textMuted} />
              <Text style={styles.emptyText}>No levels found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8, gap: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.light.card, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  headerTitles: { flex: 1 },
  programLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.light.primary, textTransform: "uppercase", letterSpacing: 1 },
  screenTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.light.text },
  list: { paddingHorizontal: 16, gap: 12, paddingTop: 4 },
  card: {
    backgroundColor: Colors.light.card, borderRadius: 16, padding: 16,
    flexDirection: "row", alignItems: "center", gap: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  iconBox: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cardContent: { flex: 1, gap: 4 },
  levelName: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.light.text },
  levelDesc: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary },
  statsRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.light.backgroundSecondary, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  chipText: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.light.textMuted },
  orderBadge: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  orderNum: { fontSize: 14, fontFamily: "Inter_700Bold" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.light.error },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: Colors.light.primary, borderRadius: 10 },
  retryText: { color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  emptyText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.light.textMuted },
});
