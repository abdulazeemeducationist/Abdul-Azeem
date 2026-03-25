import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { api, Course } from "@/hooks/useApi";

const PROGRAM_META: Record<string, {
  icon: keyof typeof Ionicons.glyphMap;
  bg: string;
  accent: string;
  hasLevels: boolean;
}> = {
  ACCA:  { icon: "school-outline",      bg: "#1E3A5F", accent: "#60A5FA", hasLevels: false },
  CA:    { icon: "ribbon-outline",       bg: "#0C4A6E", accent: "#38BDF8", hasLevels: false },
  PIPFA: { icon: "briefcase-outline",   bg: "#065F46", accent: "#34D399", hasLevels: false },
  BCOM:  { icon: "library-outline",     bg: "#4C1D95", accent: "#C084FC", hasLevels: false },
  MBA:   { icon: "trending-up-outline", bg: "#78350F", accent: "#FCD34D", hasLevels: false },
};

function ProgramCard({ course }: { course: Course }) {
  const meta = PROGRAM_META[course.code] ?? {
    icon: "book-outline" as keyof typeof Ionicons.glyphMap,
    bg: Colors.light.primary,
    accent: "#60A5FA",
    hasLevels: false,
  };

  const handlePress = () => {
    if (meta.hasLevels) {
      router.push({ pathname: "/levels/[courseId]", params: { courseId: course.id, courseName: course.name, courseCode: course.code } });
    } else {
      router.push({ pathname: "/subjects/[courseId]", params: { courseId: course.id, courseName: course.name, courseCode: course.code } });
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.93 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] }]}
      onPress={handlePress}
    >
      <View style={[styles.cardHeader, { backgroundColor: meta.bg }]}>
        <View style={[styles.iconCircle, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
          <Ionicons name={meta.icon} size={38} color="#FFFFFF" />
        </View>
        <View style={styles.cardHeaderRight}>
          <Text style={styles.programCode}>{course.code}</Text>
          <Text style={styles.programName} numberOfLines={2}>{course.name}</Text>
          {meta.hasLevels && (
            <View style={styles.levelsChip}>
              <Ionicons name="layers-outline" size={10} color={meta.accent} />
              <Text style={[styles.levelsChipText, { color: meta.accent }]}>Multi-level</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.cardFooter}>
        <View style={styles.footerStats}>
          <Ionicons name="book-outline" size={13} color={Colors.light.textMuted} />
          <Text style={styles.footerStatsText}>{course.subjectCount} {course.code === "ACCA" ? "Papers" : "Subjects"}</Text>
          <Text style={styles.footerDot}>·</Text>
          <Ionicons name="help-circle-outline" size={13} color={Colors.light.textMuted} />
          <Text style={styles.footerStatsText}>{course.questionCount} MCQs</Text>
        </View>
        <View style={styles.goRow}>
          <Text style={[styles.goText, { color: meta.bg }]}>
            {meta.hasLevels ? "View Levels" : "View Papers"}
          </Text>
          <Ionicons name="arrow-forward" size={15} color={meta.bg} />
        </View>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 67) : insets.top;

  const { data: courses, isLoading, error, refetch } = useQuery({
    queryKey: ["courses"],
    queryFn: api.getCourses,
    enabled: !!user,
  });

  const initial = user?.name?.charAt(0)?.toUpperCase() ?? "?";
  const firstName = user?.name?.split(" ")[0] ?? "Student";

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.welcomeLabel}>Welcome back,</Text>
          <Text style={styles.fullName}>{user?.name ?? firstName}</Text>
        </View>
        {user?.role === "admin" && (
          <Pressable style={styles.adminBtn} onPress={() => router.push("/admin")}>
            <Ionicons name="settings-outline" size={20} color={Colors.light.primary} />
          </Pressable>
        )}
      </View>

      <Text style={styles.sectionTitle}>Programs</Text>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.loadingText}>Loading programs...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.light.error} />
          <Text style={styles.errorText}>Failed to load programs</Text>
          <Pressable style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={courses ?? []}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <ProgramCard course={item} />}
          contentContainerStyle={[styles.list, { paddingBottom: isWeb ? 34 + 84 : 100 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={Colors.light.primary} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="book-outline" size={64} color={Colors.light.textMuted} />
              <Text style={styles.emptyText}>No programs available</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 12,
    gap: 12,
  },
  avatarCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.light.primary,
    alignItems: "center", justifyContent: "center",
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  avatarText: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  headerText: { flex: 1 },
  welcomeLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary },
  fullName: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.light.text },
  adminBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.light.backgroundSecondary,
    alignItems: "center", justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.light.textMuted,
    textTransform: "uppercase", letterSpacing: 1.2,
    marginHorizontal: 20, marginBottom: 12, marginTop: 4,
  },
  list: { paddingHorizontal: 16, gap: 14 },
  card: {
    backgroundColor: Colors.light.card,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 14,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    gap: 14,
  },
  iconCircle: {
    width: 70, height: 70, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  cardHeaderRight: { flex: 1, gap: 5 },
  programCode: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.7)", letterSpacing: 1, textTransform: "uppercase" },
  programName: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#FFFFFF", lineHeight: 24 },
  levelsChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
    alignSelf: "flex-start", marginTop: 2,
  },
  levelsChipText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  cardFooter: {
    paddingHorizontal: 18, paddingVertical: 12,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderTopWidth: 1, borderTopColor: Colors.light.border,
  },
  footerStats: { flexDirection: "row", alignItems: "center", gap: 5 },
  footerStatsText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.light.textMuted },
  footerDot: { color: Colors.light.textMuted, fontSize: 12 },
  goRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  goText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 10 },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary },
  errorText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.light.error },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: Colors.light.primary, borderRadius: 10, marginTop: 4 },
  retryText: { color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  emptyText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.light.textMuted },
});
