import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Alert,
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

const COURSE_META: Record<string, {
  icon: keyof typeof Ionicons.glyphMap;
  bg: string;
  accent: string;
  abbr: string;
  fullName: string;
}> = {
  ACCA:  { icon: "school-outline",     bg: "#1E3A5F", accent: "#60A5FA", abbr: "ACCA",  fullName: "Association of Chartered\nCertified Accountants" },
  PIPFA: { icon: "briefcase-outline",  bg: "#065F46", accent: "#34D399", abbr: "PIPFA", fullName: "Pakistan Institute of\nPublic Finance Accountants" },
  BCOM:  { icon: "library-outline",    bg: "#4C1D95", accent: "#C084FC", abbr: "B.Com", fullName: "Bachelor of Commerce" },
  MBA:   { icon: "trending-up-outline",bg: "#78350F", accent: "#FCD34D", abbr: "MBA",   fullName: "Master of Business\nAdministration" },
};

function CourseCard({ course, onLockedPress }: { course: Course; onLockedPress: () => void }) {
  const meta = COURSE_META[course.code] ?? {
    icon: "book-outline" as keyof typeof Ionicons.glyphMap,
    bg: Colors.light.primary,
    accent: "#60A5FA",
    abbr: course.code,
    fullName: course.name,
  };

  const handlePress = () => {
    if (!course.purchased) { onLockedPress(); return; }
    router.push({ pathname: "/subjects/[courseId]", params: { courseId: course.id, courseName: course.name } });
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.94 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] }]}
      onPress={handlePress}
    >
      <View style={[styles.cardHeader, { backgroundColor: meta.bg }]}>
        <View style={styles.logoWrapper}>
          <View style={[styles.logoBadge, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
            <Ionicons name={meta.icon} size={36} color="#FFFFFF" />
          </View>
          <View style={styles.abbrBlock}>
            <Text style={styles.abbrText}>{meta.abbr}</Text>
            <Text style={styles.fullNameText} numberOfLines={2}>{meta.fullName}</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View style={[styles.statusBadge, course.purchased ? styles.purchasedBadge : styles.lockedBadge]}>
            <Ionicons
              name={course.purchased ? "checkmark-circle" : "lock-closed"}
              size={12}
              color={course.purchased ? "#059669" : "#9CA3AF"}
            />
            <Text style={[styles.statusText, course.purchased ? styles.purchasedText : styles.lockedText]}>
              {course.purchased ? "Purchased" : "Locked"}
            </Text>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.statChip}>{course.subjectCount} Subjects</Text>
            <Text style={styles.statChip}>{course.questionCount} MCQs</Text>
          </View>
        </View>
      </View>

      <View style={styles.cardFooter}>
        {course.purchased ? (
          <View style={styles.ctaRow}>
            <Text style={[styles.ctaText, { color: meta.bg }]}>Start Practicing</Text>
            <Ionicons name="arrow-forward-circle" size={20} color={meta.bg} />
          </View>
        ) : (
          <View style={styles.ctaRow}>
            <Ionicons name="lock-closed-outline" size={16} color={Colors.light.textMuted} />
            <Text style={[styles.ctaText, { color: Colors.light.textMuted }]}>Contact admin to purchase</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const { data: courses, isLoading, error, refetch } = useQuery({
    queryKey: ["courses", user?.id],
    queryFn: () => api.getCourses(user?.role === "admin" ? undefined : user?.id),
    enabled: !!user,
  });

  const topPad = isWeb ? Math.max(insets.top, 67) : insets.top;
  const firstName = user?.name?.split(" ")[0] ?? "Student";

  const purchasedCount = courses?.filter(c => c.purchased).length ?? 0;
  const totalCount = courses?.length ?? 0;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.name}>{firstName}</Text>
        </View>
        {user?.role === "admin" && (
          <Pressable style={styles.adminBtn} onPress={() => router.push("/admin")}>
            <Ionicons name="settings-outline" size={20} color={Colors.light.primary} />
          </Pressable>
        )}
      </View>

      {user?.role !== "admin" && courses && courses.length > 0 && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{purchasedCount}</Text>
            <Text style={styles.summaryLabel}>Purchased</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{totalCount - purchasedCount}</Text>
            <Text style={styles.summaryLabel}>Locked</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{totalCount}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
        </View>
      )}

      <Text style={styles.sectionTitle}>
        {user?.role === "admin" ? "All Courses" : "Your Courses"}
      </Text>

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
          renderItem={({ item }) => (
            <CourseCard
              course={item}
              onLockedPress={() =>
                Alert.alert("Course Locked", "Please contact your admin to get access to this course.", [{ text: "OK" }])
              }
            />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: isWeb ? 34 + 84 : 100 }]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!courses?.length}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={Colors.light.primary} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="book-outline" size={64} color={Colors.light.textMuted} />
              <Text style={styles.emptyText}>No courses available</Text>
              <Text style={styles.emptySubText}>Contact your admin to get course access</Text>
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
    paddingBottom: 12,
    paddingTop: 12,
  },
  greeting: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary },
  name: { fontSize: 26, fontFamily: "Inter_700Bold", color: Colors.light.text },
  adminBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.light.backgroundSecondary,
    alignItems: "center", justifyContent: "center",
  },
  summaryCard: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: Colors.light.card,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryItem: { flex: 1, alignItems: "center", gap: 2 },
  summaryDivider: { width: 1, backgroundColor: Colors.light.border },
  summaryValue: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.light.text },
  summaryLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textMuted },
  sectionTitle: {
    fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.light.textMuted,
    textTransform: "uppercase", letterSpacing: 1,
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
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: 18,
    paddingBottom: 16,
    gap: 12,
  },
  logoWrapper: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  logoBadge: {
    width: 64, height: 64, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  abbrBlock: { flex: 1, gap: 3 },
  abbrText: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#FFFFFF", letterSpacing: 0.5 },
  fullNameText: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)", lineHeight: 15 },
  headerRight: { alignItems: "flex-end", gap: 8, flexShrink: 0 },
  statusBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
  },
  purchasedBadge: { backgroundColor: "#DCFCE7" },
  lockedBadge: { backgroundColor: "#F3F4F6" },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  purchasedText: { color: "#059669" },
  lockedText: { color: "#6B7280" },
  statsRow: { gap: 4, alignItems: "flex-end" },
  statChip: { fontSize: 11, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.8)" },
  cardFooter: {
    paddingHorizontal: 18, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: Colors.light.border,
    backgroundColor: Colors.light.card,
  },
  ctaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  ctaText: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 10 },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary },
  errorText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.light.error },
  retryBtn: {
    paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: Colors.light.primary, borderRadius: 10, marginTop: 4,
  },
  retryText: { color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  emptyText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.light.textMuted },
  emptySubText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.light.textMuted, textAlign: "center", paddingHorizontal: 20 },
});
