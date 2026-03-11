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

const COURSE_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; bg: string; accent: string }> = {
  ACCA:  { icon: "school",        bg: "#1E3A5F", accent: "#3B82F6" },
  PIPFA: { icon: "business",      bg: "#0F5132", accent: "#34D399" },
  BCOM:  { icon: "library",       bg: "#581C87", accent: "#C084FC" },
  MBA:   { icon: "trending-up",   bg: "#92400E", accent: "#FCD34D" },
};

function CourseCard({ course }: { course: Course }) {
  const meta = COURSE_META[course.code] ?? { icon: "book", bg: Colors.light.primary, accent: Colors.light.accent };

  return (
    <Pressable
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
      onPress={() => router.push({ pathname: "/subjects/[courseId]", params: { courseId: course.id, courseName: course.name } })}
    >
      <View style={[styles.cardHeader, { backgroundColor: meta.bg }]}>
        <View style={[styles.iconBadge, { backgroundColor: meta.accent + "33" }]}>
          <Ionicons name={meta.icon} size={28} color={meta.accent} />
        </View>
        <View style={styles.cardStats}>
          <Text style={styles.statText}>{course.subjectCount} Subjects</Text>
          <Text style={styles.statText}>{course.questionCount} MCQs</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.courseCode}>{course.code}</Text>
        <Text style={styles.courseName}>{course.name}</Text>
        {course.description ? (
          <Text style={styles.courseDesc} numberOfLines={2}>{course.description}</Text>
        ) : null}
        <View style={styles.startRow}>
          <Text style={[styles.startBtn, { color: meta.bg }]}>Start Practicing</Text>
          <Ionicons name="arrow-forward" size={16} color={meta.bg} />
        </View>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const { data: courses, isLoading, error, refetch } = useQuery({
    queryKey: ["courses"],
    queryFn: api.getCourses,
  });

  const topPad = isWeb ? Math.max(insets.top, 67) : insets.top;

  const firstName = user?.name?.split(" ")[0] ?? "Student";

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.name}>{firstName}</Text>
        </View>
        {user?.role === "admin" && (
          <Pressable style={styles.adminBtn} onPress={() => router.push("/admin")}>
            <Ionicons name="settings" size={20} color={Colors.light.primary} />
          </Pressable>
        )}
      </View>

      <Text style={styles.sectionTitle}>Choose a Course</Text>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.loadingText}>Loading courses...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.light.error} />
          <Text style={styles.errorText}>Failed to load courses</Text>
          <Pressable style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={courses ?? []}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <CourseCard course={item} />}
          contentContainerStyle={[styles.list, { paddingBottom: isWeb ? 34 + 84 : 100 }]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!courses?.length}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={Colors.light.primary} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="book-outline" size={64} color={Colors.light.textMuted} />
              <Text style={styles.emptyText}>No courses available</Text>
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
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 8,
    paddingTop: 12,
  },
  greeting: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary },
  name: { fontSize: 26, fontFamily: "Inter_700Bold", color: Colors.light.text },
  adminBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginHorizontal: 20,
    marginBottom: 12,
    marginTop: 4,
  },
  list: { paddingHorizontal: 16, gap: 16 },
  card: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingVertical: 14,
  },
  iconBadge: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cardStats: { alignItems: "flex-end", gap: 4 },
  statText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.8)" },
  cardBody: { padding: 16, gap: 4 },
  courseCode: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.light.textMuted, textTransform: "uppercase", letterSpacing: 1 },
  courseName: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.light.text },
  courseDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, lineHeight: 18, marginTop: 2 },
  startRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  startBtn: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 12 },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary },
  errorText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.light.error },
  retryBtn: {
    paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: Colors.light.primary, borderRadius: 10,
    marginTop: 4,
  },
  retryText: { color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  emptyText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.light.textMuted },
});
