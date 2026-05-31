import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { api, UserProgress } from "@/hooks/useApi";

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? Colors.light.success : score >= 50 ? Colors.light.warning : Colors.light.error;
  return (
    <View style={styles.scoreBarBg}>
      <View style={[styles.scoreBarFill, { width: `${score}%`, backgroundColor: color }]} />
    </View>
  );
}

function ProgressCard({ item }: { item: UserProgress }) {
  const score = Number(item.scorePercentage);
  const color = score >= 70 ? Colors.light.success : score >= 50 ? Colors.light.warning : Colors.light.error;
  return (
    <View style={styles.progressCard}>
      <View style={styles.progressCardTop}>
        <Text style={styles.topicName} numberOfLines={2}>{item.topicName || `Topic ${item.topicId}`}</Text>
        <View style={[styles.scoreBadge, { backgroundColor: color + "18" }]}>
          <Text style={[styles.scoreText, { color }]}>{score.toFixed(0)}%</Text>
        </View>
      </View>
      <ScoreBar score={score} />
      <View style={styles.progressStats}>
        <Text style={styles.progressStatText}>{item.correctAnswers}/{item.totalQuestions} correct</Text>
        {item.completed ? (
          <View style={styles.completedBadge}>
            <Ionicons name="checkmark-circle" size={12} color={Colors.light.success} />
            <Text style={styles.completedText}>Completed</Text>
          </View>
        ) : (
          <Text style={styles.progressStatText}>In Progress</Text>
        )}
      </View>
    </View>
  );
}

export default function ProgressScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 67) : insets.top;

  const { data: progress, isLoading, error, refetch } = useQuery({
    queryKey: ["progress", user?.id],
    queryFn: () => api.getUserProgress(user!.id),
    enabled: !!user?.id,
  });

  const completed = progress?.filter(p => p.completed).length ?? 0;
  const total = progress?.length ?? 0;
  const avgScore = total > 0
    ? progress!.reduce((acc, p) => acc + Number(p.scorePercentage), 0) / total
    : 0;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Progress</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.light.error} />
          <Text style={styles.errorText}>Failed to load progress</Text>
          <Pressable style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={progress ?? []}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={() => (
            <View>
              <View style={styles.summaryRow}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryValue}>{completed}/{total}</Text>
                  <Text style={styles.summaryLabel}>Topics Done</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={[styles.summaryValue, { color: avgScore >= 70 ? Colors.light.success : Colors.light.warning }]}>
                    {avgScore.toFixed(0)}%
                  </Text>
                  <Text style={styles.summaryLabel}>Avg Score</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryValue}>{progress?.reduce((a, p) => a + p.totalQuestions, 0) ?? 0}</Text>
                  <Text style={styles.summaryLabel}>OTQs Done</Text>
                </View>
              </View>
              {total > 0 && (
                <Text style={styles.sectionLabel}>Topic History</Text>
              )}
            </View>
          )}
          renderItem={({ item }) => <ProgressCard item={item} />}
          contentContainerStyle={[styles.list, { paddingBottom: isWeb ? 34 + 84 : 100 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="bar-chart-outline" size={72} color={Colors.light.textMuted} />
              <Text style={styles.emptyTitle}>No Progress Yet</Text>
              <Text style={styles.emptyDesc}>Complete some MCQ topics to see your progress here</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: { paddingHorizontal: 20, paddingBottom: 12, paddingTop: 12 },
  headerTitle: { fontSize: 26, fontFamily: "Inter_700Bold", color: Colors.light.text },
  summaryRow: { flexDirection: "row", gap: 12, marginHorizontal: 16, marginBottom: 20 },
  summaryCard: {
    flex: 1, backgroundColor: Colors.light.card, borderRadius: 14,
    padding: 14, alignItems: "center", gap: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  summaryValue: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.light.primary },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.light.textMuted, textAlign: "center" },
  sectionLabel: {
    fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.light.textMuted,
    textTransform: "uppercase", letterSpacing: 1, marginHorizontal: 16, marginBottom: 10,
  },
  list: { gap: 10 },
  progressCard: {
    backgroundColor: Colors.light.card, marginHorizontal: 16, borderRadius: 14, padding: 14, gap: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  progressCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  topicName: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.light.text },
  scoreBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  scoreText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  scoreBarBg: { height: 6, backgroundColor: Colors.light.backgroundSecondary, borderRadius: 3, overflow: "hidden" },
  scoreBarFill: { height: "100%", borderRadius: 3 },
  progressStats: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressStatText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textMuted },
  completedBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  completedText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.light.success },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.light.error },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: Colors.light.primary, borderRadius: 10 },
  retryText: { color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingTop: 60, paddingHorizontal: 32, gap: 12 },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.light.text },
  emptyDesc: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, textAlign: "center", lineHeight: 21 },
});
