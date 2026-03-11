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
import { api, Subject } from "@/hooks/useApi";

function SubjectCard({ subject }: { subject: Subject }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
      onPress={() => router.push({
        pathname: "/chapters/[subjectId]",
        params: { subjectId: subject.id, subjectName: subject.name }
      })}
    >
      <View style={styles.cardLeft}>
        <View style={styles.codeTag}>
          <Text style={styles.codeText}>{subject.code}</Text>
        </View>
      </View>
      <View style={styles.cardCenter}>
        <Text style={styles.subjectName}>{subject.name}</Text>
        {subject.description ? <Text style={styles.desc} numberOfLines={1}>{subject.description}</Text> : null}
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Ionicons name="layers-outline" size={12} color={Colors.light.textMuted} />
            <Text style={styles.statChipText}>{subject.chapterCount} Chapters</Text>
          </View>
          <View style={styles.statChip}>
            <Ionicons name="help-circle-outline" size={12} color={Colors.light.textMuted} />
            <Text style={styles.statChipText}>{subject.questionCount} MCQs</Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.light.textMuted} />
    </Pressable>
  );
}

export default function SubjectsScreen() {
  const { courseId, courseName } = useLocalSearchParams<{ courseId: string; courseName: string }>();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 67) : insets.top;

  const { data: subjects, isLoading, error, refetch } = useQuery({
    queryKey: ["subjects", courseId],
    queryFn: () => api.getSubjects(Number(courseId)),
    enabled: !!courseId,
  });

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.light.text} />
        </Pressable>
        <View style={styles.headerTitles}>
          <Text style={styles.courseLabel}>{courseName}</Text>
          <Text style={styles.screenTitle}>Subjects</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.light.error} />
          <Text style={styles.errorText}>Failed to load subjects</Text>
          <Pressable style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={subjects ?? []}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <SubjectCard subject={item} />}
          contentContainerStyle={[styles.list, { paddingBottom: isWeb ? 34 : 30 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="library-outline" size={64} color={Colors.light.textMuted} />
              <Text style={styles.emptyText}>No subjects found</Text>
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
  courseLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.light.textMuted, textTransform: "uppercase", letterSpacing: 0.8 },
  screenTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.light.text },
  list: { paddingHorizontal: 16, gap: 10, paddingTop: 4 },
  card: {
    backgroundColor: Colors.light.card, borderRadius: 14, padding: 14,
    flexDirection: "row", alignItems: "center", gap: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardLeft: { alignItems: "center", justifyContent: "center" },
  codeTag: { backgroundColor: Colors.light.primary + "14", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  codeText: { fontSize: 11, fontFamily: "Inter_700Bold", color: Colors.light.primary },
  cardCenter: { flex: 1, gap: 4 },
  subjectName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  desc: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary },
  statsRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  statChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.light.backgroundSecondary, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  statChipText: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.light.textMuted },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.light.error },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: Colors.light.primary, borderRadius: 10 },
  retryText: { color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  emptyText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.light.textMuted },
});
