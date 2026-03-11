import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { api, Question } from "@/hooks/useApi";

export default function ResultsScreen() {
  const { topicId, topicName, score: scoreStr, total: totalStr } = useLocalSearchParams<{
    topicId: string;
    topicName: string;
    score: string;
    total: string;
  }>();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 67) : insets.top;

  const score = parseInt(scoreStr ?? "0", 10);
  const total = parseInt(totalStr ?? "0", 10);
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const passed = pct >= 50;

  const scoreColor = pct >= 70 ? Colors.light.success : pct >= 50 ? Colors.light.warning : Colors.light.error;

  const { data: questions } = useQuery({
    queryKey: ["questions", topicId],
    queryFn: () => api.getQuestions(Number(topicId)),
  });

  const grade = pct >= 80 ? "Excellent" : pct >= 70 ? "Good" : pct >= 50 ? "Pass" : "Needs Work";
  const gradeIcon: keyof typeof Ionicons.glyphMap = pct >= 70 ? "trophy" : pct >= 50 ? "thumbs-up" : "refresh-circle";

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable style={styles.closeBtn} onPress={() => router.dismissAll()}>
          <Ionicons name="close" size={22} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Results</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 20, 40) }]}
      >
        <View style={styles.heroCard}>
          <View style={[styles.heroIcon, { backgroundColor: scoreColor + "20" }]}>
            <Ionicons name={gradeIcon} size={48} color={scoreColor} />
          </View>
          <Text style={[styles.gradeText, { color: scoreColor }]}>{grade}</Text>
          <Text style={styles.topicTitle}>{topicName}</Text>

          <View style={styles.bigScore}>
            <Text style={[styles.bigScoreNum, { color: scoreColor }]}>{pct}%</Text>
          </View>

          <View style={styles.scoreBarBg}>
            <View style={[styles.scoreBarFill, { width: `${pct}%`, backgroundColor: scoreColor }]} />
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="help-circle" size={24} color={Colors.light.primary} />
            <Text style={styles.statNum}>{total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={24} color={Colors.light.success} />
            <Text style={[styles.statNum, { color: Colors.light.success }]}>{score}</Text>
            <Text style={styles.statLabel}>Correct</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="close-circle" size={24} color={Colors.light.error} />
            <Text style={[styles.statNum, { color: Colors.light.error }]}>{total - score}</Text>
            <Text style={styles.statLabel}>Wrong</Text>
          </View>
        </View>

        {questions && questions.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Answer Review</Text>
            {questions.map((q: Question, idx: number) => (
              <View key={q.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewQNum}>Q{idx + 1}</Text>
                  <Text style={styles.reviewQuestion}>{q.questionText}</Text>
                </View>
                <View style={styles.reviewAnswers}>
                  <View style={styles.reviewAnswerRow}>
                    <Ionicons name="checkmark-circle" size={14} color={Colors.light.success} />
                    <Text style={styles.reviewAnswerText}>
                      Correct: {q.correctAnswers.map(a => {
                        const map: Record<string, string> = { A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD };
                        return `${a}: ${map[a]}`;
                      }).join(", ")}
                    </Text>
                  </View>
                  <Text style={styles.reviewExplanation}>{q.explanation}</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 8, 24) }]}>
        <Pressable
          style={({ pressed }) => [styles.restartBtn, { opacity: pressed ? 0.85 : 1 }]}
          onPress={() => router.replace({ pathname: "/practice/[topicId]", params: { topicId, topicName } })}
        >
          <Ionicons name="refresh" size={18} color={Colors.light.primary} />
          <Text style={styles.restartBtnText}>Try Again</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.homeBtn, { opacity: pressed ? 0.85 : 1 }]}
          onPress={() => router.dismissAll()}
        >
          <Text style={styles.homeBtnText}>Back to Home</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, paddingTop: 8 },
  closeBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.light.backgroundSecondary, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.light.text },
  scrollContent: { padding: 16, gap: 16 },
  heroCard: {
    backgroundColor: Colors.light.card, borderRadius: 20, padding: 24, alignItems: "center", gap: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
  },
  heroIcon: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  gradeText: { fontSize: 18, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 1 },
  topicTitle: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.light.textSecondary, textAlign: "center" },
  bigScore: { marginVertical: 8 },
  bigScoreNum: { fontSize: 64, fontFamily: "Inter_700Bold", lineHeight: 72 },
  scoreBarBg: { width: "100%", height: 8, backgroundColor: Colors.light.backgroundSecondary, borderRadius: 4, overflow: "hidden" },
  scoreBarFill: { height: "100%", borderRadius: 4 },
  statsRow: { flexDirection: "row", gap: 12 },
  statCard: {
    flex: 1, backgroundColor: Colors.light.card, borderRadius: 14, padding: 14, alignItems: "center", gap: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  statNum: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.light.text },
  statLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.light.textMuted },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.light.text, marginTop: 4 },
  reviewCard: {
    backgroundColor: Colors.light.card, borderRadius: 14, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  reviewHeader: { flexDirection: "row", gap: 10, padding: 14, backgroundColor: Colors.light.backgroundSecondary },
  reviewQNum: { fontSize: 12, fontFamily: "Inter_700Bold", color: Colors.light.primary, minWidth: 24 },
  reviewQuestion: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.light.text, lineHeight: 18 },
  reviewAnswers: { padding: 14, gap: 6 },
  reviewAnswerRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  reviewAnswerText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.light.success, lineHeight: 17 },
  reviewExplanation: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.light.textSecondary, lineHeight: 17, paddingTop: 4, borderTopWidth: 1, borderTopColor: Colors.light.border, marginTop: 4 },
  footer: { flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingTop: 8, backgroundColor: Colors.light.background },
  restartBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, height: 52, borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.light.primary,
  },
  restartBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.light.primary },
  homeBtn: {
    flex: 1, alignItems: "center", justifyContent: "center",
    height: 52, borderRadius: 14, backgroundColor: Colors.light.primary,
  },
  homeBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFF" },
});
